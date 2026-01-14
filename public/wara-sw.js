const SW_VERSION = 'v1';

// Store keys mapping: streamId -> { key, iv, remoteUrl }
const streamConfig = new Map();

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Configure a stream with keys
self.addEventListener('message', (event) => {
    if (event.data.type === 'CONFIGURE_STREAM') {
        const { streamId, key, iv, remoteUrl, size } = event.data;
        streamConfig.set(streamId, { key, iv, remoteUrl, size });
        console.log(`[WaraSW] Configured stream ${streamId}`);
        event.ports[0].postMessage({ success: true });
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept requests to /wara-virtual/{streamId}
    if (url.pathname.startsWith('/wara-virtual/')) {
        const streamId = url.pathname.split('/')[2];
        const config = streamConfig.get(streamId);

        if (config) {
            event.respondWith(handleStreamRequest(event.request, config));
        } else {
            console.warn(`[WaraSW] No config found for ${streamId}`);
        }
    }
});

async function handleStreamRequest(request, config) {
    // 1. Parse Range Header (Browser asks for "bytes=0-" or "bytes=1000-2000")
    const rangeHeader = request.headers.get('Range');
    const fileSize = config.size;

    let start = 0;
    let end = fileSize - 1;

    if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        if (parts[1]) {
            end = parseInt(parts[1], 10);
        }
    }

    // Sanity check
    if (start >= fileSize) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }

    // Content-Length for this chunk
    const chunkLength = (end - start) + 1;

    // 2. Fetch Encrypted Chunk from Remote Node
    // We must fetch exactly the bytes corresponding to this range.
    // Since AES-CTR is 1:1 mapping (1 byte encrypted = 1 byte plaintext),
    // mapping ranges is trivial! No block alignment padding needed except for counter calculation.

    // HOWEVER: AES-CTR works on 16-byte blocks.
    // If 'start' is not a multiple of 16, we need to generate the keystream for the block containing 'start'.

    // Block Logic:
    const BLOCK_SIZE = 16;
    const startBlock = Math.floor(start / BLOCK_SIZE);
    const endBlock = Math.floor(end / BLOCK_SIZE);

    // We need to fetch enough data to cover full blocks to decrypt correctly, 
    // or at least be careful with the keystream.
    // Fetch range aligned to blocks for simplicity
    const fetchStart = startBlock * BLOCK_SIZE; // Round down to nearest block
    // We can fetch just the exact bytes we need from server, but we need to generate keystream from fetchStart offset.

    // Let's fetch EXACTLY what is requested.
    // range: bytes=fetchStart-end
    // (We fetch from the start of the BLOCK containing the requested byte, to make counter math easy)

    const response = await fetch(config.remoteUrl, {
        headers: {
            'Range': `bytes=${fetchStart}-${end}`
        }
    });

    if (!response.ok) {
        return new Response("Upstream Error", { status: 502 });
    }

    const encryptedBuffer = await response.arrayBuffer();

    // 3. Decrypt
    const decryptedBuffer = await decryptCTR(
        encryptedBuffer,
        config.key,
        config.iv,
        startBlock // Counter starts at this block index relative to file start
    );

    // 4. Return the specific slice requested
    // If we requested bytes 5-10, startBlock is 0 (bytes 0-15).
    // We fetched bytes 0-10. Decrypted bytes 0-10.
    // We need to slice 5-10 to return to browser.

    const offsetInFirstBlock = start - fetchStart;
    const finalData = decryptedBuffer.slice(offsetInFirstBlock);

    return new Response(finalData, {
        status: 206, // Partial Content
        headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': finalData.byteLength,
            'Content-Type': 'video/mp4', // Assume MP4 for now
            'Accept-Ranges': 'bytes'
        }
    });
}

// AES-CTR Decryption Helper using Web Crypto
async function decryptCTR(encryptedData, keyHex, ivHex, startBlockIndex) {
    const keyBytes = hexToBytes(keyHex);
    const ivBytes = hexToBytes(ivHex);

    // Calculate Counter for this specific block offset
    // Counter = IV + BlockIndex (Big Endian addition usually, but standard WebCrypto AES-CTR uses specific counter logic)
    // Actually WebCrypto 'counter' param is the INITIAL counter block (16 bytes).
    // It increments the RIGHTMOST bits.

    // We need to add startBlockIndex to the IV.
    // Implementation of 128-bit addition:
    // IV is 16 bytes. Treat as BigInt.
    const counter = new Uint8Array(16);
    counter.set(ivBytes);

    incrementCounter(counter, startBlockIndex);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-CTR' },
        false,
        ['decrypt']
    );

    return await crypto.subtle.decrypt(
        {
            name: 'AES-CTR',
            counter: counter,
            length: 128 // Full 128-bit counter to match Node.js behavior
        },
        cryptoKey,
        encryptedData
    );
}

function incrementCounter(counterBuffer, value) {
    // Treat the last 4 bytes as a 32-bit integer for simplicity (standard for many CTR implementations)
    // Or do full 128-bit addition.
    // Let's do full 128-bit big-endian add.

    let carry = value;
    for (let i = 15; i >= 0; i--) {
        if (carry === 0) break;
        const sum = counterBuffer[i] + (carry & 0xFF);
        counterBuffer[i] = sum & 0xFF;
        carry = (carry >>> 8) + (sum >>> 8);
    }
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

'use client';
import { useState } from 'react';
import { getApiUrl } from '@/lib/node-helpers';

export default function MirrorButton({ sourceUrl, tmdbId, mediaType, onMirrored }: { sourceUrl: string, tmdbId: string, mediaType: string, onMirrored: () => void }) {
    const [status, setStatus] = useState<'idle' | 'mirroring' | 'done' | 'error'>('idle');

    // Hide if source is already localhost (can't mirror yourself)
    if (sourceUrl.includes('localhost') || sourceUrl.includes('127.0.0.1')) {
        return null;
    }

    const handleMirror = async () => {
        setStatus('mirroring');
        try {
            // 1. Clean URL (remove hash key) -> actually mirror endpoint expects base url? 
            // My backend code: const { outputUrl } = req.body; 
            // It then does fetch(`${outputUrl}/map`). So it expects the base URL to the resource.
            // My link URL format in DB: "http://ip:port/wara/id#key"

            const [baseUrl, key] = sourceUrl.split('#');

            // 2. Call Local Node Mirror
            const res = await fetch(getApiUrl('/admin/mirror'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outputUrl: baseUrl })
            });

            if (!res.ok) throw new Error("Local Node Mirror failed");

            const data = await res.json();

            // 3. Register New Link (My Mirror)
            // Re-use the ORIGINAL KEY because we are just mirroring the encrypted file!
            // The node returns a new map with MY public endpoint.
            const newLinkUrl = `${data.map.publicEndpoint}#${key}`; // Use original key!

            await fetch(getApiUrl('/api/links'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: newLinkUrl,
                    title: `Mirror of ${data.mirroredFrom}`,
                    tmdbId,
                    mediaType
                })
            });

            setStatus('done');
            setTimeout(onMirrored, 1000); // Give time for UI update

        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    return (
        <button
            onClick={handleMirror}
            disabled={status !== 'idle'}
            className={`text-xs px-2 py-1 rounded border transition-colors ${status === 'idle' ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300' :
                status === 'mirroring' ? 'bg-blue-900 border-blue-700 text-blue-200 animate-pulse' :
                    status === 'done' ? 'bg-green-900 border-green-700 text-green-200' :
                        'bg-red-900 border-red-700 text-red-200'
                }`}
            title="Host a copy of this file on your generic node to help the network"
        >
            {status === 'idle' && '⚡ Mirror'}
            {status === 'mirroring' && 'Downloading...'}
            {status === 'done' && 'Mirrored!'}
            {status === 'error' && 'Failed'}
        </button>
    );
}

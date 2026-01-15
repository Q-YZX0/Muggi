'use client'
import { useState, useEffect } from 'react'
import { useWallet } from '@/context/WalletContext'
import { WalletProvider as ManagedWalletProvider } from '@/lib/walletProvider'

interface WaraLocalUploaderProps {
    tmdbId: string;
    mediaType: string; // 'movie' | 'tv' | 'episode'
    title: string; // Show Name ("The Simpsons") or Movie Name
    episodeName?: string; // NEW: Episode Name ("Homer's Odyssey")
    season?: number;
    episode?: number;
    onLinkCreated: () => void;
}

interface SavedNode {
    id: string;
    name: string;
    url: string;
    key: string;
}

const DEFAULT_NODE: SavedNode = {
    id: 'local',
    name: 'Local Node (This PC)',
    url: 'http://127.0.0.1:21746',
    key: ''
};

export default function WaraLocalUploader({ tmdbId, mediaType, title, episodeName, season, episode, onLinkCreated }: WaraLocalUploaderProps) {
    const { address, username, isConnected, connect } = useWallet(); // USE GLOBAL CONTEXT

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [lastLinkId, setLastLinkId] = useState<string | null>(null);

    // Custom Metadata State
    const [customTitle, setCustomTitle] = useState('');
    const [description, setDescription] = useState('');
    const [quality, setQuality] = useState('1080p');
    const [language, setLanguage] = useState('es'); // Default to Spanish

    // Node Selection
    const [targetNode, setTargetNode] = useState<SavedNode>(DEFAULT_NODE);
    const [availableNodes, setAvailableNodes] = useState<SavedNode[]>([DEFAULT_NODE]);

    useEffect(() => {
        // 1. Load Nodes
        const storedNodes = localStorage.getItem('wara_saved_nodes');
        const storedActive = localStorage.getItem('active_wara_node'); // Correct Key !

        let loadedNodes = [DEFAULT_NODE];
        if (storedNodes) {
            try {
                const parsed = JSON.parse(storedNodes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    loadedNodes = [DEFAULT_NODE, ...parsed];
                }
            } catch (e) { }
        }
        setAvailableNodes(loadedNodes);

        // 2. Set Active Node
        if (storedActive) {
            try {
                const active = JSON.parse(storedActive);
                // Ensure we use the latest version if key/url changed in savedNodes
                const fresh = loadedNodes.find(n => n.id === active.id) || active;
                setTargetNode(fresh);
            } catch (e) { }
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setLogs([]);
            setStatus('idle');
            setLastLinkId(null);

            if (file.name.toLowerCase().endsWith('.mkv')) {
                setLogs(prev => [...prev, "⚠️ WARNING: MKV files may not play directly in browsers. MP4 (H.264) is recommended."]);
            }
        }
    };

    const handleSubtitleUpload = async (file: File, lang: string) => {
        if (!lastLinkId) return;
        setLogs(prev => [...prev, `Uploading Subtitle (${lang})...`]);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${targetNode.url}/admin/subtitle`, true);

            // Auth Headers
            if (targetNode.key) xhr.setRequestHeader('X-Wara-Key', targetNode.key);

            xhr.setRequestHeader('X-Link-Id', lastLinkId);
            xhr.setRequestHeader('X-Lang', lang);
            xhr.setRequestHeader('X-Label', lang.toUpperCase());
            xhr.setRequestHeader('X-Filename', file.name);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');

            xhr.onload = () => {
                if (xhr.status === 200) {
                    setLogs(prev => [...prev, `Subtitle (${lang}) attached successfully!`]);
                    // Trigger UI refresh to show new capabilities
                    onLinkCreated();
                } else {
                    setLogs(prev => [...prev, `Subtitle upload failed: ${xhr.statusText}`]);
                }
            };
            xhr.send(file);
        } catch (e) {
            console.error(e);
        }
    };

    const handlePublish = async () => {
        if (!selectedFile) return;

        if (!address) {
            await connect();
            // Wait for context to update or check manually
            if (!(window as any).ethereum) return;
        }

        // 1. Determine Prefix
        let prefix = '';
        if (mediaType === 'tv' && season && episode) {
            prefix = `S${season}E${episode} - `;
        }

        // 2. Determine Suffix (User Input > Episode Name > Show Name)
        let suffix = customTitle.trim();
        if (!suffix) {
            suffix = mediaType === 'tv' ? (episodeName || title) : title;
        }

        const finalTitle = `${prefix}${suffix}`;

        setStatus('uploading');
        setLogs(prev => [...prev, `Uploading ${selectedFile.name} to ${targetNode.name}...`]);

        try {
            // 1. Upload to Node using Stream
            const mediaInfo = {
                tmdbId,
                type: mediaType === 'tv' ? 'episode' : 'movie',
                title: finalTitle,
                description,
                quality,
                language
            };

            // 1. Authentication (Local vs Remote)
            let uploadToken = ManagedWalletProvider.getAuthToken(); // Default to Local Token

            if (targetNode.id !== 'local') {
                // If Remote Node: Needs Remote Auth Token
                // 1. Prompt for *Local* Password (to decrypt remote key stored in Local DB)
                const password = prompt(`Enter your Wara Node password to sync with ${targetNode.name}`);
                if (!password) {
                    setStatus('error');
                    setLogs(prev => [...prev, "Authentication cancelled. Password required."]);
                    return;
                }

                setLogs(prev => [...prev, "🔐 Authenticating with Remote Node..."]);

                // 2. Prepare Payloads (Local Node)
                const prepRes = await fetch(`${DEFAULT_NODE.url}/api/auth/prepare-sync-payloads`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': uploadToken || ''
                    },
                    body: JSON.stringify({ targetUrl: targetNode.url, password })
                });

                if (!prepRes.ok) {
                    const err = await prepRes.json();
                    throw new Error("Local Authentication Failed: " + (err.error || prepRes.statusText));
                }
                const { importPayload, loginPayload } = await prepRes.json();

                // 3. Import Profile (Remote Node) - Ensures User Exists
                const impRes = await fetch(`${targetNode.url}/api/auth/import-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload: importPayload })
                });
                if (!impRes.ok) console.warn("Profile import warning:", await impRes.text());

                // 4. Remote Login (Get Remote Token)
                const logRes = await fetch(`${targetNode.url}/api/auth/remote-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload: loginPayload })
                });

                if (!logRes.ok) throw new Error("Remote Login Failed");
                const loginData = await logRes.json();
                uploadToken = loginData.authToken; // SWAP TOKEN for the upload request
                setLogs(prev => [...prev, "✅ Remote Authentication Successful."]);
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${targetNode.url}/admin/import`, true);

            // Auth Headers (Use Token instead of Key)
            if (uploadToken) xhr.setRequestHeader('x-auth-token', uploadToken);

            // Metadata via headers
            xhr.setRequestHeader('X-Filename', selectedFile.name);
            xhr.setRequestHeader('X-Title', finalTitle);
            xhr.setRequestHeader('X-Hoster', address || '');
            xhr.setRequestHeader('X-MediaInfo', JSON.stringify(mediaInfo));
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(percent);
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);

                    setStatus('processing');
                    setLogs(prev => [...prev, `Upload 100%. Node processing...`]);
                    setLogs(prev => [...prev, `Success! Encryption Key generated.`]);
                    setLogs(prev => [...prev, `Link ID: ${data.linkId}`]);
                    setLastLinkId(data.linkId);

                    // Backend provides the final URL (wara:// format)
                    const finalLink = data.map?.publicEndpoint || `${targetNode.url}/wara/${data.linkId}#${data.key}`;

                    setLogs(prev => [...prev, `Sealing & Registering Content...`]);

                    const uploaderWallet = address;
                    if (!uploaderWallet) throw new Error("Wallet not connected");

                    // Call Node API directly to save link metadata P2P
                    const linkSubmitResponse = await fetch(`${targetNode.url}/api/links`, {
                        method: 'POST',
                        body: JSON.stringify({
                            url: finalLink,
                            title: finalTitle,
                            tmdbId,
                            mediaType,
                            season,
                            episode,
                            uploaderWallet: address, // Tell the remote node this belongs to ME
                            waraMetadata: {
                                quality,
                                description,
                                language,
                                hash: data.map?.hash,
                                key: data.key // Store key in metadata for fallback
                            }
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                            ...(targetNode.key ? { 'x-wara-key': targetNode.key } : {}),
                            'x-auth-token': ManagedWalletProvider.getAuthToken() || '' // Send User Session Token
                        }
                    });

                    if (!linkSubmitResponse.ok) {
                        const errorData = await linkSubmitResponse.json();
                        console.error('[Upload] Failed to save link to database:', errorData);
                        setLogs(prev => [...prev, `⚠️ Warning: Link saved to node but database registration failed: ${errorData.error || 'Unknown error'}`]);
                    } else {
                        const linkData = await linkSubmitResponse.json();
                        console.log('[Upload] Link saved to node:', linkData);
                        setLogs(prev => [...prev, `✅ Link saved to ${targetNode.name}`]);

                        // DELEGATED SIGNING: If we are on a remote node, use our LOCAL node to sign on-chain
                        if (targetNode.id !== 'local' && linkData.registrationParams) {
                            setLogs(prev => [...prev, `⛓️ Requesting Local Node to sign on-chain...`]);
                            try {
                                const regRes = await fetch(`${DEFAULT_NODE.url}/api/links/register-on-chain`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-auth-token': ManagedWalletProvider.getAuthToken() || ''
                                    },
                                    body: JSON.stringify(linkData.registrationParams)
                                });
                                if (regRes.ok) {
                                    const regData = await regRes.json();
                                    setLogs(prev => [...prev, `✅ Blockchain Ownership Secured! TX: ${regData.txHash}`]);
                                } else {
                                    const err = await regRes.json();
                                    setLogs(prev => [...prev, `⚠️ Local registration failed: ${err.error}`]);
                                }
                            } catch (e) {
                                setLogs(prev => [...prev, `⚠️ Could not reach Local Node for signing.`]);
                            }
                        } else if (linkData.txHash) {
                            // This part might be reached if we are on local node and it happened to have gas/auto-register
                            setLogs(prev => [...prev, `⛓️ Blockchain Ownership Registered! TX: ${linkData.txHash}`]);
                        }
                    }

                    setStatus('done');
                    onLinkCreated();
                } else {
                    throw new Error(`Upload failed: ${xhr.statusText}`);
                }
            };

            xhr.onerror = () => {
                throw new Error("Network Error. Is the selected Node running?");
            };

            xhr.send(selectedFile);

        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, `Error: ${(e as Error).message}`]);
            setStatus('error');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-purple-500/30 relative">
            {!isConnected && (
                <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-300 font-bold mb-2">Earn rewards for hosting!</p>
                    <p className="text-xs text-gray-400 mb-4">You must connect your wallet to upload content.</p>
                    <button
                        type="button"
                        onClick={connect}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transform hover:scale-105 transition-all"
                    >
                        🦊 Connect Wallet
                    </button>
                </div>
            )}

            <div className={!isConnected ? 'opacity-30 blur-[1px]' : ''}>
                <h3 className="font-bold text-lg text-purple-300 mb-2">⚡ Host Content</h3>

                {/* Node Selector instead of just Indicator */}
                <div className="text-xs mb-4 space-y-2">
                    <label className="block text-gray-500 font-bold uppercase">Target Node</label>
                    <select
                        value={targetNode.id}
                        onChange={(e) => {
                            const node = availableNodes.find(n => n.id === e.target.value);
                            if (node) {
                                setTargetNode(node);
                                localStorage.setItem('active_wara_node', JSON.stringify(node));
                            }
                        }}
                        className="w-full bg-gray-900 border border-gray-700 text-purple-400 font-bold p-2 rounded outline-none focus:border-purple-500"
                    >
                        {availableNodes.map(node => (
                            <option key={node.id} value={node.id}>
                                {node.id === 'local' ? '💻' : '☁️'} {node.name} ({node.url})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-4">

                    {/* Optional Custom Title */}
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
                            Link Title (Optional)
                        </label>
                        <div className="flex rounded-md shadow-sm">
                            {mediaType === 'tv' && season && episode && (
                                <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg select-none">
                                    S{season}E{episode} -
                                </span>
                            )}
                            <input
                                type="text"
                                placeholder={mediaType === 'tv' ? (episodeName || title) : title}
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                disabled={status !== 'idle'}
                                className={`flex-1 bg-gray-900 border border-gray-700 text-white text-sm p-2.5 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 outline-none
                                    ${(mediaType === 'tv' && season && episode) ? 'rounded-r-lg' : 'rounded-lg'}
                                `}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
                                Quality
                            </label>
                            <select
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-2.5 rounded-lg focus:ring-purple-500 outline-none"
                            >
                                <option value="480p">480p (SD)</option>
                                <option value="720p">720p (HD)</option>
                                <option value="1080p">1080p (Full HD)</option>
                                <option value="1440p">1440p (2K)</option>
                                <option value="2160p">2160p (4K)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
                                Audio Language
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-2.5 rounded-lg focus:ring-purple-500 outline-none"
                            >
                                <option value="es">Español (Latino/EE)</option>
                                <option value="en">English (Original)</option>
                                <option value="fr">French</option>
                                <option value="pt">Portuguese</option>
                                <option value="it">Italian</option>
                                <option value="de">German</option>
                                <option value="jp">Japanese</option>
                                <option value="multi">Multi-Audio</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
                                Summary
                            </label>
                            <input
                                type="text"
                                placeholder="Short description..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-2.5 rounded-lg focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Select Video File</label>
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            disabled={status === 'uploading' || status === 'processing' || !isConnected}
                            className="block w-full text-sm text-gray-400
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-full file:border-0
                              file:text-sm file:font-semibold
                              file:bg-purple-600 file:text-white
                              file:cursor-pointer hover:file:bg-purple-700
                            "
                        />
                    </div>

                    {status === 'idle' && selectedFile && (
                        <button
                            onClick={handlePublish}
                            disabled={!isConnected}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            🚀 Encrypt & Host Now
                        </button>
                    )}

                    {status === 'uploading' && (
                        <div className="space-y-2">
                            <div className="text-blue-400 text-sm font-bold">Transferring to {targetNode.name}... {uploadProgress}%</div>
                            <div className="w-full bg-gray-900 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="text-yellow-400 text-sm animate-pulse">Processing Encryption... Please wait...</div>
                    )}

                    {status === 'done' && (
                        <div className="text-green-400 text-sm font-bold">Hosted successfully! Database updated.</div>
                    )}

                    {status === 'error' && (
                        <div className="text-red-400 text-sm font-bold">Failed. Check logs.</div>
                    )}

                    {logs.length > 0 && (
                        <div className="bg-black/50 p-2 rounded text-xs font-mono text-gray-400 max-h-32 overflow-y-auto mt-2">
                            {logs.map((L, i) => <div key={i}>{L}</div>)}
                        </div>
                    )}

                    {/* Subtitle Section - Only appears after successful upload */}
                    {status === 'done' && lastLinkId && (
                        <div className="mt-6 border-t border-purple-500/30 pt-4">
                            <h4 className="text-sm font-bold text-gray-300 mb-2">Add Subtitles (Optional)</h4>
                            <div className="flex gap-2">
                                <select className="bg-gray-700 text-xs text-white p-2 rounded" id="subLang">
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="jp">Japanese</option>
                                </select>
                                <input
                                    type="file"
                                    accept=".vtt,.srt"
                                    id="subFile"
                                    className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-gray-600 file:text-white file:border-0"
                                />
                                <button
                                    onClick={() => {
                                        const fileInput = document.getElementById('subFile') as HTMLInputElement;
                                        const langSelect = document.getElementById('subLang') as HTMLSelectElement;
                                        const file = fileInput.files?.[0];
                                        if (file) handleSubtitleUpload(file, langSelect.value);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded"
                                >
                                    Upload Track
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

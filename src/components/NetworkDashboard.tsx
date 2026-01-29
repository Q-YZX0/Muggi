'use client';
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/node-helpers';

export default function NetworkDashboard({ activeNodeUrl }: { activeNodeUrl: string }) {
    const [peerUrl, setPeerUrl] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [tmdbKey, setTmdbKey] = useState('');
    const [tmdbLoading, setTmdbLoading] = useState(false);
    const [tmdbMessage, setTmdbMessage] = useState('');

    const [peerName, setPeerName] = useState('');
    const [peerEndpoint, setPeerEndpoint] = useState('');
    const [peerLoading, setPeerLoading] = useState(false);
    const [peerMessage, setPeerMessage] = useState('');

    useEffect(() => {
        // Load current TMDB key from node
        fetch(getApiUrl('/api/catalog/tmdb-key'))
            .then(res => res.json())
            .then(data => setTmdbKey(data.apiKey || ''))
            .catch(console.error);
    }, []);

    const log = (msg: string) => setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const handleSync = async () => {
        if (!peerUrl) return;
        setLoading(true);
        log(`Connecting to peer: ${peerUrl}...`);

        try {
            // This pulls FROM a remote peer INTO the local database
            const res = await fetch(`${peerUrl}/api/catalog`); // Sync usually starts with catalog
            if (!res.ok) throw new Error(`Peer error: ${res.status}`);

            const json = await res.json();
            log(`Fetched catalog from peer.`);

            const adminKey = localStorage.getItem('muggi_admin_key') || '';

            log(`Importing to local database...`);
            const localRes = await fetch(getApiUrl('/api/network/sync'), { // Using network/sync
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminKey}`
                },
                body: JSON.stringify({ data: json.data })
            });
            const localJson = await localRes.json();
            log(`Success! Sync process started.`);
        } catch (e) {
            log(`Error: ${(e as Error).message}`);
        }
        setLoading(false);
    };

    const handleSaveTmdbKey = async () => {
        setTmdbLoading(true);
        setTmdbMessage('');
        try {
            const res = await fetch(getApiUrl('/api/catalog/tmdb-key'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: tmdbKey })
            });
            const data = await res.json();
            if (data.success) {
                setTmdbMessage('✅ API Key saved! Restart WaraNode to apply.');
            } else {
                setTmdbMessage('❌ ' + (data.error || 'Failed to save'));
            }
        } catch (e: any) {
            setTmdbMessage('❌ ' + e.message);
        } finally {
            setTmdbLoading(false);
        }
    };

    const handleAddPeer = async () => {
        if (!peerName || !peerEndpoint) return;
        setPeerLoading(true);
        setPeerMessage('');

        const adminKey = localStorage.getItem('muggi_admin_key') || '';

        try {
            const res = await fetch(getApiUrl('/api/network/peer'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminKey}`
                },
                body: JSON.stringify({
                    name: peerName,
                    endpoint: peerEndpoint
                })
            });
            const data = await res.json();

            if (data.success) {
                setPeerMessage(`✅ Peer "${peerName}" added successfully!`);
                setPeerName('');
                setPeerEndpoint('');
            } else {
                setPeerMessage('❌ ' + (data.error || 'Failed to add peer'));
            }
        } catch (e: any) {
            setPeerMessage('❌ ' + e.message);
        } finally {
            setPeerLoading(false);
        }
    };

    return (
        <div className="space-y-6 mt-12 pt-12 border-t border-gray-800">
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Global Network Configuration</h3>
                <p className="text-gray-400 text-sm">Manage P2P peering and discovery services for the entire Muggi network.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Peer Discovery / Sync */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>🔄</span> P2P Catalog Pull
                    </h4>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={peerUrl}
                            onChange={e => setPeerUrl(e.target.value)}
                            placeholder="Remote Muggi Address (http://ip:3000)"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                        />
                        <button
                            onClick={handleSync}
                            disabled={loading || !peerUrl}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Pulsing Peer...' : '📥 Import Catalog from Peer'}
                        </button>
                        <div className="bg-black/50 p-3 rounded-lg font-mono text-[10px] text-green-400 h-32 overflow-y-auto border border-gray-800">
                            {logs.length === 0 ? "Network gossip waiting..." : logs.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                </div>

                {/* Add Peer Manually */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>🌐</span> Gossip Peering
                    </h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Alias"
                                value={peerName}
                                onChange={e => setPeerName(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white outline-none"
                            />
                            <input
                                type="text"
                                placeholder="http://ip:21746"
                                value={peerEndpoint}
                                onChange={e => setPeerEndpoint(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddPeer}
                            disabled={peerLoading || !peerName || !peerEndpoint}
                            className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 font-bold py-2 rounded-lg transition-all"
                        >
                            {peerLoading ? 'Adding...' : '➕ Add Peer to Gossip Pool'}
                        </button>
                        {peerMessage && <p className="text-xs text-center text-gray-400">{peerMessage}</p>}
                    </div>
                </div>

                {/* TMDB Key */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 md:col-span-2">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>🎬</span> Metadata Provider (TMDB)
                    </h4>
                    <div className="flex gap-4">
                        <input
                            type="password"
                            value={tmdbKey}
                            onChange={(e) => setTmdbKey(e.target.value)}
                            placeholder="TMDB API Key"
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white outline-none"
                        />
                        <button
                            onClick={handleSaveTmdbKey}
                            disabled={tmdbLoading || !tmdbKey}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg transition-all"
                        >
                            {tmdbLoading ? 'Saving...' : 'Save Key'}
                        </button>
                    </div>
                    {tmdbMessage && <p className="text-xs mt-2 text-blue-400">{tmdbMessage}</p>}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function AdsManagerPage() {
    const [wallet, setWallet] = useState<string>('');
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Create Form State
    const [showCreate, setShowCreate] = useState(false);
    const [budget, setBudget] = useState('10');
    const [duration, setDuration] = useState<number>(0);
    const [file, setFile] = useState<File | null>(null);
    const [videoHash, setVideoHash] = useState('');
    const [category, setCategory] = useState({ id: 0, name: 'General' });

    // Estimates
    const [estimatedViews, setEstimatedViews] = useState('0');
    const [costPerView, setCostPerView] = useState('0');

    // Video Duration Helper
    const videoRef = useRef<HTMLVideoElement>(null);

    const categories = [
        { id: 0, name: 'General' },
        { id: 1, name: 'Tech' },
        { id: 2, name: 'DeFi' },
        { id: 3, name: 'Gaming' },
        { id: 4, name: 'Lifestyle' },
        { id: 5, name: 'Adult (Restricted)' }
    ];

    // Helper to get active node URL
    const getApiUrl = (path: string) => {
        let baseUrl = 'http://localhost:21746';
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('active_wara_node');
                if (stored) {
                    const node = JSON.parse(stored);
                    if (node.url) baseUrl = node.url;
                }
            } catch (e) { }
        }
        return `${baseUrl.replace(/\/$/, '')}${path}`;
    };

    useEffect(() => {
        // Correctly load session from WalletProvider storage
        const address = localStorage.getItem('muggi_address');
        const token = localStorage.getItem('muggi_token');

        if (address && token) {
            setWallet(address);
            fetchCampaigns(address);
        } else {
            // Optional: Redirect to login or show instruction
            console.log("No active session found");
        }
    }, []);

    // Calculate Estimates when Budget or Duration changes
    useEffect(() => {
        if (duration > 0 && budget) {
            calculateEstimates();
        }
    }, [budget, duration]);

    const calculateEstimates = async () => {
        try {
            const res = await fetch(getApiUrl(`/api/ads/cost?duration=${duration}`));
            const data = await res.json();
            if (data.cost) {
                const cost = parseFloat(data.cost);
                const budg = parseFloat(budget);
                const views = cost > 0 ? Math.floor(budg / cost) : 0;
                setCostPerView(cost.toFixed(4));
                setEstimatedViews(views.toLocaleString());
            }
        } catch (e) { }
    };

    const fetchCampaigns = async (addr: string) => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/ads/my-campaigns?wallet=${addr}`));
            const data = await res.json();
            if (Array.isArray(data)) {
                setCampaigns(data);
            } else if (data && Array.isArray(data.campaigns)) {
                setCampaigns(data.campaigns);
            } else {
                setCampaigns([]);
            }
        } catch (e) {
            console.error(e);
            setCampaigns([]);
        }
        setLoading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);

            // Read duration
            const url = URL.createObjectURL(f);
            if (videoRef.current) {
                videoRef.current.src = url;
            }
        }
    };

    const onVideoLoaded = () => {
        if (videoRef.current) {
            const raw = videoRef.current.duration;
            const rounded = Math.ceil(raw);
            setDuration(rounded);

            if (rounded < 5 || rounded > 45) {
                alert(`Video length (${rounded}s) invalid. Must be between 5s and 45s.`);
                setFile(null);
                setDuration(0);
            }
        }
    };

    const handleUploadAndCreate = async () => {
        if (!wallet) return alert("Not authenticated. Please login to Node.");
        if (!file) return alert("Please select a video file.");
        if (duration === 0) return alert("Invalid duration.");

        setLoading(true);
        try {
            // 1. Upload File to Node (POST /api/upload)
            // Note: Assuming a simple multipart upload endpoint exists or we mock the hash for now if strictly P2P
            // For MVP integration, let's use FormData
            const formData = new FormData();
            formData.append('file', file);

            // OPTIONAL: If your upload endpoint is different, adjust here.
            // Using a generic upload handler that returns IPFS Hash / ID
            const uploadRes = await fetch(getApiUrl('/api/upload'), { // Ensure this endpoint exists
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();
            const finalHash = uploadData.hash || uploadData.cid;

            if (!finalHash) throw new Error("No hash returned from upload");

            // 2. Create Campaign on Chain via Node Wallet
            const res = await fetch(getApiUrl('/api/ads/create'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet,
                    budget,
                    duration,
                    videoHash: finalHash,
                    category: category.id
                })
            });
            const data = await res.json();

            if (data.success) {
                alert("Campaign Created Successfully!");
                setShowCreate(false);
                setFile(null);
                fetchCampaigns(wallet);
            } else {
                alert("Creation Error: " + data.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        }
        setLoading(false);
    };

    const handleAction = async (action: 'cancel' | 'toggle-pause' | 'topup', id: number, amount?: string) => {
        if (action === 'cancel' && !confirm("Warning: This will refund remaining budget and stop the ad permanently. Continue?")) return;

        setLoading(true);
        try {
            const endpoint = getApiUrl(`/api/ads/${action}`);
            const body: any = { wallet, id };
            if (action === 'topup') body.amount = amount;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                if (action === 'toggle-pause') alert("Status updated.");
                else alert("Success!");
                fetchCampaigns(wallet);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Action Failed");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Head>
                <title>Ads Manager | Muggi</title>
            </Head>

            {/* Hidden Video for Metadata Extraction */}
            <video ref={videoRef} className="hidden" onLoadedMetadata={onVideoLoaded} />

            <div className="max-w-6xl mx-auto p-6">
                <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Ads Manager
                    </h1>
                    {wallet && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold transition shadow-lg shadow-yellow-500/20"
                        >
                            + New Campaign
                        </button>
                    )}
                </header>

                {loading && <div className="text-center py-4 text-yellow-500 font-mono animate-pulse">Processing... Please wait.</div>}

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl relative">
                            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                            <h2 className="text-2xl font-bold mb-6">Create New Ad</h2>

                            <div className="space-y-6">
                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Upload Video (Min 5s, Max 45s)</label>
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-yellow-500 transition bg-gray-900/50">
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="video-upload"
                                        />
                                        <label htmlFor="video-upload" className="cursor-pointer block w-full h-full">
                                            {file ? (
                                                <div className="text-green-400 font-bold">
                                                    {file.name} <br />
                                                    <span className="text-xs text-gray-400 font-normal">
                                                        Detected Duration: {duration}s
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">Click to Select Video File</span>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Budget (WARA)</label>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={e => setBudget(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-yellow-500 outline-none font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Duration</label>
                                        <div className="w-full bg-gray-700/50 border border-gray-700 p-3 rounded text-gray-300 cursor-not-allowed">
                                            {duration > 0 ? `${duration} seconds` : "Waiting for file..."}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setCategory(c)}
                                                className={`px-3 py-1 rounded text-sm transition border ${category.id === c.id ? 'bg-yellow-500 text-black border-yellow-500 font-bold' : 'bg-transparent border-gray-600 text-gray-300 hover:border-gray-400'}`}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ESTIMATION BOX */}
                                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Cost per View:</span>
                                        <span className="font-mono text-white">{costPerView} WARA</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-yellow-400 mt-1">
                                        <span>Est. Views:</span>
                                        <span>≈ {estimatedViews} Users</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-4">
                                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium">Cancel</button>
                                <button
                                    onClick={handleUploadAndCreate}
                                    disabled={!file || duration < 5 || duration > 45}
                                    className={`flex-1 py-3 rounded-lg font-bold shadow-lg ${(!file || duration < 5 || duration > 45) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20'}`}
                                >
                                    Launch Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Campaigns Table */}
                <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-800 shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800 text-gray-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">ID / Hash</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Budget / Performance</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {campaigns.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-gray-500">
                                    No campaigns found. <br />
                                    <button onClick={() => setShowCreate(true)} className="text-yellow-500 hover:underline mt-2">Create your first ad</button>
                                </td></tr>
                            ) : campaigns.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-800/30 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-white">#{c.id}</div>
                                        <div className="text-xs text-gray-500 font-mono truncate w-32" title={c.campaign.videoHash}>
                                            {c.campaign.videoHash.substring(0, 10)}...
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {c.campaign.active ? (
                                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs border border-green-500/30 font-bold">ACTIVE</span>
                                        ) : c.campaign.viewsRemaining === 0 ? (
                                            <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs border border-gray-600">COMPLETED</span>
                                        ) : (
                                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs border border-red-500/30 font-bold">PAUSED</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-yellow-400 font-mono font-bold">{parseFloat(c.campaign.budgetMUGGI).toFixed(2)} WARA</div>
                                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                            <span className="bg-gray-700 px-1.5 rounded">{c.campaign.viewsRemaining} views left</span>
                                            <span className="text-gray-600">•</span>
                                            <span>{c.campaign.duration}s</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300 border border-gray-600">
                                            {categories[c.campaign.category]?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleAction('toggle-pause', c.id)}
                                            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition border border-gray-600"
                                            title="Pause/Resume Campaign"
                                        >
                                            {c.campaign.active ? 'Pause' : 'Resume'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const amt = prompt("Amount to add (WARA):", "10");
                                                if (amt) handleAction('topup', c.id, amt);
                                            }}
                                            className="text-xs bg-green-900/40 hover:bg-green-800 text-green-400 border border-green-800 px-3 py-1.5 rounded transition"
                                        >
                                            Top Up
                                        </button>
                                        <button
                                            onClick={() => handleAction('cancel', c.id)}
                                            className="text-xs bg-red-900/40 hover:bg-red-800 text-red-400 border border-red-800 px-3 py-1.5 rounded transition"
                                            title="Cancel & Refund Remaining Budget"
                                        >
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

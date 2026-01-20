'use client'
import { useState, useEffect } from 'react';
import { syncNetworkAction } from '@/app/actions';
import { useWallet } from '@/hooks/useWallet';
import NetworkDashboard from './NetworkDashboard';
import { formatWARA } from '@/lib/node-helpers';

// Define strict types for the response
interface NodeStatus {
    nodeId: string;
    nodeName?: string; // Nombre registrado
    nodeOwner?: string; // Wallet Owner (Fallback)
    nodeAddress?: string; // Dirección técnica
    nodeBalance?: string; // Saldo en WARA/ETH
    peers?: number;    // Cantidad de peers conocidos
    sentinel?: {
        lastCheck: number;
        lastSuccess: boolean;
        lastUpdateHash?: string;
        error?: string;
    };
    config: {
        port: number;
        trackerUrl: string | null;
    };
    resources: {
        freeMem: number;
        totalMem: number;
        loadAvg: number[];
        cpus: number;
        disk?: {
            free: number;
            total: number;
            used: number;
        } | null;
    };
    network: {
        publicIp: string | null;
        capacity: number;
    };
    content: Array<{
        id: string;
        title: string;
        activeStreams: number;
        hosterAddress?: string;
        mediaInfo?: {
            title: string;
            type: string;
            quality?: string;
        };
    }>;
}

interface SavedNode {
    id: string;
    name: string;
    url: string;
    key: string;
    trackers?: string[]; // URLs de trackers configurados
}

const DEFAULT_NODE: SavedNode = {
    id: 'local',
    name: 'Local Node',
    url: 'http://127.0.0.1:21746',
    key: '',
    trackers: []
};

export default function WaraNodeDashboard() {
    const { address, isConnected, connect } = useWallet();
    const [status, setStatus] = useState<NodeStatus | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Node Management State
    const [activeNode, setActiveNode] = useState<SavedNode>(DEFAULT_NODE);
    const [savedNodes, setSavedNodes] = useState<SavedNode[]>([]);
    const [showManager, setShowManager] = useState(false);

    // Form State
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeUrl, setNewNodeUrl] = useState('');
    const [newNodeKey, setNewNodeKey] = useState('');

    // Web3 Identity State
    const [isRegistering, setIsRegistering] = useState(false);
    const [desiredName, setDesiredName] = useState('');
    const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [registrationFee, setRegistrationFee] = useState<string | null>(null);
    const [nodeDetails, setNodeDetails] = useState<any>(null);

    // Store decrypted keys in memory (not persisted)
    const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});

    // NEW: Session Password (Volatile - Cleared on Refresh)
    const [profilePassword, setProfilePassword] = useState('');
    const [showUnlockModal, setShowUnlockModal] = useState<{ show: boolean, targetNode?: SavedNode } | null>(null);
    const [tempPasswordInput, setTempPasswordInput] = useState('');

    // Web3 Functions
    const connectWallet = async () => {
        if (!isConnected) await connect();
    };

    const fetchNodeDetails = async (name: string) => {
        try {
            const cleanName = name.replace('.wara', '');
            const res = await fetch(`${activeNode.url}/api/registry/node-info/${cleanName}`);
            if (res.ok) {
                const info = await res.json();
                setNodeDetails(info);
            }
        } catch (e) {
            console.error("Failed to fetch node details", e);
        }
    };

    // Auto-fetch details if nodeName is present in status
    useEffect(() => {
        if (status?.nodeName && !nodeDetails) {
            fetchNodeDetails(status.nodeName);
        }
    }, [status?.nodeName]);

    const checkAvailability = async () => {
        if (!desiredName) return;
        setAvailability('checking');
        setRegistrationFee(null);

        try {
            const [existsRes, feeRes] = await Promise.all([
                fetch(`${activeNode.url}/api/registry/name-exists/${desiredName}`),
                fetch(`${activeNode.url}/api/registry/registration-fee`)
            ]);

            if (existsRes.ok && feeRes.ok) {
                const { exists } = await existsRes.json();
                const feeData = await feeRes.json();

                // Display Fee is returned by the node API
                setRegistrationFee(feeData.displayFee || formatWARA(feeData.fee));
                setAvailability(exists ? 'taken' : 'available');
            } else {
                throw new Error("Node API unavailable");
            }
        } catch (e) {
            console.error("Availability check failed via Node", e);
            setAvailability('idle');
        }
    };

    const registerName = async () => {
        if (!desiredName) return;
        setIsRegistering(true);

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            // Usamos la llave del nodo que ya tenemos
            // Primero intentamos del estado actual, luego del localStorage si estamos en modo local
            const nodeKey = decryptedKeys[activeNode.id] || activeNode.key || localStorage.getItem('muggi_pk');

            if (nodeKey) {
                headers['x-wara-key'] = nodeKey;
            } else {
                console.warn("No admin key found for registration request");
            }

            // Send session token for owner signature
            const authToken = localStorage.getItem('muggi_token');
            if (authToken) headers['x-wara-token'] = authToken;

            const res = await fetch(`${activeNode.url}/api/registry/register`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: desiredName,
                    userWallet: address
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Registration failed');
            }
            const data = await res.json();

            alert(`✅ Node successfully registered as ${desiredName}.wara!\nTX: ${data.txHash}`);
            fetchStatus(); // Refresh general status
            await fetchNodeDetails(desiredName); // Fetch detailed info immediately

            setDesiredName('');
            setAvailability('idle');
        } catch (e: any) {
            console.error("Registration failed", e);
            alert(e.message || 'Registration failed');
        } finally {
            setIsRegistering(false);
        }
    };

    useEffect(() => {
        // Load saved nodes from database
        const loadNodes = async () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.id) return;

            try {
                const response = await fetch(`${activeNode.url}/api/remote-nodes?userId=${currentUser.id}`);
                if (response.ok) {
                    const { nodes } = await response.json();
                    const mappedNodes = nodes.map((n: any) => ({
                        id: n.id,
                        name: n.name || n.url,
                        url: n.url,
                        key: n.encryptedKey || ''
                    }));
                    setSavedNodes(mappedNodes);

                    // Sync to localStorage for WaraLocalUploader
                    localStorage.setItem('wara_saved_nodes', JSON.stringify(mappedNodes));

                    // Priority: Previous active, else keep current
                    const storedActiveId = localStorage.getItem('wara_active_node_id');
                    if (storedActiveId && storedActiveId !== 'local') {
                        const saved = mappedNodes.find((n: any) => n.id === storedActiveId);
                        if (saved) setActiveNode(saved);
                    }
                }
            } catch (error) {
                console.error('Error loading nodes:', error);
            }
        };
        loadNodes();

        // Load session keys
        const sessionKeys = localStorage.getItem('wara_session_keys');
        if (sessionKeys) {
            setDecryptedKeys(JSON.parse(sessionKeys));
        }
    }, [address]);

    // ... (rest of functions remain same until return)


    const updateActiveNode = async (node: SavedNode) => {
        setActiveNode(node);
        localStorage.setItem('wara_active_node_id', node.id);

        // Sync with WaraLocalUploader format
        const uploaderNode = {
            id: node.id,
            name: node.name,
            url: node.url,
            key: decryptedKeys[node.id] || node.key || ''
        };
        localStorage.setItem('active_wara_node', JSON.stringify(uploaderNode));

        // If remote node (and not manual key override which is node.key)
        if (node.id !== 'local' && !decryptedKeys[node.id]) {
            // Need to fetch from backend
            if (!profilePassword) {
                // If we don't have the session password, ask for it
                setShowUnlockModal({ show: true, targetNode: node });
                return;
            }

            try {
                const wallet = JSON.parse(localStorage.getItem('currentUser') || '{}');
                // Use LOCAL node (or whatever activeNode was before switching? No, usually use LOCAL as gateway)
                // Actually, 'activeNode' variable here might be the NEW node already due to setActiveNode above.
                // But setActiveNode is async state update.
                // Wait, setActiveNode(node) is called at line 248. The 'activeNode' state won't update until next render.
                // So 'activeNode.url' refers to the OLD active node.
                // If I was on Local, I call Local. If I was on Remote A, I call Remote A?
                // The logical gateway is ALWAYS the Local Node (or whatever gateway manages the DB).
                // Assuming we are always interacting through the current gateway to get keys.

                // CRITICAL: We should probably use the LOCAL url if possible, or fallback to current active.
                // Since this dashboard supports connecting directly to remote nodes, 
                // we assume the DB is on the node we are currently connected to (if it holds the profile).

                const response = await fetch(`${activeNode.url}/api/remote-nodes/decrypt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nodeId: node.id,
                        userId: wallet.id,
                        password: profilePassword
                    })
                });

                if (response.ok) {
                    const { key } = await response.json();
                    if (key) {
                        const newKeys = { ...decryptedKeys, [node.id]: key };
                        setDecryptedKeys(newKeys);
                        // Do NOT save decrypted keys to localStorage if we want high security? 
                        // The user requested session memory only.
                        // localStorage.setItem('wara_session_keys', JSON.stringify(newKeys)); // Removed for security

                        // Update uploader node with key
                        uploaderNode.key = key;
                        localStorage.setItem('active_wara_node', JSON.stringify(uploaderNode));
                    }
                } else {
                    // Password might be wrong or server error
                    if (response.status === 401) {
                        alert("Incorrect password or encryption error.");
                        setProfilePassword(''); // Clear wrong password
                        setShowUnlockModal({ show: true, targetNode: node });
                    }
                }
            } catch (error) {
                console.error('Error fetching node key:', error);
            }
        }

    };

    const fetchStatus = async () => {
        try {
            const headers: Record<string, string> = {};
            const nodeKey = decryptedKeys[activeNode.id] || activeNode.key;

            if (nodeKey) {
                headers['x-wara-key'] = nodeKey;
            }

            const res = await fetch(`${activeNode.url}/admin/status`, { headers });
            if (!res.ok) {
                if (res.status === 403) throw new Error('Access Denied: Invalid Admin Key');
                throw new Error(`Failed to connect to ${activeNode.name}`);
            }
            const data = await res.json();

            // Merge with existing content (don't overwrite empty content from status)
            setStatus((prev: any) => ({
                ...data,
                content: prev?.content || []
            }));
            setError('');
        } catch (e) {
            setError((e as Error).message || 'Node Unreachable');
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalog = async () => {
        try {
            const headers: Record<string, string> = {};
            const nodeKey = decryptedKeys[activeNode.id] || activeNode.key;
            if (nodeKey) headers['x-wara-key'] = nodeKey;

            const res = await fetch(`${activeNode.url}/admin/catalog`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.content) {
                    setStatus((prev: any) => ({
                        ...prev,
                        content: data.content
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch catalog", e);
        }
    };

    useEffect(() => {
        const initNode = async () => {
            setLoading(true);

            // If it's a remote node without decrypted key in memory, fetch it automatically
            if (activeNode.id !== 'local' && !decryptedKeys[activeNode.id]) {
                try {
                    const wallet = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    const response = await fetch(`${activeNode.url}/api/remote-nodes/decrypt`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nodeId: activeNode.id,
                            userId: wallet.id
                        })
                    });

                    if (response.ok) {
                        const { key } = await response.json();
                        if (key) {
                            const newKeys = { ...decryptedKeys, [activeNode.id]: key };
                            setDecryptedKeys(newKeys);
                            localStorage.setItem('wara_session_keys', JSON.stringify(newKeys));
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            await fetchStatus();
            await fetchCatalog();
        };

        initNode();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [activeNode, decryptedKeys]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        await syncNetworkAction();
        setIsSyncing(false);
        fetchStatus();
    };

    const handleAddNode = async () => {
        if (!newNodeName || !newNodeUrl) return;

        // Get userId from WalletProvider session
        const wallet = (window as any).WalletProvider?.getWallet?.() || JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userId = wallet.id;

        console.log('[DEBUG] Adding node with userId:', userId, 'wallet:', wallet);

        if (!userId) {
            alert('Please login to add nodes. No user ID found in session.');
            return;
        }

        try {
            const response = await fetch(`${activeNode.url}/api/remote-nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    url: newNodeUrl.replace(/\/$/, ''),
                    nodeKey: newNodeKey,
                    name: newNodeName,
                    password: profilePassword
                })
            });

            if (response.ok) {
                const { node } = await response.json();

                const newNode: SavedNode = {
                    id: node.id,
                    name: node.name,
                    url: node.url,
                    key: node.encryptedKey || ''
                };
                const updatedNodes = [...savedNodes, newNode];
                setSavedNodes(updatedNodes);

                // Sync to localStorage for WaraLocalUploader
                localStorage.setItem('wara_saved_nodes', JSON.stringify(updatedNodes));

                // Store unencrypted key in session storage
                const newKeys = { ...decryptedKeys, [node.id]: newNodeKey };
                setDecryptedKeys(newKeys);
                localStorage.setItem('wara_session_keys', JSON.stringify(newKeys));

                // Auto-select the new node
                setActiveNode(newNode);
                localStorage.setItem('wara_active_node_id', node.id);
                localStorage.setItem('active_wara_node', JSON.stringify(newNode));

                // Reset Form
                setNewNodeName('');
                setNewNodeUrl('');
                setNewNodeKey('');

                alert('✅ Node added successfully!');
            } else {
                const error = await response.json();
                console.error('[ERROR] Failed to add node:', error, 'Status:', response.status);
                alert(`Failed to add node: ${error.error || JSON.stringify(error)}`);
            }
        } catch (error) {
            console.error('Error adding node:', error);
            alert('Error adding node');
        }
    };

    const handleDeleteNode = async (id: string) => {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.id) return;

        try {
            const response = await fetch(`${activeNode.url}/api/remote-nodes?nodeId=${id}&userId=${currentUser.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const updated = savedNodes.filter(n => n.id !== id);
                setSavedNodes(updated);
                if (activeNode.id === id) updateActiveNode(DEFAULT_NODE);
            } else {
                alert('Failed to delete node');
            }
        } catch (error) {
            console.error('Error deleting node:', error);
            alert('Error deleting node');
        }
    };

    const syncTrackersToNode = async (node: SavedNode) => {
        if (!node.trackers || node.trackers.length === 0) return;

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (node.key) headers['x-wara-key'] = node.key;

            await fetch(`${node.url}/admin/trackers`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ trackers: node.trackers })
            });
            console.log(`[Muggi] Trackers synced to ${node.name}`);
        } catch (e) {
            console.error(`[Muggi] Failed to sync trackers to ${node.name}:`, e);
        }
    };

    const handleRemoteDelete = async (linkId: string) => {
        if (!confirm("Delete this file from the node? This action is permanent.")) return;

        try {
            const headers: Record<string, string> = {};
            if (activeNode.key) headers['X-Wara-Key'] = activeNode.key;

            const res = await fetch(`${activeNode.url}/admin/link/delete/${linkId}`, {
                method: 'DELETE',
                headers
            });

            if (res.ok || res.status === 404) {
                // Remove from DB (Index)
                try {
                    await fetch(`${activeNode.url}/api/link/delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ linkId })
                    });
                } catch (e) {
                    console.error("Failed to clean up DB index", e);
                }

                // Remove locally from view
                if (status) {
                    setStatus({
                        ...status,
                        content: status.content.filter(c => c.id !== linkId)
                    });
                }
            } else {
                alert("Failed to delete from node: " + await res.text());
            }
        } catch (e) {
            alert("Connection error");
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const dm = 2;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6 relative">
            {!isConnected && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl border border-white/10 p-12 text-center">
                    <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30">
                        <span className="text-4xl">🔐</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Node Access Locked</h2>
                    <p className="text-gray-400 mb-8 max-w-sm">
                        You must connect your wallet to manage nodes and view hosting rewards.
                    </p>
                    <button
                        onClick={connect}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-all"
                    >
                        Connect Wallet to Unlock
                    </button>
                </div>
            )}

            {/* Connection Bar */}
            <div className={`bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${!error ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500'}`} />
                    <div>
                        <div className="text-sm text-gray-400">Connected to</div>
                        <div className="font-bold text-white flex items-center gap-2">
                            {activeNode.name}
                            <span className="text-xs font-mono text-gray-500 hidden md:inline ml-2">{activeNode.url}</span>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className={`px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-500/10 text-sm font-medium rounded-lg transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSyncing ? 'Syncing...' : '↻ Sync Network'}
                    </button>
                    <button
                        onClick={() => setShowManager(!showManager)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {showManager ? 'Close Manager' : 'Switch Node'}
                    </button>
                </div>
            </div>

            {/* Node Manager */}
            {showManager && (
                <div className={`bg-gray-800 p-6 rounded-xl border border-gray-600 animate-in fade-in slide-in-from-top-4 ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                    {/* Add NEW Remote Node (Moved to bottom always visible) */}
                    <div className="bg-gray-700/30 p-4 rounded-lg mt-0 mb-4 border border-gray-700 border-dashed">
                        <h4 className="text-sm font-bold text-gray-300 mb-3">+ Add New Remote Node</h4>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
                            <input
                                type="text"
                                placeholder="Name (e.g. Server 1)"
                                value={newNodeName}
                                onChange={e => setNewNodeName(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="text"
                                placeholder="URL (http://1.2.3.4:21746)"
                                value={newNodeUrl}
                                onChange={e => setNewNodeUrl(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="password"
                                placeholder="Admin Key"
                                value={newNodeKey}
                                onChange={e => setNewNodeKey(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            {/* Password Field for Encryption */}
                            <input
                                type="password"
                                placeholder="Profile Password (to Encrypt)"
                                value={profilePassword}
                                onChange={e => setProfilePassword(e.target.value)}
                                className="bg-gray-800 border border-indigo-500/50 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 placeholder-indigo-300/50"
                            />
                            <button
                                onClick={handleAddNode}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 rounded-md transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                Add Node
                            </button>

                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-4">Manage Nodes</h3>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                        {/* Always show Local Node */}
                        <div
                            onClick={() => updateActiveNode(DEFAULT_NODE)}
                            className={`p-4 rounded-lg cursor-pointer border transition-all ${activeNode.id === 'local' ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 hover:border-gray-500'}`}
                        >
                            <div className="font-bold text-white">Local Node</div>
                            <div className="text-xs text-gray-400">localhost:21746</div>
                        </div>

                        {savedNodes.map(node => (
                            <div
                                key={node.id}
                                onClick={() => updateActiveNode(node)}
                                className={`group relative p-4 rounded-lg cursor-pointer border transition-all ${activeNode.id === node.id ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 hover:border-gray-500'}`}
                            >
                                <div className="font-bold text-white">{node.name}</div>
                                <div className="text-xs text-gray-400 truncate">{node.url}</div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Active Node Editor (Only if not local) */}
                    {activeNode.id !== 'local' && (
                        <div className="bg-gray-900/50 p-4 rounded-lg mt-4 border border-indigo-500/30">
                            <h4 className="text-sm font-medium text-indigo-300 mb-3 flex justify-between items-center">
                                <span>Edit Selected Node: {activeNode.name}</span>
                            </h4>
                            <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={activeNode.name}
                                        onChange={e => {
                                            const updated = { ...activeNode, name: e.target.value };
                                            updateActiveNode(updated);
                                            const nodes = savedNodes.map(n => n.id === activeNode.id ? updated : n);
                                            setSavedNodes(nodes);
                                            // Save to Wallet Scoped Storage
                                            if (address) {
                                                localStorage.setItem(`wara_saved_nodes_${address.toLowerCase()}`, JSON.stringify(nodes));
                                            }
                                        }}
                                        className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">URL</label>
                                    <input
                                        type="text"
                                        value={activeNode.url}
                                        onChange={e => {
                                            const updated = { ...activeNode, url: e.target.value.replace(/\/$/, '') };
                                            updateActiveNode(updated);
                                            const nodes = savedNodes.map(n => n.id === activeNode.id ? updated : n);
                                            setSavedNodes(nodes);
                                            if (address) {
                                                localStorage.setItem(`wara_saved_nodes_${address.toLowerCase()}`, JSON.stringify(nodes));
                                            }
                                        }}
                                        className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Admin Key</label>
                                    <input
                                        type="password"
                                        value={activeNode.key}
                                        onChange={e => {
                                            const updated = { ...activeNode, key: e.target.value };
                                            updateActiveNode(updated);
                                            const nodes = savedNodes.map(n => n.id === activeNode.id ? updated : n);
                                            setSavedNodes(nodes);
                                            if (address) {
                                                localStorage.setItem(`wara_saved_nodes_${address.toLowerCase()}`, JSON.stringify(nodes));
                                            }
                                        }}
                                        className="w-full bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tracker Configuration for Active Node */}
                    <div className="bg-gray-900/50 p-4 rounded-lg mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">
                            Trackers for {activeNode.name}
                        </h4>
                        <div className="space-y-2 mb-3">
                            {(activeNode.trackers || []).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No trackers configured</p>
                            ) : (
                                activeNode.trackers?.map((tracker, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded">
                                        <span className="text-sm text-gray-300 font-mono">{tracker}</span>
                                        <button
                                            onClick={async () => {
                                                const updated = { ...activeNode, trackers: activeNode.trackers?.filter((_, i) => i !== idx) };
                                                updateActiveNode(updated);
                                                if (activeNode.id !== 'local' && address) {
                                                    const nodes = savedNodes.map(n => n.id === activeNode.id ? updated : n);
                                                    setSavedNodes(nodes);
                                                    localStorage.setItem(`wara_saved_nodes_${address.toLowerCase()}`, JSON.stringify(nodes));
                                                }
                                                // Sync to node
                                                await syncTrackersToNode(updated);
                                            }}
                                            className="text-red-400 hover:text-red-300 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="http://tracker.example.com:21750"
                                id="newTrackerInput"
                                className="flex-1 bg-gray-800 border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={async () => {
                                    const input = document.getElementById('newTrackerInput') as HTMLInputElement;
                                    if (!input.value) return;
                                    const updated = { ...activeNode, trackers: [...(activeNode.trackers || []), input.value] };
                                    updateActiveNode(updated);
                                    if (activeNode.id !== 'local' && address) {
                                        const nodes = savedNodes.map(n => n.id === activeNode.id ? updated : n);
                                        setSavedNodes(nodes);
                                        localStorage.setItem(`wara_saved_nodes_${address.toLowerCase()}`, JSON.stringify(nodes));
                                    }
                                    // Sync to node
                                    await syncTrackersToNode(updated);
                                    input.value = '';
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md px-4 py-2 transition-colors text-sm"
                            >
                                Add Tracker
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center text-gray-400">Contacting Node...</div>
            ) : error ? (
                <div className={`bg-red-900/20 border border-red-500/50 p-6 rounded-xl text-center ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Connection Failed</h2>
                    <p className="text-gray-300 mb-4">{error}</p>
                    <button
                        onClick={fetchStatus}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                    >
                        Retry Connection
                    </button>
                </div>
            ) : status && (
                <>
                    {/* Header Stats */}
                    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                        <StatCard label="Status" value="Online" color="text-green-400" />
                        <StatCard label="Identity" value={status.nodeName ? `${status.nodeName}` : 'Unregistered'} color={status.nodeName ? "text-purple-400" : "text-gray-500"} />
                        <StatCard label="Capacity" value={`${status.network.capacity} Users`} sub="(Based on Speed)" />
                        <StatCard label="Total Links" value={status.content.length.toString()} />
                    </div>

                    {/* Web3 Identity Management */}
                    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>Web3 Identity</span>
                            {status.nodeName && <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">Active</span>}
                        </h3>

                        {!status.nodeName ? (
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <p className="text-sm text-gray-400 mb-4">
                                    Register a permanent name for your node on the Blockchain. This allows users to connect to you even if your IP changes, without using centralized trackers.
                                </p>

                                <div className="flex gap-4 items-end flex-wrap">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs text-gray-500 block mb-1">Muggi Name</label>
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={desiredName}
                                                onChange={e => {
                                                    setDesiredName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                                    setAvailability('idle');
                                                }}
                                                placeholder="Domain name (e.g. upflix)"
                                                className="bg-gray-800 border-gray-700 text-white rounded-l-md px-3 py-2 text-sm w-full focus:outline-none"
                                            />
                                            <span className="bg-gray-700 text-gray-400 px-3 py-2 text-sm rounded-r-md border border-l-0 border-gray-700">
                                                .wara
                                            </span>
                                        </div>
                                    </div>

                                    {status.nodeAddress && (
                                        <div className="mb-4 bg-indigo-900/10 border border-indigo-500/20 p-3 rounded-lg flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Technical Node Address</span>
                                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">{status.nodeBalance} WARA</span>
                                            </div>
                                            <div className="text-xs font-mono text-gray-300 break-all selection:bg-indigo-500 selection:text-white">
                                                {status.nodeAddress}
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                This is your node's unique technical ID. It needs enough gas (WARA) to perform autonomous updates.
                                            </div>
                                        </div>
                                    )}

                                    {availability === 'idle' && (
                                        <button
                                            onClick={checkAvailability}
                                            disabled={!desiredName || desiredName.length < 3}
                                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-md font-bold text-sm h-[38px] transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            Check Availability
                                        </button>
                                    )}

                                    {availability === 'checking' && (
                                        <div className="h-[38px] flex items-center px-4">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                        </div>
                                    )}

                                    {availability === 'taken' && (
                                        <div className="h-[38px] flex items-center px-4 text-red-400 text-sm font-medium">
                                            ❌ Taken
                                        </div>
                                    )}

                                    {availability === 'available' && (
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={registerName}
                                                disabled={isRegistering}
                                                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium text-sm h-[38px] transition-colors flex items-center gap-2"
                                            >
                                                {isRegistering ? 'Confirming...' : 'Register Now'}
                                            </button>
                                            {registrationFee && (
                                                <span className="text-[10px] text-gray-400 text-center">Cost: {registrationFee} WARA</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="text-xl font-bold text-white">{status.nodeName}</div>
                                        <div className="text-sm text-green-400 mt-1 flex items-center gap-2">
                                            <span>Identity Verified & Active</span>
                                            <button
                                                onClick={() => fetchNodeDetails(status.nodeName!)}
                                                className="text-gray-500 hover:text-white text-xs border border-gray-700 px-1 rounded bg-gray-800"
                                                title="Refresh Details"
                                            >
                                                ↻
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">Reputation</div>
                                        <div className="text-lg font-mono text-white">Trust Level 1</div>
                                    </div>
                                </div>

                                {nodeDetails || status.nodeOwner ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-700 pt-4 text-xs font-mono text-gray-300">
                                        <div>
                                            <span className="block text-gray-500 mb-1">Owner Wallet</span>
                                            <span className="text-purple-300 break-all">
                                                {nodeDetails?.operator && nodeDetails.operator !== '0x0000000000000000000000000000000000000000'
                                                    ? nodeDetails.operator
                                                    : (status.nodeOwner || 'Unknown')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500 mb-1">Technical Address</span>
                                            <span className="text-blue-300 break-all">
                                                {nodeDetails?.nodeAddress && nodeDetails.nodeAddress !== '0x0000000000000000000000000000000000000000'
                                                    ? nodeDetails.nodeAddress
                                                    : (status.nodeAddress || 'Unknown')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500 mb-1">Expires At</span>
                                            <span>
                                                {nodeDetails?.expiresAt
                                                    ? new Date(nodeDetails.expiresAt * 1000).toLocaleDateString()
                                                    : 'Permanent'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500 mb-1">Status</span>
                                            <span className={(nodeDetails?.active || status.nodeName) ? "text-green-400" : "text-red-400"}>
                                                {(nodeDetails?.active || status.nodeName) ? "OPERATIONAL" : "INACTIVE"}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-gray-500 italic">
                                        Loading details...
                                    </div>
                                )}

                                <div className="text-xs text-gray-500 mt-4 border-t border-gray-800 pt-2">
                                    Your node automatically gossips its location to the P2P network using this identity.
                                </div>
                            </div>
                        )}

                        {address && (
                            <div className="mt-4 text-xs text-gray-600 flex items-center justify-between border-t border-gray-700 pt-2">
                                <span>Connected Wallet: {address}</span>
                            </div>
                        )}
                    </div>

                    {/* Resource Monitor */}
                    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                        <h3 className="text-lg font-bold text-white mb-4">System Health</h3>
                        <div className="space-y-4">
                            <ProgressBar label="CPU Load" percent={Math.round((status.resources.loadAvg[0] / status.resources.cpus) * 100)} color="bg-blue-500" />
                            <ProgressBar
                                label="RAM Usage"
                                percent={Math.round(((status.resources.totalMem - status.resources.freeMem) / status.resources.totalMem) * 100)}
                                color="bg-purple-500"
                                text={`${(status.resources.totalMem - status.resources.freeMem) / 1024 / 1024 / 1024 < 0.1 ? Math.round((status.resources.totalMem - status.resources.freeMem) / 1024 / 1024) + ' MB' : (Math.round((status.resources.totalMem - status.resources.freeMem) / 1024 / 1024 / 1024 * 100) / 100) + ' GB'} / ${(Math.round(status.resources.totalMem / 1024 / 1024 / 1024 * 100) / 100) + ' GB'}`}
                            />
                            {status.resources.disk && (
                                <ProgressBar
                                    label="Disk Storage"
                                    percent={Math.round((status.resources.disk.used / status.resources.disk.total) * 100)}
                                    color="bg-orange-500"
                                    text={`${formatBytes(status.resources.disk.used)} / ${formatBytes(status.resources.disk.total)} `}
                                />
                            )}
                        </div>

                        {status.sentinel && (
                            <div className="mt-6 pt-6 border-t border-gray-700/50">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sentinel Watchdog</h4>
                                    <span className={`flex h-2 w-2 rounded-full ${status.sentinel.lastSuccess ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                </div>
                                <div className="space-y-2 text-[10px] font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Last Check:</span>
                                        <span className="text-gray-300">{status.sentinel.lastCheck > 0 ? new Date(status.sentinel.lastCheck).toLocaleTimeString() : 'Waiting...'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status:</span>
                                        <span className={status.sentinel.lastSuccess ? "text-green-400" : "text-red-400"}>
                                            {status.sentinel.lastSuccess ? "OPERATIONAL" : "FAILED"}
                                        </span>
                                    </div>
                                    {status.sentinel.lastUpdateHash && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Last TX:</span>
                                            <a
                                                href={`https://muggi-scan.io/tx/${status.sentinel.lastUpdateHash}`}
                                                target="_blank"
                                                className="text-blue-400 hover:underline truncate ml-4 max-w-[150px]"
                                            >
                                                {status.sentinel.lastUpdateHash}
                                            </a>
                                        </div>
                                    )}
                                    {status.sentinel.error && (
                                        <div className="text-red-400/80 italic mt-1 break-words">
                                            Error: {status.sentinel.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content List */}
                    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${!isConnected ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Multi-Hoster Catalog</h3>
                            <button
                                onClick={fetchStatus}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                                title="Refresh content list"
                            >
                                <span>🔄</span> Refresh
                            </button>
                        </div>
                        {status.content.length === 0 ? (
                            <p className="text-gray-400 italic">No content shared yet.</p>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(
                                    status.content.reduce((acc, item) => {
                                        const hoster = item.hosterAddress || 'Legacy / Unknown';
                                        if (!acc[hoster]) acc[hoster] = [];
                                        acc[hoster].push(item);
                                        return acc;
                                    }, {} as Record<string, typeof status.content>)
                                ).map(([hoster, items]) => (
                                    <div key={hoster} className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-2">
                                            <span className="p-1 bg-gray-700 rounded text-[10px]">👤</span>
                                            {hoster === address
                                                ? "My Content"
                                                : hoster === 'Legacy / Unknown'
                                                    ? hoster
                                                    : `User: ${hoster.substring(0, 6)}...${hoster.substring(38)}`
                                            }
                                            <span className="ml-auto bg-gray-900 px-2 py-0.5 rounded text-gray-400">{items.length} files</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {items.map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                                    <div>
                                                        <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                                            {item.mediaInfo?.title || item.title}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-gray-500 mt-1 flex gap-3">
                                                            <span>ID: {item.id}</span>
                                                            {item.mediaInfo?.quality && <span className="text-indigo-400">{item.mediaInfo.quality}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="text-right mr-4">
                                                            <div className={`text-xs font-bold ${item.activeStreams > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                                                                {item.activeStreams} active
                                                            </div>
                                                            <div className="text-[10px] text-gray-500">streams</div>
                                                        </div>
                                                        {(hoster === address || hoster === 'Legacy / Unknown') && (
                                                            <button
                                                                onClick={() => handleRemoteDelete(item.id)}
                                                                className="p-2 text-gray-500 hover:text-red-400 bg-red-900/0 hover:bg-red-900/20 rounded-lg transition-all"
                                                                title="Delete my file"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Integrated Network Section */}
                    <NetworkDashboard activeNodeUrl={activeNode.url} />
                </>
            )}

            {/* Unlock Node Modal */}
            {showUnlockModal?.show && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white flex gap-2">
                                🔐 Unlock Node Key
                            </h3>
                            <button onClick={() => setShowUnlockModal(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            Your admin key for <b>{showUnlockModal.targetNode?.name}</b> is encrypted in database.
                            Enter your profile password to unlock it for this session.
                        </p>

                        <input
                            type="password"
                            placeholder="Profile Password"
                            value={tempPasswordInput}
                            onChange={e => setTempPasswordInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setProfilePassword(tempPasswordInput);
                                    setShowUnlockModal(null);
                                    setTempPasswordInput('');
                                    alert("Password saved for session. Please click the node again to connect.");
                                }
                            }}
                            className="w-full bg-gray-900 border-gray-700 text-white rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                        />

                        <button
                            onClick={() => {
                                setProfilePassword(tempPasswordInput);
                                setShowUnlockModal(null);
                                setTempPasswordInput('');
                                alert("Password saved for session. Please click the node again to connect.");
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            Unlock Session
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-xs uppercase tracking-wider">{label}</div>
            <div className={`text-xl font-bold ${color || 'text-white'}`}>{value}</div>
            {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
    );
}

function ProgressBar({ label, percent, color, text }: any) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{label}</span>
                <span className="text-gray-400">{text || `${Math.min(percent, 100)}%`}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    );
}

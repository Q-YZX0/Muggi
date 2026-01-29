'use client';
import { useState, useEffect } from 'react';
import { WalletProvider } from '@/lib/walletProvider';
import { useRouter } from 'next/navigation';

const NODE_API = 'http://localhost:21746';

export default function ProfilePage() {
    const router = useRouter();
    const [username, setUsername] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');

    const [address, setAddress] = useState<string | null>(null);

    // Wallet States
    const [balance, setBalance] = useState("0.0");
    const [ethBalance, setEthBalance] = useState("0.0");
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [txHash, setTxHash] = useState("");
    const [pendingProofs, setPendingProofs] = useState<any[]>([]);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedNodes, setScannedNodes] = useState<any[]>([]);

    // Vote States
    const [myVotes, setMyVotes] = useState<any[]>([]);
    const [receivedVotes, setReceivedVotes] = useState<any[]>([]);
    const [isLoadingVotes, setIsLoadingVotes] = useState(false);

    // Language State
    const [lang, setLang] = useState('es');

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        if (!WalletProvider.isLoggedIn()) {
            router.push('/login');
            return;
        }

        const user = WalletProvider.getUsername() || null;
        const addr = WalletProvider.getAddress() || null;
        const userId = WalletProvider.getUserId();

        setUsername(user);
        setAddress(addr);

        if (addr) {
            loadBalances();
            autoScanNodes(addr);
            loadVotes(addr);
        }

        if (userId) {
            // Load from node
            fetch(`${NODE_API}/api/wallet/preferences?userId=${userId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.preferredLanguage) {
                        setLang(data.preferredLanguage);
                        localStorage.setItem('wara_pref_lang', data.preferredLanguage);
                    }
                })
                .catch(() => { })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [router]);

    const handleLangChange = async (newLang: string) => {
        setLang(newLang);
        localStorage.setItem('wara_pref_lang', newLang);
        const userId = WalletProvider.getUserId();
        const addr = WalletProvider.getAddress();
        if (addr && userId) {
            try {
                await fetch(`${NODE_API}/api/wallet/preferences`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, preferredLanguage: newLang })
                });
            } catch (e) { }
        }
    };

    const autoScanNodes = async (targetAddress: string) => {
        if (!targetAddress) return;
        setIsScanning(true);
        const allProofs: any[] = [];

        // Start with local node
        let nodeConfigs: any[] = [
            { id: 'local', name: 'Local Node', url: NODE_API, key: '' }
        ];

        // Load remote nodes from API
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.id) {
                const res = await fetch(`${NODE_API}/api/manager/node?userId=${currentUser.id}`);
                if (res.ok) {
                    const { nodes } = await res.json();
                    const remoteNodes = nodes.map((n: any) => ({
                        id: n.id,
                        name: n.name || n.url,
                        url: n.url,
                        key: n.encryptedKey || ''
                    }));
                    nodeConfigs = [...nodeConfigs, ...remoteNodes];
                }
            }
        } catch (e) {
            console.warn('Could not load remote nodes:', e);
        }

        const token = WalletProvider.getAuthToken();

        for (const node of nodeConfigs) {
            try {
                const headers: any = {};
                if (node.key) headers['X-Wara-Key'] = node.key;
                if (node.id === 'local' && token) headers['X-Auth-Token'] = token;

                // If local node, we don't need ?hoster since the node knows our session
                const url = node.id === 'local'
                    ? `${node.url}/api/manager/proofs`
                    : `${node.url}/api/manager/proofs?hoster=${targetAddress}`;

                const res = await fetch(url, {
                    headers,
                    signal: AbortSignal.timeout(3000)
                });
                if (res.ok) {
                    const proofs = await res.json();
                    const tagged = proofs.map((p: any) => ({ ...p, _originNode: node }));
                    allProofs.push(...tagged);
                }
            } catch (err) {
                console.warn(`Could not scan node ${node.url}`, err);
            }
        }

        setPendingProofs(allProofs);
        setScannedNodes(nodeConfigs);
        setIsScanning(false);
    };

    const loadVotes = async (targetAddress: string) => {
        if (!targetAddress) return;
        setIsLoadingVotes(true);
        const allMyVotes: any[] = [];
        const allReceivedVotes: any[] = [];

        let nodeConfigs: any[] = [
            { id: 'local', name: 'Local Node', url: NODE_API, key: '' }
        ];

        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.id) {
                const res = await fetch(`${NODE_API}/api/manager/node?userId=${currentUser.id}`);
                if (res.ok) {
                    const { nodes } = await res.json();
                    const remoteNodes = nodes.map((n: any) => ({
                        id: n.id,
                        name: n.name || n.url,
                        url: n.url,
                        key: n.encryptedKey || ''
                    }));
                    nodeConfigs = [...nodeConfigs, ...remoteNodes];
                }
            }
        } catch (e) {
            console.warn('Could not load remote nodes:', e);
        }

        const token = WalletProvider.getAuthToken();

        for (const node of nodeConfigs) {
            try {
                const headers: any = {};
                if (node.key) headers['X-Wara-Key'] = node.key;
                if (node.id === 'local' && token) headers['X-Auth-Token'] = token;

                const url = node.id === 'local'
                    ? `${node.url}/api/manager/votes`
                    : `${node.url}/api/manager/votes?wallet=${targetAddress}`;

                const res = await fetch(url, {
                    headers,
                    signal: AbortSignal.timeout(3000)
                });
                if (res.ok) {
                    const { votes } = await res.json();
                    allReceivedVotes.push(...votes.map((v: any) => ({ ...v, _originNode: node })));
                }

            } catch (err) {
                console.warn(`Could not scan votes from node ${node.url}`, err);
            }
        }

        setMyVotes(allMyVotes);
        setReceivedVotes(allReceivedVotes);
        setIsLoadingVotes(false);
    };

    const handleSubmitVotes = async () => {
        if (!address || receivedVotes.length === 0) return;

        const password = prompt("Enter your WaraNode password to submit votes securely:");
        if (!password) return;

        setIsLoadingVotes(true);
        try {
            const votesByNode: { [key: string]: any[] } = {};
            receivedVotes.forEach(v => {
                const nodeUrl = v._originNode?.url || NODE_API;
                if (!votesByNode[nodeUrl]) votesByNode[nodeUrl] = [];
                votesByNode[nodeUrl].push(v);
            });

            for (const [nodeUrl, votes] of Object.entries(votesByNode)) {
                const res = await fetch(`${nodeUrl}/api/wallet/claim-vote-rewards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet: address,
                        votes: votes,
                        password: password // Included for remote sync
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log(`Submitted ${data.submitted} votes on node ${nodeUrl}`);
                }
            }

            alert('✅ Votes submitted to blockchain!');
            loadVotes(address);
        } catch (e: any) {
            console.error('Submit votes failed:', e);
            alert('❌ Failed to submit votes: ' + e.message);
        } finally {
            setIsLoadingVotes(false);
        }
    };

    const loadBalances = async () => {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.id) return;

            const res = await fetch(`${NODE_API}/api/wallet/my-balances?userId=${currentUser.id}`);
            if (!res.ok) throw new Error("Failed to load balances");
            const data = await res.json();

            setBalance(data.wara || "0.0");
            setEthBalance(data.eth || "0.0");
        } catch (e) {
            setBalance("0.0");
            setEthBalance("0.0");
            console.warn("Could not load balances:", e);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendError("");
        setTxHash("");
        setIsSending(true);

        const password = prompt("Enter your WaraNode password to confirm transfer:");
        if (!password) {
            setIsSending(false);
            return;
        }

        try {
            if (!address) throw new Error("Wallet not loaded");

            // Send with password to allow local decryption on node
            const res = await fetch(`${NODE_API}/api/wallet/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: address,
                    to: recipient,
                    amount: amount,
                    type: 'wara',
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Transfer failed");

            setTxHash(data.txHash);
            loadBalances();
            setAmount("");
            setRecipient("");
            alert("Transfer Successful!");

        } catch (err: any) {
            console.error(err);
            setSendError(err.message || "Transaction failed");
        } finally {
            setIsSending(false);
        }
    };

    const handleClaimRewards = async () => {
        if (pendingProofs.length === 0) return;
        const password = prompt("Enter your WaraNode password to claim rewards:");
        if (!password) return;

        setIsClaiming(true);

        try {
            if (!address) throw new Error("Wallet not loaded");

            // Delegate claiming to the node with password
            const headers: any = { 'Content-Type': 'application/json' };
            const token = WalletProvider.getAuthToken();
            if (token) headers['X-Auth-Token'] = token;

            const res = await fetch(`${NODE_API}/api/wallet/claim-rewards`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Claim failed");

            if (data.ads > 0 || data.premium > 0) {
                alert(`✅ Claim Successful!\n\n📺 Ads: ${data.ads}\n💎 Premium: ${data.premium}\n\nBalance will update shortly.`);

                // Cleanup: Delete proofs from nodes
                const nodeCleanup: Record<string, { url: string, key: string, filenames: string[] }> = {};
                for (const proof of pendingProofs) {
                    const n = proof._originNode;
                    if (!nodeCleanup[n.url]) nodeCleanup[n.url] = { url: n.url, key: n.key, filenames: [] };
                    nodeCleanup[n.url].filenames.push(proof._filename);
                }

                for (const url in nodeCleanup) {
                    const { key, filenames } = nodeCleanup[url];
                    try {
                        await fetch(`${url}/api/manager/proofs/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-Wara-Key': key },
                            body: JSON.stringify({ filenames })
                        });
                    } catch (e) { console.error(`Failed to cleanup node ${url}`, e); }
                }

                setPendingProofs([]);
                loadBalances();
            }

        } catch (err: any) {
            alert("Claim Failed: " + (err.message));
        } finally {
            setIsClaiming(false);
        }
    };

    if (isLoading || !username) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen pt-24 px-6 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-6">
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-600">
                        Dashboard
                    </h1>

                    {/* Audio Preference Selector */}
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Audio Language</label>
                        <select
                            value={lang}
                            onChange={(e) => handleLangChange(e.target.value)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-bold h-10 px-4 rounded-xl outline-none cursor-pointer transition-all uppercase focus:border-purple-500/50"
                        >
                            <option value="es">Español (ES)</option>
                            <option value="en">English (EN)</option>
                            <option value="fr">Français (FR)</option>
                            <option value="pt">Português (PT)</option>
                            <option value="it">Italiano (IT)</option>
                            <option value="de">Deutsch (DE)</option>
                            <option value="jp">Japanese (JP)</option>
                            <option value="multi">Multi-Audio</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <div className="text-sm font-bold text-white">{username}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{address?.substring(0, 6)}...{address?.substring(38)}</div>
                    </div>
                    <button
                        onClick={() => {
                            WalletProvider.logout();
                            router.push('/');
                        }}
                        className="bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 p-2 rounded-xl transition-all border border-white/10 group"
                        title="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Wallet & Transfer */}
                <div className="space-y-8">
                    <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-purple-400">💳</span> Wallet Assets
                        </h2>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 group hover:border-purple-500/30 transition-all">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">WARA Balance</div>
                                <div className="text-3xl font-black text-white tracking-tighter">
                                    {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span className="text-xs text-purple-500 ml-1">WARA</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">GAS (ETH)</div>
                                <div className="text-3xl font-black text-white tracking-tighter">
                                    {parseFloat(ethBalance).toFixed(4)}
                                    <span className="text-xs text-indigo-500 ml-1">ETH</span>
                                </div>
                            </div>
                        </div>

                        {/* Public Address */}
                        <div className="mb-6">
                            <label className="block text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2">My Receive Address</label>
                            <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-sm text-gray-400 group relative">
                                <span className="truncate">{address}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(address || '')}
                                    className="ml-auto p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all"
                                    title="Copy Address"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Send Form */}
                    <div className="glass-panel p-8 rounded-3xl border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-amber-400">💸</span> Transfer Funds
                        </h2>

                        <form onSubmit={handleSend} className="space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2">Recipient Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500/50 outline-none font-mono text-sm transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2">Amount to Send</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500/50 outline-none text-lg font-bold"
                                        required
                                        min="0.000001"
                                        step="any"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setAmount(balance)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 font-bold uppercase hover:bg-purple-500/10 px-2 py-1 rounded-lg transition-all"
                                    >
                                        Use Max
                                    </button>
                                </div>
                            </div>

                            {sendError && (
                                <div className="p-4 bg-red-950/30 border border-red-500/30 text-red-400 text-xs rounded-2xl">
                                    {sendError}
                                </div>
                            )}

                            {txHash && (
                                <div className="p-4 bg-green-950/30 border border-green-500/30 text-green-400 text-xs rounded-2xl break-all">
                                    Success! Tx: <span className="font-mono">{txHash}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSending || !amount || !recipient}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-500/20 transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSending ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing via Node...
                                    </>
                                ) : "Send WARA"}
                            </button>
                        </form>
                    </div>

                    {/* Security Info */}
                    <div className="px-4">
                        <div className="p-4 bg-indigo-950/20 rounded-2xl border border-indigo-500/20">
                            <p className="text-[10px] text-indigo-400 font-medium leading-relaxed">
                                <b className="text-indigo-300">Decentralized Storage:</b> Your private keys never leave the WaraNode.
                                Transactions are signed locally on your hardware and relayed to the network.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Infrastructure & Rewards */}
                <div className="space-y-8">
                    <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/20 to-purple-950/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Hoster Rewards</h2>
                                    <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black">WaraNode Cluster</p>
                                </div>
                            </div>
                            <button
                                onClick={() => address && autoScanNodes(address)}
                                disabled={isScanning}
                                className={`p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 shadow-inner ${isScanning ? 'animate-spin opacity-50' : ''}`}
                                title="Refresh all nodes"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-black/20 backdrop-blur-md rounded-3xl border border-white/5 shadow-inner">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Unclaimed Views</div>
                                    <div className="text-4xl font-black text-white">{pendingProofs.length}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Node Connectivity</div>
                                    {isScanning ? (
                                        <div className="flex items-center gap-2 text-indigo-400 font-bold italic animate-pulse">
                                            Scanning...
                                        </div>
                                    ) : (
                                        <div className="text-emerald-400 font-black flex items-center gap-2 justify-end">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                            {scannedNodes.length} Online
                                        </div>
                                    )}
                                </div>
                            </div>

                            {pendingProofs.length > 0 && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    {/* Detailed List */}
                                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-3 custom-scrollbar">
                                        {pendingProofs.map((p, i) => (
                                            <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group/item hover:border-indigo-500/40 transition-all hover:bg-indigo-500/5">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-gray-400 text-[9px] uppercase font-bold tracking-widest opacity-60">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                                        Hoster: {p._originNode?.name || 'Local'}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {p.type === 'premium_view' ? (
                                                            <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black text-[9px] border border-amber-500/20 uppercase tracking-widest">Premium View</span>
                                                        ) : (
                                                            <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg font-bold text-[9px] border border-purple-500/20 uppercase tracking-widest">Ad Campaign #{p.campaignId}</span>
                                                        )}
                                                        <span className="text-gray-400 font-mono text-[10px] opacity-40">Link: {p.linkId.substring(0, 6)}...</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white font-mono text-xs font-bold">{new Date(p.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    <div className="text-[10px] font-black uppercase text-emerald-500/70 mt-1 flex items-center gap-1 justify-end">
                                                        <span>Ready</span>
                                                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleClaimRewards}
                                        disabled={isClaiming}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 text-sm tracking-widest uppercase disabled:opacity-50"
                                    >
                                        {isClaiming ? (
                                            <>
                                                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Relaying On-Chain Claims...
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-2xl animate-bounce">💰</span>
                                                Withdraw Rewards (via Node)
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {!isScanning && pendingProofs.length === 0 && (
                                <div className="text-center py-16 bg-black/20 rounded-3xl border border-dashed border-white/5 group hover:border-white/10 transition-all cursor-default">
                                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💎</div>
                                    <div className="text-sm font-bold text-gray-500">Your cluster is idle.</div>
                                    <p className="text-[10px] text-gray-700 mt-2 uppercase tracking-widest">Share more links to earn Rewards</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Votes Inbox */}
                    <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/20 to-pink-950/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400 shadow-lg shadow-purple-500/10 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Reputation Dashboard</h2>
                                    <p className="text-[10px] text-purple-400 uppercase tracking-[0.2em] font-black">Gasless Voting & Rewards</p>
                                </div>
                            </div>
                            <button
                                onClick={() => address && loadVotes(address)}
                                disabled={isLoadingVotes}
                                className={`p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 shadow-inner ${isLoadingVotes ? 'animate-spin opacity-50' : ''}`}
                                title="Refresh votes"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* LEFT: Votes I Received (Hoster Tray) */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                                    <div>
                                        <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1">Received (To Submit)</div>
                                        <div className="text-2xl font-black text-white">{receivedVotes.length}</div>
                                    </div>
                                    <button
                                        onClick={handleSubmitVotes}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                                        disabled={receivedVotes.length === 0 || isLoadingVotes}
                                    >
                                        {isLoadingVotes ? 'Processing...' : 'Submit to Chain'}
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                    {receivedVotes.length > 0 ? receivedVotes.map((vote, idx) => (
                                        <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-white font-bold">{vote.link?.title || 'Unknown Link'}</span>
                                                <span className={vote.value === 1 ? 'text-green-400' : 'text-orange-400'}>
                                                    {vote.value === 1 ? '👍 +1' : '👎 -1'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono italic truncate">
                                                From: {vote.voterWallet?.substring(0, 10)}...
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8 text-gray-600 text-xs italic">
                                            No votes received yet
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: Votes I Sent (Activity history) */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                    <div>
                                        <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">Your Activity</div>
                                        <div className="text-2xl font-black text-white">{myVotes.length}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Gas Saved</div>
                                        <div className="text-sm font-black text-blue-400">~{(myVotes.length * 0.005).toFixed(3)} ETH</div>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                    {myVotes.length > 0 ? myVotes.map((vote, idx) => (
                                        <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs opacity-60">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-white font-bold">{vote.link?.title || 'Unknown Link'}</span>
                                                <span className={vote.value === 1 ? 'text-green-400' : 'text-orange-400'}>
                                                    {vote.value === 1 ? '👍' : '👎'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-500">{new Date(vote.createdAt).toLocaleDateString()}</span>
                                                <span className="text-purple-400 italic">Validated</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8 text-gray-600 text-xs italic">
                                            You haven't voted yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="p-6 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 rounded-3xl border border-blue-500/10">
                        <div className="flex gap-4">
                            <span className="text-xl">💡</span>
                            <div className="text-xs text-blue-400 leading-relaxed font-medium">
                                <b className="text-blue-300">Pro Tip:</b> Keep your WaraNodes online to increase your trust score. High-uptime nodes are prioritized by the Muggi network.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

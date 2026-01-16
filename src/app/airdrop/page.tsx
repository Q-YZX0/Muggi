'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { WalletProvider } from '@/lib/walletProvider';
import { getApiUrl, formatWARA } from '@/lib/node-helpers';

export default function AirdropPage() {
    const { address, isConnected } = useWallet();
    const [state, setState] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ registered: 0, totalAirdrop: "70.00M" });

    const fetchState = async () => {
        try {
            const res = await fetch(getApiUrl('/api/airdrop/state'), {
                headers: {
                    'x-auth-token': WalletProvider.getAuthToken() || ''
                }
            });
            const data = await res.json();
            setState(data);
        } catch (e) {
            console.error("Failed to fetch airdrop state", e);
        }
    };

    useEffect(() => {
        fetchState();
        const timer = setInterval(fetchState, 30000);
        return () => clearInterval(timer);
    }, [isConnected]);

    const handleRegister = async () => {
        if (!confirm("Registering for the airdrop requires an on-chain transaction. Continue?")) return;
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/airdrop/register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': WalletProvider.getAuthToken() || ''
                }
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Registered successfully! You are now eligible for future cycles.");
                fetchState();
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async () => {
        setLoading(true);
        try {
            // In a real scenario, the proof would be fetched from the node or a JSON
            // For now, we assume the node has the proof or the user provides it
            // We'll call the backend claim which handles the Merkle Verification
            const res = await fetch(getApiUrl('/api/airdrop/claim'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': WalletProvider.getAuthToken() || ''
                },
                body: JSON.stringify({
                    cycleId: state.currentCycleId,
                    amount: "100000000000000000000", // 100 WARA (Example)
                    merkleProof: [] // Backend should ideally fulfill this or frontend fetches it
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Tokens claimed! Check your wallet.");
                fetchState();
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 mb-4 uppercase tracking-tighter">
                    Wara Hub: Airdrop Rewards
                </h1>
                <p className="text-gray-400 text-lg">
                    Join the Muggi community and earn WARA tokens every 30 days.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl text-center">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Total Pool</p>
                    <p className="text-3xl font-black text-white">{stats.totalAirdrop}</p>
                    <p className="text-[10px] text-gray-600 mt-1">7% of Total Supply</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl text-center">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Registered Users</p>
                    <p className="text-3xl font-black text-blue-400">{state?.totalRegistered || 0}</p>
                    <p className="text-[10px] text-gray-600 mt-1">On-Chain Registry</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl text-center">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Current Cycle</p>
                    <p className="text-3xl font-black text-purple-400">#{state?.currentCycleId || 0}</p>
                    <p className="text-[10px] text-gray-600 mt-1">Every 30 Days</p>
                </div>
            </div>

            <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <span className="text-9xl">🎁</span>
                </div>

                {!isConnected ? (
                    <div className="text-center py-8">
                        <p className="text-xl text-gray-400 mb-6">Connect your wallet to participate in the Airdrop.</p>
                        <div className="inline-block scale-125">
                            {/* WalletConnect component is already in Navbar, but we can prompt here */}
                            <p className="text-sm text-yellow-500 font-bold uppercase">Click "Connect Wallet" in the Navbar</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800 pb-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Registration Status</h2>
                                <p className="text-gray-400 text-sm">You must be registered on-chain to be included in distribution cycles.</p>
                            </div>
                            {state?.userRegistered ? (
                                <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                                    <span>✅</span> Registered & Eligible
                                </div>
                            ) : (
                                <button
                                    onClick={handleRegister}
                                    disabled={loading}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-yellow-500/20"
                                >
                                    {loading ? "Processing..." : "Register Now"}
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Claim Rewards</h2>
                                <p className="text-gray-400 text-sm">
                                    {state?.currentCycleId > 0
                                        ? `Rewards for Cycle #${state.currentCycleId} are ready.`
                                        : "Waiting for the first cycle to begin."}
                                </p>
                            </div>

                            {state?.userClaimed ? (
                                <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                                    <span>💎</span> Cycle Reward Claimed
                                </div>
                            ) : state?.userRegistered && state?.airdropActive ? (
                                <button
                                    onClick={handleClaim}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-3 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-purple-500/20"
                                >
                                    {loading ? "Processing..." : "Claim 100 WARA"}
                                </button>
                            ) : (
                                <div className="text-gray-600 font-bold italic px-6 py-3 border border-gray-800 rounded-xl">
                                    No Claims Available
                                </div>
                            )}
                        </div>

                        {state?.lastCycleTime > 0 && (
                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-4">
                                <span className="text-2xl">⏳</span>
                                <div>
                                    <p className="text-blue-300 text-xs font-bold uppercase">Next Cycle Opportunity</p>
                                    <p className="text-gray-400 text-sm">
                                        The next distribution will be activated approx. 30 days after {new Date(state.lastCycleTime * 1000).toLocaleDateString()}.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-12 text-center">
                <h3 className="text-gray-500 text-sm font-bold uppercase mb-4 tracking-widest">Transparency & Security</h3>
                <div className="flex flex-wrap justify-center gap-8">
                    <div className="flex items-center gap-2 text-gray-500 grayscale opacity-50">
                        <span className="text-lg">🛡️</span>
                        <span className="text-xs">Merkle Verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 grayscale opacity-50">
                        <span className="text-lg">⛓️</span>
                        <span className="text-xs">On-Chain Claims</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 grayscale opacity-50">
                        <span className="text-lg">📅</span>
                        <span className="text-xs">30-Day Cycles</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

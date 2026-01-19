'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { WalletProvider } from '@/lib/walletProvider';
import { getApiUrl } from '@/lib/node-helpers';

interface SovereignRegistryButtonProps {
    sourceId: string;
    source?: string;
    type: 'movie' | 'tv';
    initialStatus?: string;
    title: string;
}

export default function SovereignRegistryButton({
    sourceId,
    source = 'tmdb',
    type,
    initialStatus = 'unknown',
    title
}: SovereignRegistryButtonProps) {
    const { address, isConnected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [statusData, setStatusData] = useState<any>(null);
    const [config, setConfig] = useState<{ ownerAddress: string } | null>(null);
    const [waraId, setWaraId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Get Config (Owner)
                const configRes = await fetch(getApiUrl('/api/media/config'));
                setConfig(await configRes.json());

                // 2. Get WaraID & Status
                const lookupRes = await fetch(getApiUrl(`/api/media/lookup?sourceId=${sourceId}&source=${source}`));
                const lookupData = await lookupRes.json();

                if (lookupData.waraId) {
                    setWaraId(lookupData.waraId);
                    // 3. Get Gov Status
                    const statusRes = await fetch(getApiUrl(`/api/media/status/${lookupData.waraId}`));
                    setStatusData(await statusRes.json());
                }
            } catch (e) {
                console.warn("Gov init failed", e);
            }
        };
        init();
    }, [sourceId, source]);

    const isOwner = address && config?.ownerAddress &&
        address.toLowerCase() === config.ownerAddress.toLowerCase();

    // Unified Action: Register (Bless) or Propose
    const handleStart = async () => {
        const actionType = isOwner ? 'BLESS (Sovereign Authority)' : 'Propose to DAO (Requires WARA)';
        if (!confirm(`Confirm ${actionType} for "${title}"?`)) return;

        setLoading(true);
        try {
            // BOTH flows use /register. Backend handles logic.
            const res = await fetch(getApiUrl('/api/media/register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': WalletProvider.getAuthToken() || ''
                },
                body: JSON.stringify({ source, sourceId, type })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.error);

            alert(`✅ ${isOwner ? 'Blessed' : 'Proposal Started'}! Tx: ${d.txHash || 'Done'}`);
            window.location.reload();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (side: 1 | -1) => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/media/vote'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': WalletProvider.getAuthToken() || ''
                },
                body: JSON.stringify({ source, sourceId, side })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.error);
            alert(`✅ Voted ${side === 1 ? 'YES' : 'NO'}! Tx: ${d.txHash}`);
            window.location.reload();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/media/resolve'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': WalletProvider.getAuthToken() || ''
                },
                body: JSON.stringify({ source, sourceId, title })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.error);
            alert("✅ Resolved! Reward Claimed. Tx: " + d.txHash);
            window.location.reload();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isConnected) return null;

    // 1. APPROVED / SECURED
    if (statusData?.status === 'approved' || (statusData?.onChain && !statusData?.period?.isOpen && !statusData?.executed)) {
        return (
            <div className="flex flex-col items-center gap-1">
                <div className="bg-green-600/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-default shadow-lg shadow-green-500/5">
                    <span>⛓️</span> Verified on Chain
                </div>
                {isOwner && <span className="text-[10px] text-green-500/60 uppercase font-black tracking-widest">Sovereign Authority</span>}
            </div>
        );
    }

    // 2. ACTIVE VOTING (DAO)
    if (statusData?.status === 'pending_dao' && statusData?.period?.isOpen) {
        return (
            <div className="flex flex-col gap-2">
                <div className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded text-xs border border-blue-500/30 text-center">
                    ⏳ {statusData.period.remainingHours}h Left | 👍 {statusData.votes.up} vs 👎 {statusData.votes.down}
                </div>

                {/* Voting Buttons for Everyone */}
                <div className="flex gap-2">
                    <button onClick={() => handleVote(1)} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold transition-all active:scale-95">
                        👍 Yes
                    </button>
                    <button onClick={() => handleVote(-1)} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded font-bold transition-all active:scale-95">
                        👎 No
                    </button>
                </div>

                {/* ADMIN OVERRIDE: Bless directly during voting */}
                {isOwner && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 rounded font-bold text-sm shadow-lg border border-blue-400/30"
                        >
                            🏛️ Bless to Approve Now (Admin)
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // 3. READY TO RESOLVE
    if (statusData?.status === 'pending_dao' && !statusData?.period?.isOpen && !statusData?.executed) {
        return (
            <button
                onClick={handleResolve}
                disabled={loading}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl font-bold border border-yellow-400/30 shadow-lg animate-pulse"
            >
                {loading ? 'Resolving...' : '💰 Resolve & Claim Reward'}
            </button>
        );
    }

    // 4. NEW (BLESS OR PROPOSE)
    return (
        <button
            onClick={handleStart}
            disabled={loading}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-3 shadow-xl transform active:scale-95 ${isOwner
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/30'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-400/30'
                }`}
        >
            {loading ? 'Processing...' : (
                <>
                    <span>{isOwner ? '🏛️' : '🗳️'}</span>
                    <span>{isOwner ? 'Bless Title (Owner)' : 'Start DAO Vote'}</span>
                </>
            )}
        </button>
    );
}

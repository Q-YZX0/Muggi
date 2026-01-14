'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { WalletProvider } from '@/lib/walletProvider';
import { getApiUrl } from '@/lib/node-helpers';

interface RegisterOnChainButtonProps {
    linkId: string;
    uploaderWallet?: string;
}

export default function RegisterOnChainButton({ linkId, uploaderWallet }: RegisterOnChainButtonProps) {
    const { address } = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // Only show if logged in user IS the uploader
    if (!address || !uploaderWallet || address.toLowerCase() !== uploaderWallet.toLowerCase()) {
        return null;
    }

    const handleRegister = async () => {
        if (!confirm("This will execute a blockchain transaction using your wallet (via the Node) to secure ownership of this link. Gas fees apply. Continue?")) {
            return;
        }

        setLoading(true);
        setStatus('idle');
        setErrorMsg('');

        try {
            const token = WalletProvider.getAuthToken();
            if (!token) throw new Error("No active session. Please login.");

            // Use the endpoint we just created
            const res = await fetch(getApiUrl('/api/links/register-on-chain'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ linkId })
            });

            const data = await res.json();

            if (!res.ok) {
                // Check if it's a gas error
                if (data.error && data.error.includes('Insufficient funds')) {
                    throw new Error("❌ Insufficient Gas (ETH) in your wallet.");
                }
                throw new Error(data.error || 'Registration failed');
            }

            setStatus('success');
            alert(`✅ Link Registered on Blockchain!\nTX: ${data.txHash}`);
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMsg(e.message);
            alert(`⚠️ Registration Error:\n${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded flex items-center gap-1 cursor-default">
                <span>⛓️</span> Secured on Chain
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleRegister}
                disabled={loading}
                className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded transition-all flex items-center gap-2"
                title="Register this link on the blockchain to earn rewards (Gas required)"
            >
                {loading ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <span>⛓️</span>
                )}
                {loading ? 'Signing...' : 'Register Ownership'}
            </button>
            {errorMsg && (
                <span className="text-[10px] text-red-400 max-w-[100px] leading-tight hidden md:inline-block">
                    {errorMsg}
                </span>
            )}
        </div>
    );
}

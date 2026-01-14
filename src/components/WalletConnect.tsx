'use client'
import { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { WalletProvider } from '@/lib/walletProvider'
import { useRouter } from 'next/navigation'

export default function WalletConnect() {
    const { address, isConnected } = useWallet()
    const router = useRouter()

    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        const u = WalletProvider.getUsername();
        if (u) setUsername(u);
    }, [address]);

    if (!isConnected || !address) {
        return (
            <button
                onClick={() => router.push('/login')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-purple-900/20"
            >
                Login
            </button>
        )
    }

    const handleProfile = () => {
        router.push('/profile');
    };

    return (
        <div className="flex items-center gap-3">
            {/* User Profile Button */}
            <button
                onClick={handleProfile}
                className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all group"
            >
                <div className="flex flex-col items-end">
                    <span className="text-white text-xs font-bold group-hover:text-purple-300 transition-colors">
                        {username || 'User'}
                    </span>
                    <span className="text-gray-500 text-[10px] font-mono">
                        {address.slice(0, 4)}...{address.slice(-4)}
                    </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-gray-900 group-hover:ring-purple-500/50 transition-all">
                    {username ? username[0].toUpperCase() : 'U'}
                </div>
            </button>
        </div>
    )
}

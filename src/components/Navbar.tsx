'use client'
import Link from 'next/link'
import SearchBar from './SearchBar'
import WalletConnect from './WalletConnect'

export default function Navbar() {
    return (
        <nav className="bg-gray-900 text-white p-4 flex justify-between items-center border-b border-gray-800">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Muggi
            </Link>

            <div className="hidden md:block flex-1 mx-8 max-w-md">
                <SearchBar />
            </div>

            <div className="flex items-center space-x-6">
                <Link href="/ads" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                    📢 Ads Manager
                </Link>
                <Link href="/node" className="text-gray-300 hover:text-white transition-colors">
                    My Node
                </Link>
                <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">
                    🏆 Leaderboard
                </Link>
                <Link href="/premium" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 rounded-lg font-bold transition-all" style={{ paddingBlock: 'calc(var(--spacing) * 2.7)' }}>
                    ✨ Premium
                </Link>
                <Link href="/airdrop" className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors">
                    🎁 Airdrop
                </Link>
                <WalletConnect />
            </div>
        </nav>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'

import { getApiUrl } from '@/lib/node-helpers'

interface HosterData {
    address: string
    totalUpvotes: number
    totalDownvotes: number
    linkCount: number
    averageScore: number
    rank: number
}

export default function LeaderboardPage() {
    const { address: currentWallet } = useWallet();
    const [leaderboard, setLeaderboard] = useState<HosterData[]>([])
    const [contentLeaderboard, setContentLeaderboard] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'hosters' | 'content'>('hosters')
    const [totalHosters, setTotalHosters] = useState(0)
    // const [currentWallet, setCurrentWallet] = useState<string | null>(null) -> Removed, using hook
    const [loading, setLoading] = useState(true)
    const [limit, setLimit] = useState(50)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadData()
        // loadWallet() -> Removed
    }, [limit, activeTab])

    const loadData = async () => {
        try {
            setLoading(true)

            if (activeTab === 'hosters') {
                const res = await fetch(getApiUrl('/api/leaderboard'));
                if (res.ok) {
                    const data = await res.json();
                    setLeaderboard(data.leaderboard.slice(0, limit));
                    setTotalHosters(data.totalHosters);
                } else {
                    setLeaderboard([]);
                }
            } else {
                const res = await fetch(getApiUrl('/api/leaderboard/content'));
                if (res.ok) {
                    const data = await res.json();
                    setContentLeaderboard(data.content.slice(0, limit));
                } else {
                    setContentLeaderboard([]);
                }
            }
        } catch (error: any) {
            console.error('Error loading leaderboard:', error)
            setLeaderboard([])
            setContentLeaderboard([])
        } finally {
            setLoading(false)
        }
    }

    /* 
    const loadWallet = async () => {
        const wallet = await getCurrentWallet()
        setCurrentWallet(wallet)
    }
    */

    const filteredLeaderboard = leaderboard.filter(hoster =>
        hoster.address.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredContent = contentLeaderboard.filter(content =>
        content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (content.uploader && content.uploader.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const getScoreColor = (score: number) => {
        if (score >= 61) return 'text-green-400'
        if (score >= 31) return 'text-yellow-400'
        return 'text-red-400'
    }

    const getRankBadge = (rank: number) => {
        if (rank === 1) return '🥇'
        if (rank === 2) return '🥈'
        if (rank === 3) return '🥉'
        return `#${rank}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        🏆 Muggi Leaderboard
                    </h1>
                    <p className="text-xl text-gray-300 mb-6">
                        Global reputation ranking for Hosters and Content
                    </p>

                    {/* TABS */}
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => { setActiveTab('hosters'); setLimit(50); }}
                            className={`px-8 py-3 rounded-xl font-bold transition-all text-lg ${activeTab === 'hosters'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            Top Hosters
                        </button>
                        <button
                            onClick={() => { setActiveTab('content'); setLimit(50); }}
                            className={`px-8 py-3 rounded-xl font-bold transition-all text-lg ${activeTab === 'content'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            Top Content
                        </button>
                    </div>
                </div>

                {/* Stats Cards (Conditional based on Tab) */}
                {activeTab === 'hosters' && leaderboard.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-6 border-2 border-yellow-400">
                            <div className="text-4xl mb-2">🥇</div>
                            <div className="text-yellow-100 text-sm mb-1">Top Provider</div>
                            <div className="text-white font-mono text-xs break-all">
                                {leaderboard[0]?.address.slice(0, 10)}...{leaderboard[0]?.address.slice(-8)}
                            </div>
                            <div className="text-yellow-200 text-sm mt-2">
                                Score: {leaderboard[0]?.averageScore}/100
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                            <div className="text-gray-400 text-sm mb-2">Total Links Hosted</div>
                            <div className="text-3xl font-bold text-white">
                                {leaderboard.reduce((sum, h) => sum + h.linkCount, 0)}
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                            <div className="text-gray-400 text-sm mb-2">Total Upvotes</div>
                            <div className="text-3xl font-bold text-green-400">
                                {leaderboard.reduce((sum, h) => sum + h.totalUpvotes, 0)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Search */}
                        <div className="flex-1 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search by address or title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Limit Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Show:</span>
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value={10}>Top 10</option>
                                <option value={25}>Top 25</option>
                                <option value={50}>Top 50</option>
                                <option value={100}>Top 100</option>
                            </select>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg text-white font-medium transition-all"
                        >
                            {loading ? '⟳ Loading...' : '🔄 Refresh'}
                        </button>
                    </div>
                </div>

                {/* Leaderboard Table Content */}
                <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                            <div className="text-gray-400">Loading leaderboard...</div>
                        </div>
                    ) : activeTab === 'hosters' ? (
                        // --- HOSTERS TABLE ---
                        filteredLeaderboard.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔍</div>
                                <div className="text-gray-400 mb-2">
                                    {searchQuery ? 'No hosters found' : totalHosters === 0 ? 'No registered hosters yet' : 'No hosters yet'}
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-900/50 border-b border-gray-700">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Address</th>
                                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Links</th>
                                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Upvotes</th>
                                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Downvotes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {filteredLeaderboard.map((hoster, index) => (
                                            <tr key={hoster.address} className={`hover:bg-gray-700/30 transition-colors ${currentWallet?.toLowerCase() === hoster.address.toLowerCase() ? 'bg-purple-900/20 border-l-4 border-purple-500' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-2xl">{getRankBadge(hoster.rank)}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-mono text-sm text-white">{hoster.address.slice(0, 6)}...{hoster.address.slice(-4)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className={`text-xl font-bold ${getScoreColor(hoster.averageScore)}`}>{hoster.averageScore}/100</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center"><div className="text-white font-medium">{hoster.linkCount}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center"><div className="text-green-400 font-medium">👍 {hoster.totalUpvotes}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center"><div className="text-red-400 font-medium">👎 {hoster.totalDownvotes}</div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        // --- CONTENT TABLE ---
                        filteredContent.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🎬</div>
                                <div className="text-gray-400 mb-2">No rated content found yet.</div>
                                <div className="text-sm text-gray-500">Be the first to upload or vote on content!</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-900/50 border-b border-gray-700">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Content</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Uploader</th>
                                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Trust Score</th>
                                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Votes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {filteredContent.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <a href={`/${item.mediaType === 'tv' ? 'tv' : 'movie'}/${item.tmdbId}`} className="block group">
                                                        <div className="font-bold text-white group-hover:text-purple-400 decoration-purple-400 truncate max-w-xs">{item.title}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {item.mediaType === 'tv' ? `Season ${item.season} Ep ${item.episode}` : 'Movie'}
                                                        </div>
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-mono text-xs text-gray-300">
                                                        {item.uploader ? `${item.uploader.slice(0, 6)}...${item.uploader.slice(-4)}` : 'Anonymous'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className={`text-xl font-bold ${getScoreColor(item.trustScore)}`}>
                                                        {item.trustScore}%
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="flex justify-center gap-3">
                                                        <span className="text-green-400 font-medium text-sm">👍 {item.upvotes}</span>
                                                        <span className="text-red-400 font-medium text-sm">👎 {item.downvotes}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>

                {/* Info */}
                <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">ℹ️</div>
                        <div>
                            <div className="font-bold text-blue-300 mb-2">How Rankings Work</div>
                            <div className="text-blue-200 text-sm space-y-1">
                                <div>• Hosters are ranked by their average trust score across all links</div>
                                <div>• Trust scores are calculated from upvotes and downvotes on their content</div>
                                <div>• Higher quality content = higher ranking</div>
                                <div>• Rankings update automatically when users vote</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

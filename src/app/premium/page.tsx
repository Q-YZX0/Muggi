'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WalletProvider } from '@/lib/walletProvider'

// Helper to get backend URL
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

// Helper for display
const formatWARA = (wei: string | number | bigint) => {
    if (!wei) return '0';
    try {
        const val = BigInt(wei);
        // Simple generic formatter for display (wei -> ether)
        const ether = Number(val) / 1e18;
        return ether.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } catch (e) { return '0'; }
};

export default function PremiumPage() {
    const [wallet, setWallet] = useState<string | null>(null)
    const [userBalance, setUserBalance] = useState<string>('0')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)
    const [price, setPrice] = useState<bigint>(BigInt(0))
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') WalletProvider.init();
        loadWallet()
        loadStats()
    }, [])

    useEffect(() => {
        if (wallet) {
            loadSubscriptionData()
        }
    }, [wallet])

    const loadWallet = async () => {
        // Use LocalStorage from WalletProvider logic
        const address = localStorage.getItem('muggi_address');
        setWallet(address);
        if (address) {
            // Stub balance or fetch from backend if needed
            setUserBalance('0');
        }
    }

    const loadStats = async () => {
        try {
            const res = await fetch(getApiUrl('/api/subscription/stats'));
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                if (data.price) setPrice(BigInt(data.price));
            }
        } catch (error: any) {
            console.error('Error loading stats:', error)
        }
    }

    const loadSubscriptionData = async () => {
        if (!wallet) return;

        try {
            const res = await fetch(getApiUrl(`/api/subscription/status?wallet=${wallet}`));
            if (res.ok) {
                const data = await res.json();
                setIsSubscribed(data.isSubscribed);
                if (data.details) setSubscriptionDetails(data.details);
            }
        } catch (error) {
            console.error('Error loading subscription:', error)
        }
    }

    const router = useRouter() // Need to import useRouter at top

    const handleLoginRedirect = () => {
        router.push('/login')
    }

    const handleSubscribe = async () => {
        if (!wallet) {
            setMessage('Please connect wallet first')
            return
        }

        try {
            setLoading(true)
            setMessage('Processing Subscription...')

            // Get session token from local storage
            const token = localStorage.getItem('muggi_token');

            const res = await fetch(getApiUrl('/api/subscription/subscribe'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wara-token': token || ''
                },
                body: JSON.stringify({ wallet })
            });

            const data = await res.json();

            if (data.success) {
                setMessage(`✅ Subscribed! TX: ${data.txHash}`)
                await loadSubscriptionData()
                await loadStats()
            } else {
                setMessage(`❌ Error: ${data.error}`)
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        ✨ Muggi Premium
                    </h1>
                    <p className="text-xl text-gray-300">
                        Ad-free streaming while supporting content providers
                    </p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                            <div className="text-gray-400 text-sm mb-2">Total Subscribers</div>
                            <div className="text-3xl font-bold text-white">{stats.totalSubscribers}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                            <div className="text-gray-400 text-sm mb-2">Premium Views</div>
                            <div className="text-3xl font-bold text-white">{stats.totalPremiumViews}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                            <div className="text-gray-400 text-sm mb-2">Hoster Pool</div>
                            <div className="text-2xl font-bold text-green-400">{formatWARA(stats.hosterPoolBalance)} WARA</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                            <div className="text-gray-400 text-sm mb-2">Current Price</div>
                            <div className="text-2xl font-bold text-yellow-400">{formatWARA(stats.currentPriceWARA)} WARA</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Premium Benefits */}
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 border-2 border-white/20 shadow-2xl">
                        <h2 className="text-3xl font-bold text-white mb-6">Premium Benefits</h2>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">🚫</div>
                                <div>
                                    <div className="font-bold text-white">No Ads</div>
                                    <div className="text-white/80 text-sm">Skip all advertisements</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="text-2xl">💰</div>
                                <div>
                                    <div className="font-bold text-white">Support Hosters</div>
                                    <div className="text-white/80 text-sm">70% goes to content providers</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="text-2xl">🏗️</div>
                                <div>
                                    <div className="font-bold text-white">Fund Development</div>
                                    <div className="text-white/80 text-sm">20% supports platform growth</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="text-2xl">🔐</div>
                                <div>
                                    <div className="font-bold text-white">Decentralized</div>
                                    <div className="text-white/80 text-sm">Smart contract automation</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="text-2xl">💵</div>
                                <div>
                                    <div className="font-bold text-white">Fixed USD Price</div>
                                    <div className="text-white/80 text-sm">$5/month via Chainlink oracle</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-white/10 rounded-lg border border-white/20">
                            <div className="text-white/80 text-sm mb-2">Monthly Price</div>
                            <div className="text-4xl font-bold text-white">
                                {price > 0 ? `${formatWARA(price)} WARA` : 'Loading...'}
                            </div>
                            <div className="text-white/60 text-xs mt-1">≈ $5.00 USD</div>
                        </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 border border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-6">Your Subscription</h2>

                        {!wallet ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🔌</div>
                                <p className="text-gray-400 mb-6">Connect your wallet to subscribe</p>
                                <button
                                    onClick={handleLoginRedirect}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-8 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all"
                                >
                                    {loading ? 'Redirecting...' : 'Login / Connect'}
                                </button>
                            </div>
                        ) : isSubscribed && subscriptionDetails ? (
                            <div>
                                <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="text-4xl">✅</div>
                                        <div>
                                            <div className="text-2xl font-bold text-green-400">Active</div>
                                            <div className="text-green-300 text-sm">Premium Subscription</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Days Remaining</div>
                                            <div className="text-white font-bold text-xl">{subscriptionDetails.daysRemaining}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Total Paid</div>
                                            <div className="text-white font-bold text-xl">{formatWARA(subscriptionDetails.totalPaid)} WARA</div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="text-gray-400 text-xs mb-1">Expires</div>
                                        <div className="text-white text-sm">
                                            {new Date(subscriptionDetails.expiresAt * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubscribe}
                                    disabled={loading}
                                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-4 rounded-xl text-white font-bold transition-all"
                                >
                                    {loading ? 'Processing...' : 'Renew Subscription'}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="text-4xl">📺</div>
                                        <div>
                                            <div className="text-xl font-bold text-white">Free Plan</div>
                                            <div className="text-gray-400 text-sm">With advertisements</div>
                                        </div>
                                    </div>

                                    <div className="text-gray-300 text-sm">
                                        Upgrade to Premium for ad-free streaming and support the network!
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubscribe}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-6 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all"
                                >
                                    {loading ? 'Processing...' : 'Subscribe to Premium'}
                                </button>
                            </div>
                        )}

                        {wallet && (
                            <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="text-gray-400 text-xs">Connected Wallet</div>
                                    <div className="text-purple-300 text-xs font-bold font-mono">{parseFloat(userBalance).toFixed(2)} WARA</div>
                                </div>
                                <div className="text-white text-sm font-mono break-all">{wallet}</div>
                            </div>
                        )}

                        {message && (
                            <div className={`mt-4 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-500/20 border border-green-500 text-green-300' :
                                message.includes('❌') ? 'bg-red-500/20 border border-red-500 text-red-300' :
                                    'bg-blue-500/20 border border-blue-500 text-blue-300'
                                }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                {/* How It Works */}
                <div className="mt-12 bg-gray-800/30 backdrop-blur rounded-2xl p-8 border border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-4xl mb-3">1️⃣</div>
                            <div className="font-bold text-white mb-2">Subscribe</div>
                            <div className="text-gray-400 text-sm">Pay $5/month in WARA tokens</div>
                        </div>

                        <div className="text-center">
                            <div className="text-4xl mb-3">2️⃣</div>
                            <div className="font-bold text-white mb-2">Watch Ad-Free</div>
                            <div className="text-gray-400 text-sm">Enjoy content without interruptions</div>
                        </div>

                        <div className="text-center">
                            <div className="text-4xl mb-3">3️⃣</div>
                            <div className="font-bold text-white mb-2">Support Network</div>
                            <div className="text-gray-400 text-sm">Hosters earn from your views</div>
                        </div>
                    </div>

                    <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                        <div className="font-bold text-purple-300 mb-2">Revenue Distribution</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-300">
                                <span>Content Hosters</span>
                                <span className="font-bold text-green-400">70%</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>Platform Treasury</span>
                                <span className="font-bold text-blue-400">20%</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>Protocol Creator</span>
                                <span className="font-bold text-yellow-400">10%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

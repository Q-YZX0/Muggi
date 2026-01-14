'use client'
import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/lib/node-helpers'

export default function LinkSubmissionForm({ tmdbId, mediaType, season, episode }: { tmdbId: string, mediaType: string, season?: number, episode?: number }) {
    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Use internal wallet hook
    const { address, isConnected } = useWallet()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isConnected || !address) {
            router.push('/login')
            return
        }

        setLoading(true)
        const token = localStorage.getItem('muggi_token');
        const activeNodeStr = localStorage.getItem('active_wara_node');
        let xWaraKey = '';
        if (activeNodeStr && activeNodeStr.startsWith('{')) {
            try {
                const parsed = JSON.parse(activeNodeStr);
                xWaraKey = parsed.key || '';
            } catch (e) { }
        }

        try {
            const apiUrl = getApiUrl('/api/links');
            const res = await fetch(apiUrl, {
                method: 'POST',
                // Include uploaderWallet for attribution
                body: JSON.stringify({ url, title, tmdbId, mediaType, season, episode, uploaderWallet: address }),
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || '',
                    ...(xWaraKey ? { 'x-wara-key': xWaraKey } : {})
                }
            })

            if (res.ok) {
                const data = await res.json();

                // DELEGATED SIGNING: If we are on a remote node, use our LOCAL node to sign on-chain
                const { isLocalNodeUrl, getLocalNodeUrl } = await import('@/lib/node-helpers');
                if (!isLocalNodeUrl(apiUrl) && data.registrationParams) {
                    console.log("[Submission] Link saved to remote. Requesting local signing...");
                    try {
                        await fetch(`${getLocalNodeUrl()}/api/links/register-on-chain`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': token || ''
                            },
                            body: JSON.stringify(data.registrationParams)
                        });
                    } catch (e) {
                        console.error("[Submission] Local signing request failed (optional step)");
                    }
                }

                window.location.reload()
            } else {
                alert("Failed to add link")
            }
        } catch (e) {
            alert("Error adding link")
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md relative">
            {!isConnected && (
                <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-300 font-bold mb-2">Login to Host & Earn</p>
                    <p className="text-xs text-gray-400 mb-4">You must be logged in to submit links.</p>
                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                    >
                        🔐 Login / Register
                    </button>
                </div>
            )}

            {season && episode && (
                <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-2">
                    Submitting for Season {season} • Episode {episode}
                </div>
            )}
            <div className={!isConnected ? 'opacity-30 blur-[1px]' : ''}>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-300">Link Title</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors"
                        placeholder="e.g. My Fast Node - 4K"
                        required
                        disabled={!isConnected}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-300">Wara URL</label>
                    <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none focus:border-green-500 transition-colors"
                        placeholder="https://node-1.example.com/wara/..."
                        required
                        disabled={!isConnected}
                    />
                </div>

                {address && (
                    <div className="mb-4 text-xs text-gray-500 flex justify-between items-center bg-gray-800/50 p-2 rounded">
                        <span>Attributed to:</span>
                        <span className="font-mono text-purple-400 truncate max-w-[200px]">{address}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !isConnected}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Registering...</span>
                        </>
                    ) : (
                        <>
                            <span>Add Link & Earn</span>
                            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded">Gasless</span>
                        </>
                    )}
                </button>
                <p className="text-[10px] text-gray-500 text-center mt-2">
                    The protocol pays the registration gas fee for you.
                </p>
            </div>
        </form>
    )
}

'use client'
import { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { getApiUrl, getLocalNodeUrl } from '@/lib/node-helpers';

interface VotingButtonsProps {
    linkId: string
    contentHash: string // NEW: Global identification
    hosterAddress: string
    initialUpvotes?: number
    initialDownvotes?: number
    initialTrustScore?: number
}

export default function VotingButtons({
    linkId,
    contentHash,
    hosterAddress,
    initialUpvotes = 0,
    initialDownvotes = 0,
    initialTrustScore = 0
}: VotingButtonsProps) {
    const { address: wallet, connect } = useWallet();

    // Local state only for now, ignoring "userVote" history check to simplify
    const [userVote, setUserVote] = useState<number>(0)
    const [upvotes, setUpvotes] = useState(initialUpvotes)
    const [downvotes, setDownvotes] = useState(initialDownvotes)
    const [trustScore, setTrustScore] = useState(initialTrustScore)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleVote = async (value: 1 | -1) => {
        if (!hosterAddress) {
            console.error("VotingButtons: Missing hosterAddress", { linkId, hosterAddress });
            setMessage('Error: Link hoster unknown');
            return;
        }

        if (!wallet) {
            setMessage('Connect wallet to vote')
            connect();
            return;
        }

        if (userVote === value) {
            setMessage('You already voted this way')
            return
        }

        // Get Auth Token for Local Signing
        const currentUserStr = localStorage.getItem('currentUser');
        const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
        const authToken = currentUser.authToken;

        if (!authToken) {
            setMessage('Please login to local node first');
            return;
        }

        try {
            setLoading(true)
            setMessage('Signing & Relaying vote...')

            // Call Local Signer & Relayer (backend determines target URL securely)
            const res = await fetch(getApiUrl('/api/links/vote/signer'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': authToken // Send as header instead of body
                },
                body: JSON.stringify({
                    linkId,
                    contentHash,
                    voteValue: value
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Voting failed");
            }

            const data = await res.json();

            // Update UI
            if (value === 1) {
                setUpvotes(prev => prev + 1);
                // If we got back remote data with new trust score
                if (data.remoteResponse?.vote?.link?.trustScore) {
                    setTrustScore(data.remoteResponse.vote.link.trustScore);
                }
                setMessage('✅ Upvote sent!');
            } else {
                setDownvotes(prev => prev + 1);
                setMessage('✅ Downvote recorded!');
            }

            setUserVote(value);
            setTimeout(() => setMessage(''), 3000);

        } catch (error: any) {
            console.error('Vote error:', error)
            setMessage(`❌ Error: ${error.message}`);
            setTimeout(() => setMessage(''), 5000)
        } finally {
            setLoading(false)
        }
    }

    const getTrustScoreColor = () => {
        if (trustScore >= 61) return 'text-green-400'
        if (trustScore >= 31) return 'text-yellow-400'
        return 'text-red-400'
    }

    const getTrustScoreEmoji = () => {
        if (trustScore >= 61) return '🟢'
        if (trustScore >= 31) return '🟡'
        return '🔴'
    }

    return (
        <div className="flex items-center gap-3">
            {/* Trust Score */}
            <div className={`font-bold ${getTrustScoreColor()}`}>
                {getTrustScoreEmoji()} {trustScore}/100
            </div>

            {/* Upvote Button */}
            <button
                onClick={() => handleVote(1)}
                disabled={loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-all ${userVote === 1
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 hover:bg-green-600/20 text-gray-300 hover:text-green-400'
                    } disabled:opacity-50`}
            >
                <span className="text-lg">👍</span>
                <span className="text-sm">{upvotes}</span>
            </button>

            {/* Downvote Button */}
            <button
                onClick={() => handleVote(-1)}
                disabled={loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-all ${userVote === -1
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 hover:bg-red-600/20 text-gray-300 hover:text-red-400'
                    } disabled:opacity-50`}
            >
                <span className="text-lg">👎</span>
                <span className="text-sm">{downvotes}</span>
            </button>

            {/* Message */}
            {message && (
                <div className={`text-xs ${message.includes('✅') ? 'text-green-400' :
                    message.includes('❌') ? 'text-red-400' :
                        'text-gray-400'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    )
}

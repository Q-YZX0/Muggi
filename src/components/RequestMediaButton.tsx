'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/node-helpers';

export default function RequestMediaButton({
    mediaId,
    initialCount,
    hasRequested,
    isLoggedIn
}: {
    mediaId: string,
    initialCount: number,
    hasRequested: boolean,
    isLoggedIn: boolean
}) {
    const [count, setCount] = useState(initialCount);
    const [requested, setRequested] = useState(hasRequested);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRequest = async () => {
        // No login required for Beta
        if (requested) return;

        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/catalog/request'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaId })
            });
            const data = await res.json();
            if (res.ok) {
                setCount(data.newCount);
                setRequested(true);
            } else {
                alert(data.error || "Failed to request");
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center gap-4 bg-gray-800/80 p-4 rounded-lg border border-gray-700">
            <div className="flex-1">
                <h4 className="font-bold text-gray-200">Content Offline?</h4>
                <p className="text-xs text-gray-400">Request it to notify community nodes.</p>
            </div>
            <button
                onClick={handleRequest}
                disabled={loading || requested}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${requested
                    ? 'bg-green-600/20 text-green-400 border border-green-600/50 cursor-default'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg hover:shadow-purple-500/20'
                    }`}
            >
                {loading ? '...' : requested ? 'Requested' : 'Request Movie'}
                {!loading && <span className="bg-black/20 px-2 py-0.5 rounded text-xs ml-1">{count}</span>}
            </button>
        </div>
    );
}

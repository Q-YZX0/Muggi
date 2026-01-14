'use client'
import { useEffect, useState } from 'react';

interface WatchedBadgeProps {
    tmdbId: string;
    season?: number;
    episode?: number;
}

export default function WatchedBadge({ tmdbId, season, episode }: WatchedBadgeProps) {
    const [count, setCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) return;

        try {
            const currentUser = JSON.parse(currentUserStr);
            if (!currentUser.id) return;
            setIsLoggedIn(true);

            const getPK = (key: string) => `up-${currentUser.id}-${key}`;

            let watchedKey = '';
            if (season !== undefined && episode !== undefined) {
                watchedKey = getPK(`watched-ep-${tmdbId}-${season}-${episode}`);
            } else {
                watchedKey = getPK(`watched-movie-${tmdbId}`);
            }

            const val = parseInt(localStorage.getItem(watchedKey) || "0");
            setCount(val);
        } catch (e) {
            console.error("Error parsing user or reading status", e);
        }
    }, [tmdbId, season, episode]);

    if (!isLoggedIn) return null;

    if (count === 0) {
        return (
            <div className="flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded-md border border-green-500/20">
                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-black text-green-400/80 tracking-tighter">NUEVO</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 bg-indigo-600/20 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
            <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[9px] font-bold text-indigo-300/90 tracking-wider">
                {count > 1 ? `Visto ${count} veces` : 'Visto'}
            </span>
        </div>
    );
}

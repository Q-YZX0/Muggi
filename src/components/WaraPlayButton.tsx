'use client'

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function WaraPlayButton({ linkId }: { linkId: string }) {
    const searchParams = useSearchParams();

    // Create new URLSearchParams merging existing ones with 'play'
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('play', linkId);

    const handleClick = (e: React.MouseEvent) => {
        // Find player and scroll
        const player = document.getElementById('wara-main-player') || document.querySelector('h1');
        if (player) {
            player.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <Link
            href={`?${newParams.toString()}`}
            scroll={false}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1 rounded font-bold flex items-center gap-1"
            onClick={handleClick}
        >
            ▶ Play
        </Link>
    )
}

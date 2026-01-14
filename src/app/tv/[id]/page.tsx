import WaraPlayer from '@/components/WaraPlayer'
import WaraLocalUploader from '@/components/WaraLocalUploader'
import MirrorButton from '@/components/MirrorButton'
import WaraLinkManager from '@/components/WaraLinkManager'
import WaraPlayButton from '@/components/WaraPlayButton'
import VotingButtons from '@/components/VotingButtons'
import RequestMediaButton from '@/components/RequestMediaButton'
import WatchedBadge from '@/components/WatchedBadge'
import Link from 'next/link'
import RegisterOnChainButton from '@/components/RegisterOnChainButton'
import { refreshMoviePage } from '@/app/actions'
import { getApiUrl } from '@/lib/node-helpers'

async function fetchNodeMeta(id: string, type: 'tv' | 'movie') {
    try {
        const res = await fetch(getApiUrl(`/api/catalog/meta/${id}?type=${type}`), { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch metadata');
        const media = await res.json();
        const extended = media.extendedInfo ? JSON.parse(media.extendedInfo) : {};
        return {
            ...media,
            base: media,
            extended,
            seasons: extended.seasons || []
        };
    } catch (e) { return { base: {}, extended: {}, seasons: [] }; }
}

async function fetchNodeSeason(id: string, season: number) {
    try {
        const res = await fetch(getApiUrl(`/api/catalog/meta/${id}/season/${season}`), { cache: 'no-store' });
        return await res.json();
    } catch (e) { return { episodes: [] }; }
}

async function fetchNodeLinks(id: string, type: 'tv' | 'movie', season?: number, episode?: number) {
    try {
        let url = getApiUrl(`/api/links?tmdbId=${id}&mediaType=${type}`);
        if (season) url += `&season=${season}`;
        if (episode) url += `&episode=${episode}`;
        const res = await fetch(url, { cache: 'no-store' });
        return await res.json();
    } catch (e) { return []; }
}

export default async function TVShowPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ play?: string, s?: string, e?: string }> }) {
    const { id } = await params
    const sp = await searchParams
    const forcedLinkId = sp.play

    // Default to Season 1 Episode 1 if not specified
    const selectedSeason = sp.s ? parseInt(sp.s) : 1;
    const selectedEpisode = sp.e ? parseInt(sp.e) : 1;

    // 1. Fetch Basic Metadata (Via Node)
    const media = await fetchNodeMeta(id, 'tv');

    // 2. Fetch Detailed Season Info (Via Node)
    const seasonDetails = await fetchNodeSeason(id, selectedSeason);

    // Request count logic for Request Button
    // @ts-ignore
    const requestCount = media?.requestCount || 0;
    const userHasRequested = false;

    // 3. Fetch links for SPECIFIC Season/Episode (Via Node API)
    const links = await fetchNodeLinks(id, 'tv', selectedSeason, selectedEpisode);

    // Format links for player
    const playerLinks = links.map((l: any) => ({
        id: l.id,
        url: l.url,
        title: l.title || 'Unknown Source',
        waraMetadata: l.waraMetadata || '{}',
        uploaderWallet: l.uploaderWallet
    }))

    // Determine how many episodes (from details or fallback)
    const episodesList = seasonDetails?.episodes || [];
    const currentEpisodeInfo = episodesList.find((e: any) => e.episode_number === selectedEpisode);

    // --- Next Episode Logic ---
    let nextEpisodeUrl = null;
    if (episodesList.find((e: any) => e.episode_number === selectedEpisode + 1)) {
        nextEpisodeUrl = `/tv/${id}?s=${selectedSeason}&e=${selectedEpisode + 1}`;
    } else {
        if (media.seasons?.find((s: any) => s.season_number === selectedSeason + 1)) {
            nextEpisodeUrl = `/tv/${id}?s=${selectedSeason + 1}&e=1`;
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 py-8 px-4">
            <Link href="/" className="text-gray-400 hover:text-white mb-4 inline-block font-bold">&larr; Back to Browse</Link>

            {/* HERO SECTION: Info & Player */}
            <div className="bg-gray-900 rounded-xl p-0 shadow-2xl border border-gray-800 relative overflow-hidden">
                {/* Backdrop */}
                {media.base.backdropPath && (
                    <div className="absolute inset-0 z-0 opacity-20">
                        <img src={`https://image.tmdb.org/t/p/w1280${media.base.backdropPath}`} alt="backdrop" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
                    </div>
                )}

                <div className="relative z-10 p-8 flex flex-col md:flex-row gap-8">
                    {media.base.posterPath && (
                        <div className="hidden md:block w-72 flex-shrink-0">
                            <img
                                src={`https://image.tmdb.org/t/p/w500${media.base.posterPath}`}
                                alt={media.base.title}
                                className="w-full h-auto rounded-lg shadow-lg object-cover aspect-[2/3] border border-gray-700"
                            />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{media.base.title}</h1>
                            <div className="flex flex-col gap-2">
                                <RequestMediaButton
                                    mediaId={media.base.id || id}
                                    initialCount={requestCount}
                                    hasRequested={userHasRequested}
                                    isLoggedIn={true}
                                />
                                <WatchedBadge tmdbId={id} season={selectedSeason} episode={selectedEpisode} />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-6">
                            <span className="bg-purple-900/50 border border-purple-500/30 px-3 py-1 rounded text-sm text-purple-200 font-bold capitalize">{media.base.type}</span>
                            <span className="bg-gray-800/80 border border-gray-700 px-3 py-1 rounded text-sm text-gray-300 font-mono">{media.base.releaseDate?.substring(0, 4) || 'Unknown'}</span>
                            <span className="bg-gray-800/80 border border-gray-700 px-3 py-1 rounded text-sm text-gray-300">Season {selectedSeason} • Ep {selectedEpisode}</span>
                        </div>

                        <p className="text-gray-300 mb-8 max-w-3xl text-lg leading-relaxed drop-shadow-md">
                            {media.base.overview}
                        </p>

                        <div className="bg-black/60 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                            <div className="bg-gray-800/80 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <span>📺 Now Playing:</span>
                                    <span className="text-purple-400">
                                        S{selectedSeason}:E{selectedEpisode} - {currentEpisodeInfo?.name || `Episode ${selectedEpisode}`}
                                    </span>
                                </h3>
                            </div>
                            <WaraPlayer
                                key={`${selectedSeason}-${selectedEpisode}`}
                                links={playerLinks}
                                forcedLinkId={forcedLinkId}
                                nextEpisodeUrl={nextEpisodeUrl}
                                tmdbId={id}
                                season={selectedSeason}
                                episode={selectedEpisode}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SEASONS & EPISODES SELECTOR (Full Width) */}
            <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-6 border border-gray-800 shadow-xl">
                {/* 1. Seasons Tabs */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-400 mb-3 uppercase tracking-wider">Select Season</h3>
                    <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide">
                        {media.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => (
                            <Link
                                key={s.id}
                                href={`/tv/${id}?s=${s.season_number}&e=1`}
                                scroll={false}
                                className={`whitespace-nowrap px-6 py-3 rounded-lg text-sm font-bold transition-all border ${selectedSeason === s.season_number
                                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg scale-105'
                                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'}`}
                            >
                                {s.name || `Season ${s.season_number}`}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* 2. Episodes Grid/List */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>Episodes</span>
                        <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{episodesList.length}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {episodesList.map((ep: any) => {
                            const isSelected = ep.episode_number === selectedEpisode;
                            return (
                                <Link
                                    key={ep.episode_number}
                                    href={`/tv/${id}?s=${selectedSeason}&e=${ep.episode_number}`}
                                    scroll={false}
                                    className={`group flex gap-4 p-3 rounded-xl border transition-all hover:scale-[1.01] ${isSelected
                                        ? 'bg-purple-900/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-500'}`}
                                >
                                    {/* Thumbnail (if available) or Number */}
                                    <div className={`w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden relative ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
                                        {ep.still_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                                loading="lazy"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                alt=""
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-700 flex items-center justify-center font-mono font-bold text-gray-500 text-xl">
                                                {ep.episode_number}
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-purple-300' : 'text-gray-200 group-hover:text-white'}`}>
                                                {ep.episode_number}. {ep.name}
                                            </span>
                                            <WatchedBadge tmdbId={id} season={selectedSeason} episode={ep.episode_number} />
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 leading-tight">
                                            {ep.overview || "No description available."}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* LINKS & UPLOAD SECTION (Moved to bottom) */}
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                <h2 className="text-2xl font-bold mb-4">Availability for S{selectedSeason}:E{selectedEpisode}</h2>
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* LEFT: Available Links */}
                    <div>
                        <ul className="space-y-2 mb-4">
                            {links.map((link: any) => {
                                if (link.trustScore < -5) return null;
                                const isVerified = link.trustScore >= 3;
                                const isSuspicious = link.trustScore < 0;

                                return (
                                    <li key={link.id} className={`p-4 rounded flex flex-col gap-3 border ${isVerified ? 'bg-green-900/20 border-green-700/50' : isSuspicious ? 'bg-red-900/10 border-red-800/30' : 'bg-gray-800 border-gray-700'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${isVerified ? 'text-green-400' : 'text-gray-200'}`}>{link.title}</span>
                                                    {isVerified && <span className="bg-green-600 text-white text-[10px] px-1 rounded">VERIFIED</span>}
                                                </div>
                                                <span className="text-xs text-gray-500 block font-mono">
                                                    {link.uploaderWallet ? `${link.uploaderWallet.substring(0, 6)}...${link.uploaderWallet.substring(38)}` : 'Anonymous'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <WaraPlayButton linkId={link.id} />
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] bg-purple-900/40 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-md font-black uppercase">
                                                        {JSON.parse(link.waraMetadata || '{}').language || 'un'}
                                                    </span>
                                                    <span className="text-[10px] bg-gray-700/80 border border-gray-600 px-2 py-0.5 rounded-md font-bold text-gray-400">
                                                        {JSON.parse(link.waraMetadata || '{}').quality || 'HD'}
                                                    </span>
                                                </div>
                                                <WaraLinkManager linkUrl={link.url} dbLinkId={link.id} onUpdate={refreshMoviePage.bind(null, id)} />
                                                <RegisterOnChainButton linkId={link.id} uploaderWallet={link.uploaderWallet} />
                                                <MirrorButton sourceUrl={link.url} tmdbId={id} mediaType="tv" onMirrored={refreshMoviePage.bind(null, id)} />
                                            </div>
                                        </div>
                                        <VotingButtons
                                            linkId={link.id}
                                            contentHash={JSON.parse(link.waraMetadata || '{}').hash || ''}
                                            hosterAddress={link.uploaderWallet || ''}
                                            initialUpvotes={link.upvotes}
                                            initialDownvotes={link.downvotes}
                                            initialTrustScore={link.trustScore}
                                        />
                                    </li>
                                )
                            })}

                            {links.length === 0 && (
                                <li className="bg-gray-800/50 border border-dashed border-gray-700 rounded-lg p-6 text-center">
                                    <p className="text-gray-400 mb-4">No content found for this specific episode.</p>
                                    <RequestMediaButton
                                        mediaId={media.base.id || id}
                                        initialCount={requestCount}
                                        hasRequested={userHasRequested}
                                        isLoggedIn={true}
                                    />
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* RIGHT: Upload */}
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
                            <span>🚀 Host this Episode</span>
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">
                            Help the community by hosting <strong>S{selectedSeason}:E{selectedEpisode}</strong>. You earn tokens for verified uploads.
                        </p>
                        <WaraLocalUploader
                            tmdbId={id}
                            mediaType="tv"
                            season={selectedSeason}
                            episode={selectedEpisode}
                            title={media.base.title || 'Series'}
                            episodeName={currentEpisodeInfo?.name}
                            onLinkCreated={refreshMoviePage.bind(null, id)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

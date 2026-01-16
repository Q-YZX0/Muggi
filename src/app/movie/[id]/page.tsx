import WaraPlayer from '@/components/WaraPlayer'
import WaraLocalUploader from '@/components/WaraLocalUploader'
import MirrorButton from '@/components/MirrorButton'
import WaraLinkManager from '@/components/WaraLinkManager'
import WaraPlayButton from '@/components/WaraPlayButton'
import VotingButtons from '@/components/VotingButtons'
import RequestMediaButton from '@/components/RequestMediaButton'
import SovereignRegistryButton from '@/components/SovereignRegistryButton'
import WatchedBadge from '@/components/WatchedBadge'
import Link from 'next/link'
import RegisterOnChainButton from '@/components/RegisterOnChainButton'
import { refreshMoviePage } from '@/app/actions'
import { getApiUrl } from '@/lib/node-helpers'

async function fetchNodeMeta(id: string, type: 'tv' | 'movie') {
    try {
        const res = await fetch(getApiUrl(`/api/catalog/meta/${id}?type=${type}`), { cache: 'no-store' });
        const data = await res.json();
        const extended = data.extendedInfo ? JSON.parse(data.extendedInfo) : {};
        return {
            ...data,
            base: data,
            extended,
            seasons: extended.seasons || []
        };
    } catch (e) { return { base: {}, extended: {}, seasons: [] }; }
}

async function fetchNodeLinks(id: string, type: 'tv' | 'movie', season?: number, episode?: number) {
    try {
        let url = getApiUrl(`/api/links?tmdbId=${id}&mediaType=${type}`);
        if (season) url += `&season=${season}`;
        if (episode) url += `&episode=${episode}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("fetchNodeLinks error:", e);
        return [];
    }
}

export default async function MoviePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ play?: string }> }) {
    const { id } = await params
    const { play: forcedLinkId } = await searchParams

    // 1. Fetch Metadata (Via Node API)
    const media = await fetchNodeMeta(id, 'movie')

    // Use requestCount from the metadata fetched via node
    // @ts-ignore
    const requestCount = media?.requestCount || 0;
    const userHasRequested = false;

    // 2. Fetch links from Node API
    const links = await fetchNodeLinks(id, 'movie');

    // Format links for player
    const playerLinks = links.map((l: any) => ({
        id: l.id,
        url: l.url,
        title: l.title || 'Unknown Source',
        waraMetadata: l.waraMetadata || '{}',
        uploaderWallet: l.uploaderWallet // PASS THE FIELD!
    }))

    return (
        <div className="max-w-7xl mx-auto space-y-8 py-8 px-4">
            <Link href="/" className="text-gray-400 hover:text-white mb-4 inline-block font-bold">&larr; Back to Browse</Link>

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
                                className="w-full h-auto rounded-lg shadow-2xl object-cover aspect-[2/3] border border-gray-700"
                            />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{media.base.title}</h1>
                            <div className="flex flex-col gap-2">
                                <SovereignRegistryButton
                                    sourceId={media.base.id || id}
                                    type="movie"
                                    initialStatus={media.base.status}
                                    title={media.base.title}
                                />
                                <WatchedBadge tmdbId={id} />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-8">
                            <span className="bg-purple-900/50 border border-purple-500/30 px-3 py-1 rounded text-sm text-purple-200 font-bold capitalize">{media.base.type}</span>
                            <span className="bg-gray-800/80 border border-gray-700 px-3 py-1 rounded text-sm text-gray-300 font-mono">{media.base.releaseDate?.substring(0, 4) || 'Unknown'}</span>
                            {media.base.imdbId && (
                                <a href={`https://www.imdb.com/title/${media.base.imdbId}`} target="_blank" className="bg-yellow-600/20 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded text-sm hover:bg-yellow-600/30 font-bold transition-all">IMDb</a>
                            )}
                        </div>

                        <p className="text-gray-300 mb-8 max-w-3xl text-lg leading-relaxed drop-shadow-md">
                            {media.base.overview}
                        </p>

                        {media.extended?.credits?.cast?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-500 mb-3 text-sm uppercase tracking-wider">Starring</h4>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {media.extended.credits.cast.slice(0, 8).map((actor: any) => (
                                        <div key={actor.id} className="flex-shrink-0 w-24 text-center group">
                                            {actor.profile_path ? (
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                                                    className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-gray-700 group-hover:border-purple-500 transition-all shadow-lg mx-auto"
                                                    alt={actor.name}
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-2 text-xs border-2 border-gray-700 mx-auto">No img</div>
                                            )}
                                            <div className="text-xs font-bold truncate text-gray-200 group-hover:text-white">{actor.name}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{actor.character}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span>📺 Watch Now</span>
                            </h3>
                            <div className="bg-black/60 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                                <WaraPlayer links={playerLinks} forcedLinkId={forcedLinkId} tmdbId={id} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 shadow-xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-purple-600 rounded-full"></span>
                    Community Links ({links.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <ul className="space-y-3 mb-4">
                            {links.map((link: any) => {
                                if (link.trustScore < -5) return null;
                                const isVerified = link.trustScore >= 3;
                                const isSuspicious = link.trustScore < 0;

                                return (
                                    <li key={link.id} className={`p-4 rounded-xl flex flex-col gap-4 border transition-all ${isVerified ? 'bg-green-900/20 border-green-700/50 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : isSuspicious ? 'bg-red-900/10 border-red-800/30' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-bold ${isVerified ? 'text-green-400' : 'text-gray-200'}`}>{link.title}</span>
                                                    {isVerified && <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">VERIFIED</span>}
                                                    {isSuspicious && <span className="bg-red-600/50 text-white text-[10px] px-2 py-0.5 rounded font-bold">UNVERIFIED</span>}
                                                </div>
                                                <span className="text-xs text-gray-500 block font-mono">
                                                    by {link.uploaderWallet ? `${link.uploaderWallet.substring(0, 6)}...${link.uploaderWallet.substring(38)}` : 'Anonymous'}
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
                                                <WaraLinkManager linkUrl={link.url} onUpdate={refreshMoviePage.bind(null, id)} dbLinkId={link.id} />
                                                <RegisterOnChainButton linkId={link.id} uploaderWallet={link.uploaderWallet} />
                                                <MirrorButton sourceUrl={link.url} tmdbId={id} mediaType="movie" onMirrored={refreshMoviePage.bind(null, id)} />
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
                                <li className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-8 text-center">
                                    <p className="text-gray-400 mb-6 italic text-lg">No community sources found for this title.</p>
                                    <SovereignRegistryButton
                                        sourceId={media.base.id || id}
                                        type="movie"
                                        initialStatus={media.base.status}
                                        title={media.base.title}
                                    />
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="bg-gray-800/30 p-8 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-purple-400 mb-2">
                                <span>🚀 Host & Earn Rewards</span>
                            </h3>
                            <p className="text-sm text-gray-400">
                                Share your content with the community and earn MuggiCoin for every verified view from your node.
                            </p>
                        </div>
                        <WaraLocalUploader
                            tmdbId={id}
                            mediaType="movie"
                            title={media.base.title || 'Movie'}
                            onLinkCreated={refreshMoviePage.bind(null, id)}
                        />
                    </div>
                </div>
            </div>
        </div >
    )
}

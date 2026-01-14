import Link from 'next/link';
import { getApiUrl } from '@/lib/node-helpers';

// Proxy wrappers (kept for signature compatibility if needed)
export async function getMediaMetadata(tmdbId: string, type: string = 'movie') { // 1. Fetch Metadata (Server-Side from Local Node)
  try {
    const res = await fetch(getApiUrl(`/api/catalog/meta/${tmdbId}?type=${type}`));
    const data = await res.json();

    // 2. If it's a TV Show, implies picking Season 1 by default for the Hero?
    // Usually we just show the Show metadata.
    // But if we need season data:
    // const seasonRes = await fetch(getApiUrl(`/api/catalog/meta/${tmdbId}/season/${season}`));
    return data; // Return the fetched data
  } catch (e) { return {}; } // Keep original catch return for getMediaMetadata
}

export async function getSeasonDetails(tmdbId: string, season: number) {
  try {
    const res = await fetch(getApiUrl(`/api/catalog/meta/${tmdbId}/season/${season}`));
    return await res.json();
  } catch (e) { return { episodes: [] }; }
}

export async function searchAndCacheMedia(query: string) {
  // Proxy to search api
  try {
    const res = await fetch(getApiUrl(`/api/catalog/search?q=${query}`));
    const data = await res.json();
    return data.map((d: any) => d.base); // Adapter
  } catch (e) { return []; }
}

export const revalidate = 0; // Always fresh data

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string, genre?: string, tab?: string }> }) {
  const { q, genre, tab } = await searchParams;
  const activeTab = tab || 'available'; // 'available' or 'requests'

  let movies = [];

  const GENRES = [
    "Action", "Action & Adventure", "Adventure", "Animation", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "History",
    "Horror", "Kids", "Music", "Mystery", "News", "Reality", "Romance",
    "Sci-Fi & Fantasy", "Science Fiction", "Soap", "Talk",
    "TV Movie", "Thriller", "War", "War & Politics", "Western"
  ].sort();

  try {
    if (q) {
      const res = await fetch(getApiUrl(`/api/catalog/search?q=${encodeURIComponent(q)}`));
      movies = await res.json();
    } else if (activeTab === 'available') {
      const res = await fetch(getApiUrl(`/api/catalog/recent?genre=${encodeURIComponent(genre || '')}`));
      movies = await res.json();
    } else {
      // Requests
      const res = await fetch(getApiUrl(`/api/catalog/requests?genre=${encodeURIComponent(genre || '')}`));
      movies = await res.json();
    }
  } catch (e) {
    console.error("Home Catalog Fetch Error", e);
    movies = [];
  }

  if (!Array.isArray(movies)) movies = [];

  return (
    <div className="max-w-6xl mx-auto py-12">
      {!q && (
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-6 font-display">
            Welcome to Muggi
          </h1>
          <div className="text-xl text-gray-400 max-w-2xl mx-auto" style={{ marginTop: '-20px' }}>
            The decentralized movie & series manager. <br></br><div className="text-sm">Powered by Community Nodes</div>
          </div>
        </div>
      )}

      {/* TABS: Available / Requests (Only show if NOT searching) */}
      {!q && (
        <div className="flex gap-4 mb-6 border-b border-gray-800 justify-center">
          <Link
            href={`/?tab=available${genre ? `&genre=${genre}` : ''}`}
            className={`px-6 py-3 font-bold transition-all ${activeTab === 'available' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Available in Network
          </Link>
          <Link
            href={`/?tab=requests${genre ? `&genre=${genre}` : ''}`}
            className={`px-6 py-3 font-bold transition-all ${activeTab === 'requests' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Requested Community
          </Link>
        </div>
      )}

      {/* GENRE FILTER BUBBLES */}
      {!q && (
        <div className="flex overflow-x-auto p-1 mb-8 gap-3 no-scrollbar mask-gradient">
          <Link
            href="/"
            className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition-all ${!genre ? 'bg-white text-black scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            All Recent
          </Link>
          {GENRES.map(g => (
            <Link
              key={g}
              href={`/?genre=${g}`}
              className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition-all ${genre === g ? 'bg-purple-600 text-white scale-105 shadow-purple-500/50 shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {g}
            </Link>
          ))}
        </div>
      )}

      <div>
        {q && (
          <h2 className="text-2xl font-bold mb-6 border-l-4 border-purple-500 pl-4 flex items-center justify-between">
            <span>Search Results for "{q}"</span>
          </h2>
        )}
        {!q && (
          <h2 className="text-2xl font-bold mb-6 border-l-4 border-purple-500 pl-4 flex items-center justify-between">
            <span>
              {genre ? `${genre}` : (activeTab === 'available' ? 'Recent Uploads' : 'Top Requests')}
              {movies.length > 0 && <span className="text-sm font-normal text-gray-500 ml-3">({movies.length})</span>}
            </span>
          </h2>
        )}

        {movies.length === 0 && (
          <div className="text-center bg-gray-900/50 p-12 rounded-xl border border-dashed border-gray-700">
            <p className="text-gray-400 text-lg mb-4">No content found.</p>
            {q && <p className="text-sm text-gray-500">Try a different search term.</p>}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((ext: any, index: number) => {
            const movie = ext.base;
            const isAvailable = ext.isAvailable;

            return (
              <Link key={`${movie.tmdbId}-${index}`} href={`/${movie.type === 'tv' ? 'tv' : 'movie'}/${movie.tmdbId}`} className="block group" >
                <div className={`aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden relative shadow-lg transition-all group-hover:-translate-y-2 group-hover:ring-2 
                    ${isAvailable
                    ? 'group-hover:shadow-green-500/20 group-hover:ring-green-500/50 ring-1 ring-green-900/30'
                    : 'group-hover:shadow-blue-500/20 group-hover:ring-blue-500/50 opacity-80 group-hover:opacity-100'
                  }`}>
                  {movie.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                      alt={movie.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!isAvailable ? 'grayscale-[0.5] group-hover:grayscale-0' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-4xl font-bold bg-gradient-to-b from-gray-800 to-gray-900">?</div>
                  )}

                  <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-md z-10 
                      ${movie.type === 'tv' ? 'bg-indigo-600/90 text-white' : 'bg-rose-600/90 text-white'}`}>
                    {movie.type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                  </div>

                  <div className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-md z-10
                      ${isAvailable ? 'bg-green-500/90' : 'bg-gray-600/80'}`}>
                    {isAvailable ? 'AVAILABLE' : 'EMPTY'}
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="font-bold truncate text-white text-sm">{movie.title}</h3>
                    <p className="text-xs text-gray-400 capitalize flex items-center justify-between mt-1">
                      <span>{movie.releaseDate?.substring(0, 4)}</span>
                      <span className="text-[10px] border border-gray-600 px-1 rounded">{movie.type}</span>
                    </p>
                    {!isAvailable && <p className="text-[10px] text-blue-400 mt-1 text-center font-bold">Click to Upload</p>}
                  </div>
                </div>
              </Link >
            )
          })}
        </div >
      </div >
    </div >
  )
}

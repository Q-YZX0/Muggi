'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWallet'
import { getApiUrl, getLocalNodeUrl } from '@/lib/node-helpers'

type LinkType = {
    id: string
    url: string
    title: string
    waraMetadata: string
    uploaderWallet?: string // NEW: Direct wallet access
}

interface WaraPlayerProps {
    links: LinkType[];
    forcedLinkId?: string;
    nextEpisodeUrl?: string | null;
    tmdbId?: string;
    season?: number;
    episode?: number;
}

export default function WaraPlayer({ links, forcedLinkId, nextEpisodeUrl, tmdbId, season, episode }: WaraPlayerProps) {
    const { address: wallet } = useWallet();
    const router = useRouter();

    // State
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false)
    const [isAdPlaying, setIsAdPlaying] = useState(false)
    const [adTimeLeft, setAdTimeLeft] = useState<number | null>(null)
    const [adCampaign, setAdCampaign] = useState<any>(null)
    const [adVideoUrl, setAdVideoUrl] = useState<string | null>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [videoSrc, setVideoSrc] = useState<string | null>(null)
    const [subtitles, setSubtitles] = useState<{ id: string, url: string, lang: string, label: string }[]>([])
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [watchedCount, setWatchedCount] = useState<number>(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userWallet, setUserWallet] = useState<string | null>(null);

    const logsEndRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const initRef = useRef(false);
    const processingRef = useRef(false);
    const finishingAdRef = useRef(false);
    const lastSavedTime = useRef(0);

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, [logs])

    const getPK = (key: string) => {
        if (typeof window === 'undefined') return key;
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id || 'guest';
        return `up-${userId}-${key}`;
    };

    useEffect(() => {
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) {
            setIsLoggedIn(false);
            setUserWallet(null);
            return;
        }
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id) {
            setIsLoggedIn(true);
            setUserWallet(currentUser.walletAddress || null);
        }

        const savedVolume = localStorage.getItem(getPK('wara-volume'));
        if (savedVolume) setVolume(parseFloat(savedVolume));
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return;
        const targetLink = links[currentIndex];
        if (targetLink) {
            // For now, prioritize episode/movie level count if available, otherwise link level
            let watchedKey = '';
            if (tmdbId) {
                if (season !== undefined && episode !== undefined) {
                    watchedKey = getPK(`watched-ep-${tmdbId}-${season}-${episode}`);
                } else {
                    watchedKey = getPK(`watched-movie-${tmdbId}`);
                }
            } else {
                watchedKey = getPK(`watched-count-${targetLink.id}`);
            }

            const val = parseInt(localStorage.getItem(watchedKey) || "0");
            setWatchedCount(val);
        }
    }, [currentIndex, links, isLoggedIn, tmdbId, season, episode]);

    useEffect(() => {
        if (links.length === 0 || initRef.current) return;
        initRef.current = true;

        let startIndex = 0;
        if (forcedLinkId) {
            const found = links.findIndex(l => l.id === forcedLinkId);
            if (found !== -1) startIndex = found;
        } else {
            // Prioritize link by global language preference
            const prefLang = localStorage.getItem('wara_pref_lang') || 'es';
            const prioritizedIndex = links.findIndex(l => {
                try {
                    const meta = JSON.parse(l.waraMetadata);
                    return meta.language === prefLang;
                } catch (e) { return false; }
            });
            if (prioritizedIndex !== -1) startIndex = prioritizedIndex;
        }

        setCurrentIndex(startIndex);
        triggerPlay(startIndex);
    }, [links, forcedLinkId]);

    const triggerPlay = (index: number) => {
        if (processingRef.current) return;
        processingRef.current = true;

        setIsPlaying(true);
        setVideoSrc(null);
        setError(null);
        setLogs([]);
        setSubtitles([]);
        setIsAdPlaying(false);
        setAdCampaign(null);
        setAdVideoUrl(null);
        setAdTimeLeft(null);
        finishingAdRef.current = false;

        setTimeout(() => startPlaybackFlow(index), 100);
    };

    const startPlaybackFlow = async (index: number) => {
        const targetLink = links[index];
        if (!targetLink) {
            setError("No source available.");
            processingRef.current = false;
            return;
        }

        // wallet is from hook now
        if (wallet && !userWallet) {
            setUserWallet(wallet);
            setIsLoggedIn(true);
        }

        setLogs(prev => [...prev, `Initializing: ${targetLink.title}...`]);

        // 1. Determine Node URL (handle NAT loopback)
        let nodeBaseUrl = targetLink.url.split('/wara/')[0];

        // Check if this is the local node's public IP (NAT loopback fix)
        try {
            const statusRes = await fetch(getApiUrl('/admin/status'));
            if (statusRes.ok) {
                const status = await statusRes.json();
                const publicIp = status.network?.publicIp || status.publicIp;
                if (publicIp && nodeBaseUrl.includes(publicIp)) {
                    // This is our own public IP, use localhost to avoid NAT loopback
                    nodeBaseUrl = getLocalNodeUrl();
                    setLogs(prev => [...prev, `[NAT] Detected own public IP, using localhost`]);
                }
            }
        } catch (e) {
            // Ignore, continue with original URL
        }

        // Fallback for private IPs when accessing from localhost
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            if (nodeBaseUrl.includes('192.168.') || nodeBaseUrl.includes('10.0.') || nodeBaseUrl.includes('172.')) {
                nodeBaseUrl = `http://localhost:${nodeBaseUrl.split(':').pop()}`;
            }
        }
        if (!nodeBaseUrl || nodeBaseUrl === "") {
            nodeBaseUrl = getLocalNodeUrl();
        }

        const isLocal = targetLink.url.includes('localhost') || targetLink.url.includes('127.0.0.1');
        if (!wallet && !isLocal) {
            setError("Login required for remote content.");
            processingRef.current = false;
            return;
        }

        // 2. Ask Node for Access Permission (Phase 5 Refinement)
        try {
            // Extract the unique Link ID from the URL (the 'Salt')
            // URL format: http://node-url/wara/[LINK_ID]
            const urlParts = targetLink.url.split('/wara/')[1] || '';
            const specificLinkId = urlParts.split('#')[0] || targetLink.id;

            setLogs(prev => [...prev, `[Auth] Requesting access for link ${specificLinkId.substring(0, 8)}...`]);
            const query = new URLSearchParams({
                wallet: wallet || '',
                linkId: specificLinkId
            });
            const res = await fetch(`${nodeBaseUrl}/wara/access/auth?${query.toString()}`);
            if (!res.ok) throw new Error("Node auth check failed");

            const decision = await res.json();

            if (decision.status === 'play') {
                setLogs(prev => [...prev, `[Auth] ✅ Access Granted (${decision.reason})`]);
                processingRef.current = false;
                await resolveAndPlay(index, nodeBaseUrl);
            } else if (decision.status === 'sign_premium') {
                setLogs(prev => [...prev, `[Auth] Premium detected. Signing proof...`]);

                try {
                    // 1. Sign Locally
                    const message = decision.message || `Premium View: ${specificLinkId}`;
                    const { signature, address } = await signWithLocalNode(message);

                    // 2. Submit to Remote Node
                    const proofRes = await fetch(`${nodeBaseUrl}/wara/proof/premium`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            wallet: address,
                            signature,
                            message,
                            linkId: specificLinkId
                        })
                    });

                    if (!proofRes.ok) throw new Error("Proof submission failed");
                    setLogs(prev => [...prev, `[Auth] ✅ Proof Accepted.`]);
                    processingRef.current = false;
                    await resolveAndPlay(index, nodeBaseUrl);

                } catch (signErr: any) {
                    console.error("Premium sign error", signErr);
                    setLogs(prev => [...prev, `[Auth] ❌ Premium Sign Failed: ${signErr.message}`]);
                    // Fallback to ad? Or stop? 
                    // Let's try to fall back to ad flow if possible, but the node decides.
                    // For now, error out.
                    setError("Premium verification failed.");
                    processingRef.current = false;
                }

            } else if (decision.status === 'show_ad') {
                setLogs(prev => [...prev, `[Ads] Mandatory ad required.`]);
                await playAd(decision.ad, index, nodeBaseUrl);
            } else {
                setError(decision.error || "Access Denied");
                processingRef.current = false;
            }
        } catch (e: any) {
            console.error("Auth check failed", e);
            // Non-critical fallback for development
            setLogs(prev => [...prev, `[Auth] ⚠️ Auth check error. Trying direct playback...`]);
            processingRef.current = false;
            await resolveAndPlay(index, nodeBaseUrl);
        }
    }

    const signWithLocalNode = async (message: string) => {
        // Get Local Auth Token
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) throw new Error("No session found");
        const { authToken } = JSON.parse(currentUserStr);
        if (!authToken) throw new Error("No auth token");

        const res = await fetch(getApiUrl('/api/auth/sign-proof'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authToken, message })
        });

        if (!res.ok) throw new Error("Local signing failed");
        return await res.json();
    }

    const playAd = async (campaign: any, index: number, originalNodeBaseUrl: string) => {
        try {
            setLogs(prev => [...prev, `[Ads] Resolving Ad...`]);
            const { resolveStreamMetadata } = await import('../lib/resolver');
            const { configureStream } = await import('../lib/stream-manager');

            const [adId, adKey] = campaign.videoHash.includes('#') ? campaign.videoHash.split('#') : [campaign.videoHash, ''];

            const sources = [
                { url: `${getLocalNodeUrl()}/wara/${adId}`, key: adKey || '' }
            ];

            const resolved = await resolveStreamMetadata(sources, (m: string) => setLogs(p => [...p, `[Ads] ${m}`]));
            if (!resolved) throw new Error("Ad not found");

            await configureStream(resolved.map.id, resolved.sourceUsed.key || adKey, resolved.map.iv || "", `${resolved.finalEndpoint}/stream`, resolved.map.size);

            setAdTimeLeft(Number(campaign.duration));
            setAdCampaign(campaign);
            setAdVideoUrl(`/wara-virtual/${resolved.map.id}?t=${Date.now()}`);
            setIsAdPlaying(true);
            setLogs(prev => [...prev, `[Ads] Starting #${campaign.id} (${campaign.duration}s)...`]);

        } catch (e: any) {
            console.error(e);
            setIsAdPlaying(false);
            processingRef.current = false;
            await resolveAndPlay(index, originalNodeBaseUrl);
        }
    }

    useEffect(() => {
        if (isAdPlaying && adTimeLeft !== null && adTimeLeft > 0) {
            const t = setInterval(() => {
                setAdTimeLeft(prev => {
                    if (prev === null || prev <= 1) {
                        clearInterval(t);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(t);
        }
    }, [isAdPlaying, !!adCampaign]);

    useEffect(() => {
        if (isAdPlaying && adTimeLeft === 0 && !finishingAdRef.current) {
            const targetLink = links[currentIndex];
            const urlParts = targetLink.url.split('/wara/')[1] || '';
            const specificLinkId = urlParts.split('#')[0] || targetLink.id;

            let contentHash = '';
            try {
                const meta = JSON.parse(targetLink.waraMetadata);
                if (meta.hash) contentHash = meta.hash;
            } catch (e) { }

            finishAd(currentIndex, specificLinkId, contentHash);
        }
    }, [adTimeLeft, isAdPlaying]);

    const finishAd = async (index: number, specificLinkId: string, contentHash: string) => {
        if (finishingAdRef.current) return;
        finishingAdRef.current = true;
        let authError = false;

        try {
            setLogs(prev => [...prev, `[Ads] Complete. Signing Proof of Attention...`]);
            const viewer = wallet;
            // Best Source: Direct property from catalog. Fallback: Parse from metadata if missing.
            let uploaderWallet: string | null = links[index]?.uploaderWallet || null;

            if (!uploaderWallet) {
                const metaRaw = links[index]?.waraMetadata;
                if (metaRaw && metaRaw.startsWith('{')) {
                    try {
                        const meta = JSON.parse(metaRaw);
                        uploaderWallet = meta.hoster || null;
                    } catch (e) {
                        uploaderWallet = null;
                    }
                }
            }

            // Valid hoster check
            const isAddress = (a: any): a is string => typeof a === 'string' && /^0x[a-fA-F0-9]{40}$/.test(a);

            if (!viewer) {
                authError = true;
                throw new Error("Login required to verify ad view.");
            }
            if (viewer && isAddress(uploaderWallet) && adCampaign) {
                // --- NEW: Fluid Signature via Node Delegation ---
                // We ask the node to sign the proof as us (the viewer). 
                // This avoids constant MetaMask popups for every ad view.
                let nodeBaseUrl = links[index].url.split('/wara/')[0];
                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    if (nodeBaseUrl.includes('192.168.') || nodeBaseUrl.includes('10.0.') || nodeBaseUrl.includes('172.')) {
                        nodeBaseUrl = `http://localhost:${nodeBaseUrl.split(':').pop()}`;
                    }
                }
                if (!nodeBaseUrl || nodeBaseUrl === "") {
                    nodeBaseUrl = "http://127.0.0.1:21746";
                }

                let sig: string;
                try {
                    setLogs(prev => [...prev, `[Ads] Signing with Local Node...`]);

                    const { signature } = await signAdViewWithLocalNode(
                        adCampaign.id,
                        viewer,
                        contentHash,
                        specificLinkId
                    );
                    sig = signature;

                } catch (signErr: any) {
                    console.error("Local Sign failed", signErr);
                    setLogs(prev => [...prev, `[Ads] ❌ Sign Error: ${signErr.message}`]);
                    return;
                }

                setLogs(prev => [...prev, `[Ads] ✅ Proof Authenticated! Submitting...`]);

                const url = `${nodeBaseUrl}/wara/proof/submit`;
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            campaignId: adCampaign.id,
                            linkId: specificLinkId,
                            contentHash: contentHash,
                            viewerAddress: viewer,
                            uploaderWallet: uploaderWallet, // Correct payment target
                            signature: sig
                        })
                    });
                    if (response.ok) {
                        // Record visit to skip ads for 4 hours using this specific Link ID
                        localStorage.setItem(getPK(`ad-view-${specificLinkId}`), Date.now().toString());
                    } else {
                        setLogs(prev => [...prev, `[Ads] ⚠️ Node error: ${response.status}`]);
                    }
                } catch (nodeErr) {
                    setLogs(prev => [...prev, `[Ads] ⚠️ Connection failed.`]);
                }
            }
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes("Login")) {
                setError(e.message);
                authError = true;
            }
        } finally {
            if (!authError) {
                // Determine nodeBaseUrl for resolveAndPlay
                let nodeBaseUrl = links[index].url.split('/wara/')[0];
                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                    if (nodeBaseUrl.includes('192.168.') || nodeBaseUrl.includes('10.0.') || nodeBaseUrl.includes('172.')) {
                        nodeBaseUrl = `http://localhost:${nodeBaseUrl.split(':').pop()}`;
                    }
                }
                if (!nodeBaseUrl || nodeBaseUrl === "") nodeBaseUrl = getLocalNodeUrl();

                setIsAdPlaying(false);
                setAdCampaign(null);
                setAdVideoUrl(null);
                processingRef.current = false;
                await resolveAndPlay(index, nodeBaseUrl);
            }
        }
    }

    const signAdViewWithLocalNode = async (campaignId: any, viewer: string, contentHash: string, linkId: string) => {
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) throw new Error("No session found");
        const { authToken } = JSON.parse(currentUserStr);
        if (!authToken) throw new Error("No auth token");

        const res = await fetch(getApiUrl('/api/auth/sign-ad-proof'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authToken, campaignId, viewer, contentHash, linkId })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Local signing failed");
        }
        return await res.json();
    }

    const resolveAndPlay = async (index: number, nodeBaseUrl: string) => {
        if (processingRef.current && !isAdPlaying) return;
        processingRef.current = true;

        const targetLink = links[index];
        const [url, keyFromUrl] = targetLink.url.split('#');
        let extractionKey = keyFromUrl;

        // Fallback: Extract from metadata if not in URL
        if (!extractionKey && targetLink.waraMetadata) {
            try {
                const meta = typeof targetLink.waraMetadata === 'string'
                    ? JSON.parse(targetLink.waraMetadata)
                    : targetLink.waraMetadata;
                if (meta.key) extractionKey = meta.key;
            } catch (e) { }
        }

        // Apply resolved nodeBaseUrl to the individual link URL
        const originalBase = targetLink.url.split('/wara/')[0];
        const finalUrl = url.replace(originalBase, nodeBaseUrl);

        try {
            const { resolveStreamMetadata } = await import('../lib/resolver');

            const resolved = await resolveStreamMetadata([{ url: finalUrl, key: extractionKey || '' }], (m: string) => setLogs(p => [...p, `> ${m}`]));
            if (!resolved) throw new Error("Stream not found on reachable nodes");

            const { map, sourceUsed, finalEndpoint } = resolved;

            if (map.subtitles) {
                setSubtitles(map.subtitles.map((s: any) => ({ id: s.id, lang: s.lang, label: s.label, url: `${finalEndpoint}/subtitle/${s.lang}` })));
            }

            const decryptionKey = map.key || sourceUsed.key || extractionKey;
            if (decryptionKey && (decryptionKey.length === 32 || decryptionKey.length === 64 || decryptionKey.length === 66)) {
                // Decryption flow (Virtual Bridge)
                const { configureStream } = await import('../lib/stream-manager');
                setLogs(prev => [...prev, `[Player] Encrypted content detected. Using decryption bridge...`]);
                await configureStream(map.id, decryptionKey, map.iv, `${finalEndpoint}/stream`, map.size);
                setVideoSrc(`/wara-virtual/${map.id}?t=${Date.now()}`);
            } else {
                // Direct flow (Standard /wara/ stream)
                setLogs(prev => [...prev, `[Player] Playing direct stream.`]);
                setVideoSrc(`${finalEndpoint}/stream`);
            }

            setLogs(prev => [...prev, `Playback ready!`]);
        } catch (e: any) {
            setError(e.message);
            handleFailover(index);
        }
    }

    const handleFailover = (idx: number) => {
        processingRef.current = false;
        if (idx + 1 < links.length) {
            setCurrentIndex(idx + 1);
            setTimeout(() => triggerPlay(idx + 1), 1000);
        } else setError("All sources failed.");
    }

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;

        // Restore Volume
        const savedVolume = localStorage.getItem(getPK('wara-volume'));
        const savedMuted = localStorage.getItem(getPK('wara-muted'));

        if (savedVolume) {
            const vol = parseFloat(savedVolume);
            videoRef.current.volume = vol;
            setVolume(vol);
        }
        if (savedMuted) {
            const mute = savedMuted === 'true';
            videoRef.current.muted = mute;
            setIsMuted(mute);
        }

        // Restore Progress
        const targetLink = links[currentIndex];
        if (targetLink) {
            const savedProgress = localStorage.getItem(getPK(`progress-${targetLink.id}`));
            if (savedProgress) {
                const time = parseFloat(savedProgress);
                if (time > 5) {
                    videoRef.current.currentTime = time;
                    setLogs(prev => [...prev, `[Player] Resumed playback at ${Math.floor(time / 60)}m ${Math.floor(time % 60)}s`]);
                }
            }
        }

        // Restore Subtitles selection (best effort)
        const savedLang = localStorage.getItem(getPK('wara-sub-lang'));
        if (savedLang && videoRef.current.textTracks) {
            for (let i = 0; i < videoRef.current.textTracks.length; i++) {
                const track = videoRef.current.textTracks[i];
                track.mode = (track.language === savedLang) ? 'showing' : 'hidden';
            }
        }

        // Update watched count for indicator
        const watchedKey = getPK(`watched-count-${targetLink.id}`);
        setWatchedCount(parseInt(localStorage.getItem(watchedKey) || "0"));
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current || isAdPlaying) return;
        const now = videoRef.current.currentTime;
        // Save to localStorage every 5 seconds
        if (Math.abs(now - lastSavedTime.current) > 5) {
            const targetLink = links[currentIndex];
            if (targetLink) {
                localStorage.setItem(getPK(`progress-${targetLink.id}`), now.toString());
                lastSavedTime.current = now;

                // Sync to DB if logged in (less frequent)
                if (userWallet && tmdbId && Math.floor(now) % 30 === 0) {
                    import('@/app/actions').then(({ updatePlaybackProgress }) => {
                        updatePlaybackProgress({
                            tmdbId,
                            season,
                            episode,
                            wallet: userWallet,
                            currentTime: now,
                            duration: videoRef.current?.duration || 0
                        });
                    });
                }
            }
        }
    };

    const handleVolumeChange = () => {
        if (!videoRef.current) return;
        localStorage.setItem(getPK('wara-volume'), videoRef.current.volume.toString());
        localStorage.setItem(getPK('wara-muted'), videoRef.current.muted.toString());
    };

    const handleSubChange = (e: any) => {
        // Track tracks change via the video element's textTracks list
        if (!videoRef.current) return;
        const tracks = videoRef.current.textTracks;
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].mode === 'showing') {
                localStorage.setItem(getPK('wara-sub-lang'), tracks[i].language);
                break;
            }
        }
    };

    if (links.length === 0) return <div className="p-8 text-center">No sources.</div>;

    return (
        <div className="bg-black p-4 rounded-xl border border-gray-800">
            <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                {error && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-red-400 z-50 p-6 text-center">
                        <svg className="w-12 h-12 mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div className="text-xl font-bold mb-2 text-white">Playback Error</div>
                        <div className="mb-6">{error}</div>
                        {error.includes("Login") ? (
                            <button onClick={() => router.push('/login')} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors">
                                Login / Connect Wallet
                            </button>
                        ) : (
                            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors">
                                Reload Page
                            </button>
                        )}
                    </div>
                )}

                {isLoggedIn && !isAdPlaying && !error && (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-indigo-600/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                        {watchedCount === 0 ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">NUEVO</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                    Visto {watchedCount === 1 ? '1 vez' : `${watchedCount} veces`}
                                </span>
                            </>
                        )}
                    </div>
                )}

                {!videoSrc && !isAdPlaying && !error && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin h-12 w-12 border-4 border-gray-700 border-t-indigo-500 rounded-full mb-4"></div>
                        <div className="text-gray-400 text-sm animate-pulse">Loading Content...</div>
                    </div>
                )}

                {isAdPlaying && adVideoUrl && (
                    <div className="absolute inset-0 bg-black z-10">
                        <video key={adVideoUrl} className="w-full h-full" autoPlay muted playsInline>
                            <source src={adVideoUrl} type="video/mp4" />
                        </video>
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <button
                                onClick={() => {
                                    const reason = prompt("Report Reason (1=Spam/Malicious, 2=Wrong Category, 3=Illegal):", "1");
                                    if (reason && userWallet && adCampaign) {
                                        fetch(getApiUrl('/api/ads/report'), {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ wallet: userWallet, id: adCampaign.id, reason: parseInt(reason) })
                                        }).then(r => r.json()).then(d => {
                                            if (d.success) alert("Ad Reported. Thank you.");
                                            else alert("Error: " + d.error);
                                        });
                                    }
                                }}
                                className="bg-red-900/80 hover:bg-red-700 px-3 py-1 rounded border border-red-500/50 text-red-200 text-sm flex items-center gap-1 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8H3zM3 10V3m0 0l5 3 5-3 5 3V3" /></svg>
                                Report
                            </button>
                            <div className="bg-black/80 px-3 py-1 rounded border border-yellow-500/50 text-yellow-400 text-sm font-bold">
                                {adTimeLeft}s
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded text-white text-xs">Muted for Autoplay</div>
                    </div>
                )}

                {videoSrc && (
                    <video
                        ref={videoRef}
                        key={videoSrc}
                        src={videoSrc}
                        controls
                        className="w-full h-full"
                        autoPlay
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        onVolumeChange={handleVolumeChange}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => {
                            processingRef.current = false;
                            const targetLink = links[currentIndex];
                            if (targetLink) {
                                // Reset progress to 0 for next time
                                localStorage.setItem(getPK(`progress-${targetLink.id}`), "0");
                                lastSavedTime.current = 0;

                                // Increment watched count locally
                                const linkKey = getPK(`watched-count-${targetLink.id}`);
                                const curLink = parseInt(localStorage.getItem(linkKey) || "0");
                                localStorage.setItem(linkKey, (curLink + 1).toString());

                                // Global level count
                                let globalKey = '';
                                if (tmdbId) {
                                    if (season !== undefined && episode !== undefined) {
                                        globalKey = getPK(`watched-ep-${tmdbId}-${season}-${episode}`);
                                    } else {
                                        globalKey = getPK(`watched-movie-${tmdbId}`);
                                    }
                                }

                                if (globalKey) {
                                    const curGlobal = parseInt(localStorage.getItem(globalKey) || "0");
                                    const nextVal = curGlobal + 1;
                                    localStorage.setItem(globalKey, nextVal.toString());
                                    setWatchedCount(nextVal);
                                } else {
                                    const nextVal = curLink + 1;
                                    setWatchedCount(nextVal);
                                }

                                // Sync to DB
                                if (userWallet && tmdbId) {
                                    import('@/app/actions').then(({ updatePlaybackProgress }) => {
                                        updatePlaybackProgress({
                                            tmdbId,
                                            season,
                                            episode,
                                            wallet: userWallet,
                                            currentTime: 0,
                                            duration: videoRef.current?.duration || 0,
                                            isEnded: true
                                        });
                                    });
                                }
                            }
                            if (nextEpisodeUrl) router.push(nextEpisodeUrl);
                        }}
                    >
                        {subtitles.map(s => <track key={s.id} kind="subtitles" src={s.url} srcLang={s.lang} label={s.label} default={localStorage.getItem(getPK('wara-sub-lang')) === s.lang} />)}
                    </video>
                )}
            </div>
            <div className="mt-4 bg-gray-950 p-2 rounded font-mono text-[10px] text-green-400/80 h-24 overflow-y-auto border border-gray-800">
                {logs.map((log, i) => <div key={i}>{log}</div>)}
                <div ref={logsEndRef} />
            </div>
        </div>
    )
}

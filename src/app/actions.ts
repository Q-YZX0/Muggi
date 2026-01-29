'use server'

import { revalidatePath } from 'next/cache';

const NODE_API = 'http://127.0.0.1:21746';

export async function refreshMoviePage(id: string) {
    revalidatePath(`/movie/${id}`);
    revalidatePath(`/tv/${id}`);
}

export async function syncNetworkAction() {
    try {
        console.log("Delegating P2P Sync to WaraNode...");

        // We tell the node to start a sync immediately
        const res = await fetch(`${NODE_API}/api/network/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error("Node sync failed");

        return { success: true };
    } catch (e) {
        console.error("Sync delegation failed:", e);
        return { success: false, error: (e as Error).message };
    }
}

// --- Web3 Actions (Proxiados al Nodo para descentralización total) ---

export async function bindWallet(email: string, address: string) {
    try {
        const res = await fetch(`${NODE_API}/api/user/bind`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, address })
        });
        if (!res.ok) throw new Error("Failed to bind wallet in Node");

        revalidatePath('/');
        return { success: true };
    } catch (e) {
        console.error("BindWallet Error", e);
        return { success: false };
    }
}

export async function claimRewards(email: string) {
    return { success: false, message: "Claiming enabled via WaraNode (Coming Soon)" };
}

export async function updatePlaybackProgress(data: {
    tmdbId: string,
    season?: number,
    episode?: number,
    wallet: string,
    currentTime: number,
    duration: number,
    isEnded?: boolean
}) {
    try {
        const res = await fetch(`${NODE_API}/stream/user/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("Failed to update progress in Node");

        revalidatePath(`/movie/${data.tmdbId}`);
        revalidatePath(`/tv/${data.tmdbId}`);
        return { success: true };
    } catch (e) {
        console.error("UpdateProgress Error", e);
        return { success: false };
    }
}

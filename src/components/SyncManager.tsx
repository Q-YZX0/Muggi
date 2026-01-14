'use client';
import { useEffect, useState } from 'react';
import { syncNetworkAction } from '@/app/actions';
import { registerWaraServiceWorker } from '@/lib/stream-manager';

export default function SyncManager() {
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const doSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        console.log('[AutoSync] Starting...');
        try {
            await syncNetworkAction();
            setLastSync(new Date());
            console.log('[AutoSync] Completed.');
        } catch (e) {
            console.error('[AutoSync] Failed', e);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        // Register Service Worker for P2P Streaming
        if (typeof window !== 'undefined') registerWaraServiceWorker();

        // Initial Sync on Boot (with small delay)
        const timer = setTimeout(() => doSync(), 5000);

        // Periodic Sync (Every 30 mins)
        const interval = setInterval(() => {
            doSync();
        }, 30 * 60 * 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    // Minimal UI (Hidden or Small Indicator)
    return null;
}

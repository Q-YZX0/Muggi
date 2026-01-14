
export function registerWaraServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('/wara-sw.js')
            .then(registration => {
                console.log('[WaraClient] Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('[WaraClient] Service Worker registration failed:', error);
            });
    }
}

/**
 * Tells the Service Worker about a new encrypted stream.
 * This allows the browser's <img> or <video> tags to fetch data from /wara-virtual/{streamId}
 * and have it decrypted on-the-fly.
 */
export async function configureStream(streamId: string, key: string, iv: string, remoteUrl: string, size: number): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
        console.warn('[WaraClient] SW not ready');
        return false;
    }

    return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
            if (event.data.success) {
                console.log(`[WaraClient] Stream ${streamId} configured via SW`);
                resolve(true);
            } else {
                resolve(false);
            }
        };

        navigator.serviceWorker.controller?.postMessage({
            type: 'CONFIGURE_STREAM',
            streamId,
            key,
            iv,
            remoteUrl,
            size
        }, [channel.port2]);
    });
}

export const streamManager = {
    init: () => registerWaraServiceWorker(),
    configureStream
};

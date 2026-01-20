
export interface WaraSource {
    url: string;
    key?: string;
}

export interface WaraMap {
    id: string;
    size: number;
    iv: string;
    key?: string;
    subtitles?: Array<{ id: string, lang: string, label: string }>;
}

export interface ResolvedMetadata {
    map: WaraMap;
    sourceUsed: WaraSource;
    finalEndpoint: string;
}

/**
 * Resolves metadata for a .wara resource from multiple sources.
 * It tries each source until one responds with valid metadata.
 */
export async function resolveStreamMetadata(
    sources: WaraSource[],
    logCallback?: (msg: string) => void
): Promise<ResolvedMetadata | null> {
    for (const source of sources) {
        try {
            if (logCallback) logCallback(`Probing source: ${source.url.substring(0, 40)}...`);

            // Format: url is something like http://node:port/stream/SALT
            // Metadata is at http://node:port/stream/SALT/map
            const metaUrl = source.url.endsWith('/') ? `${source.url}map` : `${source.url}/map`;

            const res = await fetch(metaUrl, {
                signal: AbortSignal.timeout(5000)
            });

            if (!res.ok) {
                if (logCallback) logCallback(`Source failed with status ${res.status}`);
                continue;
            }

            const map: WaraMap = await res.json();

            // The final endpoint is the base URL of the source
            // e.g. http://node:port/stream/SALT
            return {
                map,
                sourceUsed: source,
                finalEndpoint: source.url
            };
        } catch (e: any) {
            if (logCallback) logCallback(`Source error: ${e.message}`);
        }
    }

    return null;
}

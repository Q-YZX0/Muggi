/**
 * Get the local node URL from environment or default
 */
export function getLocalNodeUrl(): string {
    // Priority: localStorage (active node) > default
    if (typeof window !== 'undefined') {
        const active = localStorage.getItem('active_wara_node');
        if (active) {
            try {
                let url = '';
                // If it's a JSON object (from WaraNodeDashboard)
                if (active.startsWith('{')) {
                    const parsed = JSON.parse(active);
                    url = parsed.url || '';
                } else {
                    url = active;
                }

                if (url) {
                    url = url.trim().replace(/\/$/, '');
                    // Fix common typo: http:/ instead of http://
                    if (url.startsWith('http:/') && !url.startsWith('http://')) {
                        url = url.replace('http:/', 'http://');
                    }
                    if (url.startsWith('https:/') && !url.startsWith('https://')) {
                        url = url.replace('https:/', 'https://');
                    }
                    return url;
                }
            } catch (e) {
                console.warn("[NodeHelpers] Failed to parse active_wara_node", e);
            }
        }
    }
    return "http://127.0.0.1:21746";
}

/**
 * Helper to get absolute API URL for the active node
 */
export function getApiUrl(path: string): string {
    const baseUrl = getLocalNodeUrl().replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Check if a URL belongs to the local node
 */
export function isLocalNodeUrl(url: string): boolean {
    const localNodeUrl = getLocalNodeUrl();
    return url.startsWith(localNodeUrl) ||
        url.includes('127.0.0.1') ||
        url.includes('localhost');
}

/**
 * Fetch user's remote nodes
 */
export async function getUserRemoteNodes(userId: string): Promise<Array<{ id: string; url: string; name: string }>> {
    try {
        const response = await fetch(getApiUrl(`/api/manager/node?userId=${userId}`));
        if (!response.ok) {
            throw new Error('Failed to fetch remote nodes');
        }
        const { nodes } = await response.json();
        return nodes;
    } catch (error) {
        console.error('Error fetching remote nodes:', error);
        return [];
    }
}

/**
 * Check if content URL belongs to user's nodes (local or remote)
 */
export async function isOwnNode(contentUrl: string, userId?: string): Promise<boolean> {
    // Check local node first (always owned)
    if (isLocalNodeUrl(contentUrl)) {
        return true;
    }

    // Check remote nodes if user is logged in
    if (userId) {
        const remoteNodes = await getUserRemoteNodes(userId);
        return remoteNodes.some(node => contentUrl.startsWith(node.url));
    }

    return false;
}

/**
 * Format WARA/MUGGI tokens (18 decimals)
 */
export function formatWARA(wei: string | bigint | number): string {
    if (!wei) return '0.00';
    try {
        const value = typeof wei === 'string' ? BigInt(wei.split('.')[0]) : BigInt(wei);
        // Basic conversion for 18 decimals
        const divisor = BigInt(10 ** 15); // Show 3 decimal places precision
        const formatted = Number(value / divisor) / 1000;
        return formatted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
        return '0.00';
    }
}

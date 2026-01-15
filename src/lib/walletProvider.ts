import { getApiUrl } from './node-helpers';

// Global state (Lightweight Session)
let managedSession: { id: string, address: string, username: string, token?: string } | null = null;

export const WalletProvider = {
    // Check for saved session on load
    init() {
        if (typeof window === 'undefined') return;

        const storedAddress = localStorage.getItem('muggi_address');
        const storedUser = localStorage.getItem('muggi_user');
        const storedCurrent = localStorage.getItem('currentUser');

        if (storedAddress && storedUser) {
            let id = '';
            let token = localStorage.getItem('muggi_token') || '';
            if (storedCurrent) {
                try {
                    const parsed = JSON.parse(storedCurrent);
                    id = parsed.id;
                    if (parsed.authToken) token = parsed.authToken;
                } catch (e) { }
            }
            managedSession = { id, address: storedAddress, username: storedUser, token };
        } else {
            // Migration from old PK storage?
            const legacyPk = localStorage.getItem('muggi_pk');
            if (legacyPk) this.logout();
        }
    },

    async login(username: string, password: string): Promise<boolean> {
        try {
            const res = await fetch(getApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (data.success && data.walletAddress) {
                managedSession = {
                    id: data.id,
                    address: data.walletAddress,
                    username: data.username,
                    token: data.authToken
                };

                // Persist Session (No Private Key!)
                localStorage.setItem('muggi_user', data.username);
                localStorage.setItem('muggi_address', data.walletAddress);
                if (data.authToken) localStorage.setItem('muggi_token', data.authToken);

                localStorage.setItem('currentUser', JSON.stringify({
                    id: data.id,
                    username: data.username,
                    walletAddress: data.walletAddress,
                    authToken: data.authToken
                }));
                // Cleanup old sensitive data
                localStorage.removeItem('muggi_pk');

                return true;
            }
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async register(username: string, password: string, privateKey?: string): Promise<any> {
        const res = await fetch(getApiUrl('/api/auth/register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, privateKey })
        });
        return await res.json();
    },

    logout() {
        managedSession = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('muggi_user');
            localStorage.removeItem('muggi_address');
            localStorage.removeItem('muggi_token'); // Clear Token
            localStorage.removeItem('muggi_pk');
            localStorage.removeItem('currentUser');
            window.location.reload();
        }
    },

    getWallet() {
        return managedSession;
    },

    // Explicit getter for components
    get address() {
        return managedSession?.address;
    },

    getUsername() {
        return managedSession?.username;
    },

    getAddress() {
        return managedSession?.address;
    },

    getUserId() {
        return managedSession?.id;
    },

    isLoggedIn(): boolean {
        return !!managedSession;
    },

    getAuthToken() {
        return managedSession?.token || localStorage.getItem('muggi_token');
    }
};

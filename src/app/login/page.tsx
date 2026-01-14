'use client';
import { useState, useEffect } from 'react';
import { WalletProvider } from '@/lib/walletProvider';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';

export default function LoginPage() {
    const router = useRouter();
    const { refreshWallet, isConnected } = useWallet();
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (isConnected) {
            router.push('/');
        }
    }, [isConnected, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        if (isRegister) {
            const res = await WalletProvider.register(formData.username, formData.password);
            if (res.success) {
                setSuccessMsg('Account created! Logging in...');
                // Auto login
                const logged = await WalletProvider.login(formData.username, formData.password);
                if (logged) {
                    await refreshWallet();
                    router.push('/');
                } else {
                    setIsRegister(false); // Switch to login tab
                    setLoading(false);
                }
            } else {
                setError(res.error || 'Registration failed');
                setLoading(false);
            }
        } else {
            const logged = await WalletProvider.login(formData.username, formData.password);
            if (logged) {
                await refreshWallet();
                router.push('/');
            } else {
                setError('Invalid username or password');
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen pt-24 px-6 flex justify-center items-start">
            <div className="glass-panel p-8 rounded-2xl max-w-md w-full border border-white/10">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-6 text-center">
                    {isRegister ? 'Create Account' : 'Welcome Back'}
                </h1>

                {/* Tabs */}
                <div className="flex mb-6 border-b border-white/10">
                    <button
                        onClick={() => setIsRegister(false)}
                        className={`flex-1 pb-3 text-sm font-medium ${!isRegister ? 'text-white border-b-2 border-primary-500' : 'text-white/50'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsRegister(true)}
                        className={`flex-1 pb-3 text-sm font-medium ${isRegister ? 'text-white border-b-2 border-primary-500' : 'text-white/50'}`}
                    >
                        Create Account
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/70 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-white/70 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, username: formData.username, password: e.target.value })}
                        />
                        {isRegister && <p className="text-xs text-white/40 mt-1">This password encrypts your private key. Do not forget it.</p>}
                    </div>

                    {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
                    {successMsg && <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20">{successMsg}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-medium py-3 rounded-lg hover:shadow-lg hover:shadow-primary-500/20 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isRegister ? 'Create & Login' : 'Login')}
                    </button>
                </form>

                <div className="mt-6 text-center border-t border-white/10 pt-4">
                    <p className="text-sm text-white/50">
                        {isRegister ? "Already have an account? " : "New to Muggi? "}
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            {isRegister ? "Login here" : "Create account"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

import { PrismaClient } from '@prisma/client';
import { getTokenBalance } from '@/lib/web3';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
    // 1. Get all users who have linked a wallet
    const users = await prisma.user.findMany({
        where: { walletAddress: { not: null } },
        select: { name: true, walletAddress: true, reputation: true }
    });

    // 2. Fetch REAL On-Chain Balances for each
    const leaderboard = await Promise.all(users.map(async (u) => {
        const balance = await getTokenBalance(u.walletAddress!);
        return {
            name: u.name || 'Anonymous',
            address: u.walletAddress!,
            reputation: u.reputation,
            balance: parseFloat(balance)
        };
    }));

    // 3. Sort by Balance (Descending)
    leaderboard.sort((a, b) => b.balance - a.balance);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
                    Global Network Ranking
                </h1>
                <p className="text-gray-400 mb-8">
                    Top nodes and curators verified on the <span className="text-yellow-500 font-mono">MuggiChain</span>.
                </p>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Rank</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Wallet Address</th>
                                <th className="p-4 text-right">WARA Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {leaderboard.map((user, index) => (
                                <tr key={user.address} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 font-mono text-gray-500">#{index + 1}</td>
                                    <td className="p-4 font-bold flex items-center gap-3">
                                        {index === 0 && <span className="text-2xl">👑</span>}
                                        {index === 1 && <span className="text-2xl">🥈</span>}
                                        {index === 2 && <span className="text-2xl">🥉</span>}
                                        {user.name}
                                    </td>
                                    <td className="p-4 font-mono text-indigo-400 text-sm">
                                        {user.address}
                                    </td>
                                    <td className="p-4 text-right font-bold text-yellow-500">
                                        {user.balance.toLocaleString()} WARA
                                    </td>
                                </tr>
                            ))}

                            {leaderboard.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                        No wallets linked yet. Be the first!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

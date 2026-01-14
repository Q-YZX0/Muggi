import WaraNodeDashboard from '@/components/WaraNodeDashboard';

export default function NodePage() {
    return (
        <main className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">My Wara Node</h1>
                <p className="text-gray-400">Manage your local streaming node and monitor performance.</p>
            </header>

            <WaraNodeDashboard />
        </main>
    );
}

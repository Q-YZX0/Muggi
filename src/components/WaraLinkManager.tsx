'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/node-helpers';

export default function WaraLinkManager({ linkUrl, onUpdate, dbLinkId }: { linkUrl: string, onUpdate: () => Promise<void> | void, dbLinkId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const router = useRouter();

    // Extract ID from URL: http://host:port/wara/{ID}#KEY or http://host:port/wara/{ID}
    const match = linkUrl.match(/\/wara\/([a-z0-9]+)/);
    const linkId = match ? match[1] : null;

    if (!linkId) return null; // Can't manage non-wara links

    const handleSubtitleUpload = async (file: File, lang: string) => {
        setLogs(prev => [...prev, `Uploading Subtitle (${lang})...`]);

        try {
            const urlParts = new URL(linkUrl);
            const nodeBaseUrl = `${urlParts.protocol}//${urlParts.host}`;

            // Find Auth Key
            let authKey = '';
            try {
                const storedNodes = JSON.parse(localStorage.getItem('wara_saved_nodes') || '[]');
                const allNodes = [...storedNodes, { url: 'http://localhost:21746', key: '' }];
                const match = allNodes.find((n: any) => nodeBaseUrl.includes(n.url.replace('http://', '').replace('https://', '').split('/')[0]));
                if (match) authKey = match.key || '';
            } catch (e) { }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${nodeBaseUrl}/admin/subtitle`, true);
            if (authKey) xhr.setRequestHeader('X-Wara-Key', authKey);

            xhr.setRequestHeader('X-Link-Id', linkId);
            xhr.setRequestHeader('X-Lang', lang);
            xhr.setRequestHeader('X-Label', lang.toUpperCase());
            xhr.setRequestHeader('X-Filename', file.name);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');

            xhr.onload = () => {
                if (xhr.status === 200) {
                    setLogs(prev => [...prev, `Subtitle (${lang}) attached successfully!`]);
                    onUpdate();
                } else {
                    setLogs(prev => [...prev, `Failed: ${xhr.statusText}`]);
                }
            };
            xhr.send(file);
        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, `Error connecting to node`]);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure? This will delete the file from the NODE permanently.")) return;

        setLogs(prev => [...prev, "Deleting..."]);
        try {
            // 1. Extract Node Base URL
            const urlParts = new URL(linkUrl);
            const nodeBaseUrl = `${urlParts.protocol}//${urlParts.host}`;

            // 2. Find Auth Key
            let authKey = '';
            try {
                const storedNodes = JSON.parse(localStorage.getItem('wara_saved_nodes') || '[]');
                const allNodes = [...storedNodes, { url: 'http://localhost:21746', key: '' }];
                const match = allNodes.find((n: any) => nodeBaseUrl.includes(n.url.replace('http://', '').replace('https://', '').split('/')[0]));
                if (match) authKey = match.key || '';
            } catch (e) { }

            // 3. Delete from Node
            try {
                const res = await fetch(`${nodeBaseUrl}/admin/delete/${linkId}`, {
                    method: 'DELETE',
                    headers: { 'X-Wara-Key': authKey }
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        setLogs(prev => [...prev, "File already deleted from Node."]);
                    } else {
                        const errText = await res.text();
                        throw new Error(errText || res.statusText);
                    }
                } else {
                    setLogs(prev => [...prev, "Deleted from Node."]);
                }
            } catch (nodeErr) {
                const msg = (nodeErr as Error).message;
                if (!msg.includes('already deleted')) {
                    // If User confirms, we proceed to DB delete. If not, we throw/return.
                    const force = confirm(`Node deletion failed (${msg}).\n\nForce remove from Muggi Database anyway?`);
                    if (!force) return;
                    setLogs(prev => [...prev, "Force deleting from DB..."]);
                }
            }

            // 4. Delete from Muggi DB
            // We use the dbLinkId if passed
            if (dbLinkId) {
                setLogs(prev => [...prev, "Cleaning Database..."]);
                const dbRes = await fetch(getApiUrl('/api/links/delete'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ linkId: dbLinkId })
                });
                if (dbRes.ok) {
                    setLogs(prev => [...prev, "Removed from Muggi DB."]);
                } else {
                    const json = await dbRes.json();
                    setLogs(prev => [...prev, `DB Fail: ${json.error}`]);
                }
            } else {
                setLogs(prev => [...prev, "Warning: DB ID unknown, manual refresh required."]);
            }

            // 5. Trigger UI Refresh
            setLogs(prev => [...prev, "Refreshing UI..."]);
            await onUpdate(); // Wait for Server Action revalidation
            router.refresh();

        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, `Error: ${(e as Error).message}`]);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
            >
                🛠 Manage
            </button>
        )
    }

    return (
        <div className="bg-gray-800 p-2 rounded border border-gray-600 mt-2">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-300">Manage Link {linkId.substring(0, 6)}...</span>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-2">
                <div className="text-xs text-gray-400">Upload Subtitles:</div>
                <div className="flex gap-1">
                    <select className="bg-gray-900 text-xs text-white p-1 rounded w-16" id={`subLang-${linkId}`}>
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                        <option value="fr">FR</option>
                    </select>
                    <input
                        type="file"
                        accept=".vtt,.srt"
                        id={`subFile-${linkId}`}
                        className="text-[10px] text-gray-400 w-24"
                    />
                    <button
                        onClick={() => {
                            const fileInput = document.getElementById(`subFile-${linkId}`) as HTMLInputElement;
                            const langSelect = document.getElementById(`subLang-${linkId}`) as HTMLSelectElement;
                            const file = fileInput.files?.[0];
                            if (file) handleSubtitleUpload(file, langSelect.value);
                        }}
                        className="bg-blue-600 text-white text-[10px] px-2 rounded"
                    >
                        Up
                    </button>
                </div>

                <div className="border-t border-gray-700 mt-2 pt-2">
                    <button
                        onClick={handleDelete}
                        className="w-full bg-red-900/50 hover:bg-red-800 text-red-200 text-xs py-1 rounded border border-red-800"
                    >
                        🗑️ Delete Link & File
                    </button>
                </div>

                {logs.length > 0 && (
                    <div className="mt-2 bg-black/30 p-1 text-[10px] font-mono text-green-400 max-h-16 overflow-y-auto">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </div>
        </div>
    )
}

'use client';

import { useState } from 'react';
import { db } from '@/src/lib/firebase';
import { collection, getDocs, limit, query, setDoc, doc, Timestamp } from 'firebase/firestore';

export default function FirebaseDebug() {
    const [status, setStatus] = useState<string>('idle');
    const [details, setDetails] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const runDiagnostics = async () => {
        setIsLoading(true);
        setStatus('Running diagnostics...');
        setDetails('');
        const logs: string[] = [];

        const log = (msg: string) => {
            console.log(`[FirebaseDebug] ${msg}`);
            logs.push(`${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`);
            setDetails(logs.join('\n'));
        };

        try {
            log('Starting Server-Side Diagnostics...');
            log('Initiating request to /api/admin/diagnostics...');

            const res = await fetch('/api/admin/diagnostics');
            const data = await res.json();

            if (res.ok) {
                if (data.status === 'ok') {
                    setStatus('✅ Server Online');
                    log('Server reports successful connection!');
                    if (data.steps && Array.isArray(data.steps)) {
                        data.steps.forEach((step: string) => logs.push(step));
                        setDetails(logs.join('\n'));
                    }
                } else {
                    throw new Error(data.error || 'Unknown server error');
                }
            } else {
                throw new Error(data.error || `HTTP ${res.status}`);
            }

        } catch (error: any) {
            console.error('Diagnostics failed:', error);
            setStatus('❌ Server Connection Failed');
            log(`ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-700 dark:text-zinc-200">Infrastructure Diagnostics</h3>
                <button
                    onClick={runDiagnostics}
                    disabled={isLoading}
                    className="px-3 py-1 bg-zinc-600 hover:bg-zinc-700 text-white text-xs rounded shadow-sm disabled:opacity-50"
                >
                    {isLoading ? 'Running...' : 'Run Diagnostics'}
                </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-zinc-500">Status:</span>
                <span className={`text-sm font-bold ${status.includes('Failed') ? 'text-red-600' : status.includes('Online') ? 'text-green-600' : 'text-zinc-600'}`}>
                    {status}
                </span>
            </div>

            {details && (
                <div className="mt-2">
                    <pre className="text-[10px] font-mono bg-zinc-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {details}
                    </pre>
                </div>
            )}
        </div>
    );
}

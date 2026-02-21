import React from 'react';

interface CopilotSuggestionProps {
    suggestion: string | number | null;
    onAccept: () => void;
    onReject: () => void;
    children: React.ReactNode;
}

export function CopilotSuggestion({ suggestion, onAccept, onReject, children }: CopilotSuggestionProps) {
    if (suggestion === null || suggestion === undefined) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col space-y-2 mt-1">
            <div className="ring-2 ring-indigo-300 rounded-md ring-offset-1 p-0.5 bg-indigo-50/30 transition-all border border-transparent">
                {children}
            </div>

            <div className="bg-white shadow-md border border-indigo-200 rounded-md px-3 py-2 flex items-center space-x-3 w-fit max-w-full animate-in slide-in-from-top-2 fade-in relative z-10">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 text-indigo-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Suggests:
                </span>

                <span className="text-sm font-medium text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100 flex-1 truncate max-w-md">
                    {String(suggestion)}
                </span>

                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
                    <button
                        type="button"
                        onClick={onAccept}
                        className="px-2 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center transition-colors"
                    >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                    </button>
                    <button
                        type="button"
                        onClick={onReject}
                        className="p-1 rounded bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 flex items-center justify-center transition-colors"
                        title="Reject"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

import React from 'react';

interface InlineCopilotTriggerProps {
    onClick: () => void;
    isLoading?: boolean;
    title?: string;
    className?: string;
}

export function InlineCopilotTrigger({ onClick, isLoading, title = "Ask AI Copilot", className = "" }: InlineCopilotTriggerProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            title={title}
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors ml-1.5 align-middle ${className}`}
        >
            {isLoading ? (
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            )}
        </button>
    );
}

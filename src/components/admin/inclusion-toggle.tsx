import React from 'react';
import { InclusionType } from "@/src/lib/types";

interface InclusionToggleProps {
    value: InclusionType;
    onChange: (value: InclusionType) => void;
    className?: string;
}

const ORDER: InclusionType[] = ['required', 'standard', 'optional'];

const LABELS: Record<InclusionType, string> = {
    required: 'Required',
    standard: 'Standard (Opt-out)',
    optional: 'Optional (Opt-in)'
};

const STYLES: Record<InclusionType, string> = {
    required: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/50',
    standard: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/50',
    optional: 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700'
};

export function InclusionToggle({ value, onChange, className = '' }: InclusionToggleProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission if in form
        e.stopPropagation(); // Prevent parent clicks

        const currentIndex = ORDER.indexOf(value);
        const nextIndex = (currentIndex + 1) % ORDER.length;
        onChange(ORDER[nextIndex]);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors select-none ${STYLES[value] || STYLES.optional} ${className}`}
            title="Click to cycle: Required -> Standard -> Optional"
        >
            {LABELS[value] || LABELS.optional}
        </button>
    );
}

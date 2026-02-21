import React, { useState, useRef, useEffect } from 'react';

interface TraceabilityPopoverProps {
    matchedRules?: { ruleId: string; ruleName: string; description?: string }[];
    reasoning?: string;
}

/**
 * TraceabilityPopover
 * 
 * An accessible, unobtrusive indicator that shows the selection logic for a BOM item.
 * Uses Tailwind CSS for premium styling and micro-animations.
 */
export const TraceabilityPopover: React.FC<TraceabilityPopoverProps> = ({ matchedRules, reasoning }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Accessibility: Close on Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!matchedRules && !reasoning) return null;

    return (
        <div className="relative inline-flex items-center ml-2" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-help group"
                aria-label="View selection logic"
                aria-expanded={isOpen}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3 h-3 group-hover:scale-110 transition-transform duration-200"
                >
                    <path d="M12 2l2.42 4.9 5.41.79-3.92 3.81.93 5.39L12 14.35l-4.84 2.54.92-5.39-3.92-3.81 5.42-.79L12 2z" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200 pointer-events-none"
                    role="tooltip"
                >
                    <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
                        Selection Traceability
                    </div>

                    <div className="space-y-4">
                        {matchedRules && matchedRules.length > 0 ? (
                            matchedRules.map((rule, idx) => (
                                <div key={idx} className="group/item">
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-start gap-2">
                                        <span className="mt-0.5 text-indigo-500">•</span>
                                        {rule.ruleName}
                                    </div>
                                    {rule.description && (
                                        <div className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1.5 ml-3 font-medium bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-700/50">
                                            <code>{rule.description}</code>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-slate-600 dark:text-slate-300 ml-3 italic">
                                {reasoning}
                            </div>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-3 h-3 rotate-45 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800"></div>
                </div>
            )}
        </div>
    );
};

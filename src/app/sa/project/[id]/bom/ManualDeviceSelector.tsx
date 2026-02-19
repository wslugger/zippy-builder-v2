"use client";

import { useState, useEffect } from "react";

function CheckIcon() {
    return (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}

interface ManualDeviceSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

export function ManualDeviceSelector({ value, onChange, options }: ManualDeviceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        if (!isOpen) return;
        const close = () => setIsOpen(false);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [isOpen]);

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-lg shadow-sm text-left text-sm flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-slate-300"
            >
                <span className={!selectedOption ? "text-slate-500 italic" : "font-medium"}>
                    {selectedOption ? selectedOption.label : "Auto-detect"}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-[200px] bg-white rounded-lg shadow-lg border border-slate-100 py-1 max-h-60 overflow-y-auto left-0 sm:left-auto sm:right-0">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                        Select Edge Device...
                    </div>
                    <button
                        type="button"
                        onClick={() => { onChange(""); setIsOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between group ${!value ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                    >
                        <span className={!value ? "font-semibold" : ""}>-- Auto-detect --</span>
                        {!value && <CheckIcon />}
                    </button>
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between group ${value === option.value ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                        >
                            <span className={value === option.value ? "font-semibold" : ""}>{option.label}</span>
                            {value === option.value && <CheckIcon />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

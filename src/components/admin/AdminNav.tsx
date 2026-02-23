'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
    href: string;
    label: string;
    active?: boolean;
}

const NavLink = ({ href, label, active }: NavItemProps) => (
    <Link
        href={href}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${active
            ? 'border-blue-500 text-zinc-900 dark:text-white'
            : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-700'
            }`}
    >
        {label}
    </Link>
);

interface DropdownProps {
    label: string;
    items: { href: string; label: string }[];
    active?: boolean;
}

const NavDropdown = ({ label, items, active }: DropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-flex items-center" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 cursor-pointer h-full ${active || isOpen
                    ? 'border-blue-500 text-zinc-900 dark:text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-700'
                    }`}
            >
                {label}
                <svg
                    className={`ml-1 h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded-xl shadow-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function AdminNav() {
    const pathname = usePathname();

    const isCatalogActive = [
        '/admin/catalog',
        '/admin/services',
        '/admin/packages',
        '/admin/features',
        '/admin/site-definitions'
    ].includes(pathname);
    const isSettingsActive = [
        '/admin/ingest',
        '/admin/metadata',
        '/admin/bom-logic',
        '/admin/bom-parameters'
    ].some(path => pathname.startsWith(path));

    return (
        <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/admin" className="flex-shrink-0 flex items-center font-bold text-xl tracking-tight mr-10 hover:opacity-80 transition-opacity">
                            <span className="text-zinc-900 dark:text-white">Zippy</span>
                            <span className="text-blue-600">Builder</span>
                        </Link>
                        <div className="hidden sm:flex sm:space-x-8">
                            <NavLink href="/admin" label="Hub" active={pathname === '/admin'} />
                            <NavLink href="/admin/dashboard" label="Dashboard" active={pathname === '/admin/dashboard'} />

                            <NavDropdown
                                label="Catalog"
                                active={isCatalogActive}
                                items={[
                                    { href: '/admin/catalog', label: 'Equipment' },
                                    { href: '/admin/services', label: 'Services' },
                                    { href: '/admin/packages', label: 'Packages' },
                                    { href: '/admin/features', label: 'Features' },
                                    { href: '/admin/site-definitions', label: 'Site Types' },
                                ]}
                            />

                            <NavDropdown
                                label="Settings & Data"
                                active={isSettingsActive}
                                items={[
                                    { href: '/admin/ingest', label: 'Ingestion' },
                                    { href: '/admin/metadata', label: 'Metadata' },
                                    { href: '/admin/bom-logic', label: 'BOM Logic' },
                                    { href: '/admin/bom-parameters', label: 'Global Params' },
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center space-x-4">
                            <span className="px-3 py-1 text-[10px] tracking-wider uppercase font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
                                Admin System
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

'use client';

import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';

// --- Mock Data ---

const userActivityData = [
    { name: 'Today', uniqueUsers: 1, returningUsers: 1 },
    { name: 'This Week', uniqueUsers: 1, returningUsers: 1 },
    { name: 'This Month', uniqueUsers: 1, returningUsers: 0 },
];

const lifecycleData = [
    { name: 'Started', value: 44, color: '#3B82F6' },
    { name: 'Recommended Package', value: 28, color: '#8B5CF6' },
    { name: 'Recommended Design', value: 17, color: '#10B981' },
    { name: 'BOM', value: 0, color: '#94A3B8' },
];

const conversionData = [
    { name: 'Recommended Package', value: 0 },
    { name: 'Recommended Design', value: 0 },
    { name: 'BOM', value: 0 },
];

const packagePopularityData = [
    { name: 'Cost Centric', value: 28, percentage: '64%', color: '#3B82F6' },
    { name: 'Business-Critical', value: 8, percentage: '18%', color: '#8B5CF6' },
    { name: 'Cloud Centric', value: 4, percentage: '9%', color: '#10B981' },
    { name: 'Security Centric', value: 2, percentage: '5%', color: '#F59E0B' },
    { name: 'Generic Enterprise', value: 2, percentage: '5%', color: '#3B82F6' },
];

const vendorPreferenceData = [
    { name: 'meraki', value: 28, percentage: '64%', color: '#3B82F6' },
    { name: 'cisco', value: 16, percentage: '36%', color: '#8B5CF6' },
];

// --- Components ---

interface StatCardProps {
    title: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    colorClass: string;
    bgColorClass: string;
}

const StatCard = ({ title, value, subtext, icon, colorClass, bgColorClass }: StatCardProps) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${bgColorClass} flex items-center justify-center ${colorClass}`}>
                {icon}
            </div>
            <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
        </div>
        <div className="mt-4">
            <span className="text-4xl font-bold text-slate-800">{value}</span>
            {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
        </div>
    </div>
);

interface ChartContainerProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const ChartContainer = ({ title, icon, children }: ChartContainerProps) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-2 mb-6">
            <span className="text-blue-500">{icon}</span>
            <h3 className="font-bold text-slate-800 tracking-tight text-base uppercase">{title}</h3>
        </div>
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    </div>
);

export default function MetricsDashboard() {
    const [lastUpdated] = useState(new Date().toLocaleString());

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#00A3FF] tracking-tight mb-1">Metrics Dashboard</h1>
                    <p className="text-slate-400 text-sm">Last updated: {lastUpdated}</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-700 rounded-xl font-semibold transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Active Users Today"
                    value="1"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    colorClass="text-blue-500"
                    bgColorClass="bg-blue-50"
                />
                <StatCard
                    title="Returning Users Today"
                    value="1"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    colorClass="text-green-500"
                    bgColorClass="bg-green-50"
                />
                <StatCard
                    title="Total Active Projects"
                    value="87"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    colorClass="text-purple-500"
                    bgColorClass="bg-purple-50"
                />
                <StatCard
                    title="BOM Downloads"
                    value="0"
                    subtext="0% conversion"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                    colorClass="text-orange-500"
                    bgColorClass="bg-orange-50"
                />
            </div>

            {/* User Activity */}
            <ChartContainer
                title="User Activity"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            >
                <BarChart data={userActivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={true} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                    <Tooltip />
                    <Legend iconType="circle" />
                    <Bar dataKey="returningUsers" fill="#10B981" radius={[4, 4, 0, 0]} name="Returning Users" />
                    <Bar dataKey="uniqueUsers" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Unique Users" />
                </BarChart>
            </ChartContainer>

            {/* Project Lifecycle Funnel */}
            <ChartContainer
                title="Project Lifecycle Funnel"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            >
                <BarChart data={lifecycleData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" axisLine={true} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {lifecycleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>

            {/* Download Conversion Rates */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-blue-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </span>
                    <h3 className="font-bold text-slate-800 tracking-tight text-base uppercase">Download Conversion Rates</h3>
                </div>
                <div className="h-64 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={conversionData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" hide />
                            <YAxis domain={[0, 4]} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#EFF6FF" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Recommended Package', value: '0%', sub: '0 of 44 projects' },
                        { label: 'Recommended Design', value: '0%', sub: '0 of 17 projects' },
                        { label: 'BOM', value: '0%', sub: '0 of 0 projects' },
                    ].map((item, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 font-medium mb-1">{item.label}</p>
                            <h4 className="text-xl font-bold text-slate-800">{item.value}</h4>
                            <p className="text-xs text-slate-400">{item.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Package Popularity */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-blue-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </span>
                        <h3 className="font-bold text-slate-800 tracking-tight text-base uppercase">Package Popularity</h3>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="h-64 w-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={packagePopularityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {packagePopularityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                            {packagePopularityData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{item.name}</p>
                                            <p className="text-xs text-slate-400">{item.value} projects</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-slate-800">{item.percentage}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Vendor Preference */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-blue-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </span>
                        <h3 className="font-bold text-slate-800 tracking-tight text-base uppercase">Vendor Preference</h3>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="h-64 w-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={vendorPreferenceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {vendorPreferenceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                            {vendorPreferenceData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{item.name}</p>
                                            <p className="text-xs text-slate-400">{item.value} projects</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-slate-800">{item.percentage}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

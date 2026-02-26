'use client';

import { useState, useEffect, use } from 'react';
import { Project, Package, Service, TechnicalFeature, Site, SiteType } from '@/src/lib/types';
import { ProjectService, PackageService, ServiceService, FeatureService, SiteDefinitionService } from '@/src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { validateDoc } from '@/src/lib/firebase/validation';
import { SiteSchema } from '@/src/lib/types';
import Link from 'next/link';

export default function DesignDocPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [project, setProject] = useState<Project | null>(null);
    const [pkg, setPkg] = useState<Package | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [features, setFeatures] = useState<TechnicalFeature[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [siteTypes, setSiteTypes] = useState<SiteType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const proj = await ProjectService.getProject(projectId);
                setProject(proj);

                if (proj?.selectedPackageId) {
                    const [packageData, servicesData, featuresData, siteTypesData] = await Promise.all([
                        PackageService.getPackageById(proj.selectedPackageId),
                        ServiceService.getAllServices(),
                        FeatureService.getAllFeatures(),
                        SiteDefinitionService.getAllSiteDefinitions()
                    ]);
                    setPkg(packageData);
                    setServices(servicesData);
                    setFeatures(featuresData);
                    setSiteTypes(siteTypesData);

                    const sitesRef = collection(db, "projects", projectId, "sites");
                    const sitesSnap = await getDocs(sitesRef);
                    const sitesData = sitesSnap.docs.map(d => validateDoc(SiteSchema, d.data(), d.id)) as Site[];
                    setSites(sitesData);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            loadData();
        }
    }, [projectId]);

    if (loading || !project || !pkg) return <div className="p-10 text-center">Loading Design Document...</div>;

    const items = project.customizedItems || [];
    const createdDate = new Date(project.createdAt).toLocaleDateString();

    return (
        <div className="max-w-4xl mx-auto p-8 mb-20 bg-white dark:bg-white text-black shadow-2xl rounded-sm min-h-screen my-8 print:shadow-none print:m-0">
            {/* Header / Cover Page Style */}
            <div className="border-b-4 border-blue-900 pb-8 mb-12">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-2">Solution Design Document</h1>
                        <p className="text-xl text-neutral-500">Prepared for {project.customerName}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-900">ZippyBuilder</div>
                        <div className="text-sm text-neutral-500">Architect Edition</div>
                    </div>
                </div>
                <div className="mt-8 flex gap-8 text-sm text-neutral-600">
                    <div>
                        <span className="block font-bold uppercase tracking-wider text-xs text-neutral-400">Project Reference</span>
                        {project.name}
                    </div>
                    <div>
                        <span className="block font-bold uppercase tracking-wider text-xs text-neutral-400">Date Created</span>
                        {createdDate}
                    </div>
                    <div>
                        <span className="block font-bold uppercase tracking-wider text-xs text-neutral-400">Solution Package</span>
                        {pkg.name}
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-blue-900 mb-4 border-b border-neutral-200 pb-2">1. Executive Summary</h2>
                <div className="prose max-w-none text-neutral-800">
                    <p className="mb-4">
                        This document outlines the proposed network architecture and service design for <strong>{project.customerName}</strong>.
                        The solution is based on the <strong>{pkg.name}</strong> architecture, tailored to meet your specific requirements for
                        performance, security, and scalability.
                    </p>
                    <p className="mb-4">
                        <strong>Key Solution Drivers:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Alignment with {project.packageReasoning ? "identified business requirements" : "standard enterprise patterns"}.</li>
                        <li>Standardized deployment model using {pkg.name} best practices.</li>
                        <li>Scalable architecture supporting future growth.</li>
                    </ul>
                </div>
            </section>

            {/* Solution Architecture */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-blue-900 mb-6 border-b border-neutral-200 pb-2">2. Solution Architecture</h2>
                <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 mb-6">
                    <h3 className="font-bold text-lg mb-2">{pkg.name} Overview</h3>
                    <p className="text-neutral-700 leading-relaxed">{pkg.detailed_description || pkg.short_description}</p>
                </div>

                {/* Dynamic List of Selected Services */}
                <h3 className="font-bold text-lg mb-4 text-neutral-800">2.1 Selected Services & Components</h3>
                <div className="space-y-6">
                    {services.filter(s => items.some(i => i.service_id === s.id)).map(service => {
                        const serviceItems = items.filter(i => i.service_id === service.id);
                        const hasOptions = serviceItems.some(i => i.service_option_id);

                        const enabledFeatureIds = new Set<string>();
                        serviceItems.forEach(item => {
                            item.enabled_features?.forEach(f => {
                                const fId = typeof f === 'string' ? f : f.feature_id;
                                if (fId) enabledFeatureIds.add(fId);
                            });
                        });
                        const serviceFeatures = features.filter(f => enabledFeatureIds.has(f.id));

                        return (
                            <div key={service.id} className="border border-neutral-200 rounded-lg overflow-hidden break-inside-avoid">
                                <div className="bg-neutral-100 px-4 py-3 border-b border-neutral-200 flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-neutral-900">{service.name}</h4>
                                        <span className="text-xs font-mono text-neutral-500 uppercase">{service.metadata?.category}</span>
                                    </div>
                                    <p className="text-sm text-neutral-600">{service.detailed_description || service.short_description}</p>
                                </div>

                                {hasOptions ? (
                                    <div className="p-4 bg-white">
                                        <ul className="space-y-4">
                                            {service.service_options?.map(option => {
                                                const optionItem = items.find(i => i.service_id === service.id && i.service_option_id === option.id && !i.design_option_id);
                                                const designItems = items.filter(i => i.service_id === service.id && i.service_option_id === option.id && i.design_option_id);

                                                if (!optionItem && designItems.length === 0) return null;

                                                return (
                                                    <li key={option.id} className="pb-4 last:pb-0 border-b last:border-0 border-neutral-100">
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <span className="text-blue-600 font-bold">✓</span>
                                                            <div>
                                                                <span className="font-semibold">{option.name}</span>
                                                                <p className="text-sm text-neutral-600 mt-1">{option.detailed_description || option.short_description}</p>
                                                            </div>
                                                        </div>

                                                        {designItems.length > 0 && (
                                                            <div className="ml-6 mt-3 bg-blue-50/50 p-3 rounded border border-blue-100">
                                                                <h5 className="text-xs font-bold uppercase text-blue-800 mb-2">Design Configurations</h5>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {designItems.map(dItem => {
                                                                        const design = option.design_options.find(d => d.id === dItem.design_option_id);
                                                                        return (
                                                                            <li key={dItem.design_option_id} className="text-sm flex flex-col gap-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                                                    <span className="font-medium text-neutral-800">{design?.name}</span>
                                                                                    <span className="text-neutral-500 text-xs">({design?.category})</span>
                                                                                </div>
                                                                                {(design?.detailed_description || design?.short_description) && (
                                                                                    <p className="text-xs text-neutral-600 ml-3">{design.detailed_description || design.short_description}</p>
                                                                                )}
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white text-sm text-neutral-600">
                                        Standard service implementation included.
                                    </div>
                                )}

                                {serviceFeatures.length > 0 && (
                                    <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200">
                                        <h5 className="text-sm font-bold text-neutral-800 mb-2">Enabled Features</h5>
                                        <ul className="space-y-2">
                                            {serviceFeatures.map(f => (
                                                <li key={f.id} className="text-sm grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                                                    <span className="font-semibold text-neutral-700">{f.name}</span>
                                                    <span className="text-neutral-600 col-span-3">{f.description}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Appendix A: Caveats, Assumptions, Constraints */}
            <section className="mb-12 page-break-before">
                <h2 className="text-2xl font-bold text-blue-900 mb-6 border-b border-neutral-200 pb-2">Appendix A: Assumptions, Caveats, and Constraints</h2>
                {(() => {
                    const allAssumptions = new Set<string>();
                    const allCaveats = new Set<string>();
                    const allConstraints = new Set<string>();

                    services.filter(s => items.some(i => i.service_id === s.id)).forEach(service => {
                        (service.assumptions || []).forEach(a => allAssumptions.add(a));
                        (service.caveats || []).forEach(c => allCaveats.add(c));

                        const serviceItems = items.filter(i => i.service_id === service.id);
                        service.service_options?.filter(o => serviceItems.some(i => i.service_option_id === o.id)).forEach(option => {
                            (option.assumptions || []).forEach(a => allAssumptions.add(a));
                            (option.caveats || []).forEach(c => allCaveats.add(c));

                            option.design_options?.filter(d => serviceItems.some(i => i.design_option_id === d.id)).forEach(dOpt => {
                                (dOpt.assumptions || []).forEach(a => allAssumptions.add(a));
                                (dOpt.caveats || []).forEach(c => allCaveats.add(c));
                            });
                        });

                        const enabledFeatureIds = new Set<string>();
                        serviceItems.forEach(item => {
                            item.enabled_features?.forEach(f => {
                                const fId = typeof f === 'string' ? f : f.feature_id;
                                if (fId) enabledFeatureIds.add(fId);
                            });
                        });
                        features.filter(f => enabledFeatureIds.has(f.id)).forEach(f => {
                            (f.assumptions || []).forEach(a => allAssumptions.add(a));
                            (f.caveats || []).forEach(c => allCaveats.add(c));
                        });
                    });

                    siteTypes.forEach(st => {
                        if (sites.some(s => s.siteTypeId === st.id || s.lanSiteTypeId === st.id)) {
                            (st.constraints || []).forEach(c => allConstraints.add(`[${c.type}] ${c.description}`));
                        }
                    });

                    return (
                        <div className="space-y-6 text-neutral-800">
                            <div>
                                <h3 className="font-bold text-lg mb-2">Assumptions</h3>
                                {allAssumptions.size > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
                                        {Array.from(allAssumptions).map((a, i) => <li key={i}>{a}</li>)}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-neutral-500 italic">No assumptions specified.</p>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Caveats</h3>
                                {allCaveats.size > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
                                        {Array.from(allCaveats).map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-neutral-500 italic">No caveats specified.</p>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Site Constraints</h3>
                                {allConstraints.size > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
                                        {Array.from(allConstraints).map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-neutral-500 italic">No site technical constraints specified.</p>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </section>

            {/* Sticky Action Footer */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-neutral-200 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                    <span>🖨️</span> Print PDF
                </button>

                <Link
                    href={`/sa/project/${projectId}/bom`}
                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all hover:scale-105 text-lg"
                >
                    Continue to BOM Builder &rarr;
                </Link>
            </div>
        </div>
    );
}

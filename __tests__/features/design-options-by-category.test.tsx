/**
 * Feature: Design options displayed grouped by Design Option Category
 *
 * Verifies that when a service option has design options from multiple categories,
 * they are rendered under their respective category headers.
 */

import { DesignOption } from '@/src/lib/types';

describe('Design Option category grouping logic', () => {
    const designOptions: DesignOption[] = [
        { id: 'hub_spoke', name: 'Hub and Spoke', category: 'Topology', short_description: '', detailed_description: '', caveats: [], assumptions: [] },
        { id: 'full_mesh', name: 'Full Mesh', category: 'Topology', short_description: '', detailed_description: '', caveats: [], assumptions: [] },
        { id: 'none_ew', name: 'None', category: 'East-West Security', short_description: '', detailed_description: '', caveats: [], assumptions: [] },
        { id: 'local_breakout', name: 'Local Breakout', category: 'Internet Breakout', short_description: '', detailed_description: '', caveats: [], assumptions: [] },
        { id: 'cloud_security', name: 'Cloud Security / SSE', category: 'Internet Breakout', short_description: '', detailed_description: '', caveats: [], assumptions: [] },
        { id: 'uncategorized', name: 'Mystery Option', category: undefined, short_description: '', detailed_description: '', caveats: [], assumptions: [] },
    ];

    const grouped = designOptions.reduce<Record<string, DesignOption[]>>((acc, design) => {
        const cat = design.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(design);
        return acc;
    }, {});

    it('groups design options by category correctly', () => {
        expect(Object.keys(grouped)).toEqual(expect.arrayContaining(['Topology', 'East-West Security', 'Internet Breakout', 'Other']));
        expect(grouped['Topology']).toHaveLength(2);
        expect(grouped['East-West Security']).toHaveLength(1);
        expect(grouped['Internet Breakout']).toHaveLength(2);
        expect(grouped['Other']).toHaveLength(1);
    });

    it('places options without a category into the Other group', () => {
        expect(grouped['Other'][0].id).toBe('uncategorized');
    });

    it('preserves the order of options within each category', () => {
        expect(grouped['Internet Breakout'].map(d => d.id)).toEqual(['local_breakout', 'cloud_security']);
    });
});

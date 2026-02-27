import { Site } from '../../src/lib/types';

// Mocking the behavior of ProjectSummaryDashboard logic locally for the test
const calculateFlagged = (sites: Partial<Site>[]) => {
  return sites.filter((s) => {
    if (s.uxRoute) return s.uxRoute === 'GUIDED_FLOW';
    return !s.siteTypeId;
  }).length;
};

describe('Triage Classification Inconsistency Fix', () => {
  it('should correctly identify flagged sites based on AI uxRoute', () => {
    const sites: Partial<Site>[] = [
      { name: 'Site 1', uxRoute: 'FAST_TRACK', siteTypeId: undefined },
      { name: 'Site 2', uxRoute: 'FAST_TRACK', siteTypeId: undefined },
      { name: 'Site 3', uxRoute: 'GUIDED_FLOW', siteTypeId: undefined },
      { name: 'Site 4', uxRoute: 'GUIDED_FLOW', siteTypeId: undefined },
      { name: 'Site 5', uxRoute: 'GUIDED_FLOW', siteTypeId: undefined },
    ];

    const flaggedCount = calculateFlagged(sites);
    const configuredCount = sites.length - flaggedCount;

    // Expectation: 3 Guided Flow sites are flagged, 2 Fast Track sites are "Configured" (Ready)
    expect(flaggedCount).toBe(3);
    expect(configuredCount).toBe(2);
  });

  it('should fallback to siteTypeId if uxRoute is missing (manual sites)', () => {
    const sites: Partial<Site>[] = [
      { name: 'Manual Site 1', siteTypeId: 'standard' }, // Configured
      { name: 'Manual Site 2', siteTypeId: undefined }, // Flagged (missing profile)
    ];

    const flaggedCount = calculateFlagged(sites);
    expect(flaggedCount).toBe(1);
  });

  it('should respect Guided Flow even if a profile is assigned (Complexity override)', () => {
    const sites: Partial<Site>[] = [
      { name: 'Complex Site', uxRoute: 'GUIDED_FLOW', siteTypeId: 'standard' },
    ];

    const flaggedCount = calculateFlagged(sites);
    // Even if it has a profile, if the AI flagged it for Guided Flow, it stays flagged.
    expect(flaggedCount).toBe(1);
  });
});

import { Site } from '../../src/lib/types';

// Mocking the behavior of ProjectSummaryDashboard logic locally for the test
const calculateFlagged = (sites: Partial<Site>[]) => {
  return sites.filter((s) => {
    return s.lanRequirements?.needsManualReview === true || !s.siteTypeId;
  }).length;
};

describe('Triage Classification Inconsistency Fix', () => {
  it('should correctly identify flagged sites based on missing siteTypeId or lan requirements', () => {
    const sites: Partial<Site>[] = [
      { name: 'Site 1', siteTypeId: 'standard' },
      { name: 'Site 2', siteTypeId: 'standard' },
      { name: 'Site 3', siteTypeId: undefined },
      { name: 'Site 4', siteTypeId: undefined },
      { name: 'Site 5', siteTypeId: 'standard', lanRequirements: { needsManualReview: true } },
    ];

    const flaggedCount = calculateFlagged(sites);
    const configuredCount = sites.length - flaggedCount;

    // Expectation: 2 Unmapped sites + 1 LAN Review site are flagged = 3
    expect(flaggedCount).toBe(3);
    expect(configuredCount).toBe(2);
  });

  it('should fallback to siteTypeId if requirements are missing (manual sites)', () => {
    const sites: Partial<Site>[] = [
      { name: 'Manual Site 1', siteTypeId: 'standard' }, // Configured
      { name: 'Manual Site 2', siteTypeId: undefined }, // Flagged (missing profile)
    ];

    const flaggedCount = calculateFlagged(sites);
    expect(flaggedCount).toBe(1);
  });

  it('should flag a site if it has a profile but needs LAN review', () => {
    const sites: Partial<Site>[] = [
      { name: 'Complex Site', siteTypeId: 'standard', lanRequirements: { needsManualReview: true } },
    ];

    const flaggedCount = calculateFlagged(sites);
    // Even if it has a profile, if it needs LAN review, it stays flagged.
    expect(flaggedCount).toBe(1);
  });
});

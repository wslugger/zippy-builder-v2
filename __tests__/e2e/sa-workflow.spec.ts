import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('SA Workflow Critical Path', () => {
    test('Upload CSV -> Classification -> BOM Generation', async ({ page }) => {
        // Debugging network requests
        page.on('request', request => console.log('>>', request.method(), request.url()));
        page.on('response', response => console.log('<<', response.status(), response.url()));

        // 1. Intercept AI Classification API
        // We mock the /api/sa/classify-sites route so we don't hit the real AI and rack up costs.
        await page.route('**/api/sa/classify-sites*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        siteIndex: 0,
                        siteTypeId: 'large_office',
                        lanSiteTypeId: '3_tier_campus',
                        confidence: 95,
                        reasoning: 'Mocked classification'
                    },
                    {
                        siteIndex: 1,
                        siteTypeId: 'medium_office',
                        lanSiteTypeId: '2_tier_collapsed',
                        confidence: 90,
                        reasoning: 'Mocked classification'
                    }
                ]),
            });
        });

        // 2. Intercept Firebase/Firestore Requests
        // Playwright cannot easily intercept gRPC websockets, but it can intercept REST fallback if forced,
        // or you can intercept the Next.js API routes if you're doing server-side fetching.
        // If your app uses the Firebase Client SDK directly, a common strategy is to mock the data at the
        // repository/hook level or intercept the googleapis.com requests (which can be flaky).
        // Assuming your app fetches catalogs via an API or we intercept googleapis:
        await page.route('https://firestore.googleapis.com/**', async (route) => {
            // Depending on the exact request (e.g., fetching packages/equipment), you map it to mock data.
            // This is a simplified catch-all. In reality, you'd match specific collection paths.
            // For this test, we might bypass mocking Firestore if we use a dedicated test project,
            // OR we return an empty/mocked success response if we strictly want no network.
            // E.g., returning mocked Equipment Catalog:
            if (route.request().url().includes('equipment_catalog')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([ /* Mock Equipment Data */]),
                });
                return;
            }
            // Fallback: let other Firestore requests through (e.g. to emulator or test db)
            await route.continue();
        });

        // 3. Navigate to the upload page
        // The SA workflow is under /sa/project/[id]/bom
        // We'll use a test project ID like "demo"
        await page.goto('/sa/project/demo/bom');

        // 4. Upload a CSV file
        // Wait for the SiteSidebar to render the file input
        const fileInput = page.locator('input[type="file"][accept=".csv"]');
        await expect(fileInput).toBeAttached();

        // Set the file
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'sample.csv'));

        // Wait for the AI Classification Modal to appear (it should say "Classifying Sites...")
        await expect(page.getByText('Classifying Sites...')).toBeVisible();

        // 5. Verify AI Classification Step
        // The SiteImportReviewModal should pop up next
        // Wait for the mocked AI data to appear on screen
        await expect(page.getByText('SiteA')).toBeVisible();
        await expect(page.getByText('Gold').first()).toBeVisible();

        // Proceed to BOM Generation by clicking Confirm
        await page.getByRole('button', { name: /Confirm & Import/i }).click();

        // 6. Verify BOM Generation
        // Wait for the modal to close and the sidebar to update with our sites
        await expect(page.getByRole('heading', { name: /Sites \(2\)/i }).first()).toBeVisible();

        // Assert the final state
        // The sidebar should list the imported sites
        await expect(page.locator('.w-80.bg-white').getByText('SiteA', { exact: true })).toBeVisible();
        await expect(page.locator('.w-80.bg-white').getByText('SiteB', { exact: true })).toBeVisible();
    });
});

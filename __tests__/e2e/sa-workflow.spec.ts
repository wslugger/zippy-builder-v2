import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('SA Workflow Critical Path', () => {
    test('Upload CSV -> Classification -> BOM Generation', async ({ page }) => {
        // Log browser errors and demo-mode messages only (avoid noise)
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().startsWith('DEMO')) {
                console.log('PAGE LOG:', msg.text());
            }
        });

        // 1. Intercept AI Classification API
        await page.route('**/api/sa/classify-sites*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        siteName: 'SiteA',
                        estimatedUsers: 50,
                        sqFt: 10000,
                        rawNotes: 'Mocked Site A requirements',
                        dynamicAttributes: {
                            address: '123 Main St',
                            lanPorts: 48,
                            poePorts: 24,
                            indoorAPs: 10,
                            outdoorAPs: 0,
                            bandwidthDownMbps: 1000,
                            bandwidthUpMbps: 1000,
                            primaryCircuit: 'Fiber',
                            wanLinks: 1,
                            redundancyModel: 'Single CPE'
                        },
                        uxRoute: 'FAST_TRACK',
                        triageReason: 'Auto-classified as Large Office'
                    },
                    {
                        siteName: 'SiteB',
                        estimatedUsers: 10,
                        sqFt: 2000,
                        rawNotes: 'Mocked Site B requirements',
                        dynamicAttributes: {
                            address: '456 Side St',
                            lanPorts: 12,
                            poePorts: 0,
                            indoorAPs: 2,
                            outdoorAPs: 0,
                            bandwidthDownMbps: 100,
                            bandwidthUpMbps: 100,
                            primaryCircuit: 'Broadband',
                            wanLinks: 1,
                            redundancyModel: 'Single CPE'
                        },
                        uxRoute: 'FAST_TRACK',
                        triageReason: 'Auto-classified as Small Office'
                    }
                ]),
            });
        });

        // 2. Block Firestore — demo mode uses seed data, no Firestore needed
        await page.route('https://firestore.googleapis.com/**', async (route) => {
            await route.abort();
        });

        // 3. Navigate to the BOM Builder in demo mode
        await page.goto('/sa/project/demo/bom');

        // 4. Wait for the page to be ready by checking for the file input directly.
        //    Demo mode initializes state synchronously so it should appear quickly.
        const fileInput = page.locator('input[type="file"][accept=".csv"]');
        await expect(fileInput).toBeVisible({ timeout: 15000 });


        // Set the file
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'sample.csv'));

        // Wait for the AI Classification Modal to appear (it should say "Classifying Sites...")
        await expect(page.getByText('Classifying Sites...')).toBeVisible();

        // 5. Verify AI Classification Step
        // The SiteImportReviewModal should pop up next
        // Wait for the mocked AI data to appear on screen
        await expect(page.getByText('AI Triage Complete')).toBeVisible();
        await expect(page.getByText('SiteA')).toBeVisible();

        // 6. Click Continue to Builder to populate the BOM
        await page.getByRole('button', { name: /Continue to Builder/i }).click();

        // 7. Verify BOM Generation
        // Wait for the modal to close and the sidebar to update with our sites
        await expect(page.getByRole('heading', { name: /Sites \(2\)/i }).first()).toBeVisible();

        // Assert the final state
        // The sidebar should list the imported sites
        await expect(page.locator('.w-80.bg-white').getByText('SiteA', { exact: true })).toBeVisible();
        await expect(page.locator('.w-80.bg-white').getByText('SiteB', { exact: true })).toBeVisible();
    });
});

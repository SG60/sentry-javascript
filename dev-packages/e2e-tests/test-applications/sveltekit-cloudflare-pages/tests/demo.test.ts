import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test('prerendered page has expected h1', async ({ page }) => {
	await page.goto('/prerender-test');
	await expect(page.locator('h1')).toHaveText('From server load function.');
});

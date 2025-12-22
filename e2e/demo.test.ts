import { expect, test } from '@playwright/test';

test('nothing', async ({ page }) => {
	await page.goto('/');
});

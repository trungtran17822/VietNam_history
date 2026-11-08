// SC-007 / SRS-Q-08: no sideways scrolling on a 360 px phone; labels always visible.
const { test, expect } = require('@playwright/test');
const { login, openLoop, goToStage } = require('./helpers');

async function expectNoHorizontalScroll(page, where) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(scroll, `horizontal overflow on ${where}`).toBeLessThanOrEqual(client);
}

test('360 px: login, dashboards and every stage fit the screen', async ({ page }) => {
  await page.goto('/');
  await expectNoHorizontalScroll(page, 'login');
  await login(page, 'student');
  await expectNoHorizontalScroll(page, 'student dashboard');
  await openLoop(page);
  for (const stage of [1, 2, 3, 4, 5, 6]) {
    await goToStage(page, stage);
    await expect(page.locator('.lesson-stepper .step-node.active')).toHaveAttribute('data-step', String(stage));
    await expectNoHorizontalScroll(page, `stage ${stage}`);
    await expect(page.locator('.global-notice-strip')).toBeVisible();
  }
  // Join card comes before the choices on small screens.
  await goToStage(page, 3);
  const panelTop = (await page.locator('#class-panel').boundingBox()).y;
  const varsTop = (await page.locator('#variables-container').boundingBox()).y;
  expect(panelTop).toBeLessThan(varsTop);
  // Touch targets on the choice tiles are at least 44 px tall.
  const tile = await page.locator('.variable-option').first().boundingBox();
  expect(tile.height).toBeGreaterThanOrEqual(44);
});

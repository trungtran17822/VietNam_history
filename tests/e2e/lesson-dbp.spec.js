// S2: Điện Biên Phủ (SGK Lịch sử và Địa lí 9, Bài 16) played through all 6 stages by a student.
// Runs on desktop and on a 360 px phone.
const { test, expect } = require('@playwright/test');
const { login, openLoop, goToStage, readComparison } = require('./helpers');

const DBP = 'dien-bien-phu-1954';

test('Điện Biên Phủ: sources, playback, 4 variables, comparison and explanation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'student');

  // Stage 1: every chapter cites the textbook.
  await page.goto(`/#/lesson/${DBP}`);
  const items = page.locator('.lesson-chapter-item');
  await expect(items).toHaveCount(5);
  await items.first().click();
  await page.click('#chapter-current .chapter-source-button');
  await expect(page.locator('#modal-source')).toContainText('Chân trời sáng tạo');
  await page.locator('#modal-source .btn-close-modal, #modal-source [data-close]').first().click();

  // Stage 2: the original campaign plays on the silk map.
  await openLoop(page, DBP);
  await page.click('#btn-start-6stages');
  await expect(page.locator('#screen-sim-original')).toBeVisible();
  await expect(page.locator('#viewport-original-canvas canvas')).toHaveCount(1);
  await expect(page.locator('#narration-original-list .chapter-item-card')).toHaveCount(5);
  await page.locator('#timeline-slider-original').fill('80');
  await expect(page.locator('#time-readout-original')).not.toHaveText('00:00');

  // Stage 3: four variables, originals preselected.
  await goToStage(page, 3);
  await expect(page.locator('#variables-container .variable-card')).toHaveCount(4);
  await expect(page.locator('.variable-option.is-original input:checked')).toHaveCount(4);
  await expect(page.locator('.original-badge').first()).toHaveText('Cách đã diễn ra năm 1953 – 1954');
  await page.click('.variable-option:has(input[value="strong_point"])');
  await page.click('.variable-option:has(input[value="army_only"])');

  // Stage 4 → 5: simulation, then the comparison with its mandatory notice first.
  await page.click('#btn-run-simulation');
  await expect(page.locator('#screen-sim-custom')).toBeVisible();
  await expect(page.locator('#viewport-custom-canvas canvas')).toHaveCount(1);
  await page.click('#btn-goto-comparison');
  const banner = page.locator('#screen-comparison .prominent-simulation-banner');
  await expect(banner).toContainText('ĐÂY LÀ MÔ PHỎNG');
  await expect(banner).toBeInViewport();
  // 1 320 h baseline + 240 + 336 = 1 896 h; 2 000 + 1 200 + 600 = 3 800; 92 − 20 − 14 = 58.
  await expect(page.locator('#comp-orig-duration')).toContainText(/1[.,\s]?320/);
  const first = await readComparison(page);
  expect(first.duration).toMatch(/1[.,\s]?896/);
  expect(first.casualties).toMatch(/3[.,\s]?800/);
  expect(first.score).toContain('58');

  // Stage 6: one feedback per variable; trying again keeps the choices and the numbers.
  await page.click('#btn-goto-explanation');
  await expect(page.locator('#explanation-points-list > *')).toHaveCount(4);
  await page.click('#btn-try-another-tactics');
  await expect(page.locator('input[value="strong_point"]')).toBeChecked();
  await page.click('#btn-run-simulation');
  await goToStage(page, 5);
  expect(await readComparison(page)).toEqual(first);
  await expect(page.locator('.global-notice-strip')).toHaveText('Nội dung minh họa, chưa được chuyên gia duyệt');
  expect(errors).toEqual([]);
});

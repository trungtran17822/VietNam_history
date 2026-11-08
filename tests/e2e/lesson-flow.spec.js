// US1 + US2: original battle playback with sources, then the Emperor's question, simulation,
// comparison and explanation. Runs on desktop and on a 360 px phone.
const { test, expect } = require('@playwright/test');
const { PILOT, login, openLoop, goToStage, readComparison } = require('./helpers');

const NOTICE = 'Nội dung minh họa, chưa được chuyên gia duyệt';

test('US1: teacher plays, pauses, seeks and changes camera on the original battle', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'teacher');
  await openLoop(page);
  await page.click('#btn-start-6stages');
  await expect(page.locator('#screen-sim-original')).toBeVisible();
  await expect(page.locator('#viewport-original-canvas canvas')).toHaveCount(1);
  await expect(page.locator('#narration-original-list .chapter-item-card')).toHaveCount(4);

  const play = page.locator('#btn-play-original');
  await play.click();
  await expect(play).toContainText('Dừng');
  await page.waitForTimeout(600);
  await play.click();
  await expect(play).toContainText('Phát');

  await page.locator('#timeline-slider-original').fill('60');
  await expect(page.locator('#time-readout-original')).not.toHaveText('00:00');

  for (const preset of ['follow_troops', 'close_up', 'top_down', 'overview']) {
    const pill = page.locator(`#cam-controls-original [data-preset="${preset}"]`);
    await pill.click();
    await expect(pill).toHaveClass(/active/);
  }
  await expect(page.locator('.global-notice-strip')).toHaveText(NOTICE);
  expect(errors).toEqual([]);
});

test('US1: every chapter source opens with book and quote', async ({ page }) => {
  await login(page, 'student');
  await page.goto(`/#/lesson/${PILOT}`);
  const items = page.locator('.lesson-chapter-item');
  await expect(items.first()).toBeVisible();
  const n = await items.count();
  expect(n).toBe(4);
  for (let i = 0; i < n; i += 1) {
    await items.nth(i).click();
    await page.click('#chapter-current .chapter-source-button');
    const modal = page.locator('#modal-source');
    await expect(modal).toHaveClass(/active/);
    await expect(modal).not.toBeEmpty();
    await modal.locator('.btn-close-modal, [data-close]').first().click();
  }
});

test('US2: full 6-stage loop is deterministic, labelled and lets the student try again', async ({ page }) => {
  await login(page, 'student');
  await openLoop(page);
  await expect(page.locator('.lesson-disclaimer, .global-notice-strip').first()).toBeVisible();

  await goToStage(page, 3);
  await expect(page.locator('#variables-container .variable-card')).toHaveCount(4);
  // Original options are preselected and labelled.
  await expect(page.locator('.variable-option.is-original input:checked')).toHaveCount(4);
  await expect(page.locator('.original-badge').first()).toHaveText('Cách của nghĩa quân Tây Sơn');

  await page.click('.variable-option:has(input[value="frontal_allout"])');
  await page.click('.variable-option:has(input[value="cavalry_instead"])');
  await page.click('#btn-run-simulation');
  await expect(page.locator('#screen-sim-custom')).toBeVisible();
  await expect(page.locator('#viewport-custom-canvas canvas')).toHaveCount(1);

  await page.click('#btn-goto-comparison');
  const banner = page.locator('#screen-comparison .prominent-simulation-banner');
  await expect(banner).toContainText('ĐÂY LÀ MÔ PHỎNG');
  await expect(banner).toBeInViewport();
  const first = await readComparison(page);
  expect(first.duration).not.toContain('--');

  await page.click('#btn-view-assumptions');
  await expect(page.locator('#modal-assumptions')).toHaveClass(/active/);
  await expect(page.locator('#modal-assumptions')).toContainText('Dồn toàn lực');
  await page.locator('#modal-assumptions [data-close], #modal-assumptions .btn-close-modal').first().click();

  await page.click('#btn-goto-explanation');
  await expect(page.locator('#explanation-points-list > *')).toHaveCount(4);
  await expect(page.locator('#class-survey')).toBeHidden(); // not in a class session

  // Try again: previous choices are kept; the same plan gives the same numbers.
  await page.click('#btn-try-another-tactics');
  await expect(page.locator('input[value="frontal_allout"]')).toBeChecked();
  await expect(page.locator('input[value="cavalry_instead"]')).toBeChecked();
  await page.click('#btn-run-simulation');
  await goToStage(page, 5);
  expect(await readComparison(page)).toEqual(first);

  // After a reload, the same choices still give the same numbers.
  await page.reload();
  await openLoop(page);
  await goToStage(page, 3);
  await page.click('.variable-option:has(input[value="frontal_allout"])');
  await page.click('.variable-option:has(input[value="cavalry_instead"])');
  await page.click('#btn-run-simulation');
  await goToStage(page, 5);
  expect(await readComparison(page)).toEqual(first);
});

test('lesson without variables explains it and blocks stages 4-6', async ({ page }) => {
  await login(page, 'teacher');
  // Every bundled lesson now has variables; a blank lesson is the one without.
  await page.click('#btn-create-lesson');
  await expect(page.locator('#view-teacher-editor')).toHaveClass(/active/);
  await openLoop(page, page.url().match(/#\/lesson\/([^/]+)\/edit/)[1]);
  await goToStage(page, 3);
  await expect(page.locator('#question-empty-notice')).toBeVisible();
  await expect(page.locator('#question-empty-notice')).toContainText('chưa có phần thử cách khác');
  await expect(page.locator('#btn-run-simulation')).toBeHidden();
  await expect(page.locator('.lesson-stepper .step-node[data-step="5"]')).toBeDisabled();
});

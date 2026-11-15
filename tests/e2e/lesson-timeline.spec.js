// S5: Trung's SGK lessons. A timeline-mode lesson (explorationMode "ussr_charts") shows the stepped
// timeline player instead of the 3D table, never loads three.js, and its comparison uses its own
// metric labels. Runs on desktop and on a 360 px phone.
const { test, expect } = require('@playwright/test');
const { login, openLoop, goToStage } = require('./helpers');

const BAI1 = 'bai-1-lien-xo';

test('a teacher opens Bài 1 and steps the timeline player (no 3D table)', async ({ page }) => {
  const errors = [];
  const requested = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requested.push(r.url()));
  await login(page, 'teacher');

  await page.goto(`/#/lesson/${BAI1}`);
  const player = page.locator('#viewport-lesson-timeline');
  await expect(player).toBeVisible();
  await expect(page.locator('#viewport-lesson-canvas')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(player.locator('.timeline-mode-label')).toContainText('Biểu đồ tăng trưởng kinh tế');
  await expect(player.locator('.timeline-year')).toHaveText('1918');
  await expect(player).toContainText('Mốc 1 / 8');
  await expect(player.locator('.timeline-dot')).toHaveCount(8);

  // Buttons, slider, keyboard and the chapter list all move the same step.
  await page.click('#btn-next-lesson');
  await expect(player.locator('.timeline-year')).toHaveText('1920');
  await expect(page.locator('#time-readout-lesson')).toHaveText('1920');
  await page.locator('#timeline-slider-lesson').fill('3');
  await expect(player.locator('.timeline-year')).toHaveText('1922');
  await player.locator('.timeline-dot.active').focus();
  await page.keyboard.press('ArrowRight');
  await expect(player.locator('.timeline-year')).toHaveText('1928');
  await expect(player.locator('.timeline-dot.active')).toBeFocused();
  await page.keyboard.press('End');
  await expect(player).toContainText('Mốc 8 / 8');
  await page.keyboard.press('Home');
  await expect(player).toContainText('Mốc 1 / 8');

  // The chapter list follows the player and seeks it.
  await page.locator('.lesson-chapter-item').nth(1).click();
  await expect(page.locator('.lesson-chapter-item.active')).toContainText('Giai đoạn 2');
  await expect(player.locator('.timeline-year')).not.toHaveText('1918');

  // Play advances on its own and stops at the end.
  await page.click('#btn-rewind-lesson');
  await page.click('#btn-play-lesson');
  await expect(player).toContainText('Mốc 2 / 8', { timeout: 6_000 });
  await page.click('#btn-play-lesson'); // pause

  // The phone layout does not scroll sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  // Nothing three.js was fetched for this lesson.
  expect(requested.filter((u) => /silk-map|three/i.test(u))).toEqual([]);
  expect(errors).toEqual([]);
});

test('the teacher editor shows the timeline events and the review flags verbatim', async ({ page }) => {
  await login(page, 'teacher');
  await page.goto(`/#/lesson/${BAI1}/edit`);
  await expect(page.locator('#editor-review-flags-list')).toContainText('Bộ sách: xác nhận từ bìa');
  await page.click('[data-editor-tab="scene"]');
  await expect(page.locator('[data-editor-tab="scene"]')).toHaveText('Trục thời gian');
  await expect(page.locator('#editor-non-3d-notice')).toContainText('Biểu đồ tăng trưởng kinh tế');
  await expect(page.locator('#viewport-editor-timeline')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.click('#btn-add-timeline-event');
  await expect(page.locator('#viewport-editor-timeline .timeline-dot')).toHaveCount(9);
});

test('Bài 1 comparison uses its own metric labels and carries the assumption note', async ({ page }) => {
  await login(page, 'student');
  await openLoop(page, BAI1);
  await page.click('#btn-start-6stages');
  await expect(page.locator('#viewport-original-timeline')).toBeVisible();
  await page.click('#btn-goto-question');
  await expect(page.locator('#variables-container .variable-card')).toHaveCount(1);
  await page.locator('.variable-option:not(.is-original)').first().click();
  await page.click('#btn-run-simulation');
  await expect(page.locator('#viewport-custom-timeline')).toBeVisible();
  await goToStage(page, 5);
  await expect(page.locator('.prominent-simulation-banner')).toContainText('ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ.');
  await expect(page.locator('#simulation-notice-note')).toHaveText('* Chỉ số là giả định sư phạm minh hoạ, không phải kết luận của sách giáo khoa.');
  await expect(page.locator('#screen-comparison')).toContainText('Sản lượng công nghiệp nặng');
  await expect(page.locator('#comp-orig-duration')).toHaveText('90 / 100');
  await expect(page.locator('#comp-cust-casualties')).toHaveText('50 / 100');
  await expect(page.locator('#comp-cust-score')).toHaveText('75 / 100');
});

test('Bài 4 (Stalingrad) is a 3D table and keeps its schematic notice', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/#/lesson/bai-4-chien-tranh-the-gioi-2');
  await expect(page.locator('#viewport-lesson-timeline')).toHaveCount(0);
  await expect(page.locator('#viewport-lesson-canvas canvas')).toHaveCount(1);
  await expect(page.locator('.lesson-schematic-notice')).toContainText('Lược đồ 4.4');
});

// FR-019: the lesson runs with the class server unreachable.
// US5: a draft created from a sourced document cannot be published before the source check.
const { test, expect } = require('@playwright/test');
const { login, openLoop, goToStage } = require('./helpers');

test('FR-019: class server down, every stage still works and the teacher is told plainly', async ({ page }) => {
  await page.route('http://localhost:8787/**', (route) => route.abort('connectionrefused'));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'teacher');
  await openLoop(page);
  await goToStage(page, 3);
  await page.click('[data-class-open]');
  await expect(page.locator('#class-panel .class-panel-status')).toHaveText(
    'Chưa kết nối được máy chủ lớp học; bài học vẫn chạy bình thường trên máy này.'
  );
  await page.click('#btn-run-simulation');
  await expect(page.locator('#screen-sim-custom')).toBeVisible();
  await goToStage(page, 5);
  await expect(page.locator('#comp-cust-score')).not.toContainText('--');
  await goToStage(page, 6);
  await expect(page.locator('#explanation-points-list > *')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('US5: intake validates input, creates a draft, and blocks publishing until the source is checked', async ({ page }) => {
  await login(page, 'teacher');
  await page.click('#btn-open-content-intake');
  const form = page.locator('#form-content-intake');
  await expect(form).toBeVisible();

  await page.fill('#intake-lesson-title', 'Chiến thắng Đống Đa (bản nháp thử)');
  await page.fill('#intake-lesson-content', 'Ghi chú tư liệu để biên tập thành lời dẫn.');
  await page.fill('#intake-source-title', 'Lịch sử và Địa lí 9');
  await page.fill('#intake-source-publisher', 'Bộ Giáo dục và Đào tạo');
  await page.fill('#intake-source-claim', 'Mốc thời gian và diễn biến chính.');
  await page.fill('#intake-source-url', 'http://example.com/sach');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#content-intake-error')).toContainText('HTTPS');

  await page.fill('#intake-source-url', 'https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-chuong-trinh-mon-lich-su.pdf');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#view-teacher-editor')).toHaveClass(/active/);
  await expect(page.locator('#source-review-notice')).toBeVisible();

  let alertText = '';
  page.once('dialog', (d) => { alertText = d.message(); d.accept(); });
  await page.click('#btn-editor-publish');
  await expect.poll(() => alertText).toContain('chờ đối chiếu');
  await expect(page.locator('#modal-confirm-publish')).not.toHaveClass(/active/);

  await page.click('#btn-mark-source-reviewed');
  await page.click('#btn-editor-publish');
  await expect(page.locator('#modal-confirm-publish')).toHaveClass(/active/);
});

// v2 authoring form ("Biến số & hệ số"): a lesson created from scratch reaches all 6 stages,
// its coefficients drive the comparison, and undo/redo works in the editor.
const { test, expect } = require('@playwright/test');
const { login, goToStage } = require('./helpers');

test('a blank lesson gets a variable in the form and runs all 6 stages with its coefficients', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'teacher');
  await page.click('#btn-create-lesson');
  await expect(page.locator('#view-teacher-editor')).toHaveClass(/active/);
  const id = page.url().match(/#\/lesson\/([^/]+)\/edit/)[1];

  // Undo/redo on a content field.
  const title = page.locator('#input-lesson-title');
  await title.fill('Bài thử biến số');
  await expect(page.locator('#btn-editor-undo')).toBeEnabled();
  await page.click('#btn-editor-undo');
  await expect(title).toHaveValue('Bài giảng Lịch sử mới');
  await page.click('#btn-editor-redo');
  await expect(title).toHaveValue('Bài thử biến số');

  await page.click('[data-editor-tab="variables"]');
  await page.click('#btn-add-variable');
  await expect(page.locator('[data-variable-index]')).toHaveCount(1);
  // The original option's coefficients are locked at 0; give the first alternative +12 h.
  await expect(page.getByLabel('Hệ số thời gian').first()).toBeDisabled();
  await page.getByLabel('Hệ số thời gian').nth(1).fill('12');
  await page.click('#btn-editor-publish');
  await page.click('#btn-confirm-publish-submit');
  await expect(page.locator('#view-teacher-editor [role="status"]').first()).toContainText('Đã lưu');

  await page.goto(`/#/lesson/${id}/interactive`);
  await expect(page.locator('#screen-intro')).toBeVisible();
  await goToStage(page, 3);
  await expect(page.locator('#variables-container .variable-card')).toHaveCount(1);
  await expect(page.locator('.variable-option.is-original input:checked')).toHaveCount(1);
  await page.click('.variable-option:has(input[value="khac_1"])');
  await page.click('#btn-run-simulation');
  await expect(page.locator('#screen-sim-custom')).toBeVisible();
  await page.click('#btn-goto-comparison');
  await expect(page.locator('#comp-orig-duration')).toContainText('36 giờ');
  await expect(page.locator('#comp-cust-duration')).toContainText('48 giờ');
  await page.click('#btn-goto-explanation');
  await expect(page.locator('#explanation-points-list > *')).toHaveCount(1);
  expect(errors).toEqual([]);
});

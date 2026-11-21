const { test, expect } = require('@playwright/test');

test('public exhibition links to role-based classroom sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Việt Nam. Ngàn năm sử Việt' })).toBeVisible();
  await expect(page.locator('.hero-image')).toBeVisible();
  await expect(page.locator('.global-notice-strip')).toHaveCount(0);
  await expect(page.locator('header .notice')).toHaveText('Nội dung minh họa, chưa được chuyên gia duyệt');

  await page.getByRole('link', { name: 'Bắt đầu hành trình' }).click();
  await expect(page).toHaveURL(/#nien-bieu$/);
  await expect(page.getByRole('tab')).toHaveCount(11);
  await page.getByRole('button', { name: 'Thời đại sau' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Thời kỳ Bắc thuộc');

  if (page.viewportSize().width <= 800) await page.getByRole('button', { name: 'Mở menu' }).click();
  await page.getByRole('link', { name: 'Vào lớp học', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vào lớp học' })).toBeVisible();
  await page.getByRole('radio', { name: 'Học sinh', exact: true }).check();
  await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click();
  await page.getByRole('button', { name: 'Đăng nhập với vai trò học sinh' }).click();
  await expect(page).toHaveURL(/\/classroom\.html#\/student$/);
  await expect(page.getByRole('heading', { name: 'Bài đã học' })).toBeVisible();
  await expect(page.locator('#cinematic-transition')).not.toHaveClass(/active/);
  await expect(page.getByRole('button', { name: 'Tài khoản học sinh' })).toBeVisible();
});

test('old atlas URL stays usable when opened from the homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-title')).toBeVisible();
  await page.evaluate(() => { location.hash = '/atlas?place=truong-sa'; });
  await expect(page.getByRole('heading', { name: 'Vào lớp học' })).toBeVisible();
  await page.getByRole('button', { name: 'Điền tài khoản mẫu' }).click();
  await page.locator('#btn-submit-login').click();
  await expect(page).toHaveURL(/\/classroom\.html#\/atlas\?place=truong-sa$/);
});

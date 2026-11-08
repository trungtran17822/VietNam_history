// S4: Atlas Việt Nam (#/atlas). Search with and without diacritics, select a landmark, URL state
// round-trip, lesson links both ways, OSM attribution. Runs on desktop and on a 360 px phone.
const { test, expect } = require('@playwright/test');
const { login, PILOT } = require('./helpers');

const results = (page) => page.locator('#atlas-results [role="option"]');
const card = (page) => page.locator('.atlas-panel article');

test('atlas: search, select, URL state, lesson links and attribution', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'teacher');

  // The dashboard links to the atlas.
  await page.click('.atlas-card');
  await expect(page).toHaveURL(/#\/atlas$/);
  await expect(page.locator('#view-atlas')).toBeVisible();
  await expect(page.locator('#view-atlas p:has-text("© OpenStreetMap") >> visible=true')).toContainText('OpenStreetMap contributors');

  // Without diacritics: "ha hoi" finds Đồn Hạ Hồi; the query goes into the URL.
  const input = page.locator('#atlas-q');
  await input.fill('ha hoi');
  await expect(results(page).first()).toContainText('Đồn Hạ Hồi');
  await expect(page).toHaveURL(/q=ha(\+|%20)hoi/);

  // With diacritics, then pick with the keyboard.
  await input.fill('Điện Biên Phủ');
  await expect(results(page).first()).toContainText('Điện Biên Phủ');
  await input.press('Enter');
  await expect(page).toHaveURL(/place=dien-bien-phu/);
  await expect(card(page).locator('h2')).toHaveText('Chiến trường Điện Biên Phủ');
  await expect(card(page).locator('h2')).toBeFocused();
  await expect(card(page).locator('.atlas-lessons a')).toHaveText(/Điện Biên Phủ/);

  // A filtered list, selected by click.
  await card(page).getByRole('button', { name: 'Danh sách' }).click();
  await input.fill('');
  await page.locator('[aria-label="Lọc theo loại địa danh"] button', { hasText: 'Chiến trường' }).click();
  await expect(page).toHaveURL(/kind=chien-truong/);
  await results(page).filter({ hasText: 'Đồn Ngọc Hồi' }).click();
  await expect(page).toHaveURL(/place=ngoc-hoi/);

  // URL state round-trips through a reload.
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(card(page).locator('h2')).toHaveText('Đồn Ngọc Hồi');
  await expect(page.locator('[aria-label="Lọc theo loại địa danh"] button', { hasText: 'Chiến trường' })).toHaveAttribute('aria-pressed', 'true');

  // Place → lesson → place.
  await card(page).locator('.atlas-lessons a', { hasText: 'Ngọc Hồi' }).click();
  await expect(page).toHaveURL(new RegExp(`#/lesson/${PILOT}$`));
  const chip = page.locator('.lesson-atlas-places a', { hasText: 'Đồn Ngọc Hồi' });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(/#\/atlas\?place=ngoc-hoi$/);
  await expect(card(page).locator('h2')).toHaveText('Đồn Ngọc Hồi');

  // A province card lists the lessons of the places inside it.
  await page.goto('/#/atlas?place=dien-bien');
  await expect(card(page).locator('h2')).toHaveText('Điện Biên');
  await expect(card(page).locator('.atlas-lessons a')).toHaveText(/Điện Biên Phủ/);

  expect(errors).toEqual([]);
});

test('atlas: a student only sees lessons that are published to students', async ({ page }) => {
  await login(page, 'student');
  await page.click('.atlas-card');
  await expect(page).toHaveURL(/#\/atlas$/);
  // Ngọc Hồi is published; Chi Lăng is only scheduled, so its place card has no lesson link.
  await page.goto('/#/atlas?place=ngoc-hoi');
  await expect(card(page).locator('.atlas-lessons a')).toHaveCount(1);
  await page.goto('/#/atlas?place=chi-lang');
  await expect(card(page).locator('h2')).toContainText('Chi Lăng');
  await expect(card(page).locator('.atlas-lessons a')).toHaveCount(0);
});

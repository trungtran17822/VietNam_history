// Atlas Việt Nam (#/atlas): the AI illustration with hotspots, a side panel with search, kind chips and the place card. Any atlas id opens a card
// (a place the picture shows gets its crop, any other the card without a picture); URL state, lesson links both ways, the AI caption and the
// OSM credit; no 3D map and no three.js. Runs on desktop and on a 360 px phone.
const { test, expect } = require('@playwright/test');
const { login, PILOT } = require('./helpers');

const results = (page) => page.locator('#atlas-results [role="option"]');
const card = (page) => page.locator('.atlas-panel article');
const hot = (page, id) => page.locator(`.atlas-hot[data-id="${id}"]`);
const CAPTION = 'Ảnh minh hoạ do AI tạo, chưa kiểm duyệt: hình dạng lãnh thổ và vị trí công trình không theo tỉ lệ địa lý.';
const NOT_IN_PICTURE = 'Địa danh này chưa có trong ảnh minh hoạ';

test('atlas: the illustration, hotspots, labels and no 3D', async ({ page }) => {
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push(r.url()));
  await login(page, 'teacher');

  // The dashboard links to the atlas.
  await page.click('.atlas-card');
  await expect(page).toHaveURL(/#\/atlas$/);
  await expect(page.locator('#view-atlas')).toBeVisible();
  const illustration = page.getByRole('img', { name: /^Ảnh minh hoạ Việt Nam do AI tạo:/ });
  await expect(illustration).toBeVisible();
  await expect(illustration).toHaveJSProperty('naturalWidth', 1024);

  // Mandatory labels: the AI caption under the picture, the content notice, the OpenStreetMap credit.
  await expect(page.locator('.atlas-caption')).toHaveText(CAPTION);
  await expect(page.locator('#view-atlas').getByText('Nội dung minh họa, chưa được chuyên gia duyệt.')).toBeVisible();
  await expect(page.getByText('Bản đồ © OpenStreetMap contributors, Natural Earth, SRTM')).toBeVisible();

  // No 3D: no canvas, and three.js / the 3D terrain were never requested.
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requests.filter((u) => /three|terrain\.png|scene/.test(u))).toEqual([]);

  // 17 hotspots (real buttons with the place's name); the 9 guessed ones carry a "?". Hoàng Sa and Trường Sa are on the picture and in the list.
  await expect(page.locator('.atlas-hot')).toHaveCount(17);
  await expect(page.locator('.atlas-hot[data-conf="doan"] .q')).toHaveCount(9);
  await expect(hot(page, 'hoang-sa')).toHaveAccessibleName('Quần đảo Hoàng Sa');
  await expect(hot(page, 'truong-sa')).toHaveAccessibleName('Quần đảo Trường Sa');
  await expect(results(page).filter({ hasText: 'Quần đảo Hoàng Sa' })).toHaveCount(1);
  await expect(results(page).filter({ hasText: 'Quần đảo Trường Sa' })).toHaveCount(1);

  expect(errors).toEqual([]);
});

test('atlas: a hotspot opens its card with the crop, the crop opens in a lightbox', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'teacher');
  await page.goto('/#/atlas');
  await hot(page, 'ho-hoan-kiem').click();
  await expect(page).toHaveURL(/place=ho-hoan-kiem/);
  await expect(card(page).locator('h2')).toHaveText('Hồ Hoàn Kiếm');
  await expect(card(page).locator('.atlas-crop')).toBeVisible();
  const crop = await card(page).locator('.atlas-crop').boundingBox();
  const panel = await page.locator('.atlas-panel').boundingBox();
  expect(crop.x + crop.width).toBeLessThanOrEqual(panel.x + panel.width - 15);
  await expect(hot(page, 'ho-hoan-kiem')).toHaveAttribute('aria-current', 'true');

  // The crop in a lightbox, with the AI caption and a low-resolution note; Escape closes it.
  await card(page).getByRole('button', { name: /Phóng to ảnh/ }).click();
  const box = page.locator('#atlas-lightbox.active');
  await expect(box).toBeVisible();
  await expect(box).toContainText(CAPTION);
  await expect(box).toContainText('Ảnh gốc độ phân giải thấp');
  await page.keyboard.press('Escape');
  await expect(page.locator('#atlas-lightbox.active')).toHaveCount(0);

  // "Phóng to" opens the whole picture.
  await page.getByRole('button', { name: /Phóng to$/ }).click();
  await expect(page.locator('#atlas-lightbox.active img')).toBeVisible();
  await page.keyboard.press('Escape');

  // A guessed spot says so on its card.
  await hot(page, 'van-mieu').click();
  await expect(card(page).locator('.atlas-guess')).toBeVisible();
  expect(errors).toEqual([]);
});

test('atlas: any id opens a card; places the picture does not show get no picture', async ({ page }) => {
  await login(page, 'teacher');
  // A province (lessons link to these): no picture, the note, its landmarks listed.
  await page.goto('/#/atlas?place=ha-noi');
  await expect(card(page).locator('h2')).toHaveText('Hà Nội');
  await expect(card(page).locator('.atlas-no-pic')).toHaveText(NOT_IN_PICTURE);
  await expect(card(page).locator('.atlas-crop')).toHaveCount(0);
  await expect(card(page).getByRole('button', { name: 'Hồ Hoàn Kiếm' })).toBeVisible();
  await expect(page.locator('.atlas-hot[aria-current="true"]')).toHaveCount(0);

  // A landmark the picture does not show.
  await page.goto('/#/atlas?place=ngoc-hoi');
  await expect(card(page).locator('h2')).toHaveText('Đồn Ngọc Hồi');
  await expect(card(page).locator('.atlas-no-pic')).toBeVisible();

  // Trường Sa is on the picture: crop and lit hotspot.
  await page.goto('/#/atlas?place=truong-sa');
  await expect(card(page).locator('h2')).toHaveText('Quần đảo Trường Sa');
  await expect(card(page).locator('.atlas-crop')).toBeVisible();
  await expect(hot(page, 'truong-sa')).toHaveAttribute('aria-current', 'true');

  // An unknown id shows the card's "not found" message, not a crash.
  await page.goto('/#/atlas?place=khong-co-id');
  await expect(page.locator('.atlas-panel')).toContainText('Không tìm thấy địa danh này');
});

test('atlas: a shared link opens its place after signing in', async ({ page }) => {
  await page.goto('/#/atlas?place=truong-sa');
  await page.locator('#btn-submit-login').click();
  await page.locator('#btn-skip-transition').click();
  await expect(page).toHaveURL(/#\/atlas\?place=truong-sa$/);
  await expect(card(page).locator('h2')).toHaveText('Quần đảo Trường Sa');
});

test('atlas: search and chips filter the list and light the hotspots; URL state round-trips', async ({ page }) => {
  await login(page, 'teacher');
  await page.goto('/#/atlas');

  // Without diacritics: "ha hoi" finds Đồn Hạ Hồi; the query goes into the URL.
  const input = page.locator('#atlas-q');
  await input.fill('ha hoi');
  await expect(results(page).first()).toContainText('Đồn Hạ Hồi');
  await expect(page).toHaveURL(/q=ha(\+|%20)hoi/);

  // The search lights the matching hotspot and dims the others.
  await input.fill('ho hoan');
  await expect(results(page).first()).toContainText('Hồ Hoàn Kiếm');
  await expect(hot(page, 'ho-hoan-kiem')).toHaveClass(/match/);
  await expect(hot(page, 'mui-ne')).toHaveClass(/dim/);

  // With diacritics, then pick with the keyboard.
  await input.fill('Điện Biên Phủ');
  await expect(results(page).first()).toContainText('Điện Biên Phủ');
  await input.press('Enter');
  await expect(page).toHaveURL(/place=dien-bien-phu/);
  await expect(card(page).locator('h2')).toHaveText('Chiến trường Điện Biên Phủ');
  await expect(card(page).locator('h2')).toBeFocused();
  await expect(card(page).locator('.atlas-lessons a')).toHaveText(/Điện Biên Phủ/);

  // A province is found by name too.
  await card(page).getByRole('button', { name: 'Danh sách' }).click();
  await input.fill('lao cai');
  await expect(results(page).first()).toContainText('Lào Cai');

  // A kind chip lights the UNESCO hotspots only.
  await input.fill('');
  await page.locator('[aria-label="Lọc theo loại địa danh"] button', { hasText: 'Di sản UNESCO' }).click();
  await expect(page).toHaveURL(/kind=unesco/);
  await expect(hot(page, 'vinh-ha-long')).toHaveClass(/match/);
  await expect(hot(page, 'hoang-sa')).toHaveClass(/dim/);
  await page.locator('[aria-label="Lọc theo loại địa danh"] button', { hasText: 'Chiến trường' }).click();
  await results(page).filter({ hasText: 'Đồn Ngọc Hồi' }).click();
  await expect(page).toHaveURL(/place=ngoc-hoi/);

  // URL state round-trips through a reload.
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(card(page).locator('h2')).toHaveText('Đồn Ngọc Hồi');
  await expect(page.locator('[aria-label="Lọc theo loại địa danh"] button', { hasText: 'Chiến trường' })).toHaveAttribute('aria-pressed', 'true');

  // A new hash on the same mounted route replaces the visible query and results.
  await page.goto('/#/atlas?kind=unesco&q=ha+long');
  await expect(input).toHaveValue('ha long');
  await expect(results(page).first()).toContainText('Vịnh Hạ Long');
  await page.goBack();
  await expect(page).toHaveURL(url);
  await expect(input).toHaveValue('');
});

test('atlas: lesson chips link to the atlas and back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'teacher');
  await page.goto('/#/atlas?place=ngoc-hoi');
  await expect(card(page).locator('h2')).toHaveText('Đồn Ngọc Hồi');
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

test('atlas: the picture stays in view and no page scrolls sideways', async ({ page }) => {
  await login(page, 'teacher');
  await page.goto('/#/atlas');
  await expect(page.locator('.atlas-picture')).toBeVisible();
  const box = await page.locator('.atlas-picture').boundingBox();
  const vw = page.viewportSize().width;
  expect(box.width).toBeGreaterThan(200);
  expect(box.x + box.width).toBeLessThanOrEqual(vw + 1);
  if (vw === 360) {
    const panel = await page.locator('.atlas-panel').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(box.y + box.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  if (vw !== 360) {
    await page.setViewportSize({ width: 768, height: 1024 });
    const tablet = await page.locator('.atlas-picture').boundingBox();
    // Hotspot coordinates use the full image, including when the side panel limits its width.
    expect(Math.abs(tablet.height - tablet.width * 1535 / 1024)).toBeLessThan(1);
    expect(tablet.x + tablet.width).toBeLessThanOrEqual(768);
  }
});

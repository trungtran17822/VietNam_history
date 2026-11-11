// US3 + US4: a teacher opens a class session, two student devices join and answer,
// the teacher sees the live distribution, exports CSV and deletes the session.
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { login, openLoop, goToStage } = require('./helpers');

async function studentJoinsAndRuns(browser, code, picks) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await login(page, 'student');
  await openLoop(page);
  await goToStage(page, 3);
  await page.fill('#class-join-code', code.toLowerCase().replace(/(...)/, '$1 '));
  await page.click('.class-join-form button[type="submit"]');
  await expect(page.locator('[data-class-joined]')).toBeVisible();
  for (const value of picks) await page.click(`.variable-option:has(input[value="${value}"])`);
  await page.click('#btn-run-simulation');
  await expect(page.locator('#class-submit-toast')).toHaveText('Đã gửi lựa chọn tới lớp.');
  return { context, page };
}

test('US3/US4: live class distribution, replace on resubmit, survey, CSV and delete', async ({ browser, page }) => {
  test.setTimeout(180_000); // three browser contexts rendering WebGL in software
  await login(page, 'teacher');
  await openLoop(page);
  await goToStage(page, 3);
  await page.click('[data-class-open]');
  const codeEl = page.locator('[data-class-code]');
  await expect(codeEl).toBeVisible();
  const code = await codeEl.getAttribute('data-class-code');
  expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  await expect(page.locator('[data-class-count]')).toHaveText('0');

  const a = await studentJoinsAndRuns(browser, code, ['opt-collectivization-gradual']);
  const b = await studentJoinsAndRuns(browser, code, ['opt-collectivization-fast']);

  await expect(page.locator('[data-class-count]')).toHaveText('2', { timeout: 10_000 });
  await expect(page.locator('[data-option-count="var-collectivization-speed:opt-collectivization-gradual"]')).toHaveText('1');
  await expect(page.locator('[data-option-count="var-collectivization-speed:opt-collectivization-fast"]')).toHaveText('1');

  // Student A changes their mind: the answer is replaced, the count stays 2.
  await goToStage(a.page, 3);
  await a.page.click('.variable-option:has(input[value="opt-collectivization-fast"])');
  await a.page.click('#btn-run-simulation');
  await expect(page.locator('[data-option-count="var-collectivization-speed:opt-collectivization-fast"]')).toHaveText('2', { timeout: 10_000 });
  await expect(page.locator('[data-option-count="var-collectivization-speed:opt-collectivization-gradual"]')).toHaveText('0');
  await expect(page.locator('[data-class-count]')).toHaveText('2');

  // Student B answers the survey at stage 6.
  await goToStage(b.page, 6);
  const survey = b.page.locator('#class-survey');
  await expect(survey).toBeVisible();
  await survey.locator('label.rating-pill:has(input[name="rating-interest"][value="5"])').click();
  await survey.locator('label.rating-pill:has(input[name="rating-again"][value="4"])').click();
  await survey.locator('button[type="submit"]').click();
  await expect(survey.locator('.class-panel-status')).toContainText('Cảm ơn em');
  await expect(page.locator('[data-class-ratings]')).toContainText('5/5', { timeout: 10_000 });

  // A student device has no way to read other answers.
  await goToStage(a.page, 3);
  await expect(a.page.locator('[data-class-count], [data-class-export]')).toHaveCount(0);

  // CSV export: one row per device, anonymous ids, no client ids.
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-class-export]')]);
  expect(download.suggestedFilename()).toBe(`phien-${code}.csv`);
  const csv = fs.readFileSync(await download.path(), 'utf8');
  const lines = csv.replace(/^﻿/, '').trim().split(/\r?\n/);
  expect(lines).toHaveLength(3);
  expect(lines[0]).toContain('anonymous_id');
  expect(lines[0]).not.toMatch(/name|email|ip/i);
  expect(csv).toContain(',A01,');
  expect(csv).toContain(',A02,');

  // Teacher reload restores the session on this device.
  await page.reload();
  await openLoop(page);
  await goToStage(page, 3);
  await expect(page.locator('[data-class-code]')).toHaveAttribute('data-class-code', code);

  // Delete: the code stops working for students.
  page.once('dialog', (d) => d.accept());
  await page.click('[data-class-delete]');
  await expect(page.locator('[data-class-open]')).toBeVisible();
  await a.page.click('#btn-run-simulation');
  await expect(a.page.locator('#class-submit-toast')).toContainText('Mã phiên không đúng hoặc đã hết hạn');

  await a.context.close();
  await b.context.close();
});

test('US3: wrong code is refused and the lesson continues', async ({ page }) => {
  await login(page, 'student');
  await openLoop(page);
  await goToStage(page, 3);
  await page.fill('#class-join-code', 'ZZZZZZ');
  await page.click('.class-join-form button[type="submit"]');
  await expect(page.locator('#class-panel .class-panel-status')).toHaveText('Mã phiên không đúng hoặc đã hết hạn.');
  await page.fill('#class-join-code', 'AB1');
  await page.click('.class-join-form button[type="submit"]');
  await expect(page.locator('#class-panel .class-panel-status')).toContainText('6 ký tự');
  await page.click('#btn-run-simulation');
  await expect(page.locator('#screen-sim-custom')).toBeVisible();
});

test('US3: a code for another lesson is refused', async ({ page, request }) => {
  const res = await request.post('http://localhost:8787/api/sessions', { data: { lessonId: 'bai-2-chau-au-my' } });
  const { code } = await res.json();
  await login(page, 'student');
  await openLoop(page);
  await goToStage(page, 3);
  await page.fill('#class-join-code', code);
  await page.click('.class-join-form button[type="submit"]');
  await expect(page.locator('#class-panel .class-panel-status')).toHaveText('Mã phiên này dành cho bài học khác.');
});

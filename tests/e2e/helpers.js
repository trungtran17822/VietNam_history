const { expect } = require('@playwright/test');

const PILOT = 'ngoc-hoi-ha-hoi-1789';

async function login(page, role = 'teacher') {
  await page.goto('/');
  if (role === 'student') await page.click('#tab-login-student');
  await page.click('#btn-submit-login');
  // Skip the post-login animation, then wait until the dashboard route is in place.
  await expect(page.locator('#cinematic-transition')).toHaveClass(/active/);
  await page.click('#btn-skip-transition');
  await expect(page.locator('#cinematic-transition')).not.toHaveClass(/active/);
  await expect(page).toHaveURL(role === 'teacher' ? /#\/teacher$/ : /#\/student$/);
  await expect(page.locator('#main-header')).toBeVisible();
}

async function openLoop(page, lessonId = PILOT) {
  await page.goto(`/#/lesson/${lessonId}/interactive`);
  await expect(page.locator('#view-lesson-detail')).toHaveClass(/active/);
  await expect(page.locator('#screen-intro')).toBeVisible();
}

async function goToStage(page, n) {
  await page.click(`.lesson-stepper .step-node[data-step="${n}"]`);
}

async function readComparison(page) {
  return {
    duration: await page.textContent('#comp-cust-duration'),
    casualties: await page.textContent('#comp-cust-casualties'),
    score: await page.textContent('#comp-cust-score')
  };
}

module.exports = { PILOT, login, openLoop, goToStage, readComparison };

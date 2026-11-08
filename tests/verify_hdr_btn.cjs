const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/trung/.gemini/antigravity/brain/6392d6dc-09e0-468f-bc4c-a22dbf8c9dfe');

async function loginAsTeacher(page) {
  await page.goto('http://localhost:8080/index.html');
  await page.click('#btn-submit-login');
  try {
    const skipBtn = page.locator('#btn-skip-transition');
    await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
    await skipBtn.click();
  } catch (e) {
    // skip transition might not be needed
  }
  await page.locator('#main-header').waitFor({ state: 'visible', timeout: 10000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  try {
    // 1. DESKTOP 1440px
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await loginAsTeacher(page);
    await page.waitForTimeout(500);

    const btnOverflow = page.locator('.header-overflow-menu summary.hdr-btn');
    const btnUser = page.locator('.user-profile-badge.hdr-btn');

    // Measure metrics
    const metricsDesktop = await page.evaluate(() => {
      const btn = document.querySelector('.header-overflow-menu summary.hdr-btn');
      const userBtn = document.querySelector('.user-profile-badge.hdr-btn');
      const label = btn.querySelector('.hdr-btn__label');
      const svg = btn.querySelector('.hdr-btn__chev');

      const btnRect = btn.getBoundingClientRect();
      const userRect = userBtn.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();

      const btnComputed = window.getComputedStyle(btn);
      const userComputed = window.getComputedStyle(userBtn);
      const labelCenterY = (labelRect.top + labelRect.bottom) / 2;
      const svgCenterY = (svgRect.top + svgRect.bottom) / 2;
      const centerDiff = Math.abs(labelCenterY - svgCenterY);

      // Check text character 'v' or emoji in DOM
      const hasCharV = btn.textContent.includes('v') || btn.textContent.includes('⌄') || btn.textContent.includes('▼');

      return {
        btnHeight: btnRect.height,
        userBtnHeight: userRect.height,
        heightDiff: Math.abs(btnRect.height - userRect.height),
        btnWidth: btnRect.width,
        userBtnWidth: userRect.width,
        paddingLeft: btnComputed.paddingLeft,
        paddingRight: btnComputed.paddingRight,
        borderRadius: btnComputed.borderRadius,
        display: btnComputed.display,
        alignItems: btnComputed.alignItems,
        justifyContent: btnComputed.justifyContent,
        gap: btnComputed.gap,
        backgroundColor: btnComputed.backgroundColor,
        borderColor: btnComputed.borderColor,
        color: btnComputed.color,
        labelCenterY,
        svgCenterY,
        centerDiff,
        hasCharV,
        textContent: btn.textContent.trim(),
        ariaHasPopup: btn.getAttribute('aria-haspopup'),
        ariaExpanded: btn.getAttribute('aria-expanded')
      };
    });

    results.metricsDesktop = metricsDesktop;

    // Screenshot 1: Desktop Normal
    await btnOverflow.screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_btn_desktop_normal.png') });

    // Screenshot 2: Desktop Hover
    await btnOverflow.hover();
    await page.waitForTimeout(200);
    const hoverBg = await page.evaluate(() => {
      const btn = document.querySelector('.header-overflow-menu summary.hdr-btn');
      return {
        backgroundColor: window.getComputedStyle(btn).backgroundColor,
        borderColor: window.getComputedStyle(btn).borderColor
      };
    });
    results.desktopHoverStyle = hoverBg;
    await btnOverflow.screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_btn_desktop_hover.png') });

    // Screenshot 3: Desktop Open
    await btnOverflow.click();
    await page.waitForTimeout(300);
    const openState = await page.evaluate(() => {
      const details = document.querySelector('.header-overflow-menu');
      const btn = details.querySelector('summary.hdr-btn');
      const chev = btn.querySelector('.hdr-btn__chev');
      const chevTransform = window.getComputedStyle(chev).transform;
      return {
        isOpen: details.hasAttribute('open'),
        ariaExpanded: btn.getAttribute('aria-expanded'),
        chevTransform,
        borderColor: window.getComputedStyle(btn).borderColor
      };
    });
    results.desktopOpenState = openState;
    await btnOverflow.screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_btn_desktop_open.png') });
    await page.locator('.header-right').screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_desktop_right_open.png') });

    // Close menu before mobile
    await btnOverflow.click();
    await page.waitForTimeout(200);

    // Full header desktop screenshot
    await page.locator('.app-header').screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_full_desktop.png') });
    await page.close();

    // 2. MOBILE 390px
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await loginAsTeacher(mobilePage);
    await mobilePage.waitForTimeout(500);

    const mBtnOverflow = mobilePage.locator('.header-overflow-menu summary.hdr-btn');
    const mBtnUser = mobilePage.locator('.user-profile-badge.hdr-btn');

    const metricsMobile = await mobilePage.evaluate(() => {
      const btn = document.querySelector('.header-overflow-menu summary.hdr-btn');
      const userBtn = document.querySelector('.user-profile-badge.hdr-btn');
      const label = btn.querySelector('.hdr-btn__label');
      const svg = btn.querySelector('.hdr-btn__chev');

      const btnRect = btn.getBoundingClientRect();
      const userRect = userBtn.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();

      const labelCenterY = (labelRect.top + labelRect.bottom) / 2;
      const svgCenterY = (svgRect.top + svgRect.bottom) / 2;
      const centerDiff = Math.abs(labelCenterY - svgCenterY);

      return {
        btnHeight: btnRect.height,
        userBtnHeight: userRect.height,
        heightDiff: Math.abs(btnRect.height - userRect.height),
        btnWidth: btnRect.width,
        userBtnWidth: userRect.width,
        labelCenterY,
        svgCenterY,
        centerDiff,
        ariaHasPopup: btn.getAttribute('aria-haspopup'),
        ariaExpanded: btn.getAttribute('aria-expanded')
      };
    });

    results.metricsMobile = metricsMobile;

    // Screenshot 4: Mobile Normal
    await mBtnOverflow.screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_btn_mobile_normal.png') });

    // Screenshot 5: Mobile Hover
    await mBtnOverflow.hover();
    await mobilePage.waitForTimeout(200);
    await mBtnOverflow.screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_btn_mobile_hover.png') });

    // Screenshot 6: Mobile Open
    await mBtnOverflow.click();
    await mobilePage.waitForTimeout(300);
    const mOpenState = await mobilePage.evaluate(() => {
      const details = document.querySelector('.header-overflow-menu');
      const btn = details.querySelector('summary.hdr-btn');
      const chev = btn.querySelector('.hdr-btn__chev');
      return {
        isOpen: details.hasAttribute('open'),
        ariaExpanded: btn.getAttribute('aria-expanded'),
        chevTransform: window.getComputedStyle(chev).transform
      };
    });
    results.mobileOpenState = mOpenState;
    await mBtnOverflow.screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_btn_mobile_open.png') });
    await mobilePage.locator('.app-header').screenshot({ path: path.join(ARTIFACT_DIR, 'hdr_full_mobile_open.png') });

    await mobilePage.close();

    console.log('=== TEST VERIFICATION RESULTS ===');
    console.log(JSON.stringify(results, null, 2));

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

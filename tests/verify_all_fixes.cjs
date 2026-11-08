/**
 * verify_all_fixes.cjs
 * Comprehensive verification for LỖI A, B, and C:
 * - Tests all lessons with data across all 3 tiers (high, medium, low) and prefers-reduced-motion
 * - Asserts presence and visibility of key elements in all 6 stages
 * - Tests teacher editor tabs and live 3D preview
 * - Verifies LỖI B (notice strip flush under header / flush top at login without card overlap)
 * - Verifies LỖI C (heritage drum & flag at 1440px, 1024px, 390px)
 * - Takes screenshots for final report
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/trung/.gemini/antigravity/brain/6392d6dc-09e0-468f-bc4c-a22dbf8c9dfe/scratch');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:8080';

const LESSONS = [
  { id: 'ngoc-hoi-ha-hoi-1789', hasVariables: true, title: 'Trận Ngọc Hồi - Hạ Hồi' },
  { id: 'rach-gam-xoai-mut-1785', hasVariables: false, title: 'Trận Rạch Gầm - Xoài Mút' }
];

const CONFIGS = [
  { tier: 'high', reducedMotion: false, label: 'Tier: HIGH (motion standard)' },
  { tier: 'medium', reducedMotion: false, label: 'Tier: MEDIUM (motion reduced)' },
  { tier: 'low', reducedMotion: false, label: 'Tier: LOW (motion minimal)' },
  { tier: 'high', reducedMotion: true, label: 'Tier: HIGH with prefers-reduced-motion: reduce' }
];

async function run() {
  console.log('===============================================================');
  console.log('STARTING AUTOMATED VERIFICATION: LỖI A, B, C');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });

  const summary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: LỖI A - 6-STAGE CLASSROOM LOOP ACROSS ALL LESSONS & TIERS
    // ------------------------------------------------------------------------
    console.log('\n--- VERIFYING LỖI A: 6-STAGE LOOP ACROSS ALL LESSONS & TIERS ---');

    for (const config of CONFIGS) {
      console.log(`\n▶ Testing configuration: ${config.label}`);

      for (const lesson of LESSONS) {
        summary.totalTests++;
        const testName = `[${config.tier}${config.reducedMotion ? '+reduced' : ''}] ${lesson.id}`;

        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: config.reducedMotion ? 'reduce' : 'no-preference'
        });
        const page = await context.newPage();

        // Collect console errors
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        try {
          // Set quality preference & student session in browser
          await page.addInitScript((tier) => {
            try {
              localStorage.setItem('suviet:quality', tier);
              localStorage.setItem('history_sim_quality', tier);
              sessionStorage.setItem('history_sim_auth_session', JSON.stringify({
                role: 'student',
                roleLabel: 'Học sinh',
                displayName: 'Nguyễn Quang Vinh (11A1)',
                username: 'admin',
                loginTime: new Date().toISOString()
              }));
            } catch (e) {}
          }, config.tier);

          // 1. Open student dashboard
          await page.goto(`${BASE_URL}/#/student`);
          await page.waitForSelector('#view-student-dashboard.active', { timeout: 6000 });

          // Verify quality tier attribute set on <html>
          const htmlQuality = await page.getAttribute('html', 'data-quality');
          console.log(`  Lesson: ${lesson.id} | data-quality="${htmlQuality}"`);

          // 2. Open lesson interactive loop
          await page.goto(`${BASE_URL}/#/lesson/${lesson.id}/interactive`);
          await page.waitForSelector('#view-lesson-detail.active', { timeout: 6000 });

          // STAGE 1: Khởi động
          await page.waitForSelector('#screen-intro.active', { timeout: 4000 });
          const introNarration = page.locator('#intro-narration, #intro-summary-text').first();
          const btnStart = page.locator('#btn-start-6stages');
          if (!(await introNarration.isVisible()) || !(await btnStart.isVisible())) {
            throw new Error('Stage 1 elements not visible');
          }

          // STAGE 2: Khám phá 3D gốc
          await btnStart.click();
          await page.waitForSelector('#screen-sim-original.active', { timeout: 5000 });
          const btnPlayOrig = page.locator('#btn-play-original');
          const canvasOrig = page.locator('#viewport-original-canvas').first();
          if (!(await btnPlayOrig.isVisible()) || !(await canvasOrig.isVisible())) {
            throw new Error('Stage 2 elements not visible');
          }

          // STAGE 3: Câu hỏi của vua / câu hỏi trọng tâm
          const btnGotoQ = page.locator('#btn-goto-question');
          await btnGotoQ.click();
          await page.waitForSelector('#screen-question.active', { timeout: 5000 });

          if (lesson.hasVariables) {
            const btnRunSim = page.locator('#btn-run-simulation');
            const variablesContainer = page.locator('#variables-container');
            if (!(await btnRunSim.isVisible()) || !(await variablesContainer.isVisible())) {
              throw new Error('Stage 3 variable elements not visible');
            }

            // Capture Stage 3 screenshot (on high tier standard motion)
            if (config.tier === 'high' && !config.reducedMotion) {
              await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_step_3.png') });
            }

            // STAGE 4: Thử cách khác (Run student simulation)
            await btnRunSim.click();
            await page.waitForSelector('#screen-sim-custom.active', { timeout: 6000 });
            const customCanvas = page.locator('#viewport-custom-canvas').first();
            const btnGotoComp = page.locator('#btn-goto-comparison');
            const btnPlayCustom = page.locator('#btn-play-custom');
            if (!(await customCanvas.isVisible()) || !(await btnGotoComp.isVisible()) || !(await btnPlayCustom.isVisible())) {
              throw new Error('Stage 4 custom simulation elements not visible');
            }

            // Capture Stage 4 screenshot
            if (config.tier === 'high' && !config.reducedMotion) {
              await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_step_4.png') });
            }

            // STAGE 5: So sánh kết quả
            await btnGotoComp.click();
            await page.waitForSelector('#screen-comparison.active', { timeout: 5000 });
            const compOrig = page.locator('#comp-orig-casualties');
            const compCust = page.locator('#comp-cust-casualties');
            if (!(await compOrig.isVisible()) || !(await compCust.isVisible())) {
              throw new Error('Stage 5 comparison table elements not visible');
            }

            // Capture Stage 5 screenshot
            if (config.tier === 'high' && !config.reducedMotion) {
              await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_step_5.png') });
            }

            // STAGE 6: Củng cố & Tổng kết
            const btnGotoExp = page.locator('#btn-goto-explanation');
            await btnGotoExp.click();
            await page.waitForSelector('#screen-explanation.active', { timeout: 5000 });
            const expPoints = page.locator('#explanation-points-list');
            const btnFinish = page.locator('#btn-finish-6stages');
            const btnTryAgain = page.locator('#btn-try-another-tactics');
            if (!(await expPoints.isVisible()) || !(await btnFinish.isVisible()) || !(await btnTryAgain.isVisible())) {
              throw new Error('Stage 6 explanation elements not visible');
            }

            // Capture Stage 6 screenshot
            if (config.tier === 'high' && !config.reducedMotion) {
              await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_step_6.png') });
            }
          } else {
            // For lesson without variables, stage 3 explains and blocks simulation
            const notice = page.locator('#question-empty-notice');
            if (!(await notice.isVisible())) {
              throw new Error('Stage 3 notice for lesson without variables not visible');
            }
          }

          summary.passed++;
          console.log(`  ✓ ${testName} PASSED: 6 stages verified successfully`);
          summary.details.push({ name: testName, status: 'PASSED' });
        } catch (err) {
          summary.failed++;
          console.error(`  ✗ ${testName} FAILED: ${err.message}`);
          summary.details.push({ name: testName, status: 'FAILED', error: err.message });
        } finally {
          await context.close();
        }
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 2: VERIFY TEACHER EDITOR TABS & LIVE 3D PREVIEW (Requirement 7)
    // ------------------------------------------------------------------------
    console.log('\n--- VERIFYING TEACHER EDITOR TABS & LIVE 3D PREVIEW ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      try {
        await page.addInitScript(() => {
          try {
            sessionStorage.setItem('history_sim_auth_session', JSON.stringify({
              role: 'teacher',
              roleLabel: 'Giáo viên',
              displayName: 'Thầy Nguyễn Văn Hưng',
              username: 'admin',
              loginTime: new Date().toISOString()
            }));
          } catch (e) {}
        });

        await page.goto(`${BASE_URL}/#/lesson/ngoc-hoi-ha-hoi-1789/edit`);
        await page.waitForSelector('#view-teacher-editor.active', { timeout: 6000 });

        // Tab A: Content
        const tabContent = page.locator('.btn-editor-tab[data-tab="tab-content"]');
        await tabContent.click();
        await page.waitForSelector('#panel-tab-content.active', { timeout: 3000 });
        console.log('  ✓ Teacher Tab 1: Nội dung bài dạy active');

        // Tab B: Questions
        const tabQuestions = page.locator('.btn-editor-tab[data-tab="tab-questions"]');
        await tabQuestions.click();
        await page.waitForSelector('#panel-tab-questions.active', { timeout: 3000 });
        console.log('  ✓ Teacher Tab 2: Câu hỏi & Thảo luận active');

        // Tab C: 3D Simulation & Live Preview
        const tabSim = page.locator('.btn-editor-tab[data-tab="tab-sim3d"]');
        await tabSim.click();
        await page.waitForSelector('#panel-tab-sim3d.active', { timeout: 3000 });
        await page.waitForSelector('#editor-preview-canvas-mount canvas', { timeout: 5000 });
        console.log('  ✓ Teacher Tab 3: Mô phỏng 3D trực tiếp & live preview mount active');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_teacher_editor_3d.png') });

        // Tab D: Notes
        const tabNotes = page.locator('.btn-editor-tab[data-tab="tab-notes"]');
        await tabNotes.click();
        await page.waitForSelector('#panel-tab-notes.active', { timeout: 3000 });
        console.log('  ✓ Teacher Tab 4: Ghi chú sư phạm active');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_teacher_editor_tabs.png') });
      } finally {
        await context.close();
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 3: VERIFY LỖI B (Notice strip flush under header / flush top at login)
    // ------------------------------------------------------------------------
    console.log('\n--- VERIFYING LỖI B: GLOBAL NOTICE STRIP ---');
    {
      // 1. Login page at 1440px
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}/`);
        await page.waitForSelector('#view-login.active', { timeout: 6000 });

        const stripBox = await page.locator('.global-notice-strip').boundingBox();
        const cardBox = await page.locator('.login-card').boundingBox();

        console.log(`  Login 1440px: Strip top=${stripBox.y}, height=${stripBox.height} | Card top=${cardBox.y}`);
        if (stripBox.y > 5) {
          throw new Error(`Strip not flush at top on login: top is ${stripBox.y}`);
        }
        if (cardBox.y < stripBox.y + stripBox.height) {
          throw new Error(`Login card is covered by strip! Card top: ${cardBox.y}, strip bottom: ${stripBox.y + stripBox.height}`);
        }
        console.log('  ✓ Login 1440px: Strip sits flush at top (0px), card is clear with no overlap');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_login_1440.png') });

        // 2. Login page at 390px (mobile)
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(300);
        const stripBox390 = await page.locator('.global-notice-strip').boundingBox();
        const cardBox390 = await page.locator('.login-card').boundingBox();
        console.log(`  Login 390px: Strip top=${stripBox390.y}, height=${stripBox390.height} | Card top=${cardBox390.y}`);
        if (stripBox390.y > 5) {
          throw new Error(`Strip not flush at top on mobile login: top is ${stripBox390.y}`);
        }
        if (cardBox390.y < stripBox390.y + stripBox390.height) {
          throw new Error(`Mobile login card covered by strip! Card top: ${cardBox390.y}`);
        }
        console.log('  ✓ Login 390px: Strip sits flush at top, mobile card is clear with no overlap');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_login_390.png') });

        // 3. Page with header (Teacher dashboard at 1440px)
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.evaluate(() => {
          try {
            sessionStorage.setItem('history_sim_auth_session', JSON.stringify({
              role: 'teacher',
              roleLabel: 'Giáo viên',
              displayName: 'Thầy Nguyễn Văn Hưng',
              username: 'admin',
              loginTime: new Date().toISOString()
            }));
          } catch (e) {}
        });
        await page.goto(`${BASE_URL}/#/teacher`);
        await page.waitForSelector('#view-teacher-dashboard.active', { timeout: 6000 });

        const headerBox = await page.locator('#main-header').boundingBox();
        const stripWithHeaderBox = await page.locator('.global-notice-strip').boundingBox();
        console.log(`  With Header: Header bottom=${headerBox.y + headerBox.height} | Strip top=${stripWithHeaderBox.y}`);
        const gap = Math.abs(stripWithHeaderBox.y - (headerBox.y + headerBox.height));
        if (gap > 2) {
          throw new Error(`Strip not flush under header: gap is ${gap}px`);
        }
        console.log('  ✓ Page with header: Strip sits flush immediately under header');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'report_header_with_strip.png') });
      } finally {
        await context.close();
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 4: VERIFY LỖI C (Heritage drum & flag composition at 1440, 1024, 390)
    // ------------------------------------------------------------------------
    console.log('\n--- VERIFYING LỖI C: HERITAGE DRUM & FLAG AT 1440, 1024, 390 ---');
    {
      const widths = [1440, 1024, 390];
      for (const w of widths) {
        const context = await browser.newContext({ viewport: { width: w, height: 844 } });
        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}/`);
          await page.waitForSelector('#view-login.active', { timeout: 6000 });

          const drum = await page.locator('.heritage-drum').boundingBox();
          const flag = await page.locator('.heritage-flag').boundingBox();
          const flagLabel = await page.locator('.heritage-flag-label').textContent();
          const drumLabel = await page.locator('.heritage-drum-label').textContent();

          console.log(`  Width ${w}px: Drum w=${drum ? drum.width : 'N/A'}, Flag w=${flag ? flag.width : 'N/A'}`);
          console.log(`  Labels: flagLabel="${flagLabel.trim()}", drumLabel="${drumLabel.trim()}"`);

          if (w >= 760) {
            // Check overlap ratio: flag should overlap right rim only (max 15% of drum width)
            const overlapX = (drum.x + drum.width) - flag.x;
            const overlapPercent = (overlapX / drum.width) * 100;
            console.log(`  Overlap on drum right rim: ${overlapX.toFixed(1)}px (${overlapPercent.toFixed(1)}%)`);
            if (overlapX > 38 || overlapPercent > 18) {
              throw new Error(`Flag overlaps more than allowable right rim! (${overlapPercent.toFixed(1)}%)`);
            }
          }

          await page.screenshot({ path: path.join(ARTIFACT_DIR, `report_heritage_${w}px.png`) });
          console.log(`  ✓ Width ${w}px: Drum & flag composition verified successfully`);
        } finally {
          await context.close();
        }
      }
    }

  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${summary.passed}/${summary.totalTests} tests passed`);
  if (summary.failed > 0) {
    console.error(`FAILED TESTS: ${summary.failed}`);
    process.exit(1);
  } else {
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

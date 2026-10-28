/**
 * app.js - Main Application Controller
 * Coordinates:
 * - Authentication (Teacher / Student) with sessionStorage
 * - Dynamic Header & Role-based Navigation
 * - Teacher Dashboard & Lesson Authoring (4 tabs + live 3D preview + Undo/Redo)
 * - Student Area (Visible lessons only, 3D Replay, Synced Chapters, Key Notes, Teacher Questions)
 * - 6-Stage Classroom Stepper Interactive Loop
 * - URL Routing & Hidden Lesson Protection
 * - WebAudio Procedural Ambience Toggle
 * - Presentation Mode & Graphic Quality Toggle
 */

(function () {
  'use strict';

  // App State
  let currentUser = null;
  let activeLesson = null;
  let activeRole = 'guest'; // 'guest' | 'teacher' | 'student'
  let editorActiveTab = 'tab-content';
  let studentActiveSubtab = 'subtab-keynotes';
  let current6StageIndex = 1;

  // 3D Scene Instances
  let editorSceneInstance = null;
  let studentViewerSceneInstance = null;
  let originalStageSceneInstance = null;
  let customStageSceneInstance = null;

  // Undo / Redo stack for teacher editor
  const undoStack = [];
  const redoStack = [];

  // Tactical choices for 6-stage loop
  let studentTacticalChoices = {};

  // Audio & Presentation State
  let isPresentationMode = false;
  let currentQuality = window.localStorage ? window.localStorage.getItem('history_sim_quality') || 'high' : 'high';
  let transitionTimer = null;
  let lessonSceneInstance = null;
  let activeLessonChapter = 0;
  let isStudentPreview = false;

  // DOM Elements cache
  const elements = {};

  /**
   * Application Initialization
   */
  async function init() {
    cacheDOMElements();
    setupGlobalEventListeners();
    setupRouting();

    if (window.location.hash === '#/fonttest') {
      handleRoute();
      return;
    }

    // Check existing session
    if (window.Auth && window.Auth.isAuthenticated()) {
      currentUser = window.Auth.getCurrentUser();
      setAuthenticatedRole(currentUser.role);
      handleRoute();
    } else {
      if (hashMatchesLessonRequest(window.location.hash)) {
        try { sessionStorage.setItem('history_requested_lesson_route', window.location.hash); } catch (error) { /* Storage may be unavailable. */ }
      }
      showView('view-login');
    }
  }

  function cacheDOMElements() {
    // Header
    elements.mainHeader = document.getElementById('main-header');
    elements.headerNavTabs = document.getElementById('header-nav-tabs');
    elements.headerUserName = document.getElementById('header-user-name');
    elements.headerUserRoleChip = document.getElementById('header-user-role-chip');
    elements.headerUserFullName = document.getElementById('header-user-full-name');
    elements.headerUserAvatar = document.getElementById('header-user-avatar');
    elements.headerMenu = document.getElementById('btn-header-menu');
    elements.fontTestStatus = document.getElementById('fonttest-status');
    elements.fontTestRows = document.getElementById('fonttest-rows');
    elements.btnLogout = document.getElementById('btn-logout');
    elements.btnToggleAudio = document.getElementById('btn-toggle-audio');
    elements.labelAudioMode = document.getElementById('label-audio-mode');
    elements.btnToggleQuality = document.getElementById('btn-toggle-quality');
    elements.labelQualityMode = document.getElementById('label-quality-mode');
    elements.btnTogglePresentation = document.getElementById('btn-toggle-presentation');
    elements.labelPresentationMode = document.getElementById('label-presentation-mode');
    elements.btnNavBrand = document.getElementById('btn-nav-brand');
    elements.lessonWorkspace = document.getElementById('lesson-workspace-content');
    elements.cinematicTransition = document.getElementById('cinematic-transition');
    elements.transitionTitle = document.getElementById('transition-title');
    elements.btnSkipTransition = document.getElementById('btn-skip-transition');

    // Login View
    elements.viewLogin = document.getElementById('view-login');
    elements.tabLoginTeacher = document.getElementById('tab-login-teacher');
    elements.tabLoginStudent = document.getElementById('tab-login-student');
    elements.formLogin = document.getElementById('form-login');
    elements.inputUsername = document.getElementById('input-username');
    elements.inputPassword = document.getElementById('input-password');
    elements.loginError = document.getElementById('login-error');

    // Teacher Dashboard View
    elements.viewTeacherDashboard = document.getElementById('view-teacher-dashboard');
    elements.teacherLessonsGrid = document.getElementById('teacher-lessons-grid');
    elements.btnCreateLesson = document.getElementById('btn-create-lesson');
    elements.btnExportJson = document.getElementById('btn-export-json');
    elements.btnImportJson = document.getElementById('btn-import-json');
    elements.inputSearchLessons = document.getElementById('input-search-lessons');

    // Teacher Editor View
    elements.viewTeacherEditor = document.getElementById('view-teacher-editor');
    elements.btnEditorBack = document.getElementById('btn-editor-back');
    elements.editorDisplayTitle = document.getElementById('editor-display-title');
    elements.editorDisplayStatus = document.getElementById('editor-display-status');
    elements.btnEditorUndo = document.getElementById('btn-editor-undo');
    elements.btnEditorRedo = document.getElementById('btn-editor-redo');
    elements.btnEditorPreviewStudent = document.getElementById('btn-editor-preview-student');
    elements.btnEditorSaveDraft = document.getElementById('btn-editor-save-draft');
    elements.btnEditorSchedule = document.getElementById('btn-editor-schedule');
    elements.btnEditorPublish = document.getElementById('btn-editor-publish');
    elements.editorSectionsContainer = document.getElementById('editor-sections-container');
    elements.btnAddSection = document.getElementById('btn-add-section');
    elements.editorQuestionsContainer = document.getElementById('editor-questions-container');
    elements.btnAddQuestion = document.getElementById('btn-add-question');
    elements.editorPreviewMount = document.getElementById('editor-preview-canvas-mount');

    // Editor Form Inputs
    elements.editTitle = document.getElementById('edit-title');
    elements.editSubtitle = document.getElementById('edit-subtitle');
    elements.editDate = document.getElementById('edit-date');
    elements.editClass = document.getElementById('edit-class');
    elements.editSubject = document.getElementById('edit-subject');
    elements.editGrade = document.getElementById('edit-grade');
    elements.editTeacher = document.getElementById('edit-teacher');
    elements.editObjectives = document.getElementById('edit-objectives');
    elements.editFocusQuestion = document.getElementById('edit-focus-question');
    elements.editKeyNotes = document.getElementById('edit-key-notes');
    elements.editPrivateNotes = document.getElementById('edit-private-notes');

    // 3D Authoring Controls
    elements.togglePropPalisade = document.getElementById('toggle-prop-palisade');
    elements.togglePropTents = document.getElementById('toggle-prop-tents');
    elements.togglePropElephants = document.getElementById('toggle-prop-elephants');
    elements.togglePropBanners = document.getElementById('toggle-prop-banners');
    elements.togglePropFire = document.getElementById('toggle-prop-fire');
    elements.togglePropVillage = document.getElementById('toggle-prop-village');
    elements.togglePropBamboo = document.getElementById('toggle-prop-bamboo');
    elements.rangeCountTaySon = document.getElementById('range-count-tayson');
    elements.rangeCountQing = document.getElementById('range-count-qing');
    elements.labelCountTaySon = document.getElementById('label-count-tayson');
    elements.labelCountQing = document.getElementById('label-count-qing');
    elements.colorTaySon = document.getElementById('color-tayson');
    elements.colorQing = document.getElementById('color-qing');

    // Student Dashboard View
    elements.viewStudentDashboard = document.getElementById('view-student-dashboard');
    elements.studentPostersGrid = document.getElementById('student-posters-grid');
    elements.inputStudentSearch = document.getElementById('input-student-search');

    // Student Lesson Viewer View
    elements.viewStudentViewer = document.getElementById('view-student-viewer');
    elements.btnViewerBackDashboard = document.getElementById('btn-viewer-back-dashboard');
    elements.viewerLessonTitle = document.getElementById('viewer-lesson-title');
    elements.viewerLessonSubtitle = document.getElementById('viewer-lesson-subtitle');
    elements.viewerTeacherName = document.getElementById('viewer-teacher-name');
    elements.viewerDateText = document.getElementById('viewer-date-text');
    elements.viewerClassText = document.getElementById('viewer-class-text');
    elements.studentViewportMount = document.getElementById('student-viewport-mount');
    elements.studentChaptersContainer = document.getElementById('student-chapters-container');
    elements.studentKeynotesList = document.getElementById('student-keynotes-list');
    elements.studentQuestionsContainer = document.getElementById('student-questions-container');
    elements.btnLaunch6stages = document.getElementById('btn-launch-6stages');
    elements.studentPreviousRunBox = document.getElementById('student-previous-run-box');

    // Student Player controls
    elements.studentTimelineSlider = document.getElementById('student-timeline-slider');
    elements.studentTimeReadout = document.getElementById('student-time-readout');
    elements.btnStudentPlay = document.getElementById('btn-student-play');
    elements.btnStudentRewind = document.getElementById('btn-student-rewind');
    elements.studentSpeedSelect = document.getElementById('student-speed-select');
    elements.btnStudentOrbit = document.getElementById('btn-student-orbit');

    // 6-Stage Interactive Loop View
    elements.viewLessonDetail = document.getElementById('view-lesson-detail');
    elements.btnBackFrom6stages = document.getElementById('btn-back-from-6stages');
    elements.btnStart6stages = document.getElementById('btn-start-6stages');
    elements.btnGotoQuestion = document.getElementById('btn-goto-question');
    elements.btnRunSimulation = document.getElementById('btn-run-simulation');
    elements.btnGotoComparison = document.getElementById('btn-goto-comparison');
    elements.btnGotoExplanation = document.getElementById('btn-goto-explanation');
    elements.btnTryAnotherTactics = document.getElementById('btn-try-another-tactics');
    elements.btnFinish6stages = document.getElementById('btn-finish-6stages');
    elements.btnViewAssumptions = document.getElementById('btn-view-assumptions');

    // Hidden Lesson Error View
    elements.viewLessonHidden = document.getElementById('view-lesson-hidden');
    elements.btnBackFromHidden = document.getElementById('btn-back-from-hidden');

    // Modals
    elements.modalSource = document.getElementById('modal-source');
    elements.sourceModalBody = document.getElementById('source-modal-body');
    elements.modalAssumptions = document.getElementById('modal-assumptions');
    elements.assumptionsModalBody = document.getElementById('assumptions-modal-body');
    elements.modalConfirmPublish = document.getElementById('modal-confirm-publish');
    elements.btnConfirmPublishSubmit = document.getElementById('btn-confirm-publish-submit');
    elements.modalImportJson = document.getElementById('modal-import-json');
    elements.textareaImportJson = document.getElementById('textarea-import-json');
    elements.fileInputJson = document.getElementById('file-input-json');
    elements.importJsonError = document.getElementById('import-json-error');
    elements.btnSubmitImportJson = document.getElementById('btn-submit-import-json');
  }

  /**
   * Set authenticated role and configure UI
   */
  function setAuthenticatedRole(role) {
    activeRole = role;
    document.body.className = `role-${role}`;
    elements.mainHeader.style.display = 'flex';

    if (currentUser) {
      const displayName = normalizeText(currentUser.displayName);
      elements.headerUserName.textContent = displayName;
      elements.headerUserFullName.textContent = displayName;
      elements.headerUserAvatar.textContent = displayName.charAt(0) || 'S';
      elements.headerUserRoleChip.textContent = normalizeText(currentUser.roleLabel);
      elements.headerUserRoleChip.className = `user-role-chip ${currentUser.role}`;
    }

    renderHeaderNavTabs();

  }

  /**
   * Render Header Navigation Tabs based on role
   */
  function renderHeaderNavTabs() {
    elements.headerNavTabs.innerHTML = '';
    if (activeRole === 'teacher') {
      const btnDash = document.createElement('button');
      btnDash.className = 'nav-tab active';
      btnDash.id = 'tab-nav-teacher-dash';
      btnDash.innerHTML = '<span>📅 Quản lý bài giảng</span>';
      btnDash.addEventListener('click', () => {
        window.location.hash = '#/teacher';
        showRoleHub();
      });

      const btnEdit = document.createElement('button');
      btnEdit.className = 'nav-tab';
      btnEdit.id = 'tab-nav-teacher-edit';
      btnEdit.innerHTML = '<span>✍️ Soạn thảo bài giảng</span>';
      btnEdit.addEventListener('click', () => {
        if (!activeLesson) {
          const all = window.LessonStorage.getAllLessons();
          activeLesson = all[0];
        }
        openTeacherEditor(activeLesson.id);
      });

      elements.headerNavTabs.appendChild(btnDash);
      elements.headerNavTabs.appendChild(btnEdit);
    } else if (activeRole === 'student') {
      const btnDash = document.createElement('button');
      btnDash.className = 'nav-tab active';
      btnDash.id = 'tab-nav-student-dash';
      btnDash.innerHTML = '<span>📚 Bài đã học</span>';
      btnDash.addEventListener('click', () => {
        window.location.hash = '#/student';
        showRoleHub();
      });

      const btnView = document.createElement('button');
      btnView.className = 'nav-tab';
      btnView.id = 'tab-nav-student-view';
      btnView.innerHTML = '<span>📖 Xem bài học</span>';
      btnView.addEventListener('click', () => {
        if (!activeLesson) {
          const visible = window.LessonStorage.getVisibleLessonsForStudent();
          if (visible.length > 0) activeLesson = visible[0];
        }
        if (activeLesson) {
          navigateToLesson(activeLesson.id);
        } else {
          showView('view-student-dashboard');
        }
      });

      elements.headerNavTabs.appendChild(btnDash);
      elements.headerNavTabs.appendChild(btnView);
    }
  }

  /**
   * Switch between app views
   */
  function showView(viewId) {
    document.querySelectorAll('.app-view').forEach((v) => {
      v.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Update active state in header tabs
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.remove('active');
    });

    if (viewId === 'view-teacher-dashboard') {
      const t = document.getElementById('tab-nav-teacher-dash');
      if (t) t.classList.add('active');
    } else if (viewId === 'view-teacher-editor') {
      const t = document.getElementById('tab-nav-teacher-edit');
      if (t) t.classList.add('active');
    } else if (viewId === 'view-student-dashboard') {
      const t = document.getElementById('tab-nav-student-dash');
      if (t) t.classList.add('active');
    } else if (viewId === 'view-student-viewer' || viewId === 'view-lesson-detail' || viewId === 'view-lesson-workspace') {
      const t = document.getElementById('tab-nav-student-view');
      if (t) t.classList.add('active');
    }
  }

  /**
   * Global Event Listeners setup
   */
  function setupGlobalEventListeners() {
    elements.headerMenu.addEventListener('click', () => {
      const open = elements.mainHeader.classList.toggle('nav-open');
      elements.headerMenu.setAttribute('aria-expanded', String(open));
    });
    elements.headerNavTabs.addEventListener('click', () => {
      elements.mainHeader.classList.remove('nav-open');
      elements.headerMenu.setAttribute('aria-expanded', 'false');
    });
    // 1. Login Role Tabs
    let selectedLoginRole = 'teacher';
    elements.tabLoginTeacher.addEventListener('click', () => {
      selectedLoginRole = 'teacher';
      elements.tabLoginTeacher.classList.add('active');
      elements.tabLoginStudent.classList.remove('active');
      elements.inputUsername.value = 'admin';
      elements.inputPassword.value = '123';
    });

    elements.tabLoginStudent.addEventListener('click', () => {
      selectedLoginRole = 'student';
      elements.tabLoginStudent.classList.add('active');
      elements.tabLoginTeacher.classList.remove('active');
      elements.inputUsername.value = 'admin';
      elements.inputPassword.value = '123';
    });

    // 2. Login Form Submit
    elements.formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      elements.loginError.style.display = 'none';

      const userVal = elements.inputUsername.value;
      const passVal = elements.inputPassword.value;
      const res = window.Auth.login(selectedLoginRole, userVal, passVal);

      if (res.success) {
        currentUser = res.user;
        setAuthenticatedRole(currentUser.role);
        beginPostLoginTransition();
      } else {
        elements.loginError.textContent = res.message || 'Đăng nhập không thành công.';
        elements.loginError.style.display = 'block';
      }
    });

    elements.btnSkipTransition.addEventListener('click', finishPostLoginTransition);

    // 3. Logout
    elements.btnLogout.addEventListener('click', () => {
      if (lessonSceneInstance) lessonSceneInstance.destroy();
      lessonSceneInstance = null;
      window.Auth.logout();
      currentUser = null;
      activeRole = 'guest';
      elements.mainHeader.style.display = 'none';
      if (editorSceneInstance) {
        editorSceneInstance.destroy();
        editorSceneInstance = null;
      }
      if (studentViewerSceneInstance) {
        studentViewerSceneInstance.destroy();
        studentViewerSceneInstance = null;
      }
      window.location.hash = '';
      showView('view-login');
    });

    // 4. Brand Click
    elements.btnNavBrand.addEventListener('click', () => {
      if (activeRole === 'teacher') {
        window.location.hash = '#/teacher';
        showRoleHub();
      } else if (activeRole === 'student') {
        window.location.hash = '#/student';
        showRoleHub();
      }
    });

    // 5. Audio Toggle
    elements.btnToggleAudio.addEventListener('click', () => {
      if (window.BattleAudio) {
        const isAudioOn = window.BattleAudio.toggle();
        elements.labelAudioMode.textContent = isAudioOn ? 'Âm thanh: Bật' : 'Âm thanh: Tắt';
        elements.btnToggleAudio.querySelector('.tool-icon').textContent = isAudioOn ? '🔊' : '🔇';
        elements.btnToggleAudio.classList.toggle('active', isAudioOn);
      }
    });

    // 6. Quality Toggle
    elements.btnToggleQuality.addEventListener('click', () => {
      currentQuality = currentQuality === 'high' ? 'low' : 'high';
      if (window.localStorage) {
        window.localStorage.setItem('history_sim_quality', currentQuality);
      }
      elements.labelQualityMode.textContent = currentQuality === 'high' ? 'Chất lượng: Cao' : 'Chất lượng: Thấp';

      if (editorSceneInstance) editorSceneInstance.setQuality(currentQuality);
      if (studentViewerSceneInstance) studentViewerSceneInstance.setQuality(currentQuality);
      if (lessonSceneInstance) lessonSceneInstance.setQuality(currentQuality);
    });

    // 7. Presentation Mode Toggle
    elements.btnTogglePresentation.addEventListener('click', () => {
      isPresentationMode = !isPresentationMode;
      document.body.classList.toggle('presentation-mode', isPresentationMode);
      const playerBox = document.getElementById('student-player-box');
      if (playerBox) playerBox.classList.toggle('letterboxed', isPresentationMode);
      const lessonPlayer = document.getElementById('lesson-player-box');
      if (lessonPlayer) lessonPlayer.classList.toggle('letterboxed', isPresentationMode);

      elements.labelPresentationMode.textContent = isPresentationMode ? 'Thoát toàn màn hình' : 'Chiếu lên lớp';
      elements.btnTogglePresentation.classList.toggle('active', isPresentationMode);
    });

    // 8. Teacher Dashboard Events
    elements.btnCreateLesson.addEventListener('click', handleCreateLesson);
    elements.btnExportJson.addEventListener('click', () => window.LessonStorage.downloadJSON());
    elements.btnImportJson.addEventListener('click', openImportJsonModal);

    elements.inputSearchLessons.addEventListener('input', (e) => {
      renderTeacherDashboard(e.target.value);
    });

    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.getAttribute('data-filter');
        renderTeacherDashboard(elements.inputSearchLessons.value, filter);
      });
    });

    // 9. Teacher Editor Tab switching
    document.querySelectorAll('.btn-editor-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tabKey = btn.getAttribute('data-tab');
        switchEditorTab(tabKey);
      });
    });

    elements.btnEditorBack.addEventListener('click', () => {
      window.location.hash = activeRole === 'teacher' ? '#/teacher' : '#/student';
      showView('view-teacher-dashboard');
      renderTeacherDashboard();
    });

    elements.btnEditorUndo.addEventListener('click', handleEditorUndo);
    elements.btnEditorRedo.addEventListener('click', handleEditorRedo);

    elements.btnEditorPreviewStudent.addEventListener('click', () => {
      if (activeLesson) navigateToLesson(activeLesson.id);
    });

    elements.btnEditorSaveDraft.addEventListener('click', () => saveActiveLessonWithStatus('Nháp'));
    elements.btnEditorSchedule.addEventListener('click', () => saveActiveLessonWithStatus('Đã lên lịch'));
    elements.btnEditorPublish.addEventListener('click', () => {
      elements.modalConfirmPublish.classList.add('active');
    });

    elements.btnConfirmPublishSubmit.addEventListener('click', () => {
      elements.modalConfirmPublish.classList.remove('active');
      saveActiveLessonWithStatus('Đã dạy');
    });

    elements.btnAddSection.addEventListener('click', handleAddSection);
    elements.btnAddQuestion.addEventListener('click', handleAddQuestion);

    // Live Authoring Inputs change listener (auto-save snapshot to undo stack)
    setupLiveAuthoringListeners();

    // 10. Student Area Events
    elements.inputStudentSearch.addEventListener('input', (e) => {
      renderStudentDashboard(e.target.value);
    });

    elements.btnViewerBackDashboard.addEventListener('click', () => {
      window.location.hash = '#/student';
      showView('view-student-dashboard');
      renderStudentDashboard();
    });

    elements.btnBackFromHidden.addEventListener('click', () => {
      window.location.hash = '#/student';
      showView('view-student-dashboard');
      renderStudentDashboard();
    });

    document.querySelectorAll('.btn-student-subtab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const subtab = btn.getAttribute('data-subtab');
        switchStudentSubtab(subtab);
      });
    });

    elements.btnLaunch6stages.addEventListener('click', () => {
      launch6StagesLoop(activeLesson);
    });

    elements.btnBackFrom6stages.addEventListener('click', () => {
      showView('view-student-viewer');
    });

    elements.btnStart6stages.addEventListener('click', () => goTo6StageScreen(2));
    elements.btnGotoQuestion.addEventListener('click', () => goTo6StageScreen(3));
    elements.btnRunSimulation.addEventListener('click', () => goTo6StageScreen(4));
    elements.btnGotoComparison.addEventListener('click', () => goTo6StageScreen(5));
    elements.btnGotoExplanation.addEventListener('click', () => goTo6StageScreen(6));
    elements.btnTryAnotherTactics.addEventListener('click', () => goTo6StageScreen(3));
    elements.btnFinish6stages.addEventListener('click', () => {
      if (activeLesson) navigateToLesson(activeLesson.id);
    });

    if (elements.fileInputJson) {
      elements.fileInputJson.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          elements.textareaImportJson.value = evt.target.result;
        };
        reader.readAsText(file);
      });
    }

    // 11. Modal close handlers
    document.querySelectorAll('.btn-close-modal, [data-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close') || btn.closest('.modal-overlay').id;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
      });
    });

    elements.btnSubmitImportJson.addEventListener('click', handleImportJsonSubmit);
  }

  /**
   * Routing based on window.location.hash
   */
  function setupRouting() {
    window.addEventListener('hashchange', handleRoute);
  }

  function beginPostLoginTransition() {
    const isTeacher = activeRole === 'teacher';
    elements.transitionTitle.textContent = isTeacher ? 'Quản lý bài giảng' : 'Bài đã học';
    elements.cinematicTransition.classList.add('active');
    elements.cinematicTransition.setAttribute('aria-hidden', 'false');
    clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(finishPostLoginTransition, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 2000);
  }

  function finishPostLoginTransition() {
    clearTimeout(transitionTimer);
    transitionTimer = null;
    elements.cinematicTransition.classList.remove('active');
    elements.cinematicTransition.setAttribute('aria-hidden', 'true');
    if (!window.Auth.isAuthenticated()) return;

    let requestedRoute = '';
    try {
      requestedRoute = sessionStorage.getItem('history_requested_lesson_route') || '';
      sessionStorage.removeItem('history_requested_lesson_route');
    } catch (error) { /* Storage may be unavailable. */ }
    const requestedLesson = (requestedRoute || window.location.hash).match(/^#\/?lesson\/([^/]+)/);
    if (requestedRoute) window.location.hash = requestedRoute;
    else if (!requestedLesson) {
      window.location.hash = activeRole === 'teacher' ? '#/teacher' : '#/student';
    }
    handleRoute();
  }

  function navigateToLesson(lessonId) {
    const route = `#/lesson/${encodeURIComponent(lessonId)}`;
    if (window.location.hash === route) handleRoute();
    else window.location.hash = route;
  }

  function showRoleHub() {
    if (lessonSceneInstance) lessonSceneInstance.destroy();
    lessonSceneInstance = null;
    if (activeRole === 'teacher') {
      showView('view-teacher-dashboard');
      renderTeacherDashboard();
    } else {
      showView('view-student-dashboard');
      renderStudentDashboard();
    }
  }

  function handleRoute() {
    const hash = window.location.hash || '';
    if (hash === '#/fonttest') {
      elements.mainHeader.style.display = 'none';
      showView('view-fonttest');
      renderFontTest();
      return;
    }
    if (!window.Auth.isAuthenticated()) {
      if (lessonSceneInstance) lessonSceneInstance.destroy();
      lessonSceneInstance = null;
      if (hashMatchesLessonRequest(hash)) {
        try { sessionStorage.setItem('history_requested_lesson_route', hash); } catch (error) { /* Storage may be unavailable. */ }
      }
      showView('view-login');
      return;
    }

    const canonical = hash.match(/^#\/?lesson\/([^/]+)(?:\/([^/]+))?/);
    const legacy = hash.match(/^#lesson\/([^/]+)(?:\/([^/]+))?/);
    const route = canonical || legacy;
    if (route) {
      const lessonId = decodeURIComponent(route[1]);
      const subAction = route[2] || '';
      const lesson = window.LessonStorage.getLessonById(lessonId);
      if (!lesson) {
        showRoleHub();
        return;
      }
      if (activeRole === 'student' && !window.LessonStorage.isLessonVisibleForStudent(lesson)) {
        if (lessonSceneInstance) lessonSceneInstance.destroy();
        lessonSceneInstance = null;
        activeLesson = null;
        showView('view-lesson-hidden');
        return;
      }
      if (activeRole === 'teacher' && subAction === 'edit') {
        openTeacherEditor(lessonId);
        return;
      }
      if (activeRole === 'teacher' && subAction === 'preview') {
        isStudentPreview = true;
        try { openLessonWorkspace(lesson, false); } catch (error) { showLessonError(); }
        return;
      }
      if (activeRole === 'student' && (subAction === 'edit' || subAction === 'preview')) {
        window.location.replace(`#/lesson/${encodeURIComponent(lessonId)}`);
        return;
      }
      if (subAction === 'interactive' && activeRole === 'student') {
        launch6StagesLoop(lesson);
      } else {
        isStudentPreview = false;
        try { openLessonWorkspace(lesson, false); } catch (error) { showLessonError(); }
      }
      return;
    }

    if (hash === '#/teacher' || hash === '#/student' || hash === '#dashboard' || !hash) {
      showRoleHub();
      return;
    }
    showRoleHub();
  }

  function normalizeText(value) {
    return window.normalizeVietnamese ? window.normalizeVietnamese(String(value == null ? '' : value)) : String(value == null ? '' : value).normalize('NFC');
  }

  async function renderFontTest() {
    if (!elements.fontTestRows || elements.fontTestRows.dataset.rendered === 'true') return;
    elements.fontTestRows.dataset.rendered = 'true';
    const samples = [
      'Trận Ngọc Hồi - Hạ Hồi',
      'Hồ Hầu Ế Ề Ổ Ỗ Ộ',
      'ồ ố ổ ỗ ộ ầ ấ ẩ ẫ ậ ề ế ể ễ ệ ằ ắ ẳ ẵ ặ',
      'ươ ữ ừ ử ự ứ',
      'Nguyễn Huệ, Quang Trung, Đống Đa'
    ];
    const failures = [];
    const checks = [];
    for (const family of ['Noto Serif', 'Noto Sans']) {
      for (const weight of [400, 600, 700]) {
        for (const size of [16, 22, 32]) {
          const font = `${weight} ${size}px "${family}"`;
          try { await document.fonts.load(font, samples.join(' ')); } catch (error) { failures.push(`${family} ${weight}`); }
          checks.push({ family, weight, size, font, loaded: document.fonts.check(font, samples.join(' ')) });
        }
      }
    }
    checks.forEach((check) => {
      const group = document.createElement('section');
      group.className = 'fonttest-row';
      group.innerHTML = `<strong>${check.family} · ${check.weight} · ${check.size}px</strong>`;
      samples.forEach((sample) => {
        const line = document.createElement('p');
        line.className = 'fonttest-sample';
        line.style.fontFamily = `"${check.family}"`;
        line.style.fontWeight = String(check.weight);
        line.style.fontSize = `${check.size}px`;
        line.textContent = normalizeText(sample);
        group.appendChild(line);
      });
      elements.fontTestRows.appendChild(group);
      if (!check.loaded) failures.push(`${check.family} ${check.weight} ${check.size}px`);
    });
    if (failures.length) {
      elements.fontTestStatus.classList.add('warning');
      elements.fontTestStatus.textContent = `Cảnh báo: Không tải được phông chữ cục bộ (${[...new Set(failures)].join(', ')}). Kiểm tra thư mục fonts.`;
    } else {
      elements.fontTestStatus.textContent = 'Đã tải đầy đủ các phông chữ Noto Serif và Noto Sans cục bộ. document.fonts.check() thành công.';
    }
  }

  function hashMatchesLessonRequest(hash) {
    return /^#\/?lesson\//.test(hash) || /^#lesson\//.test(hash);
  }

  function showLessonError() {
    elements.lessonWorkspace.innerHTML = '<div class="workspace-empty lesson-error-state"><h2>Chưa thể tải bài học</h2><p>Đã xảy ra sự cố khi mở nội dung. Vui lòng quay lại danh sách và thử lại.</p><button type="button" class="btn-action-secondary" data-back-hub>← Quay lại danh sách bài học</button></div>';
    elements.lessonWorkspace.querySelector('[data-back-hub]').addEventListener('click', showRoleHub);
    showView('view-lesson-workspace');
  }

  /* ==========================================================================
     TEACHER DASHBOARD
     ========================================================================== */
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function getTeacherFeaturedLesson(lessons) {
    if (!lessons.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const byDate = lessons.slice().sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
    return byDate.find((lesson) => lesson.date === today) ||
      byDate.find((lesson) => lesson.status === 'Đã lên lịch' && lesson.date >= today) || byDate[0];
  }

  function renderTeacherFeaturedLesson(lessons) {
    const dashboard = elements.viewTeacherDashboard;
    let featured = dashboard.querySelector('.dashboard-featured-lesson');
    if (!featured) {
      featured = document.createElement('section');
      featured.className = 'dashboard-featured-lesson';
      dashboard.querySelector('.dashboard-hero-card').insertAdjacentElement('afterend', featured);
    }
    const lesson = getTeacherFeaturedLesson(lessons);
    if (!lesson) {
      featured.innerHTML = '<div class="featured-empty"><span class="featured-eyebrow">KHÔNG GIAN GIẢNG DẠY</span><h2>Chưa có bài giảng nào</h2><p>Tạo bài giảng đầu tiên để bắt đầu xây dựng hành trình học tập.</p><button class="btn-action-primary" type="button" data-create-first>＋ Thêm bài giảng mới</button></div>';
      featured.querySelector('[data-create-first]').addEventListener('click', handleCreateLesson);
      return;
    }
    featured.innerHTML = `<div class="featured-copy"><span class="featured-eyebrow">✦ BÀI GIẢNG NỔI BẬT · ${lesson.date === new Date().toISOString().slice(0, 10) ? 'HÔM NAY' : 'LỊCH GẦN NHẤT'}</span><h2>${escapeHTML(lesson.title)}</h2><p>${escapeHTML(lesson.objectives || lesson.subtitle || 'Mở bài giảng để xem nội dung và sa bàn tương tác.')}</p><div class="featured-meta"><span>📅 ${escapeHTML(lesson.date || 'Chưa định ngày')}</span><span>🏫 ${escapeHTML(lesson.class || 'Chưa phân lớp')}</span><span>${escapeHTML(lesson.status || 'Nháp')}</span></div></div><button class="featured-open" type="button" data-lesson-id="${escapeHTML(lesson.id)}">Vào bài giảng <span>↗</span></button>`;
    featured.querySelector('[data-lesson-id]').addEventListener('click', () => navigateToLesson(lesson.id));
  }

  function renderTeacherDashboard(searchTerm = '', statusFilter = 'all') {
    elements.teacherLessonsGrid.innerHTML = '';
    const all = window.LessonStorage.getAllLessons();
    renderTeacherFeaturedLesson(all);

    const filtered = all.filter((l) => {
      const matchesSearch = !searchTerm || l.title.toLowerCase().includes(searchTerm.toLowerCase()) || (l.class && l.class.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      elements.teacherLessonsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
          ${all.length ? 'Không tìm thấy bài giảng nào phù hợp với điều kiện tìm kiếm.' : 'Chưa có bài giảng nào. Hãy tạo bài giảng đầu tiên.'}
          ${all.length ? '' : '<br><button class="btn-action-primary" type="button" style="margin:16px auto 0" data-create-first>＋ Thêm bài giảng mới</button>'}
        </div>
      `;
      const createFirst = elements.teacherLessonsGrid.querySelector('[data-create-first]');
      if (createFirst) createFirst.addEventListener('click', handleCreateLesson);
      return;
    }

    filtered.forEach((lesson) => {
      const card = document.createElement('div');
      card.className = 'lesson-manage-card';

      let chipClass = 'draft';
      if (lesson.status === 'Đã dạy') chipClass = 'published';
      else if (lesson.status === 'Đã lên lịch') chipClass = 'scheduled';

      card.innerHTML = `
        <div>
          <div class="card-top-row">
            <span class="card-date-badge">📅 ${lesson.date || 'Chưa định ngày'}</span>
            <span class="status-chip ${chipClass}">${lesson.status || 'Nháp'}</span>
          </div>
          <h3 class="card-title">${lesson.title}</h3>
          <p class="card-objective">${lesson.objectives || 'Chưa có tóm tắt mục tiêu bài học.'}</p>
          <div class="card-meta-chips">
            <span class="meta-pill">${lesson.subject || 'Lịch sử'}</span>
            <span class="meta-pill">${lesson.class || 'Lớp 11A1'}</span>
            <span class="meta-pill">${(lesson.sections && lesson.sections.length) || 0} giai đoạn</span>
            <span class="meta-pill">${(lesson.questions && lesson.questions.length) || 0} câu hỏi</span>
          </div>
        </div>
        <div class="card-footer-actions">
          <button class="btn-card-edit" data-id="${lesson.id}">✏️ Soạn thảo</button>
          <div class="card-action-icons">
            <button class="btn-icon-action" data-action="preview" data-id="${lesson.id}" title="Xem thử bài giảng">👁️</button>
            <button class="btn-icon-action" data-action="duplicate" data-id="${lesson.id}" title="Nhân bản bài học">📋</button>
            <button class="btn-icon-action danger" data-action="delete" data-id="${lesson.id}" title="Xóa bài học">🗑️</button>
          </div>
        </div>
      `;

      card.querySelector('.btn-card-edit').addEventListener('click', () => openTeacherEditor(lesson.id));
      card.querySelector('[data-action="preview"]').addEventListener('click', () => openStudentViewer(lesson.id));
      card.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
        window.LessonStorage.duplicateLesson(lesson.id);
        renderTeacherDashboard(searchTerm, statusFilter);
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm(`Bạn có chắc chắn muốn xóa bài học "${lesson.title}" không?`)) {
          window.LessonStorage.deleteLesson(lesson.id);
          renderTeacherDashboard(searchTerm, statusFilter);
        }
      });
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        navigateToLesson(lesson.id);
      });

      elements.teacherLessonsGrid.appendChild(card);
    });
  }

  function handleCreateLesson() {
    const newId = `lesson-${Date.now().toString(36)}`;
    const newLesson = {
      id: newId,
      title: 'Bài giảng Lịch sử mới',
      subtitle: 'Kế hoạch bài dạy tương tác',
      date: new Date().toISOString().slice(0, 10),
      teacher: currentUser ? currentUser.displayName : 'Giáo viên bộ môn',
      class: 'Lớp 11A1',
      subject: 'Lịch sử',
      grade: 'Khối 11',
      objectives: 'Phân tích diễn biến và rút ra bài học lịch sử.',
      focusQuestion: 'Câu hỏi trọng tâm của bài học là gì?',
      status: 'Nháp',
      sections: [
        {
          id: 'sec-1',
          title: 'Giai đoạn 1: Mở màn chiến dịch',
          narration: 'Lời dẫn thuyết minh bối cảnh mở đầu.',
          caption: 'Chú thích hình ảnh trên sa bàn.',
          timelineRange: 0.1,
          timeLabel: 'Khởi đầu'
        }
      ],
      keyNotes: ['Nội dung ghi chú cốt lõi thứ nhất.'],
      privateNotes: 'Sổ tay nội bộ dành riêng cho thầy cô.',
      questions: [],
      simulation: {
        propsConfig: { palisade: true, tents: true, elephants: true, banners: true, fire: true, village: true, bamboo: true },
        unitCounts: { taySonInfantry: 45, qingInfantry: 45 },
        factionColors: { taySon: '#962d22', qing: '#1e3a8a' }
      }
    };

    window.LessonStorage.saveLesson(newLesson);
    openTeacherEditor(newId);
  }

  /* ==========================================================================
     TEACHER LESSON EDITOR (4 Tabs + Live 3D Preview + Undo/Redo)
     ========================================================================== */
  function openTeacherEditor(lessonId) {
    const lesson = window.LessonStorage.getLessonById(lessonId);
    if (!lesson) return;

    if (lessonSceneInstance) lessonSceneInstance.destroy();
    lessonSceneInstance = null;

    activeLesson = JSON.parse(JSON.stringify(lesson));
    window.location.hash = `#/lesson/${encodeURIComponent(lesson.id)}/edit`;

    // Reset undo/redo
    undoStack.length = 0;
    redoStack.length = 0;
    updateUndoRedoButtons();

    // Populate Top Bar
    elements.editorDisplayTitle.textContent = activeLesson.title;
    elements.editorDisplayStatus.textContent = activeLesson.status;
    elements.editorDisplayStatus.className = `status-chip ${getStatusClass(activeLesson.status)}`;

    // Populate Tab a: Form fields
    elements.editTitle.value = activeLesson.title || '';
    elements.editSubtitle.value = activeLesson.subtitle || '';
    elements.editDate.value = activeLesson.date || '';
    elements.editClass.value = activeLesson.class || '';
    elements.editSubject.value = activeLesson.subject || '';
    elements.editGrade.value = activeLesson.grade || '';
    elements.editTeacher.value = activeLesson.teacher || '';
    elements.editObjectives.value = activeLesson.objectives || '';
    elements.editFocusQuestion.value = activeLesson.focusQuestion || '';

    // Populate Tab d: Notes
    elements.editKeyNotes.value = Array.isArray(activeLesson.keyNotes) ? activeLesson.keyNotes.join('\n') : activeLesson.keyNotes || '';
    elements.editPrivateNotes.value = activeLesson.privateNotes || '';

    // Render Tab a: Sections
    renderEditorSectionsList();

    // Render Tab b: Questions
    renderEditorQuestionsList();

    // Setup Tab c: 3D Live preview
    setupEditor3DLivePreview();

    // Switch view
    showView('view-teacher-editor');
    switchEditorTab(editorActiveTab);
  }

  function switchEditorTab(tabKey) {
    editorActiveTab = tabKey;
    document.querySelectorAll('.btn-editor-tab').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabKey);
    });

    document.querySelectorAll('.editor-tab-panel').forEach((p) => {
      p.classList.remove('active');
    });

    const target = document.getElementById(`panel-${tabKey}`);
    if (target) target.classList.add('active');

    // If 3D tab selected, ensure canvas is resized
    if (tabKey === 'tab-sim3d' && editorSceneInstance) {
      setTimeout(() => {
        editorSceneInstance.onResize();
      }, 50);
    }
  }

  function getStatusClass(status) {
    if (status === 'Đã dạy') return 'published';
    if (status === 'Đã lên lịch') return 'scheduled';
    return 'draft';
  }

  function pushUndoSnapshot() {
    undoStack.push(JSON.stringify(activeLesson));
    if (undoStack.length > 25) undoStack.shift();
    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function handleEditorUndo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(activeLesson));
    const previous = undoStack.pop();
    activeLesson = JSON.parse(previous);
    openTeacherEditor(activeLesson.id);
  }

  function handleEditorRedo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(activeLesson));
    const next = redoStack.pop();
    activeLesson = JSON.parse(next);
    openTeacherEditor(activeLesson.id);
  }

  function updateUndoRedoButtons() {
    elements.btnEditorUndo.disabled = undoStack.length === 0;
    elements.btnEditorRedo.disabled = redoStack.length === 0;
  }

  function syncFormToActiveLesson() {
    activeLesson.title = elements.editTitle.value;
    activeLesson.subtitle = elements.editSubtitle.value;
    activeLesson.date = elements.editDate.value;
    activeLesson.class = elements.editClass.value;
    activeLesson.subject = elements.editSubject.value;
    activeLesson.grade = elements.editGrade.value;
    activeLesson.teacher = elements.editTeacher.value;
    activeLesson.objectives = elements.editObjectives.value;
    activeLesson.focusQuestion = elements.editFocusQuestion.value;
    activeLesson.privateNotes = elements.editPrivateNotes.value;
    activeLesson.keyNotes = elements.editKeyNotes.value
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    elements.editorDisplayTitle.textContent = activeLesson.title;
  }

  function saveActiveLessonWithStatus(newStatus) {
    pushUndoSnapshot();
    syncFormToActiveLesson();
    activeLesson.status = newStatus;
    window.LessonStorage.saveLesson(activeLesson);

    elements.editorDisplayStatus.textContent = newStatus;
    elements.editorDisplayStatus.className = `status-chip ${getStatusClass(newStatus)}`;

    alert(`Đã lưu bài học thành công với trạng thái: ${newStatus}`);
  }

  // Section List in Tab a
  function renderEditorSectionsList() {
    elements.editorSectionsContainer.innerHTML = '';
    const sections = activeLesson.sections || [];

    sections.forEach((sec, idx) => {
      const item = document.createElement('div');
      item.className = 'section-author-item';

      item.innerHTML = `
        <div class="section-item-header">
          <span class="section-order-badge">Giai đoạn ${idx + 1}</span>
          <div class="section-controls">
            <button class="btn-sec-tool" data-action="up" data-idx="${idx}" title="Di chuyển lên">▲</button>
            <button class="btn-sec-tool" data-action="down" data-idx="${idx}" title="Di chuyển xuống">▼</button>
            <button class="btn-sec-tool" data-action="delete" data-idx="${idx}" style="color: #ef4444;" title="Xóa">✕</button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Tiêu đề giai đoạn</label>
          <input type="text" class="form-input sec-title-input" value="${sec.title || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Thời điểm / Mốc tiến trình (${Math.round((sec.timelineRange || 0.1) * 100)}%)</label>
          <input type="text" class="form-input sec-time-input" value="${sec.timeLabel || ''}" placeholder="Vd: Mờ sáng mùng 5 Tết">
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Lời dẫn thuyết minh (Narration)</label>
          <textarea class="form-input sec-narration-input" style="min-height: 60px;">${sec.narration || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Chú thích sa bàn (Caption)</label>
          <input type="text" class="form-input sec-caption-input" value="${sec.caption || ''}">
        </div>
      `;

      // Event bindings
      item.querySelector('.sec-title-input').addEventListener('input', (e) => {
        sec.title = e.target.value;
      });
      item.querySelector('.sec-time-input').addEventListener('input', (e) => {
        sec.timeLabel = e.target.value;
      });
      item.querySelector('.sec-narration-input').addEventListener('input', (e) => {
        sec.narration = e.target.value;
      });
      item.querySelector('.sec-caption-input').addEventListener('input', (e) => {
        sec.caption = e.target.value;
      });

      item.querySelector('[data-action="up"]').addEventListener('click', () => {
        if (idx > 0) {
          pushUndoSnapshot();
          const temp = sections[idx];
          sections[idx] = sections[idx - 1];
          sections[idx - 1] = temp;
          renderEditorSectionsList();
        }
      });

      item.querySelector('[data-action="down"]').addEventListener('click', () => {
        if (idx < sections.length - 1) {
          pushUndoSnapshot();
          const temp = sections[idx];
          sections[idx] = sections[idx + 1];
          sections[idx + 1] = temp;
          renderEditorSectionsList();
        }
      });

      item.querySelector('[data-action="delete"]').addEventListener('click', () => {
        pushUndoSnapshot();
        sections.splice(idx, 1);
        renderEditorSectionsList();
      });

      elements.editorSectionsContainer.appendChild(item);
    });
  }

  function handleAddSection() {
    pushUndoSnapshot();
    if (!activeLesson.sections) activeLesson.sections = [];
    const count = activeLesson.sections.length;
    activeLesson.sections.push({
      id: `sec-${Date.now().toString(36)}`,
      title: `Giai đoạn ${count + 1}`,
      narration: 'Lời dẫn diễn biến lịch sử...',
      caption: 'Chú thích hình ảnh...',
      timelineRange: Math.min(1.0, (count + 1) * 0.25),
      timeLabel: 'Mốc thời gian'
    });
    renderEditorSectionsList();
  }

  // Questions List in Tab b
  function renderEditorQuestionsList() {
    elements.editorQuestionsContainer.innerHTML = '';
    const questions = activeLesson.questions || [];

    if (questions.length === 0) {
      elements.editorQuestionsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi mới" để soạn thảo.
        </div>
      `;
      return;
    }

    questions.forEach((q, qIdx) => {
      const qCard = document.createElement('div');
      qCard.className = 'question-author-card';

      qCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="section-order-badge">Câu ${qIdx + 1}</span>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Thảo luận mở'}</span>
            ${q.isEmperorQuestion ? '<span style="font-size: 0.74rem; background: var(--lacquer-red); color: #fff; padding: 2px 6px; border-radius: 4px;">👑 Vua hỏi</span>' : ''}
          </div>
          <div class="section-controls">
            <button class="btn-sec-tool" data-action="q-up" title="Lên">▲</button>
            <button class="btn-sec-tool" data-action="q-down" title="Xuống">▼</button>
            <button class="btn-sec-tool" data-action="q-del" style="color: #ef4444;" title="Xóa">✕</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 10px;">
          <label>Nội dung câu hỏi</label>
          <input type="text" class="form-input q-text-input" value="${q.text || ''}">
        </div>

        <div style="display: flex; gap: 16px; margin-bottom: 12px; font-size: 0.85rem; color: var(--text-secondary);">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" class="q-emperor-checkbox" ${q.isEmperorQuestion ? 'checked' : ''}>
            <span>Đặt làm câu hỏi của vua ở cuối trận</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" class="q-release-checkbox" ${q.isExplanationReleased ? 'checked' : ''}>
            <span>Công khai đáp án & giải thích cho học sinh</span>
          </label>
        </div>
      `;

      qCard.querySelector('.q-text-input').addEventListener('input', (e) => {
        q.text = e.target.value;
      });
      qCard.querySelector('.q-emperor-checkbox').addEventListener('change', (e) => {
        pushUndoSnapshot();
        questions.forEach((other) => (other.isEmperorQuestion = false));
        q.isEmperorQuestion = e.target.checked;
        renderEditorQuestionsList();
      });
      qCard.querySelector('.q-release-checkbox').addEventListener('change', (e) => {
        q.isExplanationReleased = e.target.checked;
      });

      qCard.querySelector('[data-action="q-up"]').addEventListener('click', () => {
        if (qIdx > 0) {
          pushUndoSnapshot();
          const t = questions[qIdx];
          questions[qIdx] = questions[qIdx - 1];
          questions[qIdx - 1] = t;
          renderEditorQuestionsList();
        }
      });
      qCard.querySelector('[data-action="q-down"]').addEventListener('click', () => {
        if (qIdx < questions.length - 1) {
          pushUndoSnapshot();
          const t = questions[qIdx];
          questions[qIdx] = questions[qIdx + 1];
          questions[qIdx + 1] = t;
          renderEditorQuestionsList();
        }
      });
      qCard.querySelector('[data-action="q-del"]').addEventListener('click', () => {
        pushUndoSnapshot();
        questions.splice(qIdx, 1);
        renderEditorQuestionsList();
      });

      elements.editorQuestionsContainer.appendChild(qCard);
    });
  }

  function handleAddQuestion() {
    pushUndoSnapshot();
    if (!activeLesson.questions) activeLesson.questions = [];
    activeLesson.questions.push({
      id: `q-${Date.now().toString(36)}`,
      text: 'Câu hỏi mới về chiến thuật...',
      type: 'multiple_choice',
      isEmperorQuestion: false,
      isExplanationReleased: true,
      options: [
        { id: 'opt-a', text: 'Phương án A', isCorrect: true, explanation: 'Giải thích đúng' },
        { id: 'opt-b', text: 'Phương án B', isCorrect: false, explanation: 'Giải thích sai' }
      ]
    });
    renderEditorQuestionsList();
  }

  // Live 3D Preview in Tab c
  function setupEditor3DLivePreview() {
    if (editorSceneInstance) {
      editorSceneInstance.destroy();
      editorSceneInstance = null;
    }

    elements.editorPreviewMount.innerHTML = '';
    editorSceneInstance = new window.BattleScene3D(elements.editorPreviewMount, {
      quality: currentQuality,
      lessonConfig: activeLesson
    });
    const themeColors = getComputedStyle(document.documentElement);
    const sideAColor = themeColors.getPropertyValue('--faction-a').trim();
    const sideBColor = themeColors.getPropertyValue('--faction-b').trim();
    if (sideAColor) elements.colorTaySon.value = sideAColor;
    if (sideBColor) elements.colorQing.value = sideBColor;
    editorSceneInstance.updateFactionColors({ taySon: sideAColor, qing: sideBColor });

    // Camera preset buttons in editor HUD
    document.querySelectorAll('#panel-tab-sim3d .btn-cam-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#panel-tab-sim3d .btn-cam-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        if (editorSceneInstance) editorSceneInstance.setCameraPreset(preset);
      });
    });

    // Populate variable assumptions list in Tab c
    renderEditorVariablesCoefficients();
  }

  function renderEditorVariablesCoefficients() {
    const list = document.getElementById('editor-variables-coefficients-list');
    if (!list) return;
    list.innerHTML = '';

    const question = activeLesson.question || {};
    const vars = question.variables || [];

    if (vars.length === 0) {
      list.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Bài học sử dụng bộ tham số tiêu chuẩn của bộ môn.</span>`;
      return;
    }

    vars.forEach((v) => {
      const row = document.createElement('div');
      row.style.background = 'rgba(255,255,255,0.03)';
      row.style.padding = '8px 10px';
      row.style.borderRadius = '6px';
      row.style.fontSize = '0.82rem';

      const optOriginal = (v.options && v.options.find((o) => o.isOriginal)) || (v.options && v.options[0]);
      row.innerHTML = `
        <div style="font-weight:600; color:var(--text-gold-bright);">${v.title}</div>
        <div style="color:var(--text-secondary); margin-top:2px;">Chuẩn: ${optOriginal ? optOriginal.shortName || optOriginal.name : 'Mặc định'}</div>
      `;
      list.appendChild(row);
    });
  }

  function setupLiveAuthoringListeners() {
    // Props toggles
    const propMap = [
      { el: elements.togglePropPalisade, key: 'palisade' },
      { el: elements.togglePropTents, key: 'tents' },
      { el: elements.togglePropElephants, key: 'elephants' },
      { el: elements.togglePropBanners, key: 'banners' },
      { el: elements.togglePropFire, key: 'fire' },
      { el: elements.togglePropVillage, key: 'village' },
      { el: elements.togglePropBamboo, key: 'bamboo' }
    ];

    propMap.forEach(({ el, key }) => {
      if (!el) return;
      el.addEventListener('change', () => {
        if (!activeLesson.simulation) activeLesson.simulation = {};
        if (!activeLesson.simulation.propsConfig) activeLesson.simulation.propsConfig = {};
        activeLesson.simulation.propsConfig[key] = el.checked;

        if (editorSceneInstance) {
          editorSceneInstance.updatePropsVisibility(activeLesson.simulation.propsConfig);
        }
      });
    });

    // Troop sliders
    if (elements.rangeCountTaySon) {
      elements.rangeCountTaySon.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        elements.labelCountTaySon.textContent = val;
        if (!activeLesson.simulation) activeLesson.simulation = {};
        if (!activeLesson.simulation.unitCounts) activeLesson.simulation.unitCounts = {};
        activeLesson.simulation.unitCounts.taySonInfantry = val;

        if (editorSceneInstance) {
          editorSceneInstance.updateUnitCounts({ taySonInfantry: val });
        }
      });
    }

    if (elements.rangeCountQing) {
      elements.rangeCountQing.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        elements.labelCountQing.textContent = val;
        if (!activeLesson.simulation) activeLesson.simulation = {};
        if (!activeLesson.simulation.unitCounts) activeLesson.simulation.unitCounts = {};
        activeLesson.simulation.unitCounts.qingInfantry = val;

        if (editorSceneInstance) {
          editorSceneInstance.updateUnitCounts({ qingInfantry: val });
        }
      });
    }

    // Faction colors
    if (elements.colorTaySon) {
      elements.colorTaySon.addEventListener('input', (e) => {
        const val = e.target.value;
        if (!activeLesson.simulation) activeLesson.simulation = {};
        if (!activeLesson.simulation.factionColors) activeLesson.simulation.factionColors = {};
        activeLesson.simulation.factionColors.taySon = val;

        if (editorSceneInstance) {
          editorSceneInstance.updateFactionColors({ taySon: val });
        }
      });
    }

    if (elements.colorQing) {
      elements.colorQing.addEventListener('input', (e) => {
        const val = e.target.value;
        if (!activeLesson.simulation) activeLesson.simulation = {};
        if (!activeLesson.simulation.factionColors) activeLesson.simulation.factionColors = {};
        activeLesson.simulation.factionColors.qing = val;

        if (editorSceneInstance) {
          editorSceneInstance.updateFactionColors({ qing: val });
        }
      });
    }
  }

  /* ==========================================================================
     UNIFIED LESSON WORKSPACE
     ========================================================================== */
  const LESSON_STAGES = [
    { title: 'Khởi động', minutes: 5 },
    { title: 'Khám phá 3D', minutes: 10 },
    { title: 'Câu hỏi trọng tâm', minutes: 8 },
    { title: 'Thử cách khác', minutes: 7 },
    { title: 'So sánh', minutes: 8 },
    { title: 'Củng cố', minutes: 7 }
  ];

  function getLessonProgressKey(lessonId) {
    return `history_lesson_progress_${lessonId}`;
  }

  function getSavedLessonProgress(lessonId) {
    try {
      return JSON.parse(localStorage.getItem(getLessonProgressKey(lessonId)) || 'null') || { progress: 0, chapter: 0 };
    } catch (error) {
      return { progress: 0, chapter: 0 };
    }
  }

  function getAllowedLessons() {
    return activeRole === 'teacher' ? window.LessonStorage.getAllLessons() : window.LessonStorage.getVisibleLessonsForStudent();
  }

  function buildWorkspaceTabs(teacher, preview) {
    const studentTabs = [
      ['keynotes', 'Ghi chú chính'], ['questions', 'Câu hỏi của thầy cô'], ['simulation', 'Mô phỏng của em']
    ];
    const teacherTabs = [
      ['content', 'Nội dung'], ['questions', 'Câu hỏi'], ['simulation', 'Mô phỏng 3D'], ['notes', 'Ghi chú giảng dạy'], ['preview', 'Xem như học sinh']
    ];
    const tabs = teacher && !preview ? teacherTabs : studentTabs;
    return tabs.map(([id, label]) => `<button type="button" class="lesson-tab${id === 'content' || id === 'keynotes' ? ' active' : ''}" data-workspace-tab="${id}">${label}</button>`).join('') +
      (teacher && preview ? '<button type="button" class="lesson-tab" data-toggle-student-preview>↩ Thoát xem trước</button>' : '');
  }

  function renderWorkspaceTab(lesson, tab, teacher, preview) {
    const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
    if (tab === 'questions') {
      return questions.length ? `<div class="workspace-card-list">${questions.map((question, index) => `<article class="workspace-info-card"><span class="chapter-time-tag">CÂU ${index + 1}</span><h3>${escapeHTML(question.text || 'Câu hỏi')}</h3>${question.options && question.options.length ? `<ul>${question.options.map((option) => `<li>${escapeHTML(option.text)}</li>`).join('')}</ul>` : ''}</article>`).join('')}</div>` : '<div class="workspace-empty">Bài học chưa có câu hỏi.</div>';
    }
    if (tab === 'simulation') return `<div class="workspace-info-card"><h3>${teacher && !preview ? 'Sa bàn 3D tương tác' : 'Mô phỏng của em'}</h3><p>${escapeHTML(lesson.simulationDisclaimer || 'Khám phá diễn biến bằng các góc nhìn và mốc thời gian.')}</p>${teacher && !preview ? '<button class="btn-action-secondary" type="button" data-focus-player>Đi tới mô phỏng 3D</button>' : '<button class="btn-action-primary" type="button" data-start-interactive>🚀 Bắt đầu mô phỏng tương tác</button>'}</div>`;
    if (tab === 'notes' && teacher && !preview) return `<div class="workspace-info-card teacher-notes-card"><h3>Ghi chú giảng dạy · Nội bộ</h3><textarea class="form-input workspace-notes-input" rows="8" aria-label="Ghi chú giảng dạy">${escapeHTML(lesson.privateNotes || '')}</textarea><p class="workspace-hint">Ghi chú này chỉ hiển thị cho giáo viên.</p></div>`;
    if (tab === 'keynotes' || tab === 'notes') {
      const notes = Array.isArray(lesson.keyNotes) ? lesson.keyNotes : [];
      return notes.length ? `<div class="workspace-paper-notes"><ul class="workspace-keynotes">${notes.map((note) => `<li>${escapeHTML(note)}</li>`).join('')}</ul></div>` : '<div class="workspace-empty">Chưa có ghi chú chính cho bài học này.</div>';
    }
    if (tab === 'preview') return `<div class="workspace-info-card"><h3>Chế độ xem học sinh</h3><p>Ẩn các công cụ chỉnh sửa và chỉ hiển thị nội dung học sinh được phép xem.</p><button class="btn-action-secondary" type="button" data-toggle-student-preview>Đóng chế độ xem học sinh</button></div>`;
    const content = sections.length ? sections.map((section, index) => `<article class="workspace-info-card"><span class="chapter-time-tag">GIAI ĐOẠN ${index + 1} · ${escapeHTML(section.timeLabel || 'Chưa đặt mốc')}</span><h3>${escapeHTML(section.title || `Giai đoạn ${index + 1}`)}</h3><p>${escapeHTML(section.narration || 'Chưa có lời dẫn cho giai đoạn này.')}</p></article>`).join('') : '<div class="workspace-empty">Bài học chưa có giai đoạn nội dung. Giáo viên có thể bổ sung trong phần soạn thảo.</div>';
    if (teacher && !preview) {
      return `<div class="workspace-content-editor"><label>Đề bài<input class="form-input workspace-title-input" value="${escapeHTML(lesson.title)}"></label><label>Mục tiêu bài học<textarea class="form-input workspace-objective-input" rows="3">${escapeHTML(lesson.objectives || '')}</textarea></label></div><div class="workspace-card-list">${content}</div>`;
    }
    return `<p class="workspace-objective">${escapeHTML(lesson.objectives || lesson.subtitle || 'Khám phá nội dung bài học qua các giai đoạn.')}</p><div class="workspace-card-list">${content}</div>`;
  }

  function openLessonWorkspace(lesson, updateRoute = true) {
    if (!lesson || (activeRole === 'student' && !window.LessonStorage.isLessonVisibleForStudent(lesson))) {
      activeLesson = null;
      if (lessonSceneInstance) lessonSceneInstance.destroy();
      lessonSceneInstance = null;
      showView('view-lesson-hidden');
      return;
    }
    if (updateRoute) {
      navigateToLesson(lesson.id);
      return;
    }
    [editorSceneInstance, studentViewerSceneInstance, originalStageSceneInstance, customStageSceneInstance].forEach((scene) => {
      if (scene) scene.destroy();
    });
    editorSceneInstance = null;
    studentViewerSceneInstance = null;
    originalStageSceneInstance = null;
    customStageSceneInstance = null;
    if (lessonSceneInstance) lessonSceneInstance.destroy();
    lessonSceneInstance = null;
    activeLesson = JSON.parse(JSON.stringify(lesson));
    activeLessonChapter = 0;
    const teacher = activeRole === 'teacher';
    const saved = getSavedLessonProgress(lesson.id);
    const allowed = getAllowedLessons();
    const currentIndex = allowed.findIndex((item) => item.id === lesson.id);
    const previous = currentIndex > 0 ? allowed[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < allowed.length - 1 ? allowed[currentIndex + 1] : null;
    const sectionCount = Array.isArray(lesson.sections) ? lesson.sections.length : 0;
    const initialTab = 'content';

    elements.lessonWorkspace.innerHTML = `
      <header class="lesson-page-topbar">
        <button type="button" class="btn-back-dash" data-back-hub>← ${teacher ? 'Quản lý bài giảng' : 'Bài đã học'}</button>
        <div class="lesson-page-heading"><h1>${escapeHTML(lesson.title || 'Bài học')}</h1><div class="lesson-page-meta"><span>${escapeHTML(lesson.date || 'Chưa định ngày')}</span><span>${escapeHTML(lesson.class || 'Chưa phân lớp')}</span><span>${escapeHTML(lesson.teacher || 'Giáo viên bộ môn')}</span><span class="status-chip ${getStatusClass(lesson.status)}">${escapeHTML(lesson.status || 'Nháp')}</span></div></div>
      </header>
      <section class="lesson-cinematic-hero"><div class="lesson-hero-copy"><span class="featured-eyebrow">HÀNH TRÌNH LỊCH SỬ · ${escapeHTML(lesson.year || lesson.subject || 'LỊCH SỬ')}</span><h2>${escapeHTML(lesson.title || 'Bài học')}</h2><p>${escapeHTML(lesson.objectives || lesson.subtitle || 'Quan sát, phân tích và khám phá những dấu mốc lịch sử.')}</p><button type="button" class="btn-action-primary" data-primary-play>${teacher && !isStudentPreview ? '▶ Bắt đầu bài giảng' : '▶ Xem lại mô phỏng'}</button>${saved.progress > 0 ? `<button type="button" class="resume-link" data-resume>Tiếp tục từ chỗ đã dừng · ${Math.round(saved.progress * 100)}%</button>` : ''}</div><div class="hero-ornament" aria-hidden="true"></div></section>
      <nav class="lesson-stage-stepper" aria-label="Các giai đoạn bài học">${LESSON_STAGES.map((stage, index) => `<button type="button" class="lesson-stage${index === 0 ? ' active' : ''}" data-stage-index="${index}"><span class="stage-dot">${index + 1}</span><span class="stage-copy"><strong>${stage.title}</strong><small>${stage.minutes} phút</small></span></button>`).join('')}</nav>
      <div class="lesson-comparison-notice" data-comparison-notice hidden>⚠️ Đây là mô phỏng minh họa dựa trên giả định, không thay thế cho tài liệu lịch sử chính thống.</div>
      <div class="lesson-player-layout">
        <section class="lesson-player-column"><div class="cinematic-player-box lesson-player-box" id="lesson-player-box"><div class="letterbox-bar top"></div><div class="letterbox-bar bottom"></div><div class="player-canvas-mount lesson-canvas-mount" id="lesson-canvas-mount"></div><div class="player-hud-overlay"><span class="hud-pill">SA BÀN LỊCH SỬ 3D</span><div class="hud-camera-controls" id="lesson-camera-controls"><button type="button" class="btn-cam-pill active" data-preset="overview">Toàn cảnh</button><button type="button" class="btn-cam-pill" data-preset="follow_troops">Theo quân</button><button type="button" class="btn-cam-pill" data-preset="close_up">Cận cảnh</button><button type="button" class="btn-cam-pill" data-preset="top_down">Trên cao</button></div></div><div class="lesson-player-controls"><div class="player-slider-row"><input type="range" class="player-slider" id="lesson-timeline" min="0" max="100" value="${Math.round((saved.progress || 0) * 100)}" aria-label="Tiến trình mô phỏng"><span class="lesson-time-readout" id="lesson-time-readout">${formatTimelineReadout(saved.progress || 0)}</span></div><div class="player-buttons-row"><div class="lesson-player-actions"><button type="button" class="btn-header-tool" data-player-action="rewind" aria-label="Về đầu">⏮</button><button type="button" class="btn-header-tool lesson-play-button" data-player-action="play">▶ Phát</button><select class="form-input lesson-speed" aria-label="Tốc độ phát"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></div><div class="lesson-player-actions"><button type="button" class="btn-header-tool" data-toggle-player-quality>⚡ ${currentQuality === 'high' ? 'Cao' : 'Thấp'}</button><button type="button" class="btn-header-tool" data-presentation>⛶ Trình chiếu</button></div></div></div></div><div class="lesson-navigation"><button type="button" class="btn-action-secondary" data-neighbor="${previous ? escapeHTML(previous.id) : ''}" ${previous ? '' : 'disabled'}>← Bài trước</button><span>${currentIndex >= 0 ? currentIndex + 1 : 0} / ${allowed.length}</span><button type="button" class="btn-action-secondary" data-neighbor="${next ? escapeHTML(next.id) : ''}" ${next ? '' : 'disabled'}>Bài tiếp theo →</button></div></section>
        <aside class="lesson-chapters-panel"><div class="chapters-panel-heading"><span class="featured-eyebrow">DIỄN BIẾN</span><h2>Các chương bài học</h2><span>${sectionCount} giai đoạn</span></div><div class="lesson-chapter-list" id="lesson-chapter-list">${sectionCount ? lesson.sections.map((section, index) => `<button type="button" class="lesson-chapter-item${index === Math.min(saved.chapter || 0, sectionCount - 1) ? ' active' : ''}" data-chapter-index="${index}" data-progress="${Number(section.timelineRange) || (index + 1) / sectionCount}"><span>${String(index + 1).padStart(2, '0')} · ${escapeHTML(section.timeLabel || 'Mốc diễn biến')}</span><strong>${escapeHTML(section.title || `Giai đoạn ${index + 1}`)}</strong></button>`).join('') : '<div class="workspace-empty">Bài học chưa có chương nội dung.</div>'}</div><article class="chapter-current" id="chapter-current"></article></aside>
      </div>
      <section class="lesson-tabs-section"><div class="lesson-tabs" id="lesson-tabs">${buildWorkspaceTabs(teacher, isStudentPreview)}</div><div class="lesson-tab-content" id="lesson-tab-content">${renderWorkspaceTab(lesson, initialTab, teacher, isStudentPreview)}</div>${teacher && !isStudentPreview ? '<div class="lesson-edit-actions"><button type="button" class="btn-action-secondary" data-save-status="Nháp">Lưu nháp</button><button type="button" class="btn-action-secondary" data-save-status="Đã lên lịch">Lên lịch</button><button type="button" class="btn-publish-now" data-save-status="Đã dạy">Đăng cho học sinh</button></div>' : ''}</section>`;

    const heroArt = elements.lessonWorkspace.querySelector('.hero-ornament');
    if (heroArt) {
      heroArt.className = 'hero-scroll';
      heroArt.innerHTML = '<canvas id="lesson-map-thumbnail" aria-label="Minh họa sa bàn lịch sử"></canvas><span class="hero-scroll-note">Màu sắc minh họa</span>';
      window.BattleScene3D.paintMapThumbnail(document.getElementById('lesson-map-thumbnail'));
    }

    showView('view-lesson-workspace');
    bindLessonWorkspace(lesson, saved);
  }

  function bindLessonWorkspace(lesson, saved) {
    const root = elements.lessonWorkspace;
    root.querySelector('#lesson-camera-controls [data-preset="overview"]').textContent = 'Toàn cảnh sa bàn';
    root.querySelector('#lesson-camera-controls [data-preset="top_down"]').textContent = 'Từ trên';
    updateCurrentChapter(lesson, saved.chapter || 0);
    const mount = document.getElementById('lesson-canvas-mount');
    lessonSceneInstance = new window.BattleScene3D(mount, {
      quality: currentQuality,
      lessonConfig: lesson,
      onProgressUpdate: (progress) => {
        if (progress >= 1) document.getElementById('lesson-player-box')?.classList.remove('is-playing');
        const slider = document.getElementById('lesson-timeline');
        const readout = document.getElementById('lesson-time-readout');
        if (slider) slider.value = Math.round(progress * 100);
        if (readout) readout.textContent = formatTimelineReadout(progress);
        const chapter = getChapterForProgress(lesson, progress);
        updateCurrentChapter(lesson, chapter);
        try { localStorage.setItem(getLessonProgressKey(lesson.id), JSON.stringify({ progress, chapter })); } catch (error) { /* Storage may be unavailable. */ }
        updateLessonStage(progress);
      }
    });
    lessonSceneInstance.seek(Number(saved.progress) || 0);
    lessonSceneInstance.pause();

    root.querySelector('[data-back-hub]').addEventListener('click', () => {
      const hub = activeRole === 'teacher' ? '#/teacher' : '#/student';
      window.location.hash = hub;
      showRoleHub();
    });
    root.querySelectorAll('[data-neighbor]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.neighbor) navigateToLesson(button.dataset.neighbor);
    }));
    root.querySelector('[data-primary-play]').addEventListener('click', () => {
      lessonSceneInstance.play();
      document.getElementById('lesson-player-box').classList.add('is-playing');
    });
    const resumeButton = root.querySelector('[data-resume]');
    if (resumeButton) resumeButton.addEventListener('click', () => lessonSceneInstance.seek(Number(saved.progress) || 0));
    root.querySelector('#lesson-timeline').addEventListener('input', (event) => lessonSceneInstance.seek(Number(event.target.value) / 100));
    root.querySelector('[data-player-action="play"]').addEventListener('click', (event) => {
      if (lessonSceneInstance.isPlaying) {
        lessonSceneInstance.pause();
        document.getElementById('lesson-player-box').classList.remove('is-playing');
        event.currentTarget.textContent = '▶ Phát';
      } else {
        lessonSceneInstance.play();
        document.getElementById('lesson-player-box').classList.add('is-playing');
        event.currentTarget.textContent = '⏸ Tạm dừng';
      }
    });
    root.querySelector('[data-player-action="rewind"]').addEventListener('click', () => {
      lessonSceneInstance.seek(0);
      lessonSceneInstance.pause();
      document.getElementById('lesson-player-box').classList.remove('is-playing');
      root.querySelector('[data-player-action="play"]').textContent = '▶ Phát';
    });
    root.querySelector('.lesson-speed').addEventListener('change', (event) => lessonSceneInstance.setSpeed(Number(event.target.value)));
    root.querySelectorAll('#lesson-camera-controls [data-preset]').forEach((button) => button.addEventListener('click', () => {
      root.querySelectorAll('#lesson-camera-controls [data-preset]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      lessonSceneInstance.setCameraPreset(button.dataset.preset);
    }));
    root.querySelector('[data-toggle-player-quality]').addEventListener('click', (event) => {
      currentQuality = currentQuality === 'high' ? 'low' : 'high';
      localStorage.setItem('history_sim_quality', currentQuality);
      lessonSceneInstance.setQuality(currentQuality);
      event.currentTarget.textContent = `⚡ ${currentQuality === 'high' ? 'Cao' : 'Thấp'}`;
    });
    root.querySelector('[data-presentation]').addEventListener('click', () => elements.btnTogglePresentation.click());
    root.querySelectorAll('[data-chapter-index]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.chapterIndex);
      activeLessonChapter = index;
      updateCurrentChapter(lesson, index);
      const section = lesson.sections[index];
      lessonSceneInstance.seek(getSectionProgress(section, index, lesson.sections.length));
    }));
    root.querySelector('#lesson-tabs').addEventListener('click', (event) => {
      const button = event.target.closest('[data-workspace-tab]');
      if (!button) {
        if (event.target.closest('[data-toggle-student-preview]')) {
          isStudentPreview = false;
          openLessonWorkspace(lesson, false);
        }
        return;
      }
      if (button.dataset.workspaceTab === 'preview') {
        isStudentPreview = true;
        openLessonWorkspace(lesson, false);
        return;
      }
      root.querySelectorAll('.lesson-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
      root.querySelector('#lesson-tab-content').innerHTML = renderWorkspaceTab(lesson, button.dataset.workspaceTab, activeRole === 'teacher', isStudentPreview);
    });
    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-toggle-student-preview]')) {
        isStudentPreview = false;
        openLessonWorkspace(lesson, false);
      }
      if (event.target.closest('[data-focus-player]')) document.getElementById('lesson-player-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (event.target.closest('[data-start-interactive]')) launch6StagesLoop(lesson);
      const saveButton = event.target.closest('[data-save-status]');
      if (saveButton) saveWorkspaceLesson(lesson, saveButton.dataset.saveStatus);
    });
    root.querySelectorAll('[data-stage-index]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.stageIndex);
      root.querySelectorAll('[data-stage-index]').forEach((node) => node.classList.toggle('active', node === button));
      const notice = root.querySelector('[data-comparison-notice]');
      notice.hidden = index !== 4;
      if (index === 1 && Array.isArray(lesson.sections) && lesson.sections.length) lessonSceneInstance.seek(Number(lesson.sections[0].timelineRange) || 0);
    }));
    if (saved.progress > 0) updateLessonStage(saved.progress);
  }

  function saveWorkspaceLesson(lesson, status) {
    const root = elements.lessonWorkspace;
    const title = root.querySelector('.workspace-title-input');
    const objectives = root.querySelector('.workspace-objective-input');
    const notes = root.querySelector('.workspace-notes-input');
    if (title) lesson.title = title.value.trim() || lesson.title;
    if (objectives) lesson.objectives = objectives.value.trim();
    if (notes) lesson.privateNotes = notes.value;
    lesson.status = status;
    window.LessonStorage.saveLesson(lesson);
    activeLesson = JSON.parse(JSON.stringify(lesson));
    openLessonWorkspace(lesson, false);
  }

  function getChapterForProgress(lesson, progress) {
    const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    if (!sections.length) return 0;
    let active = 0;
    sections.forEach((section, index) => {
      if (getSectionProgress(section, index, sections.length) <= progress) active = index;
    });
    return active;
  }

  function getSectionProgress(section, index, count) {
    const value = Number(section.timelineRange);
    return Number.isFinite(value) && value > 0 ? value : (index + 1) / count;
  }

  function updateCurrentChapter(lesson, chapterIndex) {
    const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    const panel = document.getElementById('chapter-current');
    if (!panel) return;
    if (!sections.length) {
      panel.innerHTML = '<div class="workspace-empty">Chưa có lời dẫn hoặc chú thích cho bài học này.</div>';
      return;
    }
    const index = Math.max(0, Math.min(chapterIndex, sections.length - 1));
    activeLessonChapter = index;
    const section = sections[index];
    panel.innerHTML = `<span class="featured-eyebrow">CHƯƠNG ${index + 1} · LỜI DẪN</span><p>${escapeHTML(section.narration || 'Chưa có lời dẫn cho chương này.')}</p><blockquote>${escapeHTML(section.caption || 'Chưa có chú thích.')}</blockquote>${section.source ? '<button type="button" class="btn-action-secondary chapter-source-button">Xem nguồn</button>' : ''}`;
    panel.querySelector('.chapter-source-button')?.addEventListener('click', () => showSourceModal(section.source));
    document.querySelectorAll('.lesson-chapter-item').forEach((item) => item.classList.toggle('active', Number(item.dataset.chapterIndex) === index));
  }

  function updateLessonStage(progress) {
    const stageIndex = Math.min(5, Math.floor(progress * 6));
    document.querySelectorAll('#lesson-workspace-content [data-stage-index]').forEach((node, index) => {
      node.classList.toggle('complete', index < stageIndex);
      node.classList.toggle('active', index === stageIndex);
    });
  }

  /* ==========================================================================
     STUDENT AREA (Dashboard & Lesson Viewer)
     ========================================================================== */
  function renderStudentDashboard(searchTerm = '') {
    elements.studentPostersGrid.innerHTML = '';
    const visibleLessons = window.LessonStorage.getVisibleLessonsForStudent().slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    let featured = elements.viewStudentDashboard.querySelector('.dashboard-featured-lesson');
    if (!featured) {
      featured = document.createElement('section');
      featured.className = 'dashboard-featured-lesson student-featured';
      elements.viewStudentDashboard.querySelector('.student-hero-banner').insertAdjacentElement('afterend', featured);
    }
    const newest = visibleLessons.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    if (newest) {
      featured.innerHTML = `<div class="featured-copy"><span class="featured-eyebrow">✦ BÀI HỌC MỚI NHẤT</span><h2>${escapeHTML(newest.title)}</h2><p>${escapeHTML(newest.objectives || newest.subtitle || 'Ôn tập nội dung và khám phá lại mô phỏng 3D.')}</p><div class="featured-meta"><span>📅 ${escapeHTML(newest.date || '')}</span><span>🏫 ${escapeHTML(newest.class || '')}</span><span>👩‍🏫 ${escapeHTML(newest.teacher || 'Giáo viên bộ môn')}</span></div></div><button class="featured-open" type="button" data-lesson-id="${escapeHTML(newest.id)}">Xem lại bài <span>↗</span></button>`;
      featured.querySelector('[data-lesson-id]').addEventListener('click', () => navigateToLesson(newest.id));
    } else {
      featured.innerHTML = '<div class="featured-empty"><span class="featured-eyebrow">KHÔNG GIAN HỌC TẬP</span><h2>Chưa có bài học nào</h2><p>Khi thầy cô phát hành bài giảng, nội dung sẽ xuất hiện tại đây.</p></div>';
    }

    const filtered = visibleLessons.filter((l) => {
      return !searchTerm || l.title.toLowerCase().includes(searchTerm.toLowerCase()) || (l.class && l.class.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    if (filtered.length === 0) {
      elements.studentPostersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">
          Chưa có bài học nào
        </div>
      `;
      return;
    }

    filtered.forEach((lesson) => {
      const card = document.createElement('div');
      card.className = 'poster-card';

      card.innerHTML = `
        <div class="poster-thumbnail-wrap">
          <div class="poster-seal-icon">SỬ</div>
        </div>
        <div class="poster-body">
          <div class="poster-date">📅 ${lesson.date} · ${lesson.class || 'Lớp 11A1'}</div>
          <h3 class="poster-title">${lesson.title}</h3>
          <p class="poster-objective">${lesson.objectives || 'Khám phá bài học và sa bàn 3D tương tác.'}</p>
          <div class="poster-footer">
            <span>${lesson.teacher || 'Thầy Nguyễn Văn Hưng'}</span>
            <button class="btn-open-lesson-viewer" data-id="${escapeHTML(lesson.id)}">Xem lại bài ➔</button>
          </div>
        </div>
      `;

      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        navigateToLesson(lesson.id);
      });
      card.querySelector('.btn-open-lesson-viewer').addEventListener('click', () => navigateToLesson(lesson.id));

      elements.studentPostersGrid.appendChild(card);
    });
  }

  function openStudentViewer(lessonId) {
    if (activeRole === 'teacher') {
      isStudentPreview = true;
      const previewRoute = `#/lesson/${encodeURIComponent(lessonId)}/preview`;
      if (window.location.hash === previewRoute) handleRoute();
      else window.location.hash = previewRoute;
      return;
    }
    const lesson = window.LessonStorage.getLessonById(lessonId);
    if (!lesson) return;

    // Student Visibility Check
    if (activeRole === 'student' && !window.LessonStorage.isLessonVisibleForStudent(lesson)) {
      showView('view-lesson-hidden');
      return;
    }

    activeLesson = lesson;
    window.location.hash = `#/lesson/${encodeURIComponent(lesson.id)}`;

    // Update Header Meta
    elements.viewerLessonTitle.textContent = lesson.title;
    elements.viewerLessonSubtitle.textContent = lesson.subtitle || '';
    elements.viewerTeacherName.textContent = lesson.teacher || 'Giáo viên bộ môn';
    elements.viewerDateText.textContent = lesson.date || '';
    elements.viewerClassText.textContent = lesson.class || '';

    // Render Synced Chapters
    renderStudentChapters(lesson);

    // Render Key Notes
    renderStudentKeyNotes(lesson);

    // Render Questions Asked by Teacher
    renderStudentQuestions(lesson);

    // Render Previous Run if available
    renderStudentPreviousRun(lesson);

    // Mount 3D Scene
    setupStudentViewer3D(lesson);

    showView('view-student-viewer');
    switchStudentSubtab('subtab-keynotes');
  }

  function setupStudentViewer3D(lesson) {
    if (studentViewerSceneInstance) {
      studentViewerSceneInstance.destroy();
      studentViewerSceneInstance = null;
    }

    elements.studentViewportMount.innerHTML = '';
    studentViewerSceneInstance = new window.BattleScene3D(elements.studentViewportMount, {
      quality: currentQuality,
      lessonConfig: lesson,
      onProgressUpdate: (progress) => {
        elements.studentTimelineSlider.value = Math.round(progress * 100);
        elements.studentTimeReadout.textContent = formatTimelineReadout(progress);
        highlightActiveChapterByProgress(progress);
      }
    });

    // Controls bindings
    elements.btnStudentPlay.onclick = () => {
      if (studentViewerSceneInstance.isPlaying) {
        studentViewerSceneInstance.pause();
        elements.btnStudentPlay.textContent = '▶ Phát';
      } else {
        studentViewerSceneInstance.play();
        elements.btnStudentPlay.textContent = '⏸ Dừng';
      }
    };

    elements.btnStudentRewind.onclick = () => {
      studentViewerSceneInstance.seek(0);
      studentViewerSceneInstance.pause();
      elements.btnStudentPlay.textContent = '▶ Phát';
    };

    elements.studentTimelineSlider.oninput = (e) => {
      const p = parseFloat(e.target.value) / 100;
      studentViewerSceneInstance.seek(p);
    };

    elements.studentSpeedSelect.onchange = (e) => {
      studentViewerSceneInstance.setSpeed(parseFloat(e.target.value));
    };

    // Camera presets
    document.querySelectorAll('#student-cam-controls .btn-cam-pill').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('#student-cam-controls .btn-cam-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        if (preset && studentViewerSceneInstance) {
          studentViewerSceneInstance.setCameraPreset(preset);
        }
      };
    });

    elements.btnStudentOrbit.onclick = () => {
      const isOrbiting = studentViewerSceneInstance.toggleCinematicOrbit();
      elements.btnStudentOrbit.classList.toggle('active', isOrbiting);
    };
  }

  function formatTimelineReadout(progress) {
    const totalSecs = 36 * 3600; // 36 hours historical duration
    const currentSecs = Math.round(progress * totalSecs);
    const hours = Math.floor(currentSecs / 3600);
    const minutes = Math.floor((currentSecs % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function renderStudentChapters(lesson) {
    elements.studentChaptersContainer.innerHTML = '';
    const sections = lesson.sections || [];

    sections.forEach((sec, idx) => {
      const item = document.createElement('div');
      item.className = `chapter-item-card ${idx === 0 ? 'active' : ''}`;
      item.setAttribute('data-progress', sec.timelineRange || 0.1);

      item.innerHTML = `
        <div class="chapter-time-tag">⏱️ ${sec.timeLabel || `Giai đoạn ${idx + 1}`}</div>
        <div class="chapter-title">${sec.title}</div>
        <div class="chapter-narration-snippet">${sec.narration || ''}</div>
        ${
          sec.source
            ? `<button class="btn-action-secondary btn-view-source" style="margin-top:8px; padding:3px 8px; font-size:0.75rem;">📜 Nguồn sử liệu</button>`
            : ''
        }
      `;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-view-source')) {
          e.stopPropagation();
          showSourceModal(sec.source);
          return;
        }
        document.querySelectorAll('.chapter-item-card').forEach((c) => c.classList.remove('active'));
        item.classList.add('active');
        if (studentViewerSceneInstance) {
          studentViewerSceneInstance.seek(sec.timelineRange || 0.1);
        }
      });

      elements.studentChaptersContainer.appendChild(item);
    });
  }

  function highlightActiveChapterByProgress(progress) {
    const chapters = document.querySelectorAll('.chapter-item-card');
    let bestChapter = null;
    let minDiff = 999;

    chapters.forEach((c) => {
      const p = parseFloat(c.getAttribute('data-progress') || 0);
      if (progress >= p - 0.08) {
        bestChapter = c;
      }
    });

    if (bestChapter) {
      chapters.forEach((c) => c.classList.remove('active'));
      bestChapter.classList.add('active');
    }
  }

  function showSourceModal(source) {
    if (!source) return;
    elements.sourceModalBody.innerHTML = `
      <div style="margin-bottom:12px;"><strong>Bộ sách:</strong> ${source.book || 'Chính sử Việt Nam'}</div>
      <div style="margin-bottom:12px;"><strong>Thiên / Quyển:</strong> ${source.chapter || ''}</div>
      <blockquote style="border-left: 3px solid var(--gold-bright); padding-left: 12px; margin-bottom: 14px; font-style: italic; color: var(--text-gold-bright);">
        "${source.quote || ''}"
      </blockquote>
      <div style="font-size:0.85rem; color: var(--text-muted);">${source.note || ''}</div>
    `;
    elements.modalSource.classList.add('active');
  }

  function renderStudentKeyNotes(lesson) {
    elements.studentKeynotesList.innerHTML = '';
    const notes = lesson.keyNotes || [];
    if (notes.length === 0) {
      elements.studentKeynotesList.innerHTML = `<li>Chưa có ghi chú tổng kết cho bài học này.</li>`;
      return;
    }
    notes.forEach((n) => {
      const li = document.createElement('li');
      li.style.marginBottom = '12px';
      li.textContent = n;
      elements.studentKeynotesList.appendChild(li);
    });
  }

  function renderStudentQuestions(lesson) {
    elements.studentQuestionsContainer.innerHTML = '';
    const questions = lesson.questions || [];

    if (questions.length === 0) {
      elements.studentQuestionsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          Thầy cô chưa thêm câu hỏi luyện tập cho bài học này.
        </div>
      `;
      return;
    }

    questions.forEach((q, idx) => {
      const box = document.createElement('div');
      box.className = 'viet-border-card';
      box.style.padding = '20px';
      box.style.borderRadius = '8px';

      let optionsHtml = '';
      if (q.type === 'multiple_choice' && q.options) {
        optionsHtml = `
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
            ${q.options
              .map(
                (opt) => `
              <label style="display:flex; align-items:center; gap:10px; background:var(--bg-dark-input); padding:8px 12px; border-radius:6px; cursor:pointer;">
                <input type="radio" name="q-${q.id}" value="${opt.id}" class="student-q-radio">
                <span style="font-size:0.92rem;">${opt.text}</span>
              </label>
            `
              )
              .join('')}
          </div>
          <div id="feedback-q-${q.id}" style="margin-top:10px; display:none; padding:8px 12px; border-radius:6px; font-size:0.88rem;"></div>
        `;
      } else {
        optionsHtml = `
          <div style="margin-top:10px;">
            <textarea class="form-input" style="min-height:80px;" placeholder="Nhập câu trả lời của em..."></textarea>
          </div>
        `;
      }

      box.innerHTML = `
        <div style="font-weight:700; color:var(--text-gold-bright); margin-bottom:6px;">
          Câu ${idx + 1}: ${q.text}
        </div>
        ${optionsHtml}
      `;

      // Multiple choice checking logic
      if (q.type === 'multiple_choice') {
        box.querySelectorAll('.student-q-radio').forEach((radio) => {
          radio.addEventListener('change', (e) => {
            const optId = e.target.value;
            const chosen = q.options.find((o) => o.id === optId);
            const fbBox = box.querySelector(`#feedback-q-${q.id}`);
            if (chosen && fbBox) {
              fbBox.style.display = 'block';
              if (chosen.isCorrect) {
                fbBox.style.background = 'rgba(34,197,94,0.18)';
                fbBox.style.color = '#86efac';
                fbBox.innerHTML = `✅ <strong>Chính xác!</strong> ${q.isExplanationReleased ? chosen.explanation : 'Thầy cô sẽ giải thích chi tiết trên lớp.'}`;
              } else {
                fbBox.style.background = 'rgba(239,68,68,0.18)';
                fbBox.style.color = '#fca5a5';
                fbBox.innerHTML = `❌ <strong>Chưa chính xác.</strong> ${q.isExplanationReleased ? chosen.explanation : 'Hãy xem lại sa bàn 3D và suy ngẫm thêm.'}`;
              }
            }
          });
        });
      }

      elements.studentQuestionsContainer.appendChild(box);
    });
  }

  function renderStudentPreviousRun(lesson) {
    const run = window.LessonStorage.getStudentRun(lesson.id);
    if (!run) {
      elements.studentPreviousRunBox.innerHTML = `
        <div style="font-size:0.88rem; color:var(--text-muted);">
          Em chưa thực hiện mô phỏng phương án riêng nào cho bài học này.
        </div>
      `;
      return;
    }

    elements.studentPreviousRunBox.innerHTML = `
      <div style="background:var(--bg-dark-input); border:1px solid var(--border-gold); padding:14px; border-radius:8px;">
        <div style="font-weight:700; color:var(--text-gold-bright); margin-bottom:4px;">
          Lần mô phỏng trước của em (${new Date(run.timestamp).toLocaleString('vi-VN')}):
        </div>
        <div style="display:flex; gap:16px; font-size:0.88rem; color:var(--text-secondary);">
          <span>⏱️ Thời gian: <strong>${run.student.durationHours} giờ</strong></span>
          <span>🛡️ Tổn thất: <strong>${run.student.casualties} binh sĩ</strong></span>
          <span>⭐ Điểm thế trận: <strong>${run.student.positionScore} / 100</strong></span>
        </div>
        <p style="margin-top:6px; font-size:0.84rem; color:#93c5fd;">${run.student.outcomeSummary}</p>
      </div>
    `;
  }

  function switchStudentSubtab(subtabKey) {
    studentActiveSubtab = subtabKey;
    document.querySelectorAll('.btn-student-subtab').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-subtab') === subtabKey);
    });

    document.querySelectorAll('.student-subtab-pane').forEach((p) => {
      p.classList.remove('active');
    });

    const target = document.getElementById(subtabKey);
    if (target) target.classList.add('active');
  }

  /* ==========================================================================
     6-STAGE CLASSROOM STEPPER INTERACTIVE LOOP
     ========================================================================== */
  function launch6StagesLoop(lesson) {
    if (lessonSceneInstance) lessonSceneInstance.destroy();
    lessonSceneInstance = null;
    activeLesson = lesson;
    window.location.hash = `#/lesson/${encodeURIComponent(lesson.id)}/interactive`;
    current6StageIndex = 1;

    // Reset default tactical choices
    studentTacticalChoices = {};
    if (lesson.question && lesson.question.variables) {
      lesson.question.variables.forEach((v) => {
        studentTacticalChoices[v.id] = v.options[0].id;
      });
    }

    renderVariablesQuestionForm(lesson);
    goTo6StageScreen(1);
    showView('view-lesson-detail');
  }

  function goTo6StageScreen(stepIndex) {
    current6StageIndex = stepIndex;

    // Update Stepper UI
    document.querySelectorAll('.lesson-stepper .step-node').forEach((node) => {
      const idx = parseInt(node.getAttribute('data-step'), 10);
      node.classList.toggle('active', idx === stepIndex);
    });

    // Hide all stage screens
    document.querySelectorAll('#view-lesson-detail .screen-view').forEach((s) => {
      s.style.display = 'none';
      s.classList.remove('active');
    });

    const screenMap = {
      1: 'screen-intro',
      2: 'screen-sim-original',
      3: 'screen-question',
      4: 'screen-sim-custom',
      5: 'screen-comparison',
      6: 'screen-explanation'
    };

    const targetId = screenMap[stepIndex];
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.style.display = 'block';
      targetEl.classList.add('active');
    }

    // Screen specific logic
    if (stepIndex === 2) {
      mountOriginalStageScene();
    } else if (stepIndex === 4) {
      mountCustomStageScene();
    } else if (stepIndex === 5) {
      computeAndRenderComparison();
    } else if (stepIndex === 6) {
      renderExplanationSummary();
    }
  }

  function mountOriginalStageScene() {
    const mount = document.getElementById('viewport-original-canvas');
    if (!mount) return;

    if (originalStageSceneInstance) {
      originalStageSceneInstance.destroy();
      originalStageSceneInstance = null;
    }
    mount.innerHTML = '';

    originalStageSceneInstance = new window.BattleScene3D(mount, {
      quality: currentQuality,
      lessonConfig: activeLesson,
      onProgressUpdate: (progress) => {
        const slider = document.getElementById('timeline-slider-original');
        const readout = document.getElementById('time-readout-original');
        if (slider) slider.value = Math.round(progress * 100);
        if (readout) readout.textContent = formatTimelineReadout(progress);
      }
    });

    // Hook controls
    const playBtn = document.getElementById('btn-play-original');
    if (playBtn) {
      playBtn.onclick = () => {
        if (originalStageSceneInstance.isPlaying) {
          originalStageSceneInstance.pause();
          playBtn.textContent = '▶ Phát';
        } else {
          originalStageSceneInstance.play();
          playBtn.textContent = '⏸ Dừng';
        }
      };
    }

    const rewindBtn = document.getElementById('btn-rewind-original');
    if (rewindBtn) {
      rewindBtn.onclick = () => {
        originalStageSceneInstance.seek(0);
        originalStageSceneInstance.pause();
        if (playBtn) playBtn.textContent = '▶ Phát';
      };
    }

    const slider = document.getElementById('timeline-slider-original');
    if (slider) {
      slider.oninput = (e) => {
        originalStageSceneInstance.seek(parseFloat(e.target.value) / 100);
      };
    }

    // Camera presets
    document.querySelectorAll('#cam-controls-original .btn-cam-pill').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('#cam-controls-original .btn-cam-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.getAttribute('data-preset');
        if (originalStageSceneInstance) originalStageSceneInstance.setCameraPreset(p);
      };
    });

    // Populate side narration list
    const list = document.getElementById('narration-original-list');
    if (list && activeLesson.sections) {
      list.innerHTML = '';
      activeLesson.sections.forEach((sec) => {
        const row = document.createElement('div');
        row.className = 'chapter-item-card';
        row.innerHTML = `
          <div class="chapter-time-tag">⏱️ ${sec.timeLabel || ''}</div>
          <div class="chapter-title">${sec.title}</div>
          <div class="chapter-narration-snippet">${sec.narration || ''}</div>
        `;
        row.onclick = () => {
          originalStageSceneInstance.seek(sec.timelineRange || 0.1);
        };
        list.appendChild(row);
      });
    }
  }

  function renderVariablesQuestionForm(lesson) {
    const container = document.getElementById('variables-container');
    if (!container) return;
    container.innerHTML = '';

    const q = lesson.question || {};
    const vars = q.variables || [];

    vars.forEach((v) => {
      const vBox = document.createElement('div');
      vBox.className = 'viet-border-card';
      vBox.style.padding = '18px 20px';
      vBox.style.borderRadius = '8px';

      vBox.innerHTML = `
        <h4 class="serif-title" style="color:var(--text-gold-bright); margin-bottom:6px;">${v.title}</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${v.description || ''}</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${(v.options || [])
            .map(
              (opt, idx) => `
            <label style="display:flex; align-items:flex-start; gap:10px; background:var(--bg-dark-input); padding:10px 14px; border-radius:6px; cursor:pointer;">
              <input type="radio" name="var-${v.id}" value="${opt.id}" ${idx === 0 ? 'checked' : ''} style="margin-top:4px;" class="var-choice-radio">
              <div>
                <strong style="color:var(--text-ivory); font-size:0.95rem;">${opt.name}</strong>
                <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">${opt.desc || ''}</p>
              </div>
            </label>
          `
            )
            .join('')}
        </div>
      `;

      vBox.querySelectorAll('.var-choice-radio').forEach((radio) => {
        radio.addEventListener('change', (e) => {
          studentTacticalChoices[v.id] = e.target.value;
        });
      });

      container.appendChild(vBox);
    });
  }

  function mountCustomStageScene() {
    const mount = document.getElementById('viewport-custom-canvas');
    if (!mount) return;

    if (customStageSceneInstance) {
      customStageSceneInstance.destroy();
      customStageSceneInstance = null;
    }
    mount.innerHTML = '';

    customStageSceneInstance = new window.BattleScene3D(mount, {
      quality: currentQuality,
      isCustomScenario: true,
      studentChoices: studentTacticalChoices,
      lessonConfig: activeLesson,
      onProgressUpdate: (progress) => {
        const slider = document.getElementById('timeline-slider-custom');
        const readout = document.getElementById('time-readout-custom');
        if (slider) slider.value = Math.round(progress * 100);
        if (readout) readout.textContent = formatTimelineReadout(progress);
      }
    });

    const playBtn = document.getElementById('btn-play-custom');
    if (playBtn) {
      playBtn.onclick = () => {
        if (customStageSceneInstance.isPlaying) {
          customStageSceneInstance.pause();
          playBtn.textContent = '▶ Phát';
        } else {
          customStageSceneInstance.play();
          playBtn.textContent = '⏸ Dừng';
        }
      };
    }

    const rewindBtn = document.getElementById('btn-rewind-custom');
    if (rewindBtn) {
      rewindBtn.onclick = () => {
        customStageSceneInstance.seek(0);
        customStageSceneInstance.pause();
        if (playBtn) playBtn.textContent = '▶ Phát';
      };
    }

    const slider = document.getElementById('timeline-slider-custom');
    if (slider) {
      slider.oninput = (e) => {
        customStageSceneInstance.seek(parseFloat(e.target.value) / 100);
      };
    }

    document.querySelectorAll('#cam-controls-custom .btn-cam-pill').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('#cam-controls-custom .btn-cam-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.getAttribute('data-preset');
        if (customStageSceneInstance) customStageSceneInstance.setCameraPreset(p);
      };
    });
  }

  function computeAndRenderComparison() {
    const result = window.SimulationEngine.calculate(activeLesson, studentTacticalChoices);

    // Save student run into localStorage
    window.LessonStorage.saveStudentRun(activeLesson.id, result);

    document.getElementById('comp-orig-duration').textContent = `${result.original.durationHours} giờ (~1.5 ngày)`;
    document.getElementById('comp-orig-casualties').textContent = `${result.original.casualties.toLocaleString()} binh sĩ`;
    document.getElementById('comp-orig-score').textContent = `${result.original.positionScore} / 100`;

    document.getElementById('comp-cust-duration').textContent = `${result.student.durationHours} giờ`;
    document.getElementById('comp-cust-casualties').textContent = `${result.student.casualties.toLocaleString()} binh sĩ`;
    document.getElementById('comp-cust-score').textContent = `${result.student.positionScore} / 100`;
    document.getElementById('comp-cust-outcome-summary').textContent = result.student.outcomeSummary;

    // Setup assumptions modal body
    elements.btnViewAssumptions.onclick = () => {
      elements.assumptionsModalBody.innerHTML = `
        <p style="margin-bottom:12px; font-weight:600; color:var(--text-gold-bright);">
          Các giả định toán học áp dụng cho phương án của em:
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${result.appliedAssumptions
            .map(
              (a) => `
            <div style="background:var(--bg-dark-input); padding:10px; border-radius:6px;">
              <strong style="color:var(--text-ivory);">${a.variable}:</strong> ${a.choice}
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                ${a.explanation || 'Không có ghi chú thêm.'}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
      elements.modalAssumptions.classList.add('active');
    };
  }

  function renderExplanationSummary() {
    const exp = window.SimulationEngine.generateExplanation(activeLesson, studentTacticalChoices);

    document.getElementById('explanation-intro-quote').textContent = `"${exp.intro}"`;
    document.getElementById('explanation-closing-text').textContent = exp.encouragement;

    const list = document.getElementById('explanation-points-list');
    list.innerHTML = '';
    exp.variablePoints.forEach((p) => {
      const item = document.createElement('div');
      item.style.background = 'rgba(255,255,255,0.03)';
      item.style.padding = '12px 16px';
      item.style.borderRadius = '6px';
      item.style.fontSize = '0.95rem';
      item.style.lineHeight = '1.6';
      item.textContent = p.text;
      list.appendChild(item);
    });
  }

  /* ==========================================================================
     JSON IMPORT / EXPORT
     ========================================================================== */
  function openImportJsonModal() {
    elements.textareaImportJson.value = '';
    elements.importJsonError.style.display = 'none';
    elements.modalImportJson.classList.add('active');
  }

  function handleImportJsonSubmit() {
    const raw = elements.textareaImportJson.value.trim();
    if (!raw) {
      elements.importJsonError.textContent = 'Vui lòng dán chuỗi JSON hoặc tải tệp lên.';
      elements.importJsonError.style.display = 'block';
      return;
    }

    const res = window.LessonStorage.importJSON(raw);
    if (res.success) {
      alert(res.message);
      elements.modalImportJson.classList.remove('active');
      renderTeacherDashboard();
    } else {
      elements.importJsonError.textContent = res.message;
      elements.importJsonError.style.display = 'block';
    }
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();

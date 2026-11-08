/**
 * storage.js - Data persistence and synchronization module
 * Manages curriculum lessons in localStorage, export / import JSON,
 * and enforces strict student visibility rules (status == 'Đã dạy' AND date <= today).
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_LESSONS_V2 = 'history_sim_lessons_db_v2';
  const STORAGE_KEY_LESSONS = 'history_sim_lessons_db_v3';
  const STORAGE_KEY_BACKUP_V2 = 'history_sim_lessons_backup_v2';
  const STORAGE_KEY_STUDENT_RUNS = 'history_sim_student_runs';

  const OLD_SAMPLE_LESSON_IDS = new Set([
    'ngoc-hoi-ha-hoi-1789',
    'rach-gam-xoai-mut-1785',
    'chi-lang-xuong-giang-1427',
    'khang-chien-mong-nguyen-vuon-khong'
  ]);

  function normalizeData(value) {
    return window.normalizeVietnamese ? window.normalizeVietnamese(value) : value;
  }

  /**
   * Helper: Get today's local date string YYYY-MM-DD
   */
  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const LessonStorage = {
    /**
     * Initialize store with SEED_LESSONS and safely migrate from v2
     * Idempotent: safe to run multiple times without data loss or duplicate entries.
     */
    init() {
      try {
        const rawV3 = localStorage.getItem(STORAGE_KEY_LESSONS);
        const seeds = normalizeData(window.SEED_LESSONS || []);

        if (!rawV3) {
          const rawV2 = localStorage.getItem(STORAGE_KEY_LESSONS_V2);
          let userCreatedLessons = [];

          if (rawV2) {
            try {
              const parsedV2 = JSON.parse(rawV2);
              if (Array.isArray(parsedV2)) {
                // 1. Save removed old seed lessons into backup key if not already backed up
                const oldSeedsToRemove = parsedV2.filter((l) => l && OLD_SAMPLE_LESSON_IDS.has(l.id));
                if (oldSeedsToRemove.length > 0 && !localStorage.getItem(STORAGE_KEY_BACKUP_V2)) {
                  localStorage.setItem(STORAGE_KEY_BACKUP_V2, JSON.stringify(oldSeedsToRemove));
                }
                // 2. Keep history_sim_lessons_db_v2 untouched (DO NOT delete it)
                // 3. Preserve ALL teacher-created lessons (any lesson whose ID is not one of the 4 old sample seeds)
                userCreatedLessons = parsedV2.filter((l) => l && !OLD_SAMPLE_LESSON_IDS.has(l.id));
              }
            } catch (errV2) {
              console.warn('Error parsing v2 localStorage lessons during migration:', errV2);
            }
          }

          // Combine new seeds and user-created lessons (avoiding ID collisions)
          const seedIds = new Set(seeds.map((s) => s.id));
          const uniqueUserLessons = userCreatedLessons.filter((ul) => !seedIds.has(ul.id));
          const combined = normalizeData([...seeds, ...uniqueUserLessons]);

          localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(combined));
        } else {
          // v3 already exists. Ensure old seed IDs are absent from v3.
          try {
            const parsedV3 = JSON.parse(rawV3);
            if (Array.isArray(parsedV3)) {
              const hasOld = parsedV3.some((l) => l && OLD_SAMPLE_LESSON_IDS.has(l.id));
              if (hasOld) {
                const cleanedV3 = parsedV3.filter((l) => l && !OLD_SAMPLE_LESSON_IDS.has(l.id));
                const existingIds = new Set(cleanedV3.map((l) => l.id));
                seeds.forEach((s) => {
                  if (!existingIds.has(s.id)) cleanedV3.push(s);
                });
                localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(normalizeData(cleanedV3)));
              }
            }
          } catch (_) {}
        }
      } catch (e) {
        console.warn('LocalStorage initialization warning:', e);
      }
    },

    /**
     * Get all lessons (for teachers)
     * @returns {Array} List of lesson objects
     */
    getAllLessons() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LESSONS);
        if (!raw) {
          return normalizeData(window.SEED_LESSONS ? [...window.SEED_LESSONS] : []);
        }
        const parsed = normalizeData(JSON.parse(raw));
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse lessons from localStorage:', e);
        return normalizeData(window.SEED_LESSONS ? [...window.SEED_LESSONS] : []);
      }
    },

    /**
     * Get lesson by ID
     * @param {string} id
     */
    getLessonById(id) {
      if (!id) return null;
      const all = this.getAllLessons();
      return all.find((l) => l.id === id) || null;
    },

    /**
     * Save (create or update) a lesson
     * @param {Object} lesson
     * @returns {Object} saved lesson
     */
    saveLesson(lesson) {
      if (!lesson || !lesson.id) {
        throw new Error('Bài học không hợp lệ hoặc thiếu id.');
      }
      const all = this.getAllLessons();
      lesson = normalizeData(lesson);
      const index = all.findIndex((l) => l.id === lesson.id);

      if (index >= 0) {
        all[index] = Object.assign({}, all[index], lesson);
      } else {
        all.push(lesson);
      }

      try {
        localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(all));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
      return lesson;
    },

    /**
     * Delete a lesson by ID
     * @param {string} id
     */
    deleteLesson(id) {
      const all = this.getAllLessons();
      const filtered = all.filter((l) => l.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(filtered));
      } catch (e) {
        console.error('Failed to update localStorage after delete:', e);
      }
      return filtered;
    },

    /**
     * Duplicate a lesson for easy authoring
     * @param {string} id
     */
    duplicateLesson(id) {
      const target = this.getLessonById(id);
      if (!target) return null;

      const newLesson = JSON.parse(JSON.stringify(target));
      const newId = `lesson-${Date.now().toString(36)}`;
      newLesson.id = newId;
      newLesson.title = `${newLesson.title} (Bản sao)`;
      newLesson.status = 'Nháp'; // Duplicates default to draft

      this.saveLesson(newLesson);
      return newLesson;
    },

    /**
     * Visibility rule check for a lesson
     * Rule: Students ONLY see lessons whose status is "Đã dạy" AND whose date is today or earlier.
     * @param {Object|string} lessonOrId
     * @returns {boolean}
     */
    isLessonVisibleForStudent(lessonOrId) {
      const lesson = typeof lessonOrId === 'string' ? this.getLessonById(lessonOrId) : lessonOrId;
      if (!lesson) return false;

      // Status check
      if (lesson.status !== 'Đã dạy') {
        return false;
      }

      // Date check: must be today or earlier
      if (!lesson.date) return false;
      const todayStr = getTodayDateString();

      // Normalize date string (YYYY-MM-DD)
      const lessonDateStr = String(lesson.date).trim().slice(0, 10);
      return lessonDateStr <= todayStr;
    },

    /**
     * Get lessons visible to students
     * @returns {Array} List of published lessons with date <= today
     */
    getVisibleLessonsForStudent() {
      const all = this.getAllLessons();
      return all.filter((l) => this.isLessonVisibleForStudent(l));
    },

    /**
     * Export all curriculum data as JSON
     */
    exportJSON() {
      const all = this.getAllLessons();
      return JSON.stringify(all, null, 2);
    },

    /**
     * Download JSON file to client's computer
     */
    downloadJSON() {
      const jsonStr = this.exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ke-hoach-bai-day-lich-su-${getTodayDateString()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    /**
     * Import JSON string and merge/replace curriculum
     * @param {string} jsonString
     * @returns {{ success: boolean, count?: number, message: string }}
     */
    importJSON(jsonString) {
      try {
        const parsed = normalizeData(JSON.parse(jsonString));
        let lessons = [];
        if (Array.isArray(parsed)) {
          lessons = parsed;
        } else if (parsed && Array.isArray(parsed.lessons)) {
          lessons = parsed.lessons;
        } else if (parsed && parsed.id) {
          lessons = [parsed];
        } else {
          return { success: false, message: 'Định dạng JSON không hợp lệ. Phải là mảng danh sách bài học.' };
        }

        // Validate basic fields
        const validLessons = normalizeData(lessons.filter((l) => l && l.id && l.title));
        if (validLessons.length === 0) {
          return { success: false, message: 'Không tìm thấy bài giảng hợp lệ trong tệp JSON đã tải.' };
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(validLessons));
        return {
          success: true,
          count: validLessons.length,
          message: `Nhập thành công ${validLessons.length} bài giảng!`
        };
      } catch (e) {
        return { success: false, message: `Lỗi đọc tệp JSON: ${e.message}` };
      }
    },

    /**
     * Reset database to default seed content
     */
    resetToDefaults() {
      const seeds = normalizeData(window.SEED_LESSONS || []);
      localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(seeds));
      return seeds;
    },

    /**
     * Save student run simulation choices and results for later replay
     * @param {string} lessonId
     * @param {Object} runData
     */
    saveStudentRun(lessonId, runData) {
      if (!lessonId || !runData) return;
      try {
        let runs = {};
        const raw = localStorage.getItem(STORAGE_KEY_STUDENT_RUNS);
        if (raw) runs = normalizeData(JSON.parse(raw));
        runs[lessonId] = Object.assign({}, normalizeData(runData), { timestamp: new Date().toISOString() });
        localStorage.setItem(STORAGE_KEY_STUDENT_RUNS, JSON.stringify(runs));
      } catch (e) {
        console.warn('Failed to save student run:', e);
      }
    },

    /**
     * Get saved student simulation run for a lesson
     * @param {string} lessonId
     */
    getStudentRun(lessonId) {
      if (!lessonId) return null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY_STUDENT_RUNS);
        if (!raw) return null;
        const runs = normalizeData(JSON.parse(raw));
        return runs[lessonId] || null;
      } catch (e) {
        return null;
      }
    }
  };

  // Auto-init
  LessonStorage.init();
  window.LessonStorage = LessonStorage;
})(window);

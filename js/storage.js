/**
 * storage.js - Data persistence and synchronization module
 * Manages curriculum lessons in localStorage, export / import JSON,
 * and enforces strict student visibility rules (status == 'Đã dạy' AND date <= today).
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_LESSONS = 'history_sim_lessons_db_v2';
  const STORAGE_KEY_STUDENT_RUNS = 'history_sim_student_runs';

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
     * Initialize store with SEED_LESSONS if empty
     */
    init() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_LESSONS);
        if (!stored) {
          const seeds = normalizeData(window.SEED_LESSONS || []);
          localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(seeds));
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

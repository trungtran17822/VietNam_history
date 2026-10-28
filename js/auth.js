/**
 * auth.js - Client-side authentication module
 * Manages user sessions in sessionStorage with configurable demo credentials.
 * Roles: 'teacher' (Giáo viên) and 'student' (Học sinh).
 */

(function (window) {
  'use strict';

  // Configurable credentials object
  const AUTH_CONFIG = {
    teacher: {
      username: 'admin',
      password: '123',
      role: 'teacher',
      roleLabel: 'Giáo viên',
      displayName: 'Thầy Nguyễn Văn Hưng',
      department: 'Tổ Lịch sử - Địa lý'
    },
    student: {
      username: 'admin',
      password: '123',
      role: 'student',
      roleLabel: 'Học sinh',
      displayName: 'Nguyễn Quang Vinh (11A1)',
      className: 'Lớp 11A1'
    }
  };

  const SESSION_STORAGE_KEY = 'history_sim_auth_session';

  function normalizeData(value) {
    return window.normalizeVietnamese ? window.normalizeVietnamese(value) : value;
  }

  const Auth = {
    /**
     * Get configured accounts (for reference or UI hints)
     */
    getConfig() {
      return AUTH_CONFIG;
    },

    /**
     * Attempt login
     * @param {string} role - 'teacher' | 'student'
     * @param {string} username
     * @param {string} password
     * @returns {{ success: boolean, message?: string, user?: Object }}
     */
    login(role, username, password) {
      const targetConfig = AUTH_CONFIG[role];
      if (!targetConfig) {
        return { success: false, message: 'Vai trò đăng nhập không hợp lệ.' };
      }

      const inputUser = (username || '').trim();
      const inputPass = (password || '').trim();

      if (inputUser === targetConfig.username && inputPass === targetConfig.password) {
        const sessionUser = {
          role: targetConfig.role,
          roleLabel: targetConfig.roleLabel,
          displayName: targetConfig.displayName,
          username: targetConfig.username,
          loginTime: new Date().toISOString()
        };
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizeData(sessionUser)));
        } catch (e) {
          console.warn('SessionStorage error:', e);
        }
        return { success: true, user: sessionUser };
      }

      return {
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác. (Gợi ý: admin / 123)'
      };
    },

    /**
     * Get currently logged-in user or null
     */
    getCurrentUser() {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        return normalizeData(JSON.parse(raw));
      } catch (e) {
        return null;
      }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
      return this.getCurrentUser() !== null;
    },

    /**
     * Check if current user has the specified role
     * @param {string} role - 'teacher' | 'student'
     */
    hasRole(role) {
      const user = this.getCurrentUser();
      return user && user.role === role;
    },

    /**
     * Logout and remove session
     */
    logout() {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {
        console.warn('SessionStorage clear error:', e);
      }
    }
  };

  window.Auth = Auth;
})(window);

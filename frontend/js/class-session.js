/**
 * Class session client (F10, F11): talks to backend/ and keeps per-device session state.
 * Contract: specs/001-classroom-sim-demo/contracts/api.md. The lesson never depends on this module;
 * every call can fail with a ClassSessionError whose message is ready to show in Vietnamese.
 */
(function (window) {
  'use strict';

  var TEACHER_KEY_PREFIX = 'sv_class_teacher_';
  var STUDENT_KEY = 'sv_class_student';
  var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  var MESSAGES = {
    not_configured: 'Máy chủ lớp học chưa được cấu hình cho trang này; bài học vẫn chạy bình thường trên máy này.',
    offline: 'Chưa kết nối được máy chủ lớp học; bài học vẫn chạy bình thường trên máy này.',
    invalid_code: 'Mã phiên gồm 6 ký tự, ví dụ K7M2QX.',
    wrong_lesson: 'Mã phiên này dành cho bài học khác.',
    not_joined: 'Thiết bị này chưa vào phiên lớp.',
    no_session: 'Chưa mở phiên lớp cho bài học này.'
  };

  function ClassSessionError(code, message, status) {
    this.name = 'ClassSessionError';
    this.code = code;
    this.status = status || 0;
    this.message = message || MESSAGES[code] || MESSAGES.offline;
  }
  ClassSessionError.prototype = Object.create(Error.prototype);
  ClassSessionError.prototype.constructor = ClassSessionError;

  function config() {
    return window.APP_CONFIG || { apiBase: '', requestTimeoutMs: 6000 };
  }

  function isConfigured() {
    return Boolean(config().apiBase);
  }

  function readJson(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Storage may be unavailable (private mode); session state then lasts for this page only. */
    }
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function normalizeCode(input) {
    return String(input || '').toUpperCase().replace(/[\s-]/g, '');
  }

  function isValidCode(code) {
    return code.length === 6 && code.split('').every(function (c) { return CODE_ALPHABET.indexOf(c) !== -1; });
  }

  async function request(method, path, options) {
    options = options || {};
    if (!isConfigured()) throw new ClassSessionError('not_configured');
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, config().requestTimeoutMs || 6000) : null;
    var headers = {};
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.teacherKey) headers['X-Teacher-Key'] = options.teacherKey;
    var response;
    try {
      response = await window.fetch(config().apiBase + path, {
        method: method,
        headers: headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller ? controller.signal : undefined,
        cache: 'no-store'
      });
    } catch (error) {
      throw new ClassSessionError('offline');
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (response.ok) return response;
    var data = null;
    try { data = await response.json(); } catch (error) { /* non-JSON error body */ }
    throw new ClassSessionError((data && data.error) || 'server_error', data && data.message, response.status);
  }

  // ---- Teacher ---------------------------------------------------------------

  function getTeacherSession(lessonId) {
    var saved = readJson(TEACHER_KEY_PREFIX + lessonId);
    if (!saved || !saved.code || !saved.teacherKey) return null;
    return saved;
  }

  async function openSession(lessonId) {
    var response = await request('POST', '/api/sessions', { body: { lessonId: lessonId } });
    var data = await response.json();
    var saved = { code: data.code, teacherKey: data.teacherKey, expiresAt: data.expiresAt };
    writeJson(TEACHER_KEY_PREFIX + lessonId, saved);
    return saved;
  }

  function requireTeacher(lessonId) {
    var saved = getTeacherSession(lessonId);
    if (!saved) throw new ClassSessionError('no_session');
    return saved;
  }

  async function fetchSummary(lessonId) {
    var saved = requireTeacher(lessonId);
    try {
      var response = await request('GET', '/api/sessions/' + saved.code + '/summary', { teacherKey: saved.teacherKey });
      return await response.json();
    } catch (error) {
      // The session was deleted elsewhere or purged: forget it on this device.
      if (error.status === 404 || error.status === 403) writeJson(TEACHER_KEY_PREFIX + lessonId, null);
      throw error;
    }
  }

  async function exportCsv(lessonId) {
    var saved = requireTeacher(lessonId);
    var response = await request('GET', '/api/sessions/' + saved.code + '/export.csv', { teacherKey: saved.teacherKey });
    return { blob: await response.blob(), filename: 'phien-' + saved.code + '.csv' };
  }

  async function deleteSession(lessonId) {
    var saved = requireTeacher(lessonId);
    try {
      await request('DELETE', '/api/sessions/' + saved.code, { teacherKey: saved.teacherKey });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    writeJson(TEACHER_KEY_PREFIX + lessonId, null);
  }

  // ---- Student ---------------------------------------------------------------

  function getJoined(lessonId) {
    var joined = readJson(STUDENT_KEY);
    if (!joined || (lessonId && joined.lessonId !== lessonId)) return null;
    if (joined.expiresAt && Date.now() >= joined.expiresAt) {
      writeJson(STUDENT_KEY, null);
      return null;
    }
    return joined;
  }

  async function join(rawCode, lessonId) {
    var code = normalizeCode(rawCode);
    if (!isValidCode(code)) throw new ClassSessionError('invalid_code');
    var response = await request('GET', '/api/sessions/' + code);
    var data = await response.json();
    if (!data.open) throw new ClassSessionError('closed', null, 410);
    if (data.lessonId !== lessonId) throw new ClassSessionError('wrong_lesson');
    var previous = getJoined(lessonId);
    var joined = {
      code: code,
      lessonId: lessonId,
      // A new anonymous id per session, so a device cannot be linked across sessions.
      clientId: previous && previous.code === code ? previous.clientId : randomId(),
      joinedAt: Date.now(),
      expiresAt: data.expiresAt
    };
    writeJson(STUDENT_KEY, joined);
    return joined;
  }

  function leave() {
    writeJson(STUDENT_KEY, null);
  }

  // answer: { choices?, durationSec?, ratings? }
  async function submit(lessonId, answer) {
    var joined = getJoined(lessonId);
    if (!joined) throw new ClassSessionError('not_joined');
    try {
      await request('PUT', '/api/sessions/' + joined.code + '/answers/' + joined.clientId, { body: answer });
    } catch (error) {
      if (error.status === 404 || error.status === 410) leave();
      throw error;
    }
  }

  window.ClassSession = {
    MESSAGES: MESSAGES,
    ClassSessionError: ClassSessionError,
    isConfigured: isConfigured,
    normalizeCode: normalizeCode,
    getTeacherSession: getTeacherSession,
    openSession: openSession,
    fetchSummary: fetchSummary,
    exportCsv: exportCsv,
    deleteSession: deleteSession,
    getJoined: getJoined,
    join: join,
    leave: leave,
    submit: submit
  };
})(window);

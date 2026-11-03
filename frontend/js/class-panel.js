/**
 * Class session UI for the 6-stage loop (F10, F11).
 * Stage 3: teacher panel (open session, code, live distribution, CSV, delete) or student join card.
 * Stage 6: optional 3-question survey for students who joined a session.
 * Uses window.ClassSession for all network calls; failures never block the lesson.
 */
(function (window, document) {
  'use strict';

  var RATING_QUESTIONS = [
    { key: 'interest', label: 'Em thấy bài học hôm nay thú vị như thế nào?', low: 'Chưa thú vị', high: 'Rất thú vị' },
    { key: 'visualize', label: 'Em hình dung diễn biến trận đánh rõ đến đâu?', low: 'Chưa rõ', high: 'Rất rõ' },
    { key: 'again', label: 'Em có muốn học các bài khác theo cách này không?', low: 'Không muốn', high: 'Rất muốn' }
  ];
  var BACKOFF_MS = 15000;

  var state = {
    lesson: null,
    role: 'student',
    panel: null,
    statusLine: null,
    pollTimer: null,
    startedAt: 0
  };

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function variablesOf(lesson) {
    return (lesson && lesson.question && Array.isArray(lesson.question.variables)) ? lesson.question.variables : [];
  }

  function formatCode(code) {
    return code.slice(0, 3) + ' ' + code.slice(3);
  }

  function setStatus(el, text, tone) {
    if (!el) return;
    el.textContent = text || '';
    el.dataset.tone = tone || '';
  }

  function stopPolling() {
    if (state.pollTimer) clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }

  // ---- Teacher -------------------------------------------------------------------

  function renderTeacherIdle(message, tone) {
    var configured = window.ClassSession.isConfigured();
    state.panel.innerHTML =
      '<p class="class-panel-kicker">PHIÊN LỚP</p>' +
      '<h3 class="class-panel-title">Cả lớp cùng trả lời</h3>' +
      '<p class="class-panel-copy">Mở phiên để học sinh gửi lựa chọn từ điện thoại hoặc máy tính. Màn chiếu hiện số học sinh chọn từng phương án. Không cần tên hay tài khoản.</p>' +
      (configured ? '<button type="button" class="btn-action-primary class-panel-open" data-class-open>Mở phiên lớp</button>' : '') +
      '<p class="class-panel-status" role="status"></p>';
    state.statusLine = state.panel.querySelector('.class-panel-status');
    setStatus(state.statusLine, configured ? message : window.ClassSession.MESSAGES.not_configured, configured ? tone : 'warn');
    var openButton = state.panel.querySelector('[data-class-open]');
    if (openButton) {
      openButton.addEventListener('click', async function () {
        openButton.disabled = true;
        setStatus(state.statusLine, 'Đang mở phiên…');
        try {
          await window.ClassSession.openSession(state.lesson.id);
          renderTeacherActive(null);
          poll();
        } catch (error) {
          openButton.disabled = false;
          setStatus(state.statusLine, error.message, 'warn');
        }
      });
    }
  }

  function renderDistribution(summary) {
    var vars = variablesOf(state.lesson);
    var count = summary ? summary.count : 0;
    return vars.map(function (variable) {
      var counts = (summary && summary.distribution && summary.distribution[variable.id]) || {};
      var rows = (variable.options || []).map(function (option) {
        var n = counts[option.id] || 0;
        var pct = count ? Math.round((n / count) * 100) : 0;
        return '<li class="class-bar' + (option.isOriginal ? ' is-original' : '') + '">' +
          '<span class="class-bar-label">' + escapeHTML(option.shortName || option.name) + (option.isOriginal ? ' <small>(cách gốc)</small>' : '') + '</span>' +
          '<span class="class-bar-track" aria-hidden="true"><span class="class-bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="class-bar-count" data-option-count="' + escapeHTML(variable.id + ':' + option.id) + '">' + n + '</span>' +
          '</li>';
      }).join('');
      return '<div class="class-dist-group"><p class="class-dist-title">' + escapeHTML(variable.title) + '</p><ul class="class-bars">' + rows + '</ul></div>';
    }).join('');
  }

  function renderRatings(summary) {
    if (!summary || !summary.ratings) return '';
    var parts = RATING_QUESTIONS.map(function (q) {
      var r = summary.ratings[q.key];
      return r && r.n ? '<span><strong>' + r.avg + '</strong>/5 ' + escapeHTML(q.high.toLowerCase()) + ' <small>(' + r.n + ')</small></span>' : '';
    }).filter(Boolean);
    return parts.length ? '<p class="class-ratings" data-class-ratings><span class="class-ratings-label">Khảo sát:</span> ' + parts.join(' · ') + '</p>' : '';
  }

  function renderTeacherActive(summary, statusText, tone) {
    var saved = window.ClassSession.getTeacherSession(state.lesson.id);
    if (!saved) {
      renderTeacherIdle();
      return;
    }
    var open = summary ? summary.open : Date.now() < saved.expiresAt;
    var count = summary ? summary.count : 0;
    state.panel.innerHTML =
      '<p class="class-panel-kicker">PHIÊN LỚP · <span class="class-live' + (open ? '' : ' is-closed') + '">' + (open ? 'đang nhận câu trả lời' : 'đã hết hạn nhận câu trả lời') + '</span></p>' +
      '<div class="class-code-block">' +
        '<span class="class-code-label">Mã vào lớp</span>' +
        '<strong class="class-code" data-class-code="' + escapeHTML(saved.code) + '" aria-label="Mã vào lớp ' + escapeHTML(saved.code.split('').join(' ')) + '">' + escapeHTML(formatCode(saved.code)) + '</strong>' +
        '<span class="class-code-help">Học sinh mở bài này, đến bước 3 và nhập mã.</span>' +
      '</div>' +
      '<p class="class-count"><strong data-class-count>' + count + '</strong> học sinh đã gửi lựa chọn</p>' +
      '<div class="class-dist">' + renderDistribution(summary) + '</div>' +
      renderRatings(summary) +
      '<div class="class-panel-actions">' +
        '<button type="button" class="btn-action-secondary" data-class-export>Tải dữ liệu (CSV)</button>' +
        '<button type="button" class="btn-action-secondary class-danger" data-class-delete>Xoá phiên</button>' +
        (open ? '' : '<button type="button" class="btn-action-primary" data-class-new>Mở phiên mới</button>') +
      '</div>' +
      '<p class="class-panel-status" role="status"></p>' +
      '<p class="class-panel-privacy">Dữ liệu ẩn danh: không lưu tên, email hay địa chỉ IP. Tự xoá sau 180 ngày.</p>';
    state.statusLine = state.panel.querySelector('.class-panel-status');
    setStatus(state.statusLine, statusText, tone);

    state.panel.querySelector('[data-class-export]').addEventListener('click', async function (event) {
      var button = event.currentTarget;
      button.disabled = true;
      try {
        var file = await window.ClassSession.exportCsv(state.lesson.id);
        var url = URL.createObjectURL(file.blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        setStatus(state.statusLine, 'Đã tải ' + file.filename + '.', 'ok');
      } catch (error) {
        setStatus(state.statusLine, error.message, 'warn');
      } finally {
        button.disabled = false;
      }
    });

    state.panel.querySelector('[data-class-delete]').addEventListener('click', async function () {
      if (!window.confirm('Xoá phiên ' + saved.code + ' và toàn bộ câu trả lời? Thao tác này không thể hoàn tác.')) return;
      stopPolling();
      try {
        await window.ClassSession.deleteSession(state.lesson.id);
        renderTeacherIdle('Đã xoá phiên và toàn bộ câu trả lời.', 'ok');
      } catch (error) {
        setStatus(state.statusLine, error.message, 'warn');
        poll();
      }
    });

    var newButton = state.panel.querySelector('[data-class-new]');
    if (newButton) {
      newButton.addEventListener('click', async function () {
        newButton.disabled = true;
        try {
          await window.ClassSession.openSession(state.lesson.id);
          renderTeacherActive(null);
          poll();
        } catch (error) {
          newButton.disabled = false;
          setStatus(state.statusLine, error.message, 'warn');
        }
      });
    }
  }

  function updateTeacherSummary(summary) {
    // Re-render only when numbers changed, so buttons keep focus between polls.
    var countEl = state.panel.querySelector('[data-class-count]');
    var signature = JSON.stringify([summary.count, summary.distribution, summary.ratings, summary.open]);
    if (countEl && state.panel.dataset.signature === signature) {
      if (state.statusLine && state.statusLine.dataset.tone === 'warn') setStatus(state.statusLine, '', '');
      return;
    }
    state.panel.dataset.signature = signature;
    renderTeacherActive(summary);
  }

  async function poll() {
    stopPolling();
    if (!state.panel || state.role !== 'teacher' || !window.ClassSession.getTeacherSession(state.lesson.id)) return;
    var delay = (window.APP_CONFIG && window.APP_CONFIG.pollIntervalMs) || 4000;
    if (!document.hidden) {
      try {
        updateTeacherSummary(await window.ClassSession.fetchSummary(state.lesson.id));
      } catch (error) {
        if (!window.ClassSession.getTeacherSession(state.lesson.id)) {
          renderTeacherIdle(error.message, 'warn');
          return;
        }
        setStatus(state.statusLine, error.message, 'warn');
        delay = BACKOFF_MS;
      }
    }
    if (state.panel) state.pollTimer = setTimeout(poll, delay);
  }

  // ---- Student -------------------------------------------------------------------

  function renderStudent(message, tone) {
    if (!window.ClassSession.isConfigured()) {
      state.panel.hidden = true;
      return;
    }
    state.panel.hidden = false;
    var joined = window.ClassSession.getJoined(state.lesson.id);
    if (joined) {
      state.panel.innerHTML =
        '<p class="class-panel-kicker">PHIÊN LỚP</p>' +
        '<p class="class-joined">Đã vào lớp <strong data-class-joined>' + escapeHTML(formatCode(joined.code)) + '</strong></p>' +
        '<p class="class-panel-copy">Khi em bấm "Chạy mô phỏng", lựa chọn sẽ được gửi ẩn danh để cả lớp cùng xem. Em có thể đổi ý và chạy lại.</p>' +
        '<button type="button" class="btn-link" data-class-leave>Rời phiên lớp</button>' +
        '<p class="class-panel-status" role="status"></p>';
      state.statusLine = state.panel.querySelector('.class-panel-status');
      setStatus(state.statusLine, message, tone);
      state.panel.querySelector('[data-class-leave]').addEventListener('click', function () {
        window.ClassSession.leave();
        renderStudent('Đã rời phiên lớp. Bài học vẫn tiếp tục trên máy em.', 'ok');
      });
      return;
    }
    state.panel.innerHTML =
      '<p class="class-panel-kicker">PHIÊN LỚP</p>' +
      '<h3 class="class-panel-title">Tham gia cùng lớp</h3>' +
      '<form class="class-join-form" novalidate>' +
        '<label for="class-join-code">Mã phiên thầy cô chiếu trên màn hình</label>' +
        '<div class="class-join-row">' +
          '<input id="class-join-code" class="form-input class-join-input" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="VD: K7M2QX">' +
          '<button type="submit" class="btn-action-primary">Vào lớp</button>' +
        '</div>' +
      '</form>' +
      '<p class="class-panel-copy">Không bắt buộc. Không cần tên; lựa chọn được gửi ẩn danh.</p>' +
      '<p class="class-panel-status" role="status"></p>';
    state.statusLine = state.panel.querySelector('.class-panel-status');
    setStatus(state.statusLine, message, tone);
    var form = state.panel.querySelector('form');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var input = form.querySelector('input');
      var button = form.querySelector('button');
      button.disabled = true;
      setStatus(state.statusLine, 'Đang kiểm tra mã…');
      try {
        await window.ClassSession.join(input.value, state.lesson.id);
        renderStudent('Đã vào lớp. Hãy chọn phương án rồi bấm "Chạy mô phỏng".', 'ok');
      } catch (error) {
        button.disabled = false;
        setStatus(state.statusLine, error.message, 'warn');
        input.focus();
      }
    });
  }

  // ---- Public API ------------------------------------------------------------------

  function mountQuestionPanel(panel, lesson, role) {
    stopPolling();
    state.panel = panel;
    state.lesson = lesson;
    state.role = role;
    panel.hidden = false;
    delete panel.dataset.signature;
    if (role === 'teacher') {
      if (window.ClassSession.getTeacherSession(lesson.id)) {
        renderTeacherActive(null, 'Đang tải số liệu…');
        poll();
      } else {
        renderTeacherIdle();
      }
    } else {
      renderStudent();
    }
  }

  function unmount() {
    stopPolling();
    state.panel = null;
  }

  function markLessonStart() {
    state.startedAt = Date.now();
  }

  function elapsedSeconds() {
    return state.startedAt ? Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)) : 0;
  }

  // Called when the student presses "Chạy mô phỏng". Resolves to a message for the status line, or ''.
  async function submitChoices(lesson, choices) {
    if (!window.ClassSession.isConfigured() || !window.ClassSession.getJoined(lesson.id)) return { text: '' };
    try {
      await window.ClassSession.submit(lesson.id, { choices: choices, durationSec: elapsedSeconds() });
      return { text: 'Đã gửi lựa chọn tới lớp.', tone: 'ok' };
    } catch (error) {
      return { text: error.message + ' Bấm "Chạy mô phỏng" lần nữa để gửi lại.', tone: 'warn' };
    }
  }

  function mountSurvey(container, lesson, role) {
    if (!container) return;
    if (role !== 'student' || !window.ClassSession.isConfigured() || !window.ClassSession.getJoined(lesson.id)) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    container.hidden = false;
    container.innerHTML =
      '<h3 class="class-survey-title">Ý kiến của em <small>(ẩn danh, có thể bỏ qua)</small></h3>' +
      '<form class="class-survey-form">' +
      RATING_QUESTIONS.map(function (q) {
        return '<fieldset class="rating-row"><legend>' + escapeHTML(q.label) + '</legend>' +
          '<div class="rating-scale">' +
          [1, 2, 3, 4, 5].map(function (n) {
            return '<label class="rating-pill"><input type="radio" name="rating-' + q.key + '" value="' + n + '"><span>' + n + '</span></label>';
          }).join('') +
          '</div><p class="rating-ends"><span>' + escapeHTML(q.low) + '</span><span>' + escapeHTML(q.high) + '</span></p></fieldset>';
      }).join('') +
      '<div class="class-survey-actions"><button type="submit" class="btn-action-primary">Gửi ý kiến</button><p class="class-panel-status" role="status"></p></div>' +
      '</form>';
    var form = container.querySelector('form');
    var status = container.querySelector('.class-panel-status');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var ratings = {};
      RATING_QUESTIONS.forEach(function (q) {
        var checked = form.querySelector('input[name="rating-' + q.key + '"]:checked');
        ratings[q.key] = checked ? Number(checked.value) : null;
      });
      var button = form.querySelector('button');
      button.disabled = true;
      try {
        await window.ClassSession.submit(lesson.id, { ratings: ratings, durationSec: elapsedSeconds() });
        setStatus(status, 'Cảm ơn em! Ý kiến đã được gửi ẩn danh.', 'ok');
      } catch (error) {
        button.disabled = false;
        setStatus(status, error.message, 'warn');
      }
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && state.panel && state.role === 'teacher') poll();
  });

  window.ClassPanel = {
    mountQuestionPanel: mountQuestionPanel,
    unmount: unmount,
    markLessonStart: markLessonStart,
    submitChoices: submitChoices,
    mountSurvey: mountSurvey
  };
})(window, document);

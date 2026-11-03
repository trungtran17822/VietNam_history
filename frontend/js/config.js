/**
 * Per-environment settings (no build step, so this file is the switch).
 * apiBase: origin of the class session API (backend/). Empty string turns class features off;
 * the lesson itself never needs the API.
 * Deployed: set DEPLOYED_API_BASE to the Cloudflare Worker URL (docs/devops/DEPLOY.md).
 */
(function (window) {
  'use strict';

  var DEPLOYED_API_BASE = '';

  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || host === '[::1]';

  window.APP_CONFIG = Object.freeze({
    apiBase: isLocal ? 'http://localhost:8787' : DEPLOYED_API_BASE,
    pollIntervalMs: 4000,
    requestTimeoutMs: 6000
  });
})(window);

// Cloudflare Worker entry for the class session API.
// Bindings (wrangler.toml): DB (D1), ALLOWED_ORIGINS (comma-separated origins, or *).
import { handle, purgeExpired } from './handlers.js';
import { D1Store } from './store.js';

export default {
  fetch(request, env) {
    return handle(request, { store: new D1Store(env.DB), allowedOrigins: env.ALLOWED_ORIGINS });
  },

  // Daily cron: delete sessions older than the 180-day retention window.
  async scheduled(_event, env) {
    await purgeExpired(new D1Store(env.DB));
  }
};

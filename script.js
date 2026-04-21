/* ── AI (DISABLED FOR SECURITY) ── */
/*
SECURITY FIX:
Removed hardcoded API key from frontend code.

Reason:
Exposing API keys in client-side JavaScript is insecure because
any user can access them via browser developer tools.

Recommended Solution:
Move API calls to a backend server and store API keys in environment variables (.env file).

Example:
Backend (Node.js):
process.env.API_KEY

Frontend:
fetch('/api/endpoint')
*/
git add script.js
git commit -m "Fix: Removed exposed API key and added security explanation"
git push origin fix-api-key

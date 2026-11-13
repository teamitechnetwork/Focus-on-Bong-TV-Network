# Vercel deployment

The Vite newsroom frontend can be deployed from the repository root. The root
`vercel.json` selects the `@workspace/focus-bong-tv` package, builds it, serves
the generated static files, and routes deep links back to the app.

## Import the repository

1. Import `teamitechnetwork/Focus-on-Bong-TV-Network` into Vercel.
2. Keep the project Root Directory set to `.` (the repository root).
3. Leave the install, build, and output settings at their `vercel.json` values.
4. Add `VITE_API_BASE_URL` for Production, Preview, and Development. Set it to
   the origin of the separately hosted Express API, for example
   `https://api.example.com` (no trailing slash and no `/api` suffix).
5. Deploy.

## API and database

This configuration deploys the Vite frontend only. The existing Express API
and PostgreSQL database are not converted into Vercel functions by this
configuration. Keep the API deployed on a Node.js host and point
`VITE_API_BASE_URL` at that API's origin. Its `/api` routes must be reachable
from the Vercel site and allow the site's origin through CORS.

Without `VITE_API_BASE_URL`, the static Liberia news feed still renders, but
the existing article, video, live-status, comments, and newsletter features
will call the Vercel site's origin and need a matching API there.

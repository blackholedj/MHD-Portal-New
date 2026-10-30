# MHD Portal 4.0.0

Next.js application for the DPMOST portal, using Supabase authentication and RLS with private Cloudflare R2 files.

## Local development

Install dependencies with `npm ci`. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` locally, then run `npm run dev`. Private R2 variables belong in the server environment only. Never commit connection files, credentials, database dumps, or local test fixtures.

The historically named `scripts/verify-staging-env.mjs` validates the known project and public-variable rules. **It does not establish staging isolation:** the configured project currently backs production. Use a separate database for tests that change data.

## Timetables

Navigation: transport/day category → actual line → actual course. File URLs and images are requested only when opening a course detail. Morning and afternoon parts remain separate files.

Historical database convention is preserved: `course_number` contains the actual line; `line_number` contains the actual course. Filters, editing and new uploads follow this convention.

`supabase/migrations/202610300001_course_visibility.sql` adds course-level visibility. Existing courses are active by default. Admins can deactivate/reactivate the whole course; users cannot read inactive metadata or obtain new file URLs. Existing signed R2 URLs remain valid until their original expiration.

## Release

Back up the database and record the current Netlify deploy before applying a migration. Apply the visibility migration before deploying this release. Run the build with `NEXT_PUBLIC_R2_ENABLED=true`. Preserve production function settings for R2 reads and uploads and provide R2 credentials as private function variables. The local prebuild uses `R2_UPLOAD_ENABLED=false`; runtime upload enablement is configured separately for the deployed functions.

Production: https://dpmost.netlify.app

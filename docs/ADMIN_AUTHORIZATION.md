# Admin authorization

## Runtime authority

RUN 213 has one runtime Admin authority: a verified Firebase Authentication ID token whose custom claims contain `admin: true`. Every `/api/admin/*` handler, including session and configuration handlers, calls `verifyAdminRequest`. Missing or invalid credentials return `401`; a valid user without the claim returns `403`.

`ADMIN_EMAILS` and `SUPER_ADMIN_EMAIL` are retired. They are not read by the application or claim-management script, and email alone never grants access. Remove them from Vercel only after completing the migration below.

Firestore Rules use the same `request.auth.token.admin == true` condition for Admin writes to products, looks, and look collections. Current Admin UI operations call server Admin APIs, which write with the Firebase Admin SDK; there are no direct browser Admin Firestore writes.

## Granting and revoking

The local `.env.local` must contain `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. These commands work from Windows PowerShell:

```powershell
npm run admin:grant -- --email admin@example.com
npm run admin:revoke -- --email admin@example.com
```

The script only resolves an existing Firebase Auth account. It never creates a user, preserves unrelated custom claims, verifies the result, and prints only the affected UID/email. Claim changes require the user to sign out and back in or force-refresh the Firebase ID token. The Admin gate force-refreshes its token whenever it hydrates.

## Lockout-safe deployment order

1. Pull/build this revision locally, but do **not** deploy its claim-only API authorization yet.
2. Keep the production email allowlist configuration temporarily and run `npm run admin:grant -- --email <existing-admin-email>` against the production Firebase project.
3. In Firebase Authentication, verify that exact existing UID has `admin: true` (or securely inspect a freshly issued token).
4. Have the administrator sign out and back in and verify the refreshed token contains the claim.
5. Deploy this revision and test `/admin`, product reads, and one reversible Admin operation.
6. Verify a normal authenticated customer receives `403`, while missing/invalid tokens receive `401`.
7. Only then remove `ADMIN_EMAILS` and `SUPER_ADMIN_EMAIL` from Vercel. They are inert after this deployment.

For revocation, run the revoke command and force a token refresh/sign-out. Previously issued tokens remain valid until refresh/expiry; revoke Firebase sessions too if emergency immediate invalidation is required.

## Manual browser checks

1. Signed out: `/admin` denies access and an Admin API call without authorization returns `401`.
2. Signed in as a normal customer: `/admin` denies access and `/api/admin/me` returns `403`.
3. Signed in with `admin: true`: Admin pages and protected API calls load.
4. A legacy allowlisted email without the claim remains denied.
5. A claimed user works regardless of legacy allowlist contents.
6. After revocation and forced refresh/sign-out-in, access is denied.
7. Sending `{ "admin": true }` in a request body without a claimed token remains denied.

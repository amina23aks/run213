# Firebase setup for 213 RUN

213 RUN uses the existing Firebase project:

```text
projectId: run213
```

This sprint only adds the Firebase foundation. Orders, admin pages, Cloudinary uploads, Turnstile, checkout submission, and Firebase Analytics are intentionally not implemented yet.

## Firebase Console setup

In the Firebase Console for `run213`:

1. Authentication providers are enabled manually:
   - Email/Password
   - Google
2. Create or confirm a Firestore database in **production mode**.
3. Do not use Realtime Database for 213 RUN.

## Web app config

Find the web config in:

```text
Firebase Console → Project settings → General → Your apps → Web app → SDK setup and configuration
```

Copy those values into `.env.local` using the `NEXT_PUBLIC_FIREBASE_*` variables below.

## Service account config

Create a service account key in:

```text
Firebase Console → Project settings → Service accounts → Generate new private key
```

Use the generated JSON to fill the server-only variables below:

- `FIREBASE_PROJECT_ID` from `project_id`
- `FIREBASE_CLIENT_EMAIL` from `client_email`
- `FIREBASE_PRIVATE_KEY` from `private_key`

When storing `FIREBASE_PRIVATE_KEY` in `.env.local` or Vercel, keep escaped newlines as `\n`. The server initialization replaces escaped newlines before passing the key to Firebase Admin SDK.

## Required `.env.local` variables

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=run213.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=run213
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=run213.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Optional and documented for later only.
# Firebase Analytics is not initialized yet and getAnalytics is not imported.
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_PROJECT_ID=run213
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

ADMIN_EMAILS=
SUPER_ADMIN_EMAIL=
```

## Vercel environment variables

Add the same variables in:

```text
Vercel Project → Settings → Environment Variables
```

Recommended scopes:

- Production
- Preview
- Development, if you use Vercel CLI locally

## Security warnings

- Never commit `.env.local`.
- Never commit Firebase service account JSON files.
- Never expose `FIREBASE_CLIENT_EMAIL` or `FIREBASE_PRIVATE_KEY` with a `NEXT_PUBLIC_` prefix.
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` may exist, but Firebase Analytics is not initialized in this sprint.

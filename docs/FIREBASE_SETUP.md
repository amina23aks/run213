# Firebase Setup — 213 RUN

213 RUN uses the existing Firebase project with project ID `run213`.

## Enabled Firebase services

In Firebase Console, the following Auth providers are enabled manually:

- Email/Password
- Google

Use Cloud Firestore in production mode. Do not use Realtime Database for 213 RUN.

## Web app config

Get the public web config from Firebase Console:

1. Open Firebase Console.
2. Select the `run213` project.
3. Go to **Project settings** > **General**.
4. In **Your apps**, create or open the Web app.
5. Copy the Firebase config values into `.env.local` and Vercel.

Required client variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=run213.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=run213
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=run213.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Optional documented-only variable:

```bash
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` may exist, but Firebase Analytics is not initialized yet. Do not import or call `getAnalytics` until analytics is explicitly approved in a later sprint.

## Service account for server code

Create a Firebase Admin SDK service account:

1. Open Firebase Console.
2. Select the `run213` project.
3. Go to **Project settings** > **Service accounts**.
4. Select **Firebase Admin SDK**.
5. Generate a new private key.
6. Copy values from the downloaded JSON into `.env.local` and Vercel environment variables.

Required server variables:

```bash
FIREBASE_PROJECT_ID=run213
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_EMAILS=
SUPER_ADMIN_EMAIL=
```

`FIREBASE_PRIVATE_KEY` can include escaped newlines (`\n`); the server initializer converts them before passing the key to Firebase Admin.

## Vercel environment variables

Add the same values in Vercel:

1. Open the Vercel project.
2. Go to **Settings** > **Environment Variables**.
3. Add all `NEXT_PUBLIC_FIREBASE_*` variables for the browser.
4. Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ADMIN_EMAILS`, and `SUPER_ADMIN_EMAIL` for server code.
5. Redeploy after changing environment variables.

## Security warnings

- Never commit `.env.local`.
- Never commit service account JSON files.
- Never expose `FIREBASE_PRIVATE_KEY` or `FIREBASE_CLIENT_EMAIL` to client components.
- Firebase Admin code must stay server-only.
- Orders, admin, Cloudinary uploads, Turnstile, and checkout submission are not implemented in this sprint.

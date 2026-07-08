export function extractFirebaseAuthCode(error: unknown): string {
  if (!error) return "unknown";

  if (typeof error === "object" && error !== null) {
    if ("code" in error && typeof error.code === "string") return error.code;
    if ("message" in error && typeof error.message === "string") {
      const match = error.message.match(/\((auth\/[^)]+)\)/);
      if (match?.[1]) return match[1];
    }
  }

  return "unknown";
}

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Auth. Add the current Vercel preview/production domain in Firebase Console → Authentication → Settings → Authorized domains, then redeploy if env vars changed.";
    case "auth/popup-blocked":
      return "The Google popup was blocked. Redirect sign-in will open instead.";
    case "auth/popup-closed-by-user":
      return "Google sign in was closed before it finished.";
    case "auth/cancelled-popup-request":
      return "Another Google sign-in popup is already open. Close it and try again.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid or missing. Check NEXT_PUBLIC_FIREBASE_API_KEY and redeploy.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email sign in failed. Check your email and password.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Use Login instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "This sign-in provider is not enabled in Firebase Auth.";
    case "unknown":
      return "Authentication failed. Try again or check Firebase Auth settings.";
    default:
      return `Authentication failed (${code}). Check Firebase Auth settings and authorized domains.`;
  }
}

export function shouldFallbackToRedirect(code: string): boolean {
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
}

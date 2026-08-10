# Run Club upload security

Run Club signed uploads now require authenticated, environment-isolated UID and IP quotas, a current-month duplicate-lock pre-check, and a 15-minute one-time upload grant. Final submissions atomically consume that grant and retrieve authoritative asset metadata from Cloudinary before the Firestore transaction.

## Remaining SHOULD-fix

- Add scheduled cleanup for Cloudinary assets whose short-lived grant expires without a completed submission. This sprint deliberately does not add a scheduler or another service; the pre-check, quotas, and grant TTL reduce orphan creation in the meantime.

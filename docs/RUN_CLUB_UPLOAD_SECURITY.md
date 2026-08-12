# Run Club upload security

## Monthly submission identity

The canonical duplicate identity is the verified Firebase UID plus the current
`Africa/Algiers` calendar month. A deterministic Firestore UID/month lock is
created in the same transaction as the submission. User-controlled name,
contact, Instagram, and proof-image fields are not part of this identity.

Pending, approved, and rejected submissions all retain the lock. Rejected
submissions therefore cannot be replaced during the same month. This stricter
policy preserves moderation history without adding a risky lock-release and
replacement workflow. An early check before signing the Cloudinary upload saves
upload cost, but the Firestore transaction is always the final authority.

Run Club signed uploads now require authenticated, environment-isolated UID and IP quotas, a current-month duplicate-lock pre-check, and a 15-minute one-time upload grant. Final submissions atomically consume that grant and retrieve authoritative asset metadata from Cloudinary before the Firestore transaction.

## Remaining SHOULD-fix

- Add scheduled cleanup for Cloudinary assets whose short-lived grant expires without a completed submission. This sprint deliberately does not add a scheduler or another service; the pre-check, quotas, and grant TTL reduce orphan creation in the meantime.

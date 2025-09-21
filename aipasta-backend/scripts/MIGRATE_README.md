Migration: credits -> tokens

This repository now uses a token-based wallet instead of the legacy `credits` field on users.

Before running the migration:

- BACKUP your database. Do not run this script against production without a verified backup or staging run.
- Ensure environment variables are available to the script. The script looks for MONGO_URI or DATABASE_URL in the environment or will fallback to the server config.

How to run:

1. From the repository root (where .env exists), run:

   node aipasta-backend/scripts/migrateCreditsToTokens.js

2. The script will connect to the MongoDB and scan all users. It will do the following per user:
   - If user.credits > 0, it adds that amount to tokens.freeTokens and recomputes tokens.balance.
   - Adds a tokens.transactions entry of type "migration" for traceability.
   - Sets migrationFlags.migratedCreditsToTokens = true to avoid re-running on the same users.

3. The script prints a summary with number of updated/skipped users.

Notes and caveats:

- This script is intentionally simple and optimistic. It will zero the legacy credits field after migration. Remove that behavior if you need to preserve the original credits value.
- If your users already had tokens fields, this script will preserve existing paidTokens and add legacy credits into freeTokens.
- If you need a different mapping (for example, splitting credits into paid vs free tokens), modify the script accordingly.
- Test on a staging copy of your DB first.
/**
 * migrateCreditsToTokens.js
 *
 * Simple migration script to convert legacy `credits` on User documents
 * into the new token-based fields: `tokens.freeTokens` and `tokens.balance`.
 *
 * Usage:
 *   - Copy .env (or set environment variables) so the script can connect to MongoDB
 *   - Run: node scripts/migrateCreditsToTokens.js
 *
 * The script will:
 *  - Connect to the configured MongoDB
 *  - For each user with credits > 0 or missing tokens fields, set tokens.freeTokens += credits
 *    and tokens.balance = tokens.freeTokens + tokens.paidTokens
 *  - Write a `migrationFlags.migratedCreditsToTokens = true` and save
 *  - Print a summary at the end
 *
 * IMPORTANT: Run against a backup or a staging DB first.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const User = require(path.resolve(__dirname, '../src/models/User'));
const dbConfig = require(path.resolve(__dirname, '../src/config/database'));

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || process.env.MONGODB_URI || dbConfig.mongoUrl;
  if (!mongoUri) {
    console.error('No MongoDB connection string found. Set MONGO_URI or DATABASE_URL in your .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users. Scanning for legacy credits...`);

    let updatedCount = 0;
    let skippedCount = 0;
    for (const user of users) {
      const legacyCredits = (user.credits || 0);

      // If user already marked as migrated, skip
      if (user.migrationFlags && user.migrationFlags.migratedCreditsToTokens) {
        skippedCount++;
        continue;
      }

      // Ensure tokens object exists
      if (!user.tokens) {
        user.tokens = { freeTokens: 0, paidTokens: 0, balance: 0, totalUsed: 0, transactions: [] };
      }

      // Move legacy credits into freeTokens
      if (legacyCredits && legacyCredits > 0) {
        // If freeTokens exists, add to it
        user.tokens.freeTokens = (user.tokens.freeTokens || 0) + Number(legacyCredits);
        // Recompute balance
        user.tokens.balance = (user.tokens.freeTokens || 0) + (user.tokens.paidTokens || 0);

        // Log a migration transaction locally on the user document
        user.tokens.transactions = user.tokens.transactions || [];
        user.tokens.transactions.push({
          type: 'migration',
          amount: Number(legacyCredits),
          note: 'Migrated legacy credits into freeTokens',
          date: new Date(),
        });

        // Clear legacy credits field (optional - comment this line if you prefer to keep it)
        user.credits = 0;
      } else {
        // If there were no legacy credits but the tokens fields were missing, ensure balance is set
        user.tokens.freeTokens = user.tokens.freeTokens || 0;
        user.tokens.paidTokens = user.tokens.paidTokens || 0;
        user.tokens.balance = (user.tokens.freeTokens || 0) + (user.tokens.paidTokens || 0);
      }

      user.migrationFlags = user.migrationFlags || {};
      user.migrationFlags.migratedCreditsToTokens = true;

      await user.save();
      updatedCount++;
    }

    console.log(`Migration complete. Updated ${updatedCount} users. Skipped ${skippedCount} already-migrated users.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

main();

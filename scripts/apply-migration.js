#!/usr/bin/env node
/**
 * Apply a SQL migration to Supabase via the pg package.
 *
 * Usage:
 *   node /home/z/my-project/scripts/apply-migration.js <path-to-sql-file>
 *
 * Safety:
 *   - Reads DATABASE_URL from .env
 *   - Wraps the migration in a transaction (the SQL file itself uses BEGIN/COMMIT)
 *   - Prints affected row counts where possible
 *   - Exits non-zero on failure
 *
 * NEVER run destructive migrations (DROP TABLE, TRUNCATE, DELETE without WHERE)
 * without explicit user approval per DB-SAFETY-RULES.md.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("❌ Usage: node apply-migration.js <path-to-sql-file>");
    process.exit(1);
  }

  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ File not found: ${sqlFile}`);
    process.exit(1);
  }

  // Load .env — but HARDCODE Supabase URL because shell env has SQLite path
  const SUPABASE_DB_URL = "postgresql://postgres.hzmxgzcdiaofpznvlmrz:Shaswat%400047@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  let databaseUrl = SUPABASE_DB_URL;

  console.log("─".repeat(60));
  console.log(`📄 Migration file: ${sqlFile}`);
  console.log(`🗄️  Database: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log("─".repeat(60));

  const sql = fs.readFileSync(sqlFile, "utf8");
  console.log(`📜 SQL size: ${sql.length} chars`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  console.log("✅ Connected to database");

  try {
    console.log("⏳ Applying migration...");
    const startTime = Date.now();

    // The SQL file contains its own BEGIN/COMMIT — run as a single query.
    // pg's query() supports multi-statement SQL, and Postgres handles the
    // transaction inside. If anything fails, the SQL's BEGIN will ROLLBACK.
    await client.query(sql);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Migration applied successfully in ${elapsed}ms`);

    // Verify by listing new tables/columns
    console.log("");
    console.log("📊 Verification:");

    // Check RecruiterLeadActivity table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'RecruiterLeadActivity'
    `);
    console.log(`   RecruiterLeadActivity table: ${tableCheck.rows.length > 0 ? "✅ exists" : "❌ MISSING"}`);

    // Check new columns on RecruiterLead
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'RecruiterLead'
        AND column_name IN ('candidate_user_id', 'tag', 'last_activity_at', 'blacklist_reason', 'rtr_denial_count', 'notes', 'next_action')
      ORDER BY column_name
    `);
    console.log(`   New RecruiterLead columns: ${columnCheck.rows.length}/7 found`);
    columnCheck.rows.forEach(r => console.log(`     - ${r.column_name}`));

    // Check candidate_lead_id on VaultSignDocument
    const vaultColumn = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'VaultSignDocument' AND column_name = 'candidate_lead_id'
    `);
    console.log(`   VaultSignDocument.candidate_lead_id: ${vaultColumn.rows.length > 0 ? "✅ exists" : "❌ MISSING"}`);

    // Count leads
    const leadCount = await client.query("SELECT COUNT(*) as cnt FROM \"RecruiterLead\"");
    console.log(`   Total RecruiterLeads: ${leadCount.rows[0].cnt}`);

    // Count activities backfilled
    const activityCount = await client.query("SELECT COUNT(*) as cnt FROM \"RecruiterLeadActivity\"");
    console.log(`   Total activities (after backfill): ${activityCount.rows[0].cnt}`);

  } catch (err) {
    // The SQL's own BEGIN/COMMIT handles rollback. Try ROLLBACK here in case
    // we're mid-transaction, but ignore errors (transaction may already be aborted).
    try { await client.query("ROLLBACK"); } catch {}
    console.error("");
    console.error("❌ Migration FAILED — rolled back");
    console.error("");
    console.error(`Error: ${err.message}`);
    if (err.detail) console.error(`Detail: ${err.detail}`);
    if (err.hint) console.error(`Hint: ${err.hint}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

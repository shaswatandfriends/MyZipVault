#!/usr/bin/env node
/**
 * Pre-migration baseline check — counts rows in all tables that will be
 * touched by the BOB Phase 1 migration, so we can verify after the
 * migration that no data was lost.
 */
const { Pool } = require("pg");
const fs = require("fs");

// Read from env var (set SUPABASE_DB_URL in your shell before running).
// Do NOT use process.env.DATABASE_URL — it may point to a local SQLite path.
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
if (!SUPABASE_DB_URL) {
  console.error("ERROR: SUPABASE_DB_URL env var is not set. Export it first, e.g.:\n  export SUPABASE_DB_URL='postgresql://postgres.hzmxgzcdiaofpznvlmrz:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'");
  process.exit(1);
}

async function main() {
  const pool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  console.log("✅ Connected to Supabase");

  try {
    // Get all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log("\n📊 PRE-MIGRATION BASELINE — Row counts for all tables:");
    console.log("─".repeat(60));

    const baseline = {};
    for (const row of tables.rows) {
      const tableName = row.table_name;
      try {
        const count = await client.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
        const cnt = parseInt(count.rows[0].cnt);
        baseline[tableName] = cnt;
        console.log(`  ${tableName.padEnd(40)} ${cnt.toLocaleString()} rows`);
      } catch (err) {
        console.log(`  ${tableName.padEnd(40)} ⚠️  ${err.message.slice(0, 50)}`);
      }
    }

    // Specific checks for tables we're modifying
    console.log("\n📊 Specific checks for tables being modified:");
    console.log("─".repeat(60));

    const recruiterLeadCheck = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE pipeline_stage IS NOT NULL) as with_stage,
        COUNT(*) FILTER (WHERE source IS NOT NULL) as with_source,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM "RecruiterLead"
    `);
    console.log("  RecruiterLead:");
    console.log(`    Total: ${recruiterLeadCheck.rows[0].total}`);
    console.log(`    With pipeline_stage: ${recruiterLeadCheck.rows[0].with_stage}`);
    console.log(`    Earliest created: ${recruiterLeadCheck.rows[0].earliest}`);
    console.log(`    Latest created: ${recruiterLeadCheck.rows[0].latest}`);

    const vaultSignCheck = await client.query(`
      SELECT COUNT(*) as total FROM "VaultSignDocument"
    `);
    console.log(`  VaultSignDocument: ${vaultSignCheck.rows[0].total} rows`);

    // Save baseline to file for post-migration comparison
    const baselineFile = "/home/z/my-project/scripts/bob-migration-baseline.json";
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`\n💾 Baseline saved to: ${baselineFile}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});

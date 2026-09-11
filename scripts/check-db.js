const { Pool } = require("pg");
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
if (!SUPABASE_DB_URL) {
  console.error("ERROR: SUPABASE_DB_URL env var is not set. Export it first, e.g.:\n  export SUPABASE_DB_URL='postgresql://postgres.hzmxgzcdiaofpznvlmrz:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'");
  process.exit(1);
}
const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
(async () => {
  const c = await pool.connect();
  const bundles = await c.query('SELECT id, name, is_active, credit_cost, documents FROM "ComplianceBundle" ORDER BY id');
  console.log('Compliance bundles:', bundles.rows.length);
  bundles.rows.forEach(b => console.log('  #' + b.id + ' | ' + b.name + ' | active=' + b.is_active + ' | cost=' + b.credit_cost + ' | docs=' + b.documents));

  const templates = await c.query('SELECT id, name, profession, specialty, is_active FROM "ChecklistTemplate" ORDER BY id');
  console.log('\nChecklist templates:', templates.rows.length);
  templates.rows.forEach(t => console.log('  #' + t.id + ' | ' + t.name + ' | ' + t.profession + '/' + t.specialty + ' | active=' + t.is_active));

  c.release(); await pool.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

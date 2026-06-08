# 🛡️ Database Safety Rules — READ BEFORE EVERY SESSION

## These rules are MANDATORY. Breaking them can destroy production data.

---

### Rule 1 — Never Run Destructive Commands Without Approval

**BLOCKED commands — NEVER run these without telling the user first and waiting for their explicit "YES, proceed":**

- `prisma db push --accept-data-loss`
- `prisma migrate reset`
- `DROP TABLE`
- `DELETE FROM` (without WHERE clause)
- `prisma migrate dev` (on production)
- Any command that modifies the production Supabase database schema

**If you need any of these, STOP → explain what & why → wait for "YES, proceed".**

---

### Rule 2 — Two Separate Environments

| Environment | Database | Purpose |
|---|---|---|
| **LOCAL/DEV** | myzipvault-dev (Supabase free tier) | Building & testing new features |
| **PRODUCTION** | myzipvault (Supabase) | Live site — never touched directly |

- GLM gets **dev database credentials only**
- Production credentials stay with the **user only**
- When a feature is ready, copy schema changes to production using **safe migration commands only**

---

### Rule 3 — Backup Before Every Session

Before starting any build session that touches the database:

1. Go to Supabase Dashboard → Settings → Database → Backups → Download
2. Or run this SQL in Supabase SQL Editor to check record counts:

```sql
SELECT 'organizations' as table_name, count(*) as records FROM organizations
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'checklist_templates', count(*) FROM checklist_templates
UNION ALL SELECT 'skills', count(*) FROM skills
UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles
UNION ALL SELECT 'credentials', count(*) FROM credentials;
```

If counts drop suddenly, something went wrong.

---

### Rule 4 — Safe Migration Commands Only

| Command | Safe? | When to Use |
|---|---|---|
| `prisma migrate deploy` | ✅ Safe | Production schema updates |
| `prisma db push` (no flag) | ⚠️ Dev only | Quick prototyping in dev |
| `prisma migrate dev` | ⚠️ Dev only | Creating migration files |
| `prisma db push --accept-data-loss` | ❌ DANGEROUS | **NEVER** on production |
| `prisma migrate reset` | ❌ DANGEROUS | **NEVER** on production |

**For production: Always use `prisma migrate deploy`. Create migration files in dev first.**

---

### Rule 5 — End of Session Checklist

Before closing any session, answer these questions:

1. What database commands did you run today on the production database?
2. Did you run any destructive commands?
3. What tables or data changed?
4. Is there anything the user needs to back up?

---

## ⚡ The One Rule That Matters Most

> **Give GLM the development database credentials. Keep production credentials only with yourself. Never share production credentials with GLM.**

This single rule prevents 90% of data loss situations.

---

## Quick Reference: Available npm Scripts

```bash
# SAFE commands
npm run db:generate          # Generate Prisma client (no DB changes)
npm run db:migrate:dev       # Create migration in dev only
npm run db:migrate:deploy    # Apply migrations to production (safe)
npm run db:seed              # Seed the database
npm run db:studio            # Open Prisma Studio (read-only by default)

# REMOVED (dangerous):
# npm run db:push            # Removed — can cause data loss
# npm run db:reset           # Removed — destroys all data
```

## Safety Check Script

Run before any database operation:
```bash
bash scripts/db-safety-check.sh "your command here"
```

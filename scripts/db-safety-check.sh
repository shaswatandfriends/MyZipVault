#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# DB SAFETY CHECK — Run this BEFORE any database schema operation
# ═══════════════════════════════════════════════════════════════════
#
# This script BLOCKS destructive database commands.
# It should be sourced or run before any Prisma operation.
#
# BLOCKED COMMANDS:
#   - prisma db push --accept-data-loss
#   - prisma migrate reset
#   - Any command with --accept-data-loss flag
#
# RULE: Never run these without explicit user approval.
# If you need to run any of these, STOP and ask the user first.
# Wait for their explicit "YES, proceed" before running.
# ═══════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🛡️  DATABASE SAFETY CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check the command being run
CMD="$*"

# Block --accept-data-loss
if echo "$CMD" | grep -q "accept-data-loss"; then
    echo -e "${RED}⛔ BLOCKED: --accept-data-loss flag detected!${NC}"
    echo -e "${RED}This flag can PERMANENTLY DELETE data from your database.${NC}"
    echo ""
    echo "If you REALLY need this (you probably don't):"
    echo "  1. Tell the user what you want to do and why"
    echo "  2. Wait for their explicit 'YES, proceed'"
    echo "  3. Take a backup first"
    echo ""
    exit 1
fi

# Block migrate reset
if echo "$CMD" | grep -q "migrate reset"; then
    echo -e "${RED}⛔ BLOCKED: prisma migrate reset detected!${NC}"
    echo -e "${RED}This command DROPS ALL DATA and resets the database.${NC}"
    echo ""
    echo "If you REALLY need this (you probably don't):"
    echo "  1. Tell the user what you want to do and why"
    echo "  2. Wait for their explicit 'YES, proceed'"
    echo "  3. Take a backup first"
    echo ""
    exit 1
fi

# Warn about db push (not blocked, but warned)
if echo "$CMD" | grep -q "db push"; then
    echo -e "${YELLOW}⚠️  WARNING: prisma db push detected${NC}"
    echo -e "${YELLOW}This modifies the database schema directly.${NC}"
    echo -e "${YELLOW}Make sure you are targeting the DEV database, not production.${NC}"
    echo ""
    echo "Safe alternatives for production:"
    echo "  - prisma migrate deploy (applies pending migrations safely)"
    echo ""
fi

# Check which database we're targeting
if [ -f ".env" ]; then
    DB_URL=$(grep DATABASE_URL .env 2>/dev/null | cut -d'=' -f2-)
    if echo "$DB_URL" | grep -q "supabase"; then
        if echo "$DB_URL" | grep -q "dev\|staging\|test"; then
            echo -e "${GREEN}✅ Target: Development Supabase database${NC}"
        else
            echo -e "${YELLOW}⚠️  Target: Appears to be PRODUCTION Supabase database${NC}"
            echo -e "${YELLOW}Be extra careful! Consider using 'prisma migrate deploy' instead.${NC}"
        fi
    elif echo "$DB_URL" | grep -q "file:"; then
        echo -e "${GREEN}✅ Target: Local SQLite database${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Safety check passed${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

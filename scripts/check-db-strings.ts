// Check DB-driven UI strings: banners, tour config, notifications
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const banners = await prisma.banner.findMany({});
    console.log("=== BANNERS ===");
    for (const b of banners) {
      console.log(`[#${b.id}] ${b.title} | desc: ${b.description ?? "-"} | cta: ${b.ctaText ?? "-"} -> ${b.ctaLink ?? "-"} | pinned: ${b.isPinned}`);
    }
  } catch (e) { console.log("banner table error:", e.message); }

  // Search all string columns for "workspace" / "Switch"
  const tables = ["notification", "announcement", "system_setting", "app_config", "site_setting"];
  for (const t of tables) {
    try {
      // @ts-ignore dynamic model access
      const rows = await prisma[t].findMany({ take: 50 });
      console.log(`=== ${t} (${rows.length}) ===`);
      const s = JSON.stringify(rows);
      if (/workspace|switch/i.test(s)) {
        console.log("MATCH FOUND:", s.slice(0, 3000));
      } else {
        console.log(s.slice(0, 500));
      }
    } catch (e) { console.log(`${t}: ${e.message.split("\n")[0]}`); }
  }
}

main().finally(() => prisma.$disconnect());

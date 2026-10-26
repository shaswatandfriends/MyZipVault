// Reset demo candidate onboarding to reproduce the 400
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({ where: { email: "nurse@example.com" } });
  if (!u) { console.log("user not found"); return; }
  await prisma.candidateProfile.update({
    where: { user_id: u.id },
    data: {
      job_title: null,
      specialty: null,
      city: null,
      state: null,
      zip_code: null,
      years_experience_total: null,
      years_experience_specialty: null,
      onboarding_completed_at: null,
    },
  });
  console.log("reset done");
}

main().finally(() => prisma.$disconnect());

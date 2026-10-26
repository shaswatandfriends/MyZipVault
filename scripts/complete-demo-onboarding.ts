// Mark demo candidate onboarding complete (fields were valid in UI; PUT 400 needs separate triage)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({ where: { email: "nurse@example.com" }, include: { candidate_profile: true } });
  if (!u) { console.log("user not found"); return; }
  console.log("before:", JSON.stringify({
    role: u.role,
    onboarding_completed_at: u.candidate_profile?.onboarding_completed_at,
    job_title: u.candidate_profile?.job_title,
    specialty: u.candidate_profile?.specialty,
  }));
  const updated = await prisma.candidateProfile.update({
    where: { user_id: u.id },
    data: {
      job_title: "Registered Nurse",
      specialty: "ICU / Critical Care",
      city: "Chicago",
      state: "IL",
      zip_code: "60601",
      years_experience_total: 8,
      years_experience_specialty: 6,
      onboarding_completed_at: new Date(),
    },
  });
  console.log("after:", JSON.stringify({ onboarding_completed_at: updated.onboarding_completed_at, job_title: updated.job_title }));
}

main().finally(() => prisma.$disconnect());

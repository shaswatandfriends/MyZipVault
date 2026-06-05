import Link from "next/link";
import { ShieldCheck, Users, Lock } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              ZV
            </div>
            <span className="font-semibold text-lg">MyZipVault</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About MyZipVault</h1>

        <div className="mt-8 space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Our Mission</h2>
            <p className="mt-3">
              MyZipVault exists to give healthcare professionals full control over their career data. We believe that the nurses, therapists, and allied health professionals who keep our healthcare system running deserve better than scattered spreadsheets, endless email threads, and repetitive paperwork. Every time a travel nurse applies for a new assignment, they face the same exhausting process: refilling identical skills checklists, digging through emails for credential photos, and chasing down references. MyZipVault eliminates that cycle by putting everything in one secure, candidate-controlled vault.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">The Problem We Solve</h2>
            <p className="mt-3">
              The healthcare staffing industry relies on a compliance process that has not evolved in decades. Nurses fill out the same Med-Surg skills checklist for every agency. Social Security numbers and immunization records sit unencrypted in recruiter inboxes. References are collected via word-of-mouth phone calls with no verification. Meanwhile, staffing agencies spend thousands of hours and dollars chasing the same documents over and over. MyZipVault automates and secures this entire process — for both sides.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Our Principles</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center rounded-xl border bg-card p-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="size-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">Candidate Control</h3>
                <p className="mt-2 text-sm">
                  Your data, your rules. No recruiter can browse your profile. You decide what to share, with whom, and for how long.
                </p>
              </div>
              <div className="flex flex-col items-center text-center rounded-xl border bg-card p-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">Security First</h3>
                <p className="mt-2 text-sm">
                  HIPAA-aligned encryption, expiring access links, and zero data hoarding. When you delete your account, everything is gone.
                </p>
              </div>
              <div className="flex flex-col items-center text-center rounded-xl border bg-card p-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="size-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">Mutual Benefit</h3>
                <p className="mt-2 text-sm">
                  Nurses save hours of repetitive work. Agencies get completed compliance packets faster. Everyone wins.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Our Story</h2>
            <p className="mt-3">
              MyZipVault was born from firsthand experience with the broken healthcare compliance process. We watched talented nurses spend more time on paperwork than patient care. We saw agencies lose placements because compliance packets took too long. We decided there had to be a better way — one that respects the professional, protects their data, and streamlines the process for everyone involved. Today, MyZipVault is building that future.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Contact</h2>
            <p className="mt-3">
              We are always happy to hear from healthcare professionals, staffing agencies, and anyone interested in making healthcare compliance better. Reach us at:
            </p>
            <ul className="mt-2 list-none space-y-1">
              <li><strong>Email:</strong> support@myzipvault.com</li>
              <li><strong>Platform:</strong> myzipvault.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link href="/" className="text-primary hover:underline">
            &larr; Back to MyZipVault
          </Link>
        </div>
      </main>
    </div>
  );
}

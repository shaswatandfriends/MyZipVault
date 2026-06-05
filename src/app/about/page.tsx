import Link from "next/link";
import { ShieldCheck, Users, Lock, ArrowLeft, Heart, Target } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4]">
      {/* Header */}
      <header className="border-b border-[#E5E7EB] bg-[#F8F7F4]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-[#166534] text-white font-bold text-sm"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              ZV
            </div>
            <span
              className="font-semibold text-lg text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              MyZipVault
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1
          className="text-[36px] font-bold tracking-tight text-[#111827]"
          style={{ fontFamily: "'Clash Display', sans-serif" }}
        >
          About MyZipVault
        </h1>

        <div className="mt-10 space-y-10">
          {/* Our Mission */}
          <section>
            <h2
              className="text-[24px] font-bold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Our Mission
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">
              MyZipVault exists to give healthcare professionals full control over their career data. We believe that the nurses, therapists, and allied health professionals who keep our healthcare system running deserve better than scattered spreadsheets, endless email threads, and repetitive paperwork. Every time a travel nurse applies for a new assignment, they face the same exhausting process: refilling identical skills checklists, digging through emails for credential photos, and chasing down references. MyZipVault eliminates that cycle by putting everything in one secure, candidate-controlled vault.
            </p>
          </section>

          {/* The Problem We Solve */}
          <section>
            <h2
              className="text-[24px] font-bold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              The Problem We Solve
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">
              The healthcare staffing industry relies on a compliance process that has not evolved in decades. Nurses fill out the same Med-Surg skills checklist for every agency. Social Security numbers and immunization records sit unencrypted in recruiter inboxes. References are collected via word-of-mouth phone calls with no verification. Meanwhile, staffing agencies spend thousands of hours and dollars chasing the same documents over and over. MyZipVault automates and secures this entire process — for both sides.
            </p>
          </section>

          {/* Our Principles */}
          <section>
            <h2
              className="text-[24px] font-bold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Our Principles
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#DCFCE7]">
                  <Lock className="size-5 text-[#166534]" />
                </div>
                <h3
                  className="mt-4 font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Candidate Control
                </h3>
                <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                  Your data, your rules. No recruiter can browse your profile. You decide what to share, with whom, and for how long.
                </p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#DCFCE7]">
                  <ShieldCheck className="size-5 text-[#166534]" />
                </div>
                <h3
                  className="mt-4 font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Security First
                </h3>
                <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                  HIPAA-aligned encryption, expiring access links, and zero data hoarding. When you delete your account, everything is gone.
                </p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#DCFCE7]">
                  <Users className="size-5 text-[#166534]" />
                </div>
                <h3
                  className="mt-4 font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Mutual Benefit
                </h3>
                <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                  Nurses save hours of repetitive work. Agencies get completed compliance packets faster. Everyone wins.
                </p>
              </div>
            </div>
          </section>

          {/* Our Story */}
          <section>
            <h2
              className="text-[24px] font-bold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Our Story
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">
              MyZipVault was born from firsthand experience with the broken healthcare compliance process. We watched talented nurses spend more time on paperwork than patient care. We saw agencies lose placements because compliance packets took too long. We decided there had to be a better way — one that respects the professional, protects their data, and streamlines the process for everyone involved. Today, MyZipVault is building that future.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2
              className="text-[24px] font-bold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Contact
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#6B7280]">
              We are always happy to hear from healthcare professionals, staffing agencies, and anyone interested in making healthcare compliance better. Reach us at:
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-[16px] text-[#6B7280]">
                <strong className="text-[#111827]">Email:</strong> support@myzipvault.com
              </p>
              <p className="text-[16px] text-[#6B7280]">
                <strong className="text-[#111827]">Platform:</strong> myzipvault.com
              </p>
            </div>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-16 border-t border-[#E5E7EB] pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[#0D9488] text-sm font-medium hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to MyZipVault
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="border-t border-[#E5E7EB] bg-white py-6 px-6">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#9CA3AF]">
              &copy; 2025 MyZipVault. All rights reserved.
            </p>
            <nav className="flex items-center gap-4 text-sm text-[#6B7280]">
              <Link href="/privacy" className="hover:text-[#111827] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[#111827] transition-colors">
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

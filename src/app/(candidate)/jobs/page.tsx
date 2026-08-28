import { redirect } from "next/navigation";

/**
 * The candidate /jobs listing page has been merged with the public
 * /browse-jobs page. Logged-in candidates can now browse jobs AND apply
 * directly from /browse-jobs — they see "Applied" badges and "Apply now"
 * buttons there.
 *
 * This file just redirects /jobs → /browse-jobs so existing candidate
 * sidebar links / bookmarks still work.
 *
 * The candidate-specific job detail page at /jobs/[id] (showing the
 * candidate's own application status with "Withdraw Application" button)
 * is preserved and unchanged.
 */
export default function CandidateJobsRedirect() {
  redirect("/browse-jobs");
}

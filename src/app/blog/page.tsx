"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  blogPosts, blogCategories, formatBlogDate,
  type BlogPost,
} from "@/lib/blog-content";
import {
  ArrowRight, ChevronRight, Search, Calendar, Clock, FileText,
} from "@/lib/icons";

const CATEGORY_COLORS: Record<BlogPost["category"], string> = {
  Career: "bg-blue-50 text-blue-700 border-blue-200",
  Compliance: "bg-amber-50 text-amber-700 border-amber-200",
  Recruiting: "bg-violet-50 text-violet-700 border-violet-200",
  Marketplace: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Tech: "bg-slate-50 text-slate-700 border-slate-200",
};

function ReadingTime({ minutes }: { minutes: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-text-muted">
      <Clock className="size-3" />
      {minutes} min read
    </span>
  );
}

export default function BlogListPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogPost["category"] | "all">("all");

  const filtered = useMemo(() => {
    return blogPosts
      .filter((p) => activeCategory === "all" || p.category === activeCategory)
      .filter((p) =>
        search.trim() === "" ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }, [search, activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">M</div>
            <span className="font-semibold text-lg text-foreground">MyZipVault</span>
            <span className="ml-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">Blog</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark">
              Sign up free <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Resources</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Insights for healthcare professionals &amp; recruiters.
          </h1>
          <p className="mt-3 text-base text-text-secondary max-w-2xl">
            Practical guides on compliance, recruiting, marketplace flow, and platform features.
            Written by the MyZipVault team. Updated regularly.
          </p>
        </div>
      </section>

      {/* ─── Main ─── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        {/* Search + category filter */}
        <div className="rounded-2xl border border-border bg-white p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search articles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={activeCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory("all")}
              >
                All
              </Button>
              {blogCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            {filtered.length} article{filtered.length === 1 ? "" : "s"}
            {search && ` matching "${search}"`}
            {activeCategory !== "all" && ` in ${activeCategory}`}
          </p>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="size-12 text-text-muted mx-auto mb-3" />
              <p className="font-medium text-foreground">No articles found</p>
              <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
                Try a different search term or category filter.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Featured post (only when no filter applied) */}
            {featured && activeCategory === "all" && search === "" && (
              <Link href={`/blog/${featured.slug}`} className="block mb-8">
                <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2">
                      {/* Cover */}
                      <div
                        className="h-48 md:h-auto flex items-center justify-center text-7xl"
                        style={{ background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)" }}
                      >
                        <span>{featured.cover_emoji}</span>
                      </div>
                      {/* Content */}
                      <div className="p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={CATEGORY_COLORS[featured.category]}>
                            {featured.category}
                          </Badge>
                          <span className="text-xs text-text-muted">Featured</span>
                        </div>
                        <h2 className="text-xl font-bold text-foreground leading-snug">
                          {featured.title}
                        </h2>
                        <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-3">
                          {featured.excerpt}
                        </p>
                        <div className="mt-4 flex items-center gap-3 text-xs text-text-muted">
                          <span>{featured.author}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatBlogDate(featured.published_at)}
                          </span>
                          <span>·</span>
                          <ReadingTime minutes={featured.reading_time_minutes} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Rest of posts */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {(featured && activeCategory === "all" && search === "" ? rest : filtered).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
                  <Card className="h-full hover:border-primary/40 hover:shadow-sm transition-all">
                    <CardContent className="p-0">
                      {/* Cover */}
                      <div
                        className="h-32 flex items-center justify-center text-5xl"
                        style={{ background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)" }}
                      >
                        <span>{post.cover_emoji}</span>
                      </div>
                      {/* Body */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={CATEGORY_COLORS[post.category]}>
                            {post.category}
                          </Badge>
                        </div>
                        <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatBlogDate(post.published_at)}
                          </span>
                          <span>·</span>
                          <ReadingTime minutes={post.reading_time_minutes} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary-light/30 to-white p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Ready to get started?
          </h2>
          <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
            Build your vault, post jobs, or start recruiting — all on one secure platform.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark">
              Sign up as a candidate <ArrowRight className="size-4" />
            </Link>
            <Link href="/agency-signup" className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface">
              Become a recruiter
            </Link>
            <Link href="/employer-signup" className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface">
              Post jobs as an employer
            </Link>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-auto">
        <div className="border-t border-border bg-white py-6 px-6">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">&copy; 2026 MyZipVault. All rights reserved.</p>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
              <Link href="/browse-jobs" className="hover:text-foreground transition-colors">Jobs</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

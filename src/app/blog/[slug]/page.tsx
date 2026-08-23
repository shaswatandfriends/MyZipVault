"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getPostBySlug, getRelatedPosts, formatBlogDate, blogCategories,
  type BlogBlock, type BlogPost,
} from "@/lib/blog-content";
import {
  ArrowLeft, ArrowRight, Calendar, Clock, ChevronRight,
  Info, AlertTriangle, CheckCircle2, Quote, FileText,
} from "@/lib/icons";

const CATEGORY_COLORS: Record<BlogPost["category"], string> = {
  Career: "bg-blue-50 text-blue-700 border-blue-200",
  Compliance: "bg-amber-50 text-amber-700 border-amber-200",
  Recruiting: "bg-violet-50 text-violet-700 border-violet-200",
  Marketplace: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Tech: "bg-slate-50 text-slate-700 border-slate-200",
};

function CalloutBlock({ block }: { block: Extract<BlogBlock, { type: "callout" }> }) {
  const config = {
    info: { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", iconColor: "text-blue-600" },
    warning: { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", iconColor: "text-amber-600" },
    success: { icon: CheckCircle2, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", iconColor: "text-emerald-600" },
  }[block.variant];
  const Icon = config.icon;
  return (
    <div className={`my-6 rounded-lg ${config.bg} ${config.border} border p-4 flex gap-3`}>
      <Icon className={`size-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className={`text-sm font-semibold ${config.text} mb-1`}>{block.title}</p>
        <p className={`text-sm ${config.text} leading-relaxed`}>{block.text}</p>
      </div>
    </div>
  );
}

function BlockRenderer({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-[16px] text-text-secondary leading-relaxed mb-4">{block.text}</p>;
    case "h2":
      return <h2 className="text-[24px] font-bold text-foreground mt-8 mb-3" style={{ fontFamily: "'Satoshi', sans-serif" }}>{block.text}</h2>;
    case "h3":
      return <h3 className="text-[19px] font-semibold text-foreground mt-6 mb-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>{block.text}</h3>;
    case "ul":
      return (
        <ul className="mb-4 space-y-2 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[16px] text-text-secondary leading-relaxed">
              <span className="text-primary mt-2 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mb-4 space-y-2 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[16px] text-text-secondary leading-relaxed">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary-light text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote className="my-6 border-l-4 border-primary pl-4 py-1">
          <Quote className="size-4 text-primary/40 mb-1" />
          <p className="text-[16px] text-text-secondary leading-relaxed italic">{block.text}</p>
          {block.attribution && <p className="text-xs text-text-muted mt-2">— {block.attribution}</p>}
        </blockquote>
      );
    case "callout":
      return <CalloutBlock block={block} />;
    default:
      return null;
  }
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const post = getPostBySlug(slug);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">M</div>
              <span className="font-semibold text-lg text-foreground">MyZipVault</span>
            </Link>
            <Link href="/blog" className="text-sm font-medium text-text-secondary hover:text-foreground">← Blog</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-6">
            <ArrowLeft className="size-4" /> Back to all articles
          </Link>
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="size-10 text-text-muted mx-auto mb-3" />
              <p className="font-semibold text-foreground">Article not found</p>
              <p className="text-sm text-text-muted mt-1">This article may have been removed or the URL is incorrect.</p>
              <Link href="/blog" className="inline-block mt-4">
                <Button variant="outline">Browse all articles</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const related = getRelatedPosts(slug, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ─── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">M</div>
            <span className="font-semibold text-lg text-foreground">MyZipVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-sm font-medium text-text-secondary hover:text-foreground">Blog</Link>
            <Link href="/signup" className="text-sm font-semibold text-primary hover:underline">Sign up free →</Link>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <ChevronRight className="size-3" />
          <span className="text-text-secondary truncate">{post.title}</span>
        </nav>

        {/* ─── Article header ─── */}
        <article>
          <Badge variant="outline" className={CATEGORY_COLORS[post.category]}>
            {post.category}
          </Badge>
          <h1
            className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            {post.title}
          </h1>
          <p className="mt-4 text-base text-text-secondary leading-relaxed">
            {post.excerpt}
          </p>

          {/* Meta row */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-text-muted pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div
                className="flex size-8 items-center justify-center rounded-full text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)" }}
              >
                {post.author.charAt(0)}
              </div>
              <div>
                <p className="text-foreground font-medium">{post.author}</p>
                <p className="text-text-muted">{post.author_role}</p>
              </div>
            </div>
            <span className="text-text-muted">·</span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formatBlogDate(post.published_at)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {post.reading_time_minutes} min read
            </span>
          </div>

          {/* Cover */}
          <div
            className="my-8 rounded-2xl h-48 md:h-64 flex items-center justify-center text-8xl"
            style={{ background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)" }}
          >
            <span>{post.cover_emoji}</span>
          </div>

          {/* Body */}
          <div className="prose prose-slate max-w-none">
            {post.body.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}
          </div>

          {/* Author CTA */}
          <div className="mt-10 pt-8 border-t border-border">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  Ready to get started?
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Join MyZipVault — free for candidates, 70/30 split for recruiters, transparent commission for employers.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/signup">
                    <Button size="sm">Sign up as a candidate <ArrowRight className="size-3.5" /></Button>
                  </Link>
                  <Link href="/agency-signup">
                    <Button variant="outline" size="sm">Become a recruiter</Button>
                  </Link>
                  <Link href="/employer-signup">
                    <Button variant="outline" size="sm">Post jobs as employer</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </article>

        {/* ─── Related articles ─── */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: "'Satoshi', sans-serif" }}>
              Related articles
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`}>
                  <Card className="h-full hover:border-primary/40 hover:shadow-sm transition-all">
                    <CardContent className="p-0">
                      <div
                        className="h-24 flex items-center justify-center text-4xl"
                        style={{ background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)" }}
                      >
                        <span>{r.cover_emoji}</span>
                      </div>
                      <div className="p-3">
                        <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[r.category]}`}>
                          {r.category}
                        </Badge>
                        <h3 className="mt-2 text-sm font-semibold text-foreground leading-snug line-clamp-2">
                          {r.title}
                        </h3>
                        <p className="mt-1 text-[11px] text-text-muted">
                          {r.reading_time_minutes} min read
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-auto">
        <div className="border-t border-border bg-white py-6 px-6">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">&copy; 2026 MyZipVault. All rights reserved.</p>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

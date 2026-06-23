import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Article } from "@shared/schema";
import Layout from "@/components/Layout";
import ArticleCard from "@/components/ArticleCard";
import { SECTIONS, sectionName, formatDate } from "@/lib/sections";

function HeroSkeleton() {
  return <div className="aspect-[21/9] w-full animate-pulse rounded-2xl bg-card" />;
}

export default function Home() {
  const { data: featured } = useQuery<Article | null>({ queryKey: ["/api/articles/featured"] });
  const { data: latest, isLoading } = useQuery<Article[]>({ queryKey: ["/api/articles", { limit: "9" }] as const, queryFn: async () => {
    const res = await fetch("/api/articles?limit=9", { credentials: "include" });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  } });

  return (
    <Layout>
      <section className="container-page pt-8">
        {featured ? (
          <Link
            href={`/article/${featured.slug}`}
            data-testid="card-featured"
            className="group relative block overflow-hidden rounded-2xl border border-border"
          >
            <div className="aspect-[16/10] sm:aspect-[21/9]">
              <img src={featured.imageUrl} alt={featured.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
                {sectionName(featured.section)}
              </span>
              <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight sm:text-4xl">{featured.title}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base line-clamp-2">{featured.excerpt}</p>
              <p className="mt-4 text-xs text-white/60">{featured.author} · {formatDate(featured.publishedAt)}</p>
            </div>
          </Link>
        ) : (
          <HeroSkeleton />
        )}
      </section>

      <section className="container-page mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Latest Stories</h2>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl bg-card" />
              ))
            : latest?.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      </section>

      <section className="container-page mt-16 space-y-14">
        {SECTIONS.map((s) => (
          <SectionRow key={s.slug} slug={s.slug} name={s.name} />
        ))}
      </section>
    </Layout>
  );
}

function SectionRow({ slug, name }: { slug: string; name: string }) {
  const { data } = useQuery<Article[]>({
    queryKey: ["/api/articles", slug] as const,
    queryFn: async () => {
      const res = await fetch(`/api/articles?section=${slug}&limit=3`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-xl font-bold">{name}</h2>
        <Link
          href={`/section/${slug}`}
          data-testid={`link-section-more-${slug}`}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}

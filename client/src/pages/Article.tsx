import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { Article as ArticleType } from "@shared/schema";
import Layout from "@/components/Layout";
import ArticleCard from "@/components/ArticleCard";
import NotFound from "@/pages/not-found";
import { sectionName, formatDate } from "@/lib/sections";

export default function Article() {
  const [, params] = useRoute("/article/:slug");
  const slug = params?.slug ?? "";

  const { data: article, isLoading, isError } = useQuery<ArticleType>({
    queryKey: ["/api/articles", slug] as const,
    queryFn: async () => {
      const res = await fetch(`/api/articles/${slug}`, { credentials: "include" });
      if (res.status === 404) throw new Error("not-found");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: related } = useQuery<ArticleType[]>({
    queryKey: ["/api/articles", "related", article?.section] as const,
    queryFn: async () => {
      const res = await fetch(`/api/articles?section=${article!.section}&limit=4`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!article,
  });

  if (isError) return <NotFound />;

  if (isLoading || !article) {
    return (
      <Layout>
        <div className="container-page py-10">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-card" />
            <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-card" />
            <div className="h-4 w-full animate-pulse rounded bg-card" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-card" />
          </div>
        </div>
      </Layout>
    );
  }

  const relatedFiltered = (related ?? []).filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <Layout>
      <article className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/section/${article.section}`}
            data-testid="link-back-section"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {sectionName(article.section)}
          </Link>

          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl" data-testid="text-article-title">
            {article.title}
          </h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{article.author}</span>
            <span>·</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>

          <img
            src={article.imageUrl}
            alt={article.title}
            className="mt-6 aspect-[16/9] w-full rounded-xl object-cover"
            data-testid="img-article-hero"
          />

          <p className="mt-8 text-lg font-medium leading-relaxed text-muted-foreground">{article.excerpt}</p>

          <div className="mt-6 space-y-5 text-base leading-relaxed" data-testid="text-article-content">
            {article.content.split("\n").filter((p) => p.trim()).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </article>

      {relatedFiltered.length > 0 && (
        <section className="container-page mt-6 border-t border-border pt-10">
          <h2 className="mb-6 text-xl font-bold">More in {sectionName(article.section)}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedFiltered.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

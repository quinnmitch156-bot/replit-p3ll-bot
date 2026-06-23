import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import type { Article } from "@shared/schema";
import Layout from "@/components/Layout";
import ArticleCard from "@/components/ArticleCard";
import NotFound from "@/pages/not-found";
import { SECTIONS, sectionName, sectionTagline } from "@/lib/sections";

export default function Section() {
  const [, params] = useRoute("/section/:slug");
  const slug = params?.slug ?? "";
  const valid = SECTIONS.some((s) => s.slug === slug);

  const { data, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", slug] as const,
    queryFn: async () => {
      const res = await fetch(`/api/articles?section=${slug}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: valid,
  });

  if (!valid) return <NotFound />;

  return (
    <Layout>
      <div className="border-b border-border bg-card/30">
        <div className="container-page py-10">
          <h1 className="text-3xl font-bold sm:text-4xl" data-testid="text-section-title">{sectionName(slug)}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{sectionTagline(slug)}</p>
        </div>
      </div>

      <div className="container-page py-10">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-muted-foreground" data-testid="text-no-articles">
            No articles in this section yet. Check back soon.
          </p>
        )}
      </div>
    </Layout>
  );
}

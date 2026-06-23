import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { SearchX } from "lucide-react";
import type { Article } from "@shared/schema";
import Layout from "@/components/Layout";
import ArticleCard from "@/components/ArticleCard";

export default function SearchResults() {
  const search = useSearch();
  const q = new URLSearchParams(search).get("q") ?? "";

  const { data, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "search", q] as const,
    queryFn: async () => {
      const res = await fetch(`/api/articles?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: q.length > 0,
  });

  return (
    <Layout>
      <div className="container-page py-10">
        <h1 className="text-2xl font-bold sm:text-3xl" data-testid="text-search-title">
          Search results
        </h1>
        {q && (
          <p className="mt-2 text-muted-foreground">
            Showing results for <span className="font-medium text-foreground">"{q}"</span>
          </p>
        )}

        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="text-no-results">
              <SearchX className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                {q ? `No articles found for "${q}".` : "Type something to search articles."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

import { Link } from "wouter";
import type { Article } from "@shared/schema";
import { sectionName, formatDate } from "@/lib/sections";

interface Props {
  article: Article;
  variant?: "default" | "compact";
}

export default function ArticleCard({ article, variant = "default" }: Props) {
  if (variant === "compact") {
    return (
      <Link
        href={`/article/${article.slug}`}
        data-testid={`card-article-${article.slug}`}
        className="group flex gap-4 rounded-lg border border-border bg-card p-3 card-hover"
      >
        <img
          src={article.imageUrl}
          alt={article.title}
          loading="lazy"
          className="h-20 w-28 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            {sectionName(article.section)}
          </span>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {article.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(article.publishedAt)}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/article/${article.slug}`}
      data-testid={`card-article-${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card card-hover"
    >
      <div className="aspect-[16/9] overflow-hidden">
        <img
          src={article.imageUrl}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          {sectionName(article.section)}
        </span>
        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug group-hover:text-primary">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{article.excerpt}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{article.author}</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

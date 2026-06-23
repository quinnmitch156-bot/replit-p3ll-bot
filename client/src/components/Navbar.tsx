import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Newspaper } from "lucide-react";
import { SECTIONS } from "@/lib/sections";

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
    setOpen(false);
  }

  const isActive = (slug: string) => location === `/section/${slug}`;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" data-testid="link-home" className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Newspaper className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">Vanguard</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {SECTIONS.map((s) => (
              <Link
                key={s.slug}
                href={`/section/${s.slug}`}
                data-testid={`link-nav-${s.slug}`}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(s.slug) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} className="hidden sm:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="input-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="h-9 w-40 lg:w-56 rounded-md border border-border bg-secondary/60 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>

            <button
              data-testid="button-mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container-page py-4 space-y-3">
            <form onSubmit={submitSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-search-mobile"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles..."
                className="h-10 w-full rounded-md border border-border bg-secondary/60 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </form>
            <nav className="grid gap-1">
              {SECTIONS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/section/${s.slug}`}
                  data-testid={`link-mobile-${s.slug}`}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    isActive(s.slug) ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {s.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

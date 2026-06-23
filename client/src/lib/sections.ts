export interface SectionDef {
  slug: string;
  name: string;
  tagline: string;
}

export const SECTIONS: SectionDef[] = [
  { slug: "gaming-news", name: "Gaming News", tagline: "The latest releases, updates, and announcements from across the gaming world." },
  { slug: "esports", name: "Esports", tagline: "Tournament results, roster moves, and the stories shaping competitive play." },
  { slug: "technology", name: "Technology", tagline: "Hardware, software, and the tech powering the games we love." },
  { slug: "community-updates", name: "Community Updates", tagline: "News, events, and highlights straight from our community." },
];

export function sectionName(slug: string): string {
  return SECTIONS.find((s) => s.slug === slug)?.name ?? slug;
}

export function sectionTagline(slug: string): string {
  return SECTIONS.find((s) => s.slug === slug)?.tagline ?? "";
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

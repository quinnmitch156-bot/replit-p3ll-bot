import { db } from "./db";
import { articles, type InsertArticle } from "@shared/schema";
import { sql } from "drizzle-orm";

const SEED: InsertArticle[] = [
  {
    title: "Next-Gen Open World RPG Shatters Pre-Order Records",
    slug: "next-gen-open-world-rpg-shatters-records",
    section: "gaming-news",
    excerpt: "The most anticipated RPG of the year has already broken every pre-order milestone, signalling a massive launch ahead.",
    content: "The gaming world is buzzing after the latest open-world RPG smashed pre-order records across every major platform within 48 hours of going live.\n\nIndustry analysts estimate the title has already outsold its predecessor's entire launch week, driven by a sprawling hand-crafted map, a branching narrative, and a deep crafting system that lets players reshape the world.\n\nThe studio confirmed a day-one patch focused on performance, promising a locked 60 FPS on current-gen consoles and uncapped frame rates on PC. A free post-launch expansion was also teased for early next year.\n\n\"We wanted to build a world that reacts to you,\" the creative director said during the reveal stream. \"Every choice leaves a mark.\"",
    author: "Marcus Reed",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    featured: true,
  },
  {
    title: "Indie Studio's Cozy Farming Sim Becomes Surprise Hit",
    slug: "cozy-farming-sim-surprise-hit",
    section: "gaming-news",
    excerpt: "A two-person team has captured millions of players with a charming, slow-paced farming adventure.",
    content: "Sometimes the biggest stories come from the smallest teams. A cozy farming sim built by just two developers has rocketed up the sales charts, proving once again that heart beats budget.\n\nPlayers praise the game's relaxing loop, hand-drawn art, and a soundtrack that fans are already calling one of the year's best. The studio says a free content update with new crops, festivals, and townsfolk is on the way.",
    author: "Elena Cruz",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Long-Awaited Sequel Finally Gets Release Date",
    slug: "long-awaited-sequel-release-date",
    section: "gaming-news",
    excerpt: "After years of silence, the beloved franchise returns with a confirmed launch window and a stunning new trailer.",
    content: "Fans have waited the better part of a decade, and the wait is nearly over. The studio dropped a cinematic trailer alongside a firm release date, ending years of speculation.\n\nThe sequel promises a reimagined combat system, a larger world, and full cross-platform progression. Pre-load is expected to go live two weeks before launch.",
    author: "Marcus Reed",
    imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Underdog Roster Stuns Favourites at World Championship",
    slug: "underdog-roster-stuns-world-championship",
    section: "esports",
    excerpt: "A rookie-heavy lineup pulled off one of the biggest upsets in competitive history on the sport's grandest stage.",
    content: "In a best-of-five that will be replayed for years, an underdog roster dismantled the tournament favourites to punch their ticket to the grand final.\n\nThe series swung on a single, perfectly coordinated team fight in game four, after which the momentum never returned to the favourites. Casters called it \"the cleanest reset we've ever seen at this level.\"\n\nThe Cinderella run has already reignited debates about how much raw mechanical talent can overcome veteran experience under pressure.",
    author: "Priya Nair",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Prize Pool Hits All-Time High for Summer Major",
    slug: "prize-pool-all-time-high-summer-major",
    section: "esports",
    excerpt: "Community crowdfunding has pushed this year's championship prize pool past every previous record.",
    content: "The summer major's prize pool has officially crossed into record territory, fuelled by an in-game battle pass and direct community contributions.\n\nOrganisers say a portion of the proceeds will go toward grassroots tournaments and player welfare programs, a move widely praised across the scene.",
    author: "Priya Nair",
    imageUrl: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Veteran Pro Announces Retirement, Moves to Coaching",
    slug: "veteran-pro-retirement-coaching",
    section: "esports",
    excerpt: "One of the scene's most decorated players is hanging up the mouse to lead the next generation.",
    content: "After a glittering career spanning multiple championship titles, one of esports' most respected veterans announced their retirement from active competition.\n\nThey will transition into a head coaching role with their longtime organisation, citing a desire to \"give back everything the game gave me.\" Tributes poured in from teammates and rivals alike.",
    author: "Daniel Osei",
    imageUrl: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "New GPU Lineup Promises Massive Leap in Ray Tracing",
    slug: "new-gpu-lineup-ray-tracing-leap",
    section: "technology",
    excerpt: "The latest graphics cards deliver generational performance gains and smarter AI-driven upscaling.",
    content: "The newest generation of graphics hardware has arrived, and early benchmarks suggest a substantial leap in ray-traced performance over the previous lineup.\n\nThe headline feature is a refined AI upscaler that reconstructs detail with fewer artifacts, allowing high frame rates even at 4K with full ray tracing enabled. Power efficiency has also improved, a welcome change for compact builds.",
    author: "Aisha Khan",
    imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Handheld Gaming PCs Are Reshaping How We Play",
    slug: "handheld-gaming-pcs-reshaping-play",
    section: "technology",
    excerpt: "A new wave of powerful handhelds is blurring the line between console, PC, and portable gaming.",
    content: "Handheld gaming PCs have surged in popularity, offering near-desktop performance in a device you can take anywhere.\n\nImproved battery life, brighter OLED displays, and a maturing software ecosystem have made these devices a genuine alternative to traditional setups. Manufacturers are now racing to optimise games specifically for the form factor.",
    author: "Aisha Khan",
    imageUrl: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "AI Tools Are Changing How Games Are Built",
    slug: "ai-tools-changing-game-development",
    section: "technology",
    excerpt: "Developers are using new AI-assisted pipelines to prototype faster and free up time for creativity.",
    content: "Studios large and small are integrating AI-assisted tools into their pipelines, using them to prototype levels, generate placeholder assets, and automate repetitive tasks.\n\nDevelopers stress that these tools augment rather than replace human creativity, handling the busywork so artists and designers can focus on what makes a game memorable.",
    author: "Tom Bennett",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Community Spotlight: Charity Marathon Raises Six Figures",
    slug: "community-charity-marathon-six-figures",
    section: "community-updates",
    excerpt: "A weekend-long charity stream brought players together and raised a staggering amount for a good cause.",
    content: "Our community came together for an unforgettable weekend, with a 48-hour charity marathon raising well into six figures for children's hospitals.\n\nHundreds of viewers tuned in for speedruns, community challenges, and surprise developer cameos. Organisers thanked everyone who donated, played, or simply spread the word.",
    author: "Community Team",
    imageUrl: "https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "Monthly Creator Awards: Your Winners Revealed",
    slug: "monthly-creator-awards-winners",
    section: "community-updates",
    excerpt: "The community voted, and the results are in for this month's standout creators and content.",
    content: "Thousands of votes were cast, and we're thrilled to announce this month's Creator Award winners across art, video, and guides.\n\nFrom breathtaking fan art to in-depth strategy breakdowns, the talent in this community continues to amaze us. Congratulations to every nominee.",
    author: "Community Team",
    imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
  {
    title: "New Community Guidelines and Forum Refresh Go Live",
    slug: "community-guidelines-forum-refresh",
    section: "community-updates",
    excerpt: "We've refreshed our community spaces with clearer rules and a cleaner, faster forum experience.",
    content: "Based on your feedback, we've rolled out updated community guidelines and a complete forum refresh designed to make discussions friendlier and easier to navigate.\n\nNew features include improved search, threaded replies, and a dedicated space for feedback. We can't wait to see what you build here.",
    author: "Community Team",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
];

export async function seedArticlesIfEmpty(): Promise<void> {
  try {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(articles);
    if (Number(row.count) > 0) return;
    await db.insert(articles).values(SEED);
    console.log(`[seed] Inserted ${SEED.length} sample articles.`);
  } catch (e) {
    console.error("[seed] Failed to seed articles:", e);
  }
}

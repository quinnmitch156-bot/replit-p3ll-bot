import { Link } from "wouter";
import { Newspaper } from "lucide-react";
import { SECTIONS } from "@/lib/sections";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/40">
      <div className="container-page py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Newspaper className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold">Vanguard</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your front line for gaming, esports, technology, and community news.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Sections</h4>
            <ul className="mt-3 space-y-2">
              {SECTIONS.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/section/${s.slug}`}
                    data-testid={`link-footer-${s.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>About</li>
              <li>Contact</li>
              <li>Advertise</li>
              <li>Careers</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Vanguard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

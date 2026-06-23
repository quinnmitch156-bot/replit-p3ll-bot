---
name: wouter Link renders its own anchor
description: This repo's wouter version makes <Link> render the <a> itself; nesting <a> inside breaks DOM nesting.
---

In this project's `wouter` version, `<Link href>` renders the `<a>` element itself. Pass `className`, `data-testid`, `onClick`, etc. directly to `<Link>`.

**Why:** Nesting `<a>` inside `<Link>` (the old `<Link><a>...</a></Link>` pattern) produces a React "validateDOMNesting: <a> cannot appear as a descendant of <a>" warning and double anchors.

**How to apply:** Use `<Link href="..." className="..." data-testid="...">content</Link>` — never wrap an inner `<a>`.

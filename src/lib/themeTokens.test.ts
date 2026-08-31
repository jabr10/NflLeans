import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(source: string, start: string, end: string): string {
  const i = source.indexOf(start);
  expect(i).toBeGreaterThan(-1);
  const j = source.indexOf(end, i + start.length);
  expect(j).toBeGreaterThan(i);
  return source.slice(i, j);
}

describe("Arthur color tokens", () => {
  it("locks the night board on :root", () => {
    const root = block(css, ":root {", "@media (prefers-color-scheme: light)");
    expect(root).toContain("color-scheme: dark");
    expect(root).toContain("--paper: #07090c");
    expect(root).toContain("--card: #121820");
    expect(root).toContain("--hairline: #243041");
    expect(root).toContain("--ink: #f3f6fa");
    expect(root).toContain("--mute: #8b97a8");
    expect(root).toContain("--elevate: #c6f23a");
    expect(root).toContain("--downgrade: #ffb020");
    expect(root).toContain("--pill-rec: #8fb4ff");
    expect(root).toContain("--pill-rush: #ffc978");
    expect(root).toContain("--pill-pass: #d7a6ff");
  });

  it("follows prefers-color-scheme for a matching light board", () => {
    expect(css).toContain("@media (prefers-color-scheme: light)");
    const light = block(css, "@media (prefers-color-scheme: light)", "html,");
    expect(light).toContain("color-scheme: light");
    expect(light).toContain("--paper: #f3f6fa");
    expect(light).toContain("--ink: #07090c");
    expect(light).toContain("--card: #ffffff");
    expect(light).toContain("--elevate: #c6f23a");
    expect(light).toContain("--downgrade: #ffb020");
    expect(light).toContain("--pill-rec: #8fb4ff");
    expect(light).toContain("--pill-rush: #ffc978");
    expect(light).toContain("--pill-pass: #d7a6ff");
    expect(light).not.toContain("nflleans-theme");
  });

  it("styles the lockup tagline with mute type", () => {
    expect(css).toContain(".brand-tagline");
    const tagline = block(css, ".brand-tagline {", ".brand-lockup {");
    expect(tagline).toContain("color: var(--mute)");
    expect(tagline).not.toContain("white-space: nowrap");
  });
});

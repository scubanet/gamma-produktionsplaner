import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokensCss } from "../scripts/tokens.mjs";

describe("Design-System-Tokens", () => {
  it("app/tokens.css entspricht design-system/tokens.json", () => {
    const json = JSON.parse(readFileSync(new URL("../../design-system/tokens.json", import.meta.url), "utf8"));
    const css = readFileSync(new URL("../app/tokens.css", import.meta.url), "utf8");
    expect(css).toBe(tokensCss(json));
  });

  it("deckt jede Variable ab, die bundle.css verwendet", () => {
    const bundle = readFileSync(new URL("../../design-system/components/bundle.css", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/tokens.css", import.meta.url), "utf8");
    const benutzt = new Set([...bundle.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    const fehlt = [...benutzt].filter((v) => !css.includes(`${v}:`));
    expect(fehlt).toEqual([]);
  });
});

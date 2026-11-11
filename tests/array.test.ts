import { describe, expect, it } from "vitest";
import { moveItem, parseTags, removeAt, replaceAt } from "@/lib/array";

describe("moveItem", () => {
  it("moves an item up and down", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input", () => {
    const list = ["a", "b", "c"];
    moveItem(list, 0, 2);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("ignores out-of-range and no-op moves", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 2)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});

describe("removeAt / replaceAt", () => {
  it("removes and replaces by index without mutating", () => {
    const list = ["a", "b", "c"];
    expect(removeAt(list, 1)).toEqual(["a", "c"]);
    expect(replaceAt(list, 1, "x")).toEqual(["a", "x", "c"]);
    expect(list).toEqual(["a", "b", "c"]);
  });
});

describe("parseTags", () => {
  it("splits on commas and newlines and trims", () => {
    expect(parseTags("TypeScript,  Python ,\nGo")).toEqual(["TypeScript", "Python", "Go"]);
  });

  it("drops empties and case-insensitive duplicates", () => {
    expect(parseTags("React, , react, REACT, Next.js,")).toEqual(["React", "Next.js"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseTags("  ,  ")).toEqual([]);
    expect(parseTags("")).toEqual([]);
  });
});

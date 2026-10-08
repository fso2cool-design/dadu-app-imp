import { describe, it, expect } from "vitest";
import { LRUCache } from "./lruCache";

describe("LRUCache", () => {
  it("1. Basic get and set", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("2. Missing keys", () => {
    const cache = new LRUCache<string, number>(2);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("3. LRU eviction order", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    // Capacity is 2, adding a third should evict 'a' (oldest)
    cache.set("c", 3);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("4. Promotion after get", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    // get 'a' promotes it to most recently used
    cache.get("a");

    // adding a third should evict 'b' (now the oldest)
    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  it("5. Updating an existing key", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("a", 100);

    expect(cache.get("a")).toBe(100);
  });

  it("6. Repeated updates at capacity", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    // Repeatedly update 'a' and 'b'
    cache.set("a", 10);
    cache.set("b", 20);
    cache.set("a", 100);
    cache.set("b", 200);

    expect(cache.get("a")).toBe(100);
    expect(cache.get("b")).toBe(200);
  });

  it("7. Capacity validation", () => {
    expect(() => new LRUCache(0)).toThrow();
    expect(() => new LRUCache(-1)).toThrow();
    expect(() => new LRUCache(1.5)).toThrow();
    expect(() => new LRUCache(NaN)).toThrow();
    expect(() => new LRUCache(Infinity)).toThrow();
  });

  it("8. Correct behavior when the cache contains one entry", () => {
    const cache = new LRUCache<string, number>(1);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);

    cache.set("b", 2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  it("9. No eviction when updating an existing key", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    // Update 'a' should not evict 'b', even though cache was at capacity
    cache.set("a", 100);

    expect(cache.get("a")).toBe(100);
    expect(cache.get("b")).toBe(2);
  });

  it("10. Cache size never exceeding capacity (observable behavior)", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4);

    // If cache size is max 2, only 'c' and 'd' should be present
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });
});

export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    if (
      typeof capacity !== "number" ||
      !Number.isFinite(capacity) ||
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      throw new Error("Capacity must be a finite positive integer.");
    }
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key)!;
    // Promote to most recently used by deleting and re-inserting
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    if (this.cache.has(key)) {
      // Update existing key and promote to most recently used
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      // Insert new key
      this.cache.set(key, value);

      // Evict least recently used if capacity is exceeded
      if (this.cache.size > this.capacity) {
        // Map iterates in insertion order, so the first item is the oldest
        const firstEntry = this.cache.keys().next();
        if (!firstEntry.done) {
          this.cache.delete(firstEntry.value);
        }
      }
    }
    return this;
  }
}

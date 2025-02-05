import { Stream, Token } from "../Stream.ts";

export class CachingStream<T extends Token> implements Stream<T> {
  private cache = new Cache<number, { token: T | null; checkpoint: number }>(5);
  constructor(private inner: Stream<T>) {}
  checkpoint(): number {
    return this.inner.checkpoint();
  }
  reset(position: number): void {
    this.inner.reset(position);
  }
  nextToken(): T | null {
    const startPos = this.checkpoint();
    const cachedValue = this.cache.get(startPos);
    if (cachedValue !== undefined) {
      this.reset(cachedValue.checkpoint);
      return cachedValue.token;
    } else {
      const token = this.inner.nextToken();
      const checkpoint = this.checkpoint();
      this.cache.set(startPos, { token, checkpoint });
      return token;
    }
  }
  get src(): string {
    return this.inner.src;
  }
}

/** size limited key value cache */
class Cache<K, V> extends Map<K, V> {
  constructor(private readonly max: number) {
    super();
  }

  set(k: K, v: V): this {
    if (this.size > this.max) {
      const first = this.keys().next().value;
      if (first) this.delete(first);
    }
    return super.set(k, v);
  }
}

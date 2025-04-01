import { Expect } from "@playwright/test";

export class ExpectWrapper<ExtendedMatchers, T> {
  expecter: Expect<ExtendedMatchers>;
  apply(e: T) {
    return this.expecter<T>(e);
  }
  soft(e: T) {
    return this.expecter.soft<T>(e);
  }
  poll(e: T) {
    return this.expecter.poll<T>(() => e);
  }
}

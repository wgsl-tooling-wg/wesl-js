import { test } from "vitest";
import { testLink } from "./TestLink.ts";

test("conditional statement", async () => {
  const app = `
    fn main() {
      @if(false) let x = 1;
    }
  `;

  const expectWgsl = `
    fn main() {
    }
  `;
  await testLink({ app: app }, "app", expectWgsl);
});

test("conditional compound statement", async () => {
  const app = `
    fn main() {
      @if(false) {
        let x = 1;
      }
    }
  `;

  const expectWgsl = `
    fn main() {
    }
  `;
  await testLink({ app: app }, "app", expectWgsl);
});

test("conditional local variables", async () => {
  const app = `
    fn main() {
      @if(true) var x = 1;
      @if(false) var x = 2 ;
    }
  `;

  const expectWgsl = `
    fn main() {
       var x = 1;
    }
  `;
  await testLink({ app: app }, "app", expectWgsl);
});

test("conditional binding ", async () => {
  const app = `
    fn main() {
      @if(true) var x = 1;
      @if(false) var x = 2;
      x += 1;
    }
  `;

  const expectWgsl = `
    fn main() {
       var x = 1;
      x += 1;
    }
  `;
  await testLink({ app: app }, "app", expectWgsl);
});

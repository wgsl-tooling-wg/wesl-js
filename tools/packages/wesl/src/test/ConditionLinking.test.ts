import { test } from "vitest";
import { testLink } from "./TestLink.ts";

// LATER move these to cond cases? (or drop if duplicative)

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

test("conditional binding references", async () => {
  const app = `
    import package::file1::b;

    fn main() {
      @if(true) var x = b;
      @if(false) var x = 2;
      x += 1;
    }
  `;

  const file1 = `
    const b = 9;
  `;

  const expectWgsl = `
    fn main() {
       var x = b;
      x += 1;
    }
const b = 9;
  `;
  await testLink({ app, file1 }, "app", expectWgsl);
});

test("@if(MOBILE) statement", async () => {
  const app = `
    fn main() {
      @if(MOBILE) let x = 1;
      @if(!MOBILE) let x = 7;
    }
  `;

  const expectWgsl = `
    fn main() {
      let x = 7;
    }
  `;
  await testLink({ app: app }, "app", expectWgsl);
});

test("@if(MOBILE) const", async () => {
  const app = `
    fn main() {
      let y = package::util::x;
    }
  `;
  const util = `
    @if(MOBILE) const x = 1;
    @if(!MOBILE) const x = 7;
  `;

  const expectWgsl = `
    fn main() {
      let y = x;
    }
    const x = 7;
  `;
  await testLink({ app, util }, "app", expectWgsl);
});

test("@if(MOBILE) override", async () => {
  const app = `
    fn main() {
      let y = package::util::x;
    }
  `;
  const util = `
    @if(MOBILE) override x = 1;
    @if(!MOBILE) override x = 7;
  `;

  const expectWgsl = `
    fn main() {
      let y = x;
    }
    override x = 7;
  `;
  await testLink({ app, util }, "app", expectWgsl);
});

test("@if(MOBILE) global var", async () => {
  const app = `
    fn main() {
      let y = package::util::x;
    }
  `;
  const util = `
    @if(MOBILE) var x = 1;
    @if(!MOBILE) var x = 7;
  `;

  const expectWgsl = `
    fn main() {
      let y = x;
    }
    var x = 7;
  `;
  await testLink({ app, util }, "app", expectWgsl);
});

test("@else fn", async () => {
  const app = `
    fn main() {
      package::util::testFn();
    }
  `;

  const util = `
    @if(FOO)
    fn testFn() { let a = 0; }
    @else
    fn testFn() { let a = 1; }
  `;

  const expectWgsl = `
    fn main() {
      testFn();
    }
    fn testFn() { let a = 1; }
  `;
  await testLink({ app, util }, "app", expectWgsl);
});

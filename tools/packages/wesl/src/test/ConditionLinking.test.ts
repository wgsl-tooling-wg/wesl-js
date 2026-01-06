import { test } from "vitest";
import { testLink } from "./TestLink.ts";

// LATER move these to cond cases? (or drop if duplicative)

test("conditional declaration ", async () => {
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

test("conditional assignment", async () => {
  const app = `
    fn main() {
      var x = 1;
      @if(false) x = 2;
    }
  `;

  const expectWgsl = `
    fn main() {
      var x = 1;
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

test("disabled @if should not bind cross-module references", async () => {
  const app = `
    @if(false)
    fn unused() {
       package::util::used();
    }
    fn main() {}
  `;
  const util = `
    fn used() {}
  `;

  // 'used' should NOT be in the output because 'unused' is disabled.
  const expectWgsl = `
    fn main() {}
  `;
  await testLink({ app, util }, "app", expectWgsl);
});

test("@else after @if(false) decl should be valid", async () => {
  const app = `
    @if(false) const a = 1;
    @else const b = 2;
    fn main() { let x = b; }
  `;

  // b should be included because @else is valid after @if(false)
  const expectWgsl = `
    const b = 2;
    fn main() { let x = b; }
  `;
  await testLink({ app }, "app", expectWgsl);
});

test("@if(true) fn after @if(false) const should be valid", async () => {
  const app = `
    @if(false) const a = 1;
    @if(true) fn helper() {}
    fn main() { helper(); }
  `;

  const expectWgsl = `
    fn helper() {}
    fn main() { helper(); }
  `;
  await testLink({ app }, "app", expectWgsl);
});

// Experimental feature: conditionalBlockScope
test("conditional block declaration visible in outer scope", async () => {
  const app = `
    fn func() {
      @if(true) { let x = 1; }
      let y = x;
    }
  `;
  const expectWgsl = `
    fn func() {
      { let x = 1; }
      let y = x;
    }
  `;
  await testLink({ app }, "app", expectWgsl);
});

// Experimental feature: conditionalBlockScope
test("conditional block declaration visible in outer scope", async () => {
  const app = `
    fn func() {
      @if(true) { let x = super::util::two(); }
      @else { let x = super::util::oops(); }
      let y = x;
    }
  `;
  const util = `
    fn two() -> i32 { return 2;}
    fn three() -> i32 { return 3;}
  `;
  const expectWgsl = `
    fn func() {
      { let x = two(); }
      let y = x;
    }
    fn two() -> i32 { return 2;}
  `;
  await testLink({ app, util }, "app", expectWgsl);
});

// Tests that @if on continuing statement works (requires element-based detection, not string parsing)
test("conditional continuing statement in loop", async () => {
  const app = `
    fn func() {
      loop {
        @if(true) continuing { break if true; }
      }
    }
  `;
  const expectWgsl = `
    fn func() {
      loop {
        continuing { break if true; }
      }
    }
  `;
  await testLink({ app }, "app", expectWgsl);
});

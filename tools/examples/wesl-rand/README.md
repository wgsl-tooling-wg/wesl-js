# wgsl-linker random example

[wgsl linker]: https://github.com/mighdoll/wgsl-linker
[pcg]: https://www.pcg-random.org/using-pcg.html

The [wgsl linker] allows you to combine wgsl source code from multiple files.
This example demonstrates importing a function from a utility library
exporting a [PCG] psuedorandom number generator.

The display shows the distribution of random values produced by the generator.
Press the play button to animate through the range of random seed values.

Click through the source tabs to see how the linker merges the source code.
- The utility library contains a function named 'mixing' that conflicts with the main source.
  The [wgsl linker] rewrites the code as necessary to avoid name conflicts.
- The main module `#extends` the `struct Sprite` to demonstrate struct inheritance.

[Run/Edit in StackBlitz](https://stackblitz.com/~/github.com/mighdoll/wgsl-linker-rand-example)
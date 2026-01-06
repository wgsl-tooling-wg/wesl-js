const config = () => ({
  autoDetect: true,
  tests: {
    override: (filePatterns) => {
      filePatterns.push(`!**/bench/**/*`);
      filePatterns.push(`!**/bencher/**/*`);
      filePatterns.push(`!**/bench-viz/**/*`);
      filePatterns.push(`!**/BulkTests.test.ts`);
      filePatterns.push(`!**/cts/**/*`);
      filePatterns.push(`!**/examples/**/*`);
      filePatterns.push(`!**/wesl-plugin/**/*`);
      filePatterns.push(`!**/wesl-packager/**/*`);
      filePatterns.push(`!**/wesl-bench/**/*`);
      return filePatterns;
    },
  },
});

export default config;

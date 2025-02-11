const config = () => ({
  autoDetect: true,
  tests: {
    override: filePatterns => {
      filePatterns.push(`!**/bulk-test/**/parallelTest*`);
      filePatterns.push(`!**/plugin-test/**/*`);
      return filePatterns;
    },
  },
});

export default config;

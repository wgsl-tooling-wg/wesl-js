const config = () => ({
  autoDetect: true,
  tests: {
    override: filePatterns => {
      filePatterns.push(`!**/bulk-test/**/parallelTest*`);
      return filePatterns;
    },
  },
});

export default config;

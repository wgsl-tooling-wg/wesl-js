const config = () => ({
  autoDetect: true,
  files: {
    override: filePatterns => {
      filePatterns.push(`!**/bulk-test/**`);
      return filePatterns;
    },
  },
  tests: {
    override: filePatterns => {
      filePatterns.push(`!**/bulk-test/**`);
      return filePatterns;
    },
  },
});

export default config;

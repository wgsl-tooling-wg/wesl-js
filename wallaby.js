const config = () => ({
  autoDetect: true,
  tests: {
    override: (filePatterns) => {
      filePatterns.push(`!**/plugin-test/**/*`);
      return filePatterns;
    },
  },
});

export default config;

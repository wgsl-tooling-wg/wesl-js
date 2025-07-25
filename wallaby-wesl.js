const config = () => ({
  autoDetect: true,
  tests: {
    override: (filePatterns) => {
      filePatterns.push(`!**/plugin-test/**/*`);
      filePatterns.push(`!**/mini-parse/**/*`);
      filePatterns.push(`!**/wesl-packager/**/*`);
      return filePatterns;
    },
  },
});

export default config;

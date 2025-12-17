const config = () => ({
  autoDetect: true,
  tests: {
    override: (filePatterns) => {
      return filePatterns;
    },
  },
});

export default config;

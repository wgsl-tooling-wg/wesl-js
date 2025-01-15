const conf = {
  autoDetect: true,
  trace: true,
  files: [
    'packages/linker/src/**/*.ts',
    'packages/mini-parse/src/**/*.ts',
    '!node_modules/**/*',
    '!packages/linker/src/**/*.test.ts',
    '!packages/mini-parse/src/**/*.test.ts',
  ],
  tests: [
    'packages/bulk-test/src/**/*.test.ts',
  ]
};
export default conf;

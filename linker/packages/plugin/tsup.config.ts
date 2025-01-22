import type { Options } from 'tsup'

export default <Options>{
  entry: [
    'src/plugins/*.ts',
  ],
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
  cjsInterop: true,
  splitting: true,
  onSuccess: 'npm run build:fix',
}

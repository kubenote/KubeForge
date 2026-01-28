import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'repositories/index': 'src/repositories/index.ts',
    'storage/index': 'src/storage/index.ts',
    'providers/index': 'src/providers/index.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next',
    '@prisma/client',
    '@xyflow/react',
  ],
});

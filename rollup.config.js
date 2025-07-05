import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        sourcemapExcludeSources: false,
        exports: 'named',
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        sourcemapExcludeSources: false,
      },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
        declaration: false, // We'll generate types separately
        declarationMap: false,
        sourceMap: true,
        inlineSources: true
      }),
    ],
    external: ['d3'],
  },
  {
    input: 'src/umd-entry.ts',
    output: {
      file: 'dist/bubble-chart.min.js',
      format: 'umd',
      name: 'BubbleChart',
      sourcemap: true,
      sourcemapExcludeSources: false,
      exports: 'default',
      globals: {
        d3: 'd3',
      },
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
        declaration: false, // No types needed for UMD build
        declarationMap: false,
        sourceMap: true,
        inlineSources: true
      }),
      terser(),
    ],
    external: ['d3'],
  },
  {
    input: 'src/index.ts',
    output: [{ file: packageJson.types, format: 'es' }],
    plugins: [dts()],
  },
]; 
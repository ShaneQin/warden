import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import server from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export default {
  input: './src/index.js',
  output: {
    file: './dist/warden.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    commonjs(),
    babel({
      babelHelpers: 'runtime',
      presets: [
        ['@babel/preset-env']
      ],
      plugins: [
        ['@babel/plugin-transform-runtime']
      ],
      exclude: 'node_modules/**'
    }),
    isDevelopment && server({
      open: true,
      contentBase: ['public', 'dist'],
    }),
    isDevelopment && livereload(),
    isProduction && terser()
  ]
}

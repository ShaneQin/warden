import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import html from '@rollup/plugin-html'
import { terser } from "rollup-plugin-terser";
import { liveServer } from 'rollup-plugin-live-server'

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

let outputFile = './dist/warden.js'
isDevelopment && (outputFile = './server/warden.js')

export default {
  input: './src/index.js',
  output: {
    file: outputFile,
    format: 'es'
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
        ["@babel/plugin-transform-runtime" ]
      ],
      exclude: 'node_modules/**'
    }),
    isDevelopment && html(),
    isDevelopment && liveServer({
      file: "index.html",
      mount: [['/server', './server'], ['/src', './src'], ['/node_modules', './node_modules']],
      open: true
    }),
    false && terser()
  ]
}

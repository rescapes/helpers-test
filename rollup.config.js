import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import * as R from 'ramda';

const config = {
  input: [
    'src/index.js',
    'src/apolloContainerTestHelpers.js',
    'src/componentTestHelpers.js',
    'src/testHelpers.js',
  ],
  plugins: []
};
const externals = ['symbol-observable', 'folktale/concurrency/task', 'folktale/result', 'enzyme', 'enzyme-wait', 'fast-json-stable-stringify', 'react-dom-utils'];

const configs = R.map(c => {
  const x = R.merge(config, c);
  //console.warn(x);
  return x;
}, [
  // CommonJS
  {
    output: {
      dir: 'lib',
      format: 'cjs',
      indent: true,
      sourcemap: true
    },
    external: [
      ...externals,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: R.concat(config.plugins, [
      commonjs({
        namedExports: {
          'node_modules/folktale/result/index.js': ['Result', 'Error', 'Ok'],
          'node_modules/folktale/concurrency/task/index.js': ['task', 'rejected', 'of'],
          'node_modules/react-dom/test-utils.js': ['act'],
          'react-dom': ['act']
        }
      }),
      babel()
    ])
  },
  // ES
  {
    output: {
      dir: 'esm',
      format: 'esm',
      indent: true,
      sourcemap: true
    },
    external: [
      ...externals,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: R.concat(config.plugins, [
      nodeResolve({}), babel()
    ])
  },

  /*
  // ES for Browsers
  {
    output: {
      dir: 'esm',
      chunkFileNames: "[name]-[hash].mjs",
      entryFileNames: "[name].mjs",
      format: 'esm',
      indent: true,
      sourcemap: true
    },
    external: [
      ...externals,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: R.concat(config.plugins, [
      nodeResolve({}),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ])
  }

   */
]);
export default configs;
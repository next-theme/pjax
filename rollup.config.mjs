import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'index.js',
  output: {
    name: 'Pjax'
  },
  plugins: [resolve(), commonjs()]
};

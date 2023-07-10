import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
	  input: 'grader.js',
	  output: {
		      file: './build/grader.js',
		      format: 'cjs'
		    },
	  plugins: [
		      resolve(),
		      commonjs(),
		    ]
};

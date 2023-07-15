import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
	  input: './Stim/glue/crumble/main.js',
	  output: {
		      file: './build/main.js',
		      format: 'cjs'
		    },
	  plugins: [
		      resolve(),
		      commonjs(),
		    ]
};

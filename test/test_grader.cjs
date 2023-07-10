
// run rollup for grader, then cp /build/grader.js /test/grader.cjs
const grader = require('./grader.cjs');

let graderConfig = 
	{
		  "circuit": "QUBIT_COORDS(0, 0) 0\nQUBIT_COORDS(0.5, 0.5) 1\nX 0\nTICK\nTICK\nH 1\nCX 0 1\nTICK\nM 0 1",
		  "errors": {
			      "0": "Y",
			      "1": "Y"
			    },
		  "markIndex": 1,
		  "measureIndex": 4
	}
;

let sessionConfig = 
	{
		"circuit": "QUBIT_COORDS(0, 0) 0\nQUBIT_COORDS(0.5, 0.5) 1\nX 0\nTICK\nTICK\nH 1\nCX 0 1\nTICK\nM 0 1",
		"initIndex":1
	}
;

let answer =  "QUBIT_COORDS(0, 0) 0\nQUBIT_COORDS(0.5, 0.5) 1\nX 0\nTICK\nMARKX(0) 0 1\nTICK\nH 1\nCX 0 1\nTICK\nM 0 1";

console.log(grader.gradeAnswer(graderConfig, sessionConfig, answer));


import {Circuit} from './Stim/glue/crumble/circuit/circuit.js'
import {PropagatedPauliFrames} from './Stim/glue/crumble/circuit/propagated_pauli_frames.js'

function clearMarks(circuit){
	let markless = circuit.copy();
	for (let layer of markless.layers){
		layer.markers = [];
	}
	return markless;
}

function rotatedEquals(circuit1, circuit2){
	let rotated_circuit = circuit1.copy();
	for (let i = 0; i < 8; i++){
		if (rotated_circuit.isEqualTo(circuit2)){
			return {'equal': true, 'rotations':i};
		}
		rotated_circuit = rotated_circuit.rotated45().afterRectification();
	}
	return {'equal':false, 'rotations':-1};
}

function rotateNTimes(circuit, n){
	let rotated_circuit = circuit.copy();
	for (let i = 0; i < n; i++){
		rotated_circuit = rotated_circuit.rotated45().afterRectification();
	}
	return rotated_circuit;
}

function excise(circuit, layer_id){
	let pre = new Circuit(circuit.qubitCoordData, circuit.layers.slice(0, layer_id));
	let layer = circuit.layers[layer_id];
	let post = new Circuit(circuit.qubitCoordData, circuit.layers.slice(layer_id+1));
	return {'pre':pre, 'layer':layer, 'post':post}
}

function concat(circuit1, circuit2){
	if (!(circuit1.qubitCoordData === circuit2.qubitCoordData)){
		throw 'Attempt to concatenate circuits with different qubit coordinate data';
	}
	return new Circuit(circuit1.qubitCoordData, circuit1.layers + circuit2.layers);
}

function sortedIterEquals(a, b) {
	a = Array.from(a).sort();
	b = Array.from(b).sort();
	return Array.isArray(a) &&
		Array.isArray(b) &&
		a.length === b.length &&
		a.every((val, index) => val === b[index]);
}

function measurementLayerCorrect(propagated_marker_layer, errors){
	let mark_errors = {};
	for (let qubit of propagated_marker_layer.errors){
		mark_errors[qubit] = propagated_marker_layer.bases.get(qubit);
	}
	if (!(sortedIterEquals(Object.keys(mark_errors), Object.keys(errors)))){
		return {'isCorrect': false, 'mark_errors': mark_errors};
	}
	for (let qubit of Object.keys(errors)){
		if (!(errors[qubit] === mark_errors[qubit])){
			return {'isCorrect': false, 'mark_errors': mark_errors};
		}
	}
	return {'isCorrect': true, 'mark_errors': mark_errors};
}

function circuitMeasurementsCorrect(circuit, measurement_layer_id, errors){
	let measurement_layer = PropagatedPauliFrames.fromCircuit(circuit, 0).atLayer(measurement_layer_id);
	return measurementLayerCorrect(measurement_layer, errors);
}

function returnObject(isCorrect, feedback, circuit, initIndex, originalCircuit=null){
	if (originalCircuit === null){
		originalCircuit = circuit;
	}
	return {isCorrect: isCorrect,
		feedback: feedback,
		feedbackConfiguration: {
			circuit: circuit.toStimCircuit(),
			initIndex: initIndex,
			originalCircuit: originalCircuit.toStimCircuit(),
			feedback,
			isCorrect
			}
		}

}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

export function gradeAnswer(graderConfig, sessionConfig, answer) {

	const originalCircuit = Circuit.fromStimCircuit(graderConfig.circuit);
	const errors = graderConfig.errors;
	const measureIndex = graderConfig.measureIndex;
	const markIndex = graderConfig.markIndex;

	const answerCircuit = Circuit.fromStimCircuit(answer);

	let equal_and_rotations = rotatedEquals(clearMarks(answerCircuit), clearMarks(originalCircuit));

	function illformed(){
		let isCorrect = false;
		let feedback = 'Incorrect. Please do not modify the circuit except by adding marks on layer ' + markIndex;
		return returnObject(isCorrect, feedback, originalCircuit, markIndex);
	}

	let correct_excised = excise(originalCircuit, markIndex);
	if (correct_excised.layer === undefined || !(correct_excised.layer.isEmpty())){
		let isCorrect = false;
		let feedback = 'Incorrect grader configuration. Please contact instructors';
		return returnObject(isCorrect, feedback, originalCircuit, markIndex);
	}

	if (!(equal_and_rotations.equal)){
		return illformed();
	}

	for (let layer of answerCircuit.layers){
		for (let markOp of layer.markers){
			if (markOp.args.length != 1 || markOp.args[0] != 0){
				let isCorrect = false;
				let feedback = 'Incorrect. Please only use the 1-tagged markers: The X1, Y1 and Z1 buttons/hotkeys, which appear as MARKX(0), MARKY(0) and MARKZ(0) in the import/export panel.';
				return returnObject(isCorrect, feedback, originalCircuit, markIndex);
			}
		}
	}

	let answer_excised = excise(rotateNTimes(answerCircuit, equal_and_rotations.rotations), markIndex);
	if (!(correct_excised.pre.isEqualTo(answer_excised.pre))
		|| !(correct_excised.post.isEqualTo(answer_excised.post))){
		return illformed();
	}

	if (answer_excised.layer.id_ops.size) {
		let isCorrect = false;
		let feedback = 'Incorrect. Please only add marks, not operations, to layer ' + markIndex;
		return returnObject(isCorrect, feedback, originalCircuit, markIndex);
	}

	let reconstructed_circuit = new Circuit(originalCircuit.qubitCoordData, correct_excised.pre.layers.concat([answer_excised.layer], correct_excised.post.layers));
	let correctness = circuitMeasurementsCorrect(reconstructed_circuit, measureIndex, errors);
	let isCorrect = correctness.isCorrect;
	let failureMsg = 'Incorrect. Your circuit yielded the following errors on each qubit index: ' + JSON.stringify(correctness.mark_errors).replaceAll("\"","") + ' on layer ' + measureIndex + '.  Please yield these errors instead: ' + JSON.stringify(errors).replaceAll("\"","");
	let feedback = isCorrect ? 'Correct, well done!' : failureMsg;
	return returnObject(isCorrect, feedback, reconstructed_circuit, markIndex, originalCircuit);

};

'use strict';

/**
 * Gate drawing callback.
 *
 * @callback gateDrawCallback
 * @param {!Operation} op
 * @param {!function(qubit: !int): ![!number, !number]} qubitCoordsFunc
 * @param {!CanvasRenderingContext2D} ctx
 */

/**
 * An operation without specified targets.
 */
class Gate {
    /**
     * @param {!string} name
     * @param {!int} num_qubits
     * @param {!boolean} can_fuse
     * @param {!boolean} is_marker
     * @param {!Map<!string, !string>} tableau_map
     * @param {!function(!PauliFrame, !Array<!int>)} frameDo,
     * @param {!gateDrawCallback} drawer
     * @param {undefined|!number=undefined} defaultArgument
     */
    constructor(name,
                num_qubits,
                can_fuse,
                is_marker,
                tableau_map,
                frameDo,
                drawer,
                defaultArgument = undefined) {
        this.name = name;
        this.num_qubits = num_qubits;
        this.is_marker = is_marker;
        this.can_fuse = can_fuse;
        this.tableau_map = tableau_map;
        this.frameDo = frameDo;
        this.drawer = drawer;
        this.defaultArgument = defaultArgument;
    }

    /**
     * @param {!number} newDefaultArgument
     */
    withDefaultArgument(newDefaultArgument) {
        return new Gate(
            this.name,
            this.num_qubits,
            this.can_fuse,
            this.is_marker,
            this.tableau_map,
            this.frameDo,
            this.drawer,
            newDefaultArgument);
    }
}

/**
 * @param {!string} base
 * @returns {!Array<!string>}
 */
function expandBase(base) {
    let result = [];
    for (let k = 0; k < base.length; k++) {
        let prefix = 'I'.repeat(k);
        let suffix = 'I'.repeat(base.length - k - 1);
        if (base[k] === 'X' || base[k] === 'Y') {
            result.push(prefix + 'X' + suffix);
        }
        if (base[k] === 'Z' || base[k] === 'Y') {
            result.push(prefix + 'Z' + suffix);
        }
    }
    return result;
}

class Operation {
    /**
     * @param {!Gate} gate
     * @param {!Float32Array} args
     * @param {!Uint32Array} targets
     */
    constructor(gate, args, targets) {
        if (!(gate instanceof Gate)) {
            throw new Error('!(gate instanceof Gate)');
        }
        if (!(args instanceof Float32Array)) {
            throw new Error('!(args instanceof Float32Array)');
        }
        if (!(targets instanceof Uint32Array)) {
            throw new Error('!(targets instanceof Uint32Array)');
        }
        this.gate = gate;
        this.args = args;
        this.id_targets = targets;
    }

    /**
     * @param {!string} before
     * @returns {!string}
     */
    pauliFrameAfter(before) {
        let m = this.gate.tableau_map;
        if (m === undefined) {
            return before;
        }
        if (before.length !== this.gate.num_qubits) {
            throw new Error(`before.length !== this.gate.num_qubits`);
        }
        if (m.has(before)) {
            return m.get(before);
        }
        let bases = expandBase(before);
        bases = bases.map(e => m.get(e));
        let out = [0, 0];
        for (let b of bases) {
            for (let k = 0; k < before.length; k++) {
                if (b[k] === 'X') {
                    out[k] ^= 1;
                }
                if (b[k] === 'Y') {
                    out[k] ^= 3;
                }
                if (b[k] === 'Z') {
                    out[k] ^= 2;
                }
            }
        }
        let result = '';
        for (let k = 0; k < before.length; k++) {
            result += 'IXZY'[out[k]];
        }
        return result;
    }

    /**
     * @param {!function(qubit: !int): ![!number, !number]} qubitCoordsFunc
     * @param {!CanvasRenderingContext2D} ctx
     */
    id_draw(qubitCoordsFunc, ctx) {
        ctx.save();
        try {
            this.gate.drawer(this, qubitCoordsFunc, ctx);
        } finally {
            ctx.restore();
        }
    }
}

const pitch = 50;
const rad = 10;

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_x_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - rad);
    ctx.lineTo(x, y + rad);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - rad, y);
    ctx.lineTo(x + rad, y);
    ctx.stroke();
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_y_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    ctx.strokeStyle = 'black';
    ctx.fillStyle = '#AAA';
    ctx.beginPath();
    ctx.moveTo(x, y + rad);
    ctx.lineTo(x + rad, y - rad);
    ctx.lineTo(x - rad, y - rad);
    ctx.lineTo(x, y + rad);
    ctx.stroke();
    ctx.fill();
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_z_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    ctx.fill();
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_xswap_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    let r = rad * 0.4;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.stroke();
    ctx.moveTo(x - r, y + r);
    ctx.lineTo(x + r, y - r);
    ctx.stroke();
    ctx.lineWidth = 1;
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_zswap_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    let r = rad * 0.4;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.stroke();
    ctx.moveTo(x - r, y + r);
    ctx.lineTo(x + r, y - r);
    ctx.stroke();
    ctx.lineWidth = 1;
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_iswap_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    let r = rad * 0.4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.stroke();
    ctx.moveTo(x - r, y + r);
    ctx.lineTo(x + r, y - r);
    ctx.stroke();
    ctx.lineWidth = 1;
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function draw_swap_control(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    let r = rad / 3;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.stroke();
    ctx.moveTo(x - r, y + r);
    ctx.lineTo(x + r, y - r);
    ctx.stroke();
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x
 * @param {undefined|!number} y
 */
function stroke_degenerate_connector(ctx, x, y) {
    if (x === undefined || y === undefined) {
        return;
    }
    let r = rad * 1.1;
    ctx.strokeRect(x - r, y - r, r * 2, r * 2);
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x1
 * @param {undefined|!number} y1
 * @param {undefined|!number} x2
 * @param {undefined|!number} y2
 */
function stroke_connector_to(ctx, x1, y1, x2, y2) {
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
        stroke_degenerate_connector(ctx, x1, y1);
        stroke_degenerate_connector(ctx, x2, y2);
        return;
    }
    if (x2 < x1 || (x2 === x1 && y2 < y1)) {
        stroke_connector_to(ctx, x2, y2, x1, y1);
        return;
    }

    let dx = x2 - x1;
    let dy = y2 - y1;
    let d = Math.sqrt(dx*dx + dy*dy);
    let ux = dx / d * 14;
    let uy = dy / d * 14;
    let px = uy;
    let py = -ux;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (d < pitch * 1.1) {
        ctx.lineTo(x2, y2);
    } else {
        ctx.bezierCurveTo(x1 + ux + px, y1 + uy + py, x2 - ux + px, y2 - uy + py, x2, y2);
    }
    ctx.stroke();
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {undefined|!number} x1
 * @param {undefined|!number} y1
 * @param {undefined|!number} x2
 * @param {undefined|!number} y2
 */
function draw_connector(ctx, x1, y1, x2, y2) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    stroke_connector_to(ctx, x1, y1, x2, y2);
    ctx.lineWidth = 1;
}

function *iter_gates_controlled_paulis() {
    yield new Gate(
        'CXSWAP',
        2,
        true,
        false,
        new Map([
            ['IX', 'XI'],
            ['IZ', 'ZZ'],
            ['XI', 'XX'],
            ['ZI', 'IZ'],
        ]),
        (frame, targets) => frame.do_cx_swap(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_zswap_control(ctx, x1, y1);
            draw_xswap_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'CX',
        2,
        true,
        false,
        new Map([
            ['IX', 'IX'],
            ['IZ', 'ZZ'],
            ['XI', 'XX'],
            ['ZI', 'ZI'],
        ]),
        (frame, targets) => frame.do_cx(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_z_control(ctx, x1, y1);
            draw_x_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'CY',
        2,
        true,
        false,
        new Map([
            ['IX', 'ZX'],
            ['IZ', 'ZZ'],
            ['XI', 'XY'],
            ['ZI', 'ZI'],
        ]),
        (frame, targets) => frame.do_cy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_z_control(ctx, x1, y1);
            draw_y_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'XCX',
        2,
        true,
        false,
        new Map([
            ['IX', 'IX'],
            ['IZ', 'XZ'],
            ['XI', 'XI'],
            ['ZI', 'ZX'],
        ]),
        (frame, targets) => frame.do_xcx(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_x_control(ctx, x1, y1);
            draw_x_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'XCY',
        2,
        true,
        false,
        new Map([
            ['IX', 'XX'],
            ['IZ', 'XZ'],
            ['XI', 'XI'],
            ['ZI', 'ZY'],
        ]),
        (frame, targets) => frame.do_xcy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_x_control(ctx, x1, y1);
            draw_y_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'YCY',
        2,
        true,
        false,
        new Map([
            ['IX', 'YX'],
            ['IZ', 'YZ'],
            ['XI', 'XY'],
            ['ZI', 'ZY'],
        ]),
        (frame, targets) => frame.do_ycy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_y_control(ctx, x1, y1);
            draw_y_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'CZ',
        2,
        true,
        false,
        new Map([
            ['IX', 'ZX'],
            ['IZ', 'IZ'],
            ['XI', 'XZ'],
            ['ZI', 'ZI'],
        ]),
        (frame, targets) => frame.do_cz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_z_control(ctx, x1, y1);
            draw_z_control(ctx, x2, y2);
        },
    );
}

function *iter_gates_demolition_measurements() {
    yield new Gate(
        'MR',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:I'],
            ['Y', 'ERR:I'],
            ['Z', 'I'],
        ]),
        (frame, targets) => frame.do_demolition_measure('Z', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MR', x1, y1);
        },
    );
    yield new Gate(
        'MRY',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:I'],
            ['Y', 'I'],
            ['Z', 'ERR:I'],
        ]),
        (frame, targets) => frame.do_demolition_measure('Y', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MRY', x1, y1);
        },
    );
    yield new Gate(
        'MRX',
        1,
        true,
        false,
        new Map([
            ['X', 'I'],
            ['Y', 'ERR:I'],
            ['Z', 'ERR:I'],
        ]),
        (frame, targets) => frame.do_demolition_measure('X', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MRX', x1, y1);
        },
    );
}

function *iter_gates_hadamard_likes() {
    yield new Gate(
        'H',
        1,
        true,
        false,
        new Map([
            ['X', 'Z'],
            ['Z', 'X'],
        ]),
        (frame, targets) => frame.do_exchange_xz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('H', x1, y1);
        },
    );
    yield new Gate(
        'H_XY',
        1,
        true,
        false,
        new Map([
            ['X', 'Y'],
            ['Z', 'Z'],  // -Z technically
        ]),
        (frame, targets) => frame.do_exchange_xy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('H', x1, y1 - rad / 3);
            ctx.fillText("XY", x1, y1 + rad / 3);
        },
    );
    yield new Gate(
        'H_YZ',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],  // -X technically
            ['Z', 'Y'],
        ]),
        (frame, targets) => frame.do_exchange_yz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('H', x1, y1 - rad / 3);
            ctx.fillText("YZ", x1, y1 + rad / 3);
        },
    );
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!Array<![!number, !number]>} coords
 */
function beginPathPolygon(ctx, coords) {
    ctx.beginPath();
    if (coords.length === 0) {
        return;
    }
    let n = coords.length;
    if (n === 1) {
        let [[x0, y0]] = coords;
        ctx.arc(x0, y0, rad * 1.7, 0, 2 * Math.PI);
    } else if (n === 2) {
        let [[x0, y0], [x1, y1]] = coords;
        let dx = x1 - x0;
        let dy = y1 - y0;
        let cx = (x1 + x0) / 2;
        let cy = (y1 + y0) / 2;
        let px = -dy;
        let py = dx;
        let pa = px*px + py*py;
        if (pa > 50*50) {
            let s = 50 / Math.sqrt(pa);
            px *= s;
            py *= s;
        }
        let ac1x = cx + px * 0.2 - dx * 0.2;
        let ac1y = cy + py * 0.2 - dy * 0.2;
        let ac2x = cx + px * 0.2 + dx * 0.2;
        let ac2y = cy + py * 0.2 + dy * 0.2;
        let bc1x = cx - px * 0.2 - dx * 0.2;
        let bc1y = cy - py * 0.2 - dy * 0.2;
        let bc2x = cx - px * 0.2 + dx * 0.2;
        let bc2y = cy - py * 0.2 + dy * 0.2;
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(ac1x, ac1y, ac2x, ac2y, x1, y1);
        ctx.bezierCurveTo(bc2x, bc2y, bc1x, bc1y, x0, y0);
    } else {
        let [xn, yn] = coords[n - 1];
        ctx.moveTo(xn, yn);
        for (let k = 0; k < n; k++) {
            let [xk, yk] = coords[k];
            ctx.lineTo(xk, yk);
        }
    }
}

/**
 * @param {!int} mi
 * @returns {!{wx: !number, wy: !number, dx: !number, dy: !number}}
 */
function marker_placement(mi) {
    let dx, dy, wx, wy;
    if (mi === 0) {
        dx = rad;
        dy = rad + 5;
        wx = rad * 2;
        wy = 5;
    } else if (mi === 1) {
        dx = -rad;
        dy = rad;
        wx = 5;
        wy = rad * 2;
    } else if (mi === 2) {
        dx = rad;
        dy = -rad;
        wx = rad * 2;
        wy = 5;
    } else if (mi === 3) {
        dx = rad + 5;
        dy = rad;
        wx = 5;
        wy = rad * 2;
    } else {
        dx = Math.cos(mi / 5) * rad;
        dy = Math.sin(mi / 5) * rad;
        wx = 5;
        wy = 5;
    }
    return {dx, dy, wx, wy};
}

function *iter_gates_markers() {
    yield new Gate(
        'POLYGON',
        undefined,
        false,
        true,
        undefined,
        () => {},
        (op, coordFunc, ctx) => {
            let transformedCoords = [];
            for (let t of op.id_targets) {
                transformedCoords.push(coordFunc(t));
            }
            beginPathPolygon(ctx, transformedCoords);
            ctx.globalAlpha *= op.args[3];
            ctx.fillStyle = `rgb(${op.args[0]*255},${op.args[1]*255},${op.args[2]*255})`;
            ctx.strokeStyle = `rgb(${op.args[0]*32},${op.args[1]*32},${op.args[2]*32})`;
            ctx.fill();
            ctx.stroke();
        },
    );
    yield new Gate(
        'MARKX',
        1,
        true,
        true,
        undefined,
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            if (x1 === undefined || y1 === undefined) {
                return;
            }
            let {dx, dy, wx, wy} = marker_placement(op.args[0]);
            let x2, y2, x3, y3;
            if (wx === wy) {
                x2 = x1 + dx;
                y2 = y1 + dy;
                x3 = x2 + dx + wx;
                y3 = y2 + dy + wy;
            } else {
                x2 = x1 + (dx < 0 ? +1 : -1) * rad;
                y2 = y1 + (dy < 0 ? +1 : -1) * rad;
                x3 = x2 + (wx > rad ? +1 : 0) * rad * 2;
                y3 = y2 + (wy > rad ? +1 : 0) * rad * 2;
            }
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x1, y1);
            ctx.fill();
        }
    );
    yield new Gate(
        'MARKY',
        1,
        true,
        true,
        undefined,
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            if (x1 === undefined || y1 === undefined) {
                return;
            }
            let {dx, dy, wx, wy} = marker_placement(op.args[0]);
            let x2, y2, x3, y3;
            if (wx === wy) {
                x2 = x1 + dx;
                y2 = y1 + dy;
                x3 = x2 + dx + wx;
                y3 = y2 + dy + wy;
            } else {
                x2 = x1 + (dx < 0 ? +1 : -1) * rad;
                y2 = y1 + (dy < 0 ? +1 : -1) * rad;
                x3 = x2 + (wx > rad ? +1 : 0) * rad * 2;
                y3 = y2 + (wy > rad ? +1 : 0) * rad * 2;
            }
            ctx.fillStyle = 'green';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x1, y1);
            ctx.fill();
        }
    );
    yield new Gate(
        'MARKZ',
        1,
        true,
        true,
        undefined,
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            if (x1 === undefined || y1 === undefined) {
                return;
            }
            let {dx, dy, wx, wy} = marker_placement(op.args[0]);
            let x2, y2, x3, y3;
            if (wx === wy) {
                x2 = x1 + dx;
                y2 = y1 + dy;
                x3 = x2 + dx + wx;
                y3 = y2 + dy + wy;
            } else {
                x2 = x1 + (dx < 0 ? +1 : -1) * rad;
                y2 = y1 + (dy < 0 ? +1 : -1) * rad;
                x3 = x2 + (wx > rad ? +1 : 0) * rad * 2;
                y3 = y2 + (wy > rad ? +1 : 0) * rad * 2;
            }
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x1, y1);
            ctx.fill();
        }
    );
    yield new Gate(
        'MARK',
        1,
        false,
        true,
        undefined,
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            if (x1 === undefined || y1 === undefined) {
                return;
            }
            ctx.fillStyle = 'magenta';
            ctx.fillRect(x1 - rad, y1 - rad, rad, rad);
        }
    );
}

function *iter_gates_pair_measurements() {
    yield new Gate(
        'MXX',
        2,
        true,
        false,
        new Map([
            ['II', 'II'],
            ['IX', 'IX'],
            ['IY', 'ERR:IY'],
            ['IZ', 'ERR:IZ'],

            ['XI', 'XI'],
            ['XX', 'XX'],
            ['XY', 'ERR:XY'],
            ['XZ', 'ERR:XZ'],

            ['YI', 'ERR:YI'],
            ['YX', 'ERR:YX'],
            ['YY', 'YY'],
            ['YZ', 'YZ'],

            ['ZI', 'ERR:ZI'],
            ['ZX', 'ERR:ZX'],
            ['ZY', 'ZY'],
            ['ZZ', 'ZZ'],
        ]),
        (frame, targets) => frame.do_measure('XX', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillRect(x2 - rad, y2 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeRect(x2 - rad, y2 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MXX', x1, y1);
            ctx.fillText('MXX', x2, y2);
        },
    );
    yield new Gate(
        'MYY',
        2,
        true,
        false,
        new Map([
            ['II', 'II'],
            ['IX', 'ERR:IX'],
            ['IY', 'IY'],
            ['IZ', 'ERR:IZ'],

            ['XI', 'ERR:XI'],
            ['XX', 'XX'],
            ['XY', 'ERR:XY'],
            ['XZ', 'XZ'],

            ['YI', 'YI'],
            ['YX', 'ERR:YX'],
            ['YY', 'YY'],
            ['YZ', 'ERR:YZ'],

            ['ZI', 'ERR:ZI'],
            ['ZX', 'ZX'],
            ['ZY', 'ERR:ZY'],
            ['ZZ', 'ZZ'],
        ]),
        (frame, targets) => frame.do_measure('YY', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillRect(x2 - rad, y2 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeRect(x2 - rad, y2 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MYY', x1, y1);
            ctx.fillText('MYY', x2, y2);
        },
    );
    yield new Gate(
        'MZZ',
        2,
        true,
        false,
        new Map([
            ['II', 'II'],
            ['IX', 'ERR:IX'],
            ['IY', 'ERR:IY'],
            ['IZ', 'IZ'],

            ['XI', 'ERR:XI'],
            ['XX', 'XX'],
            ['XY', 'XY'],
            ['XZ', 'ERR:XZ'],

            ['YI', 'ERR:YI'],
            ['YX', 'YX'],
            ['YY', 'YY'],
            ['YZ', 'ERR:YZ'],

            ['ZI', 'ZI'],
            ['ZX', 'ERR:ZX'],
            ['ZY', 'ERR:ZY'],
            ['ZZ', 'ZZ'],
        ]),
        (frame, targets) => frame.do_measure('ZZ', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillRect(x2 - rad, y2 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeRect(x2 - rad, y2 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MZZ', x1, y1);
            ctx.fillText('MZZ', x2, y2);
        },
    );
}

function *iter_gates_paulis() {
    yield new Gate(
        'I',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Z', 'Z'],
        ]),
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'white';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('I', x1, y1);
        },
    );
    yield new Gate(
        'X',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Z', 'Z'],
        ]),
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'white';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('X', x1, y1);
        },
    );
    yield new Gate(
        'Y',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Z', 'Z'],
        ]),
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'white';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('Y', x1, y1);
        },
    );
    yield new Gate(
        'Z',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Z', 'Z'],
        ]),
        () => {},
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'white';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('Z', x1, y1);
        },
    );
}

function *iter_gates_quarter_turns() {
    yield new Gate(
        'S',
        1,
        true,
        false,
        new Map([
            ['X', 'Y'],
            ['Z', 'Z'],
        ]),
        (frame, targets) => frame.do_exchange_xy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('S', x1, y1);
        },
    );
    yield new Gate(
        'S_DAG',
        1,
        true,
        false,
        new Map([
            ['X', 'Y'],
            ['Z', 'Z'],
        ]),
        (frame, targets) => frame.do_exchange_xy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('S†', x1, y1);
        },
    );

    yield new Gate(
        'SQRT_X',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Z', 'Y'],
        ]),
        (frame, targets) => frame.do_exchange_yz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('√X', x1, y1);
        },
    );
    yield new Gate(
        'SQRT_X_DAG',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Z', 'Y'],
        ]),
        (frame, targets) => frame.do_exchange_yz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('√X†', x1, y1);
        },
    );

    yield new Gate(
        'SQRT_Y',
        1,
        true,
        false,
        new Map([
            ['X', 'Z'],
            ['Z', 'X'],
        ]),
        (frame, targets) => frame.do_exchange_xz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('√Y', x1, y1);
        },
    );
    yield new Gate(
        'SQRT_Y_DAG',
        1,
        true,
        false,
        new Map([
            ['X', 'Z'],
            ['Z', 'X'],
        ]),
        (frame, targets) => frame.do_exchange_xz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('√Y†', x1, y1);
        },
    );
}

function *iter_gates_resets() {
    yield new Gate(
        'R',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:I'],
            ['Y', 'ERR:I'],
            ['Z', 'ERR:I'],
        ]),
        (frame, targets) => frame.do_discard(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('R', x1, y1);
        },
    );
    yield new Gate(
        'RX',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:I'],
            ['Y', 'ERR:I'],
            ['Z', 'ERR:I'],
        ]),
        (frame, targets) => frame.do_discard(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('RX', x1, y1);
        },
    );
    yield new Gate(
        'RY',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:I'],
            ['Y', 'ERR:I'],
            ['Z', 'ERR:I'],
        ]),
        (frame, targets) => frame.do_discard(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('RY', x1, y1);
        },
    );
}

function *iter_gates_solo_measurements() {
    yield new Gate(
        'M',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:X'],
            ['Y', 'ERR:Y'],
            ['Z', 'Z'],
        ]),
        (frame, targets) => frame.do_measure('Z', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('M', x1, y1);
            ctx.textAlign = "left";
        },
    );
    yield new Gate(
        'MX',
        1,
        true,
        false,
        new Map([
            ['X', 'X'],
            ['Y', 'ERR:Y'],
            ['Z', 'ERR:Z'],
        ]),
        (frame, targets) => frame.do_measure('X', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MX', x1, y1);
            ctx.textAlign = "left";
        },
    );
    yield new Gate(
        'MY',
        1,
        true,
        false,
        new Map([
            ['X', 'ERR:X'],
            ['Y', 'Y'],
            ['Z', 'ERR:Z'],
        ]),
        (frame, targets) => frame.do_measure('Y', targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'gray';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('MY', x1, y1);
            ctx.textAlign = "left";
        },
    );
}

function *iter_gates_sqrt_pauli_pairs() {
    yield new Gate(
        'SQRT_XX',
        2,
        true,
        false,
        new Map([
            ['IX', 'IX'],
            ['IZ', 'XY'],
            ['XI', 'XI'],
            ['ZI', 'YX'],
        ]),
        (frame, targets) => frame.do_sqrt_xx(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            for (let [x, y] of [[x1, y1], [x2, y2]]) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.fillStyle = 'black';
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText('√XX', x, y);
            }
        },
    );
    yield new Gate(
        'SQRT_XX_DAG',
        2,
        true,
        false,
        new Map([
            ['IX', 'IX'],
            ['IZ', 'XY'],
            ['XI', 'XI'],
            ['ZI', 'YX'],
        ]),
        (frame, targets) => frame.do_sqrt_xx(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            for (let [x, y] of [[x1, y1], [x2, y2]]) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.fillStyle = 'black';
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText('√XX†', x, y);
            }
        },
    );

    yield new Gate(
        'SQRT_YY',
        2,
        true,
        false,
        new Map([
            ['IX', 'YZ'],
            ['IZ', 'YX'],
            ['XI', 'ZY'],
            ['ZI', 'XY'],
        ]),
        (frame, targets) => frame.do_sqrt_yy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            for (let [x, y] of [[x1, y1], [x2, y2]]) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.fillStyle = 'black';
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText('√YY', x, y);
            }
        },
    );
    yield new Gate(
        'SQRT_YY_DAG',
        2,
        true,
        false,
        new Map([
            ['IX', 'YZ'],
            ['IZ', 'YX'],
            ['XI', 'ZY'],
            ['ZI', 'XY'],
        ]),
        (frame, targets) => frame.do_sqrt_yy(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            for (let [x, y] of [[x1, y1], [x2, y2]]) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.fillStyle = 'black';
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText('√YY†', x, y);
            }
        },
    );

    yield new Gate(
        'SQRT_ZZ',
        2,
        true,
        false,
        new Map([
            ['IX', 'ZY'],
            ['IZ', 'IZ'],
            ['XI', 'YZ'],
            ['ZI', 'ZI'],
        ]),
        (frame, targets) => frame.do_sqrt_zz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            for (let [x, y] of [[x1, y1], [x2, y2]]) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.fillStyle = 'black';
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText('√ZZ', x, y);
            }
        },
    );
    yield new Gate(
        'SQRT_ZZ_DAG',
        2,
        true,
        false,
        new Map([
            ['IX', 'ZY'],
            ['IZ', 'IZ'],
            ['XI', 'YZ'],
            ['ZI', 'ZI'],
        ]),
        (frame, targets) => frame.do_sqrt_zz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);

            draw_connector(ctx, x1, y1, x2, y2);

            for (let [x, y] of [[x1, y1], [x2, y2]]) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x - rad, y - rad, rad * 2, rad * 2);
                ctx.fillStyle = 'black';
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText('√ZZ†', x, y);
            }
        },
    );
}

function *iter_gates_swaps() {
    yield new Gate(
        'ISWAP',
        2,
        true,
        false,
        new Map([
            ['IX', 'YZ'],
            ['IZ', 'ZI'],
            ['XI', 'ZY'],
            ['ZI', 'IZ'],
        ]),
        (frame, targets) => frame.do_iswap(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_iswap_control(ctx, x1, y1);
            draw_iswap_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'ISWAP_DAG',
        2,
        true,
        false,
        new Map([
            ['IX', 'YZ'],
            ['IZ', 'ZI'],
            ['XI', 'ZY'],
            ['ZI', 'IZ'],
        ]),
        (frame, targets) => frame.do_iswap(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_iswap_control(ctx, x1, y1);
            draw_iswap_control(ctx, x2, y2);
        },
    );
    yield new Gate(
        'SWAP',
        2,
        true,
        false,
        new Map([
            ['IX', 'XI'],
            ['IZ', 'ZI'],
            ['XI', 'IX'],
            ['ZI', 'IZ'],
        ]),
        (frame, targets) => frame.do_swap(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            let [x2, y2] = coordFunc(op.id_targets[1]);
            draw_connector(ctx, x1, y1, x2, y2);
            draw_swap_control(ctx, x1, y1);
            draw_swap_control(ctx, x2, y2);
        },
    );
}

function *iter_gates_third_turns() {
    yield new Gate(
        'C_XYZ',
        1,
        true,
        false,
        new Map([
            ['X', 'Y'],
            ['Z', 'X'],
        ]),
        (frame, targets) => frame.do_cycle_xyz(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'teal';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('C', x1, y1 - rad / 3);
            ctx.fillText("XYZ", x1, y1 + rad / 3);
        },
    );
    yield new Gate(
        'C_ZYX',
        1,
        true,
        false,
        new Map([
            ['X', 'Z'],
            ['Z', 'Y'],
        ]),
        (frame, targets) => frame.do_cycle_zyx(targets),
        (op, coordFunc, ctx) => {
            let [x1, y1] = coordFunc(op.id_targets[0]);
            ctx.fillStyle = 'teal';
            ctx.fillRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x1 - rad, y1 - rad, rad*2, rad*2);
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText('C', x1, y1 - rad / 3);
            ctx.fillText("ZYX", x1, y1 + rad / 3);
        },
    );
}

function *iter_gates() {
    yield *iter_gates_controlled_paulis();
    yield *iter_gates_demolition_measurements();
    yield *iter_gates_hadamard_likes();
    yield *iter_gates_markers();
    yield *iter_gates_pair_measurements();
    yield *iter_gates_paulis();
    yield *iter_gates_quarter_turns();
    yield *iter_gates_resets();
    yield *iter_gates_solo_measurements();
    yield *iter_gates_sqrt_pauli_pairs();
    yield *iter_gates_swaps();
    yield *iter_gates_third_turns();
}

/**
 * @returns {!Map<!string, !Gate>}
 */
function make_gate_map() {
    let result = new Map();
    for (let gate of iter_gates()) {
        result.set(gate.name, gate);
    }
    return result;
}
const GATE_MAP = /** @type {Map<!string, !Gate>} */ make_gate_map();

class Layer {
    constructor() {
        this.id_ops = /** @type {!Map<!int, !Operation>} */ new Map();
        this.markers /** @type {!Array<!Operation>} */ = [];
    }

    /**
     * @returns {!Layer}
     */
    copy() {
        let result = new Layer();
        result.id_ops = new Map(this.id_ops);
        result.markers = [...this.markers];
        return result;
    }

    /**
     * @return {!boolean}
     */
    empty() {
        return this.id_ops.size === 0 && this.markers.length === 0;
    }

    /**
     * @param {!function(op: !Operation): !boolean} predicate
     * @returns {!Layer}
     */
    id_filtered(predicate) {
        let newLayer = new Layer();
        for (let op of this.id_ops.values()) {
            if (predicate(op)) {
                newLayer.put(op);
            }
        }
        for (let op of this.markers) {
            if (predicate(op)) {
                newLayer.markers.push(op);
            }
        }
        return newLayer;
    }

    /**
     * @param {!function(qubit: !int): !boolean} predicate
     * @returns {!Layer}
     */
    id_filteredByQubit(predicate) {
        return this.id_filtered(op => !op.id_targets.every(q => !predicate(q)));
    }

    /**
     * @param {!Map<!int, !string>} before
     * @param {!int} marker_index
     * @returns {!Map<!int, !string>}
     */
    id_pauliFrameAfter(before, marker_index) {
        let after = new Map();
        let handled = new Set();

        for (let k of before.keys()) {
            let v = before.get(k);
            let op = this.id_ops.get(k);
            if (op !== undefined) {
                let b = '';
                for (let q of op.id_targets) {
                    if (handled.has(q)) ;
                    handled.add(q);
                    let r = before.get(q);
                    if (r === undefined) {
                        r = 'I';
                    }
                    b += r;
                }
                let a = op.pauliFrameAfter(b);
                let hasErr = a.startsWith('ERR:');
                for (let qi = 0; qi < op.id_targets.length; qi++) {
                    let q = op.id_targets[qi];
                    if (hasErr) {
                        after.set(q, 'ERR:' + a[4 + qi]);
                    } else {
                        after.set(q, a[qi]);
                    }
                }
            } else {
                after.set(k, v);
            }
        }

        for (let op of this.markers) {
            if (op.gate.name === 'MARKX' && op.args[0] === marker_index) {
                let key = op.id_targets[0];
                let pauli = after.get(key);
                if (pauli === undefined || pauli === 'I') {
                    pauli = 'X';
                } else if (pauli === 'X') {
                    pauli = 'I';
                } else if (pauli === 'Y') {
                    pauli = 'Z';
                } else if (pauli === 'Z') {
                    pauli = 'Y';
                }
                after.set(key, pauli);
            } else if (op.gate.name === 'MARKY' && op.args[0] === marker_index) {
                let key = op.id_targets[0];
                let pauli = after.get(key);
                if (pauli === undefined || pauli === 'I') {
                    pauli = 'Y';
                } else if (pauli === 'X') {
                    pauli = 'Z';
                } else if (pauli === 'Y') {
                    pauli = 'I';
                } else if (pauli === 'Z') {
                    pauli = 'X';
                }
                after.set(key, pauli);
            } else if (op.gate.name === 'MARKZ' && op.args[0] === marker_index) {
                let key = op.id_targets[0];
                let pauli = after.get(key);
                if (pauli === undefined || pauli === 'I') {
                    pauli = 'Z';
                } else if (pauli === 'X') {
                    pauli = 'Y';
                } else if (pauli === 'Y') {
                    pauli = 'X';
                } else if (pauli === 'Z') {
                    pauli = 'I';
                }
                after.set(key, pauli);
            }
        }

        return after;
    }

    /**
     * @returns {!boolean}
     */
    isEmpty() {
        return this.id_ops.size === 0 && this.markers.length === 0;
    }

    /**
     * @param {!int} qubit
     * @returns {!Operation|undefined}
     */
    id_pop_at(qubit) {
        this.markers = this.markers.filter(op => op.id_targets.indexOf(qubit) === -1);
        if (this.id_ops.has(qubit)) {
            let op = this.id_ops.get(qubit);
            for (let t of op.id_targets) {
                this.id_ops.delete(t);
            }
            return op;
        }
        return undefined;
    }

    /**
     * @param {!int} q
     * @param {undefined|!int} index
     */
    id_dropMarkersAt(q, index=undefined) {
        this.markers = this.markers.filter(op => {
            if (index !== undefined && op.args[0] !== index) {
                return true;
            }
            if (op.gate.name !== 'MARKX' && op.gate.name !== 'MARKY' && op.gate.name !== 'MARKZ') {
                return true;
            }
            return op.id_targets[0] !== q;
        });
    }

    /**
     * @param {!Operation} op
     * @param {!boolean=true} allow_overwrite
     */
    put(op, allow_overwrite=true) {
        if (op.gate.is_marker) {
            if (op.gate.name === 'MARKX' || op.gate.name === 'MARKY' || op.gate.name === 'MARKZ') {
                this.id_dropMarkersAt(op.id_targets[0], op.args[0]);
            }
            this.markers.push(op);
            return;
        }

        for (let t of op.id_targets) {
            if (this.id_ops.has(t)) {
                if (allow_overwrite) {
                    this.id_pop_at(t);
                } else {
                    throw new Error("Collision");
                }
            }
        }
        for (let t of op.id_targets) {
            this.id_ops.set(t, op);
        }
    }

    /**
     * @returns {!Iterator<!Operation>}
     */
    *iter_gates_and_markers() {
        for (let t of this.id_ops.keys()) {
            let op = this.id_ops.get(t);
            if (op.id_targets[0] === t) {
                yield op;
            }
        }
        yield *this.markers;
    }
}

/**
 * @param {!Iterator<TItem>}items
 * @param {!function(item: TItem): TKey} func
 * @returns {!Map<TKey, !Array<TItem>>}
 * @template TItem
 * @template TKey
 */
function groupBy(items, func) {
    let result = new Map();
    for (let item of items) {
        let key = func(item);
        let group = result.get(key);
        if (group === undefined) {
            result.set(key, [item]);
        } else {
            group.push(item);
        }
    }
    return result;
}

class Circuit {
    /**
     * @param {!Float64Array} qubitCoordData
     * @param {!Array<!Layer>} layers
     */
    constructor(qubitCoordData, layers = []) {
        if (!(qubitCoordData instanceof Float64Array)) {
            throw new Error('!(qubitCoords instanceof Float64Array)');
        }
        if (!Array.isArray(layers)) {
            throw new Error('!Array.isArray(layers)');
        }
        if (!layers.every(e => e instanceof Layer)) {
            throw new Error('!layers.every(e => e instanceof Layer)');
        }
        this.qubitCoordData = qubitCoordData;
        this.layers = layers;
    }

    /**
     * @param {!string} stimCircuit
     * @returns {!Circuit}
     */
    static fromStimCircuit(stimCircuit) {
        let lines = stimCircuit.replaceAll(';', '\n').
            replaceAll('_', ' ').
            replaceAll('Q(', 'QUBIT_COORDS(').
            replaceAll('DT', 'DETECTOR').
            replaceAll(' COORDS', '_COORDS').
            replaceAll(' ERROR', '_ERROR').
            replaceAll('C XYZ', 'C_XYZ').
            replaceAll('H XY', 'H_XY').
            replaceAll('H YZ', 'H_YZ').
            replaceAll(' INCLUDE', '_INCLUDE').
            replaceAll('SQRT ', 'SQRT_').
            replaceAll(' DAG ', '_DAG ').
            replaceAll('C ZYX', 'C_ZYX').split('\n');
        let layers = [new Layer()];
        let i2q = new Map();
        let used_positions = new Set();
        let next_auto_position_x = 0;
        let ensure_has_coords = t => {
            while (!i2q.has(t)) {
                let k = `${next_auto_position_x},0`;
                if (!used_positions.has(k)) {
                    used_positions.add(k);
                    i2q.set(t, [next_auto_position_x, 0]);
                }
                next_auto_position_x++;
            }
        };

        let findEndOfBlock = (lines, startIndex, endIndex) => {
            let nestLevel = 0;
            for (let k = startIndex; k < endIndex; k++) {
                let line = lines[k];
                line = line.split('#')[0].trim();
                if (line.toLowerCase().startsWith("repeat ")) {
                    nestLevel++;
                } else if (line === '}') {
                    nestLevel--;
                    if (nestLevel === 0) {
                        return k;
                    }
                }
            }
            throw Error("Repeat block didn't end");
        };

        let processLineChunk = (lines, startIndex, endIndex, repetitions) => {
            if (!layers[layers.length - 1].empty()) {
                layers.push(new Layer());
            }
            for (let rep = 0; rep < repetitions; rep++) {
                for (let k = startIndex; k < endIndex; k++) {
                    let line = lines[k];
                    line = line.split('#')[0].trim();
                    if (line.toLowerCase().startsWith("repeat ")) {
                        let reps = parseInt(line.split(" ")[1]);
                        let k2 = findEndOfBlock(lines, k, endIndex);
                        processLineChunk(lines, k + 1, k2, reps);
                        k = k2;
                    } else {
                        processLine(line);
                    }
                }
                if (!layers[layers.length - 1].empty()) {
                    layers.push(new Layer());
                }
            }
        };

        let processLine = line => {
            let args = [];
            let targets = [];
            let name = '';
            if (line.indexOf(')') !== -1) {
                let [ab, c] = line.split(')');
                let [a, b] = ab.split('(');
                name = a.trim();
                args = b.split(',').map(e => e.trim()).map(parseFloat);
                targets = c.split(' ').map(e => e.trim()).filter(e => e !== '');
            } else {
                let ab = line.split(' ').map(e => e.trim()).filter(e => e !== '');
                if (ab.length === 0) {
                    return;
                }
                let [a, ...b] = ab;
                name = a.trim();
                args = [];
                targets = b.map(e => e.trim()).filter(e => e !== '');
            }
            let reverse_pairs = false;
            if (name === '') {
                return;
            } else if (name === 'XCZ') {
                reverse_pairs = true;
                name = 'CX';
            } else if (name === 'SWAPCX') {
                reverse_pairs = true;
                name = 'CXSWAP';
            } else if (name === 'CNOT') {
                name = 'CX';
            } else if (name === 'RZ') {
                name = 'R';
            } else if (name === 'MZ') {
                name = 'M';
            } else if (name === 'MRZ') {
                name = 'MR';
            } else if (name === 'ZCX') {
                name = 'CX';
            } else if (name === 'ZCY') {
                name = 'CY';
            } else if (name === 'ZCZ') {
                name = 'CZ';
            } else if (name === 'YCX') {
                reverse_pairs = true;
                name = 'XCY';
            } else if (name === 'YCZ') {
                reverse_pairs = true;
                name = 'CY';
            } else if (name === 'TICK') {
                layers.push(new Layer());
                return;
            } else if (name === 'MPP') {
                layers[layers.length - 1];
                for (let targ of targets) {
                    let name = 'M';
                    let qubits = [];
                    for (let term of targ.split('*')) {
                        name += term[0];
                        qubits.push(term.substring(1));
                    }
                    let gate = GATE_MAP.get(name);
                    let a = new Float32Array(args);
                    let layer = layers[layers.length - 1];
                    if (gate !== undefined) {
                        layer.put(new Operation(gate, a, new Uint32Array(qubits)));
                    } else {
                        console.warn("SPLIT MPP INTO INDIVIDUAL MEASUREMENTS");
                        for (let k = 0; k < name.length - 1; k++) {
                            let sub_gate = 'M' + name[k+1];
                            if (sub_gate === 'MZ') {
                                sub_gate = 'M';
                            }
                            gate = GATE_MAP.get(sub_gate);
                            layer.put(new Operation(gate, a, new Uint32Array(qubits[k])));
                        }
                    }
                }
                return;
            } else if (name === "X_ERROR" ||
                       name === "Y_ERROR" ||
                       name === "Z_ERROR" ||
                       name === "DETECTOR" ||
                       name === "OBSERVABLE_INCLUDE" ||
                       name === "DEPOLARIZE1" ||
                       name === "DEPOLARIZE2" ||
                       name === "SHIFT_COORDS" ||
                       name === "REPEAT" ||
                       name === "}") {
                return;
            } else if (name.startsWith('QUBIT_COORDS')) {
                let x = args.length < 1 ? 0 : args[0];
                let y = args.length < 2 ? 0 : args[1];
                for (let targ of targets) {
                    let t = parseInt(targ);
                    if (i2q.has(t)) {
                        console.warn(`Ignoring "${line}" because there's already coordinate data for qubit ${t}.`);
                    } else if (used_positions.has(`${x},${y}`)) {
                        console.warn(`Ignoring "${line}" because there's already a qubit placed at ${x},${y}.`);
                    } else {
                        i2q.set(t, [x, y]);
                        used_positions.add(`${x},${y}`);
                    }
                }
                return;
            }

            let ignored = false;
            for (let targ of targets) {
                if (targ.startsWith("rec[")) {
                    if (name === "CX" || name === "CY" || name === "CZ" || name === "ZCX" || name === "ZCY") {
                        ignored = true;
                        break;
                    }
                }
                let t = parseInt(targ);
                if (typeof parseInt(targ) !== 'number') {
                    throw new Error(line);
                }
                ensure_has_coords(t);
            }
            if (ignored) {
                console.warn("IGNORED", name);
                return;
            }

            let gate = GATE_MAP.get(name);
            if (gate === undefined) {
                throw new Error("Unrecognized gate name in " + line);
            }
            let a = new Float32Array(args);

            let layer = layers[layers.length - 1];
            if (gate.num_qubits === undefined) {
                layer.put(new Operation(gate, a, new Uint32Array(targets)));
            } else {
                if (targets.length % gate.num_qubits !== 0) {
                    throw new Error("Incorrect number of targets in line " + line);
                }
                for (let k = 0; k < targets.length; k += gate.num_qubits) {
                    let sub_targets = targets.slice(k, k + gate.num_qubits);
                    if (reverse_pairs) {
                        sub_targets.reverse();
                    }
                    let qs = new Uint32Array(sub_targets);
                    try {
                        layer.put(new Operation(gate, a, qs), false);
                    } catch (_) {
                        layers.push(new Layer());
                        layer = layers[layers.length - 1];
                        layer.put(new Operation(gate, a, qs), false);
                    }
                }
            }
        };

        processLineChunk(lines, 0, lines.length, 1);
        if (layers.length > 0 && layers[layers.length - 1].isEmpty()) {
            layers.pop();
        }

        let numQubits = Math.max(...i2q.keys(), 0) + 1;
        let qubitCoords = new Float64Array(numQubits*2);
        for (let q = 0; q < numQubits; q++) {
            ensure_has_coords(q);
            let [x, y] = i2q.get(q);
            qubitCoords[2*q] = x;
            qubitCoords[2*q + 1] = y;
        }

        return new Circuit(qubitCoords, layers);
    }

    /**
     * @returns {!Set<!int>}
     */
    allQubits() {
        let result = new Set();
        for (let layer of this.layers) {
            for (let op of layer.iter_gates_and_markers()) {
                for (let t of op.id_targets) {
                    result.add(t);
                }
            }
         }
        return result;
    }

    /**
     * @returns {!Circuit}
     */
    rotated45() {
        return this.afterCoordTransform((x, y) => [x - y, x + y]);
    }

    coordTransformForRectification() {
        let coordSet = new Map();
        for (let k = 0; k < this.qubitCoordData.length; k += 2) {
            let x = this.qubitCoordData[k];
            let y = this.qubitCoordData[k+1];
            coordSet.set(`${x},${y}`, [x, y]);
        }
        let minX = Infinity;
        let minY = Infinity;
        let step = 256;
        for (let [x, y] of coordSet.values()) {
            minX = Math.min(x, minX);
            minY = Math.min(y, minY);
            while ((x % step !== 0 || y % step !== 0) && step > 1 / 256) {
                step /= 2;
            }
        }
        let scale;
        if (step <= 1 / 256) {
            scale = 1;
        } else {
            scale = 1 / step;
            let mask = 0;
            for (let [x, y] of coordSet.values()) {
                let b1 = (x - minX + y - minY) % (2 * step);
                let b2 = (x - minX - y + minY) % (2 * step);
                mask |= b1 === 0 ? 1 : 2;
                mask |= b2 === 0 ? 4 : 8;
            }
            if (mask === (1 | 4)) {
                scale /= 2;
            } else if (mask === (2 | 8)) {
                minX -= step;
                scale /= 2;
            }
        }

        let offsetX = -minX;
        let offsetY = -minY;
        return (x, y) => [(x + offsetX) * scale, (y + offsetY) * scale];
    }

    /**
     * @returns {!Circuit}
     */
    afterRectification() {
        return this.afterCoordTransform(this.coordTransformForRectification());
    }

    /**
     * @param {!number} dx
     * @param {!number} dy
     * @returns {!Circuit}
     */
    shifted(dx, dy) {
        return this.afterCoordTransform((x, y) => [x + dx, y + dy]);
    }

    /**
     * @return {!Circuit}
     */
    copy() {
        return this.shifted(0, 0);
    }

    /**
     * @param {!function(!number, !number): ![!number, !number]} coordTransform
     * @returns {!Circuit}
     */
    afterCoordTransform(coordTransform) {
        let newCoords = new Float64Array(this.qubitCoordData.length);
        for (let k = 0; k < this.qubitCoordData.length; k += 2) {
            let x = this.qubitCoordData[k];
            let y = this.qubitCoordData[k + 1];
            let [x2, y2] = coordTransform(x, y);
            newCoords[k] = x2;
            newCoords[k + 1] = y2;
        }
        let newLayers = this.layers.map(e => e.copy());
        return new Circuit(newCoords, newLayers);
    }

    /**
     * @returns {!string}
     */
    toStimCircuit() {
        let usedQubits = new Set();
        for (let layer of this.layers) {
            for (let op of layer.iter_gates_and_markers()) {
                for (let t of op.id_targets) {
                    usedQubits.add(t);
                }
            }
        }

        let packedQubitCoords = [];
        for (let q of usedQubits) {
            let x = this.qubitCoordData[2*q];
            let y = this.qubitCoordData[2*q+1];
            packedQubitCoords.push({q, x, y});
        }
        packedQubitCoords.sort((a, b) => {
            if (a.x !== b.x) {
                return a.x - b.x;
            }
            if (a.y !== b.y) {
                return a.y - b.y;
            }
            return a.q - b.q;
        });
        let old2new = new Map();
        let out = [];
        for (let q = 0; q < packedQubitCoords.length; q++) {
            let {q: old_q, x, y} = packedQubitCoords[q];
            old2new.set(old_q, q);
            out.push(`QUBIT_COORDS(${x}, ${y}) ${q}`);
        }

        for (let layer of this.layers) {
            let opsByName = groupBy(layer.iter_gates_and_markers(), op => {
                let key = op.gate.name;
                if (op.args.length > 0) {
                    key += '(' + [...op.args].join(',') + ')';
                }
                return key;
            });
            let namesWithArgs = [...opsByName.keys()];
            namesWithArgs.sort((a, b) => {
                let ma = a.startsWith('MARK') || a.startsWith('POLY');
                let mb = b.startsWith('MARK') || b.startsWith('POLY');
                if (ma !== mb) {
                    return ma < mb ? -1 : +1;
                }
                return a < b ? -1 : a > b ? +1 : 0;
            });

            for (let nameWithArgs of namesWithArgs) {
                let group = opsByName.get(nameWithArgs);
                let targetGroups = [];

                if (GATE_MAP.get(nameWithArgs.split('(')[0]).can_fuse) {
                    let flatTargetGroups = [];
                    for (let op of group) {
                        flatTargetGroups.push(...op.id_targets);
                    }
                    targetGroups.push(flatTargetGroups);
                } else {
                    for (let op of group) {
                        targetGroups.push([...op.id_targets]);
                    }
                }

                for (let targetGroup of targetGroups) {
                    let line = [nameWithArgs];
                    for (let t of targetGroup) {
                        line.push(old2new.get(t));
                    }
                    out.push(line.join(' '));
                }
            }
            out.push(`TICK`);
        }
        while (out.length > 0 && out[out.length - 1] === 'TICK') {
            out.pop();
        }

        return out.join('\n');
    }

    /**
     * @param {!Iterable<![!number, !number]>} coords
     */
    withCoordsIncluded(coords) {
        let coordMap = this.coordToQubitMap();
        let extraCoordData = [];
        for (let [x, y] of coords) {
            let key = `${x},${y}`;
            if (!coordMap.has(key)) {
                coordMap.set(key, coordMap.size);
                extraCoordData.push(x, y);
            }
        }
        return new Circuit(
            new Float64Array([...this.qubitCoordData, ...extraCoordData]),
            this.layers.map(e => e.copy()),
        );
    }

    /**
     * @returns {!Map<!string, !int>}
     */
    coordToQubitMap() {
        let result = new Map();
        for (let q = 0; q < this.qubitCoordData.length; q += 2) {
            let x = this.qubitCoordData[q];
            let y = this.qubitCoordData[q + 1];
            result.set(`${x},${y}`, q / 2);
        }
        return result;
    }

    /**
     * @returns {!string}
     */
    toString() {
        return this.toStimCircuit();
    }

    /**
     * @param {*} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        if (!(other instanceof Circuit)) {
            return false;
        }
        return this.toStimCircuit() === other.toStimCircuit();
    }
}

class PropagatedPauliFrameLayer {
    /**
     * @param {!Map<!int, !string>} bases
     * @param {!Set<!int>} errors
     * @param {!Array<!{q1: !int, q2: !int, color: !string}>} crossings
     */
    constructor(bases, errors, crossings) {
        this.bases = bases;
        this.errors = errors;
        this.crossings = crossings;
    }
}

class PropagatedPauliFrames {
    /**
     * @param {!Map<!int, !PropagatedPauliFrameLayer>} layers
     */
    constructor(layers) {
        this.id_layers = layers;
    }

    /**
     * @param {!int} layer
     */
    atLayer(layer) {
        let result = this.id_layers.get(layer);
        if (result === undefined) {
            result = new PropagatedPauliFrameLayer(new Map(), new Set(), []);
        }
        return result;
    }

    /**
     * @param {!Circuit} circuit
     * @param {!int} marker_index
     * @returns {!PropagatedPauliFrames}
     */
    static fromCircuit(circuit, marker_index) {
        let result = new PropagatedPauliFrames(new Map());

        let bases = /** @type {!Map<!int, !string>} */ new Map();
        for (let k = 0; k < circuit.layers.length; k++) {
            let layer = circuit.layers[k];
            let prevBases = bases;
            bases = layer.id_pauliFrameAfter(bases, marker_index);

            let errors = new Set();
            for (let key of [...bases.keys()]) {
                let val = bases.get(key);
                if (val.startsWith('ERR:')) {
                    errors.add(key);
                    bases.set(key, val.substring(4));
                }
                if (bases.get(key) === 'I') {
                    bases.delete(key);
                }
            }

            let crossings = /** @type {!Array<!{q1: !int, q2: !int, color: !string}>} */ [];
            for (let op of layer.iter_gates_and_markers()) {
                if (op.gate.num_qubits === 2 && !op.gate.is_marker) {
                    let [q1, q2] = op.id_targets;
                    let differences = new Set();
                    for (let t of op.id_targets) {
                        let b1 = bases.get(t);
                        let b2 = prevBases.get(t);
                        if (b1 !== b2) {
                            if (b1 !== undefined) {
                                differences.add(b1);
                            }
                            if (b2 !== undefined) {
                                differences.add(b2);
                            }
                        }
                    }
                    if (differences.size > 0) {
                        let color = 'I';
                        if (differences.size === 1) {
                            color = [...differences][0];
                        }
                        crossings.push({q1, q2, color});
                    }
                }
            }

            if (bases.size > 0 || errors.size > 0 || crossings.size > 0) {
                result.id_layers.set(k, new PropagatedPauliFrameLayer(bases, errors, crossings));
            }
        }
        return result;
    }
}

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

function gradeAnswer(graderConfig, sessionConfig, answer) {

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

}

exports.gradeAnswer = gradeAnswer;

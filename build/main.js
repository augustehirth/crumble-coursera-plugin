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
 * @param {!Iterable<![!number, !number]>} xys
 * @returns {![undefined | !number, undefined | !number]}
 */
function minXY(xys) {
    let minX = undefined;
    let minY = undefined;
    for (let [vx, vy] of xys) {
        if (minX === undefined || vx < minX || (vx === minX && vy < minY)) {
            minX = vx;
            minY = vy;
        }
    }
    return [minX, minY];
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

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const COLLECTION_CUTOFF = 1000;
const BAD_TO_STRING_RESULT = new (function(){})().toString();
const RECURSE_LIMIT_DESCRIPTION = "!recursion-limit!";
const DEFAULT_RECURSION_LIMIT = 10;

function try_describe_atomic(value) {
    if (value === null) {
        return "null";
    }
    if (value === undefined) {
        return "undefined";
    }
    if (typeof value === "string") {
        return `"${value}"`;
    }
    if (typeof value === "number") {
        return "" + value;
    }
    return undefined;
}
function try_describe_collection(value, recursionLimit) {
    if (recursionLimit === 0) {
        return RECURSE_LIMIT_DESCRIPTION;
    }
    if (value instanceof Map) {
        return describe_Map(value, recursionLimit);
    }
    if (value instanceof Set) {
        return describe_Set(value, recursionLimit);
    }
    if (value[Symbol.iterator] !== undefined) {
        return describe_Iterable(value, recursionLimit);
    }
    return undefined;
}
function describe_fallback(value, recursionLimit) {
    try {
        let defaultString = String(value);
        if (defaultString !== BAD_TO_STRING_RESULT) {
            return defaultString;
        }
    } catch {
    }
    return describe_Object(value, recursionLimit);
}

/**
 * Attempts to give a useful and unambiguous description of the given value.
 *
 * @param {*} value
 * @param {!int=} recursionLimit
 * @returns {!string}
 */
function describe(value, recursionLimit = DEFAULT_RECURSION_LIMIT) {
    return try_describe_atomic(value) ||
        try_describe_collection(value, recursionLimit) ||
        describe_fallback(value, recursionLimit);
}

/**
 * @param {!Map} map
 * @param {!int} limit
 * @returns {!string}
 */
function describe_Map(map, limit) {
    let entries = [];
    for (let [k, v] of map.entries()) {
        if (entries.length > COLLECTION_CUTOFF) {
            entries.push("[...]");
            break;
        }
        //noinspection JSUnusedAssignment
        let keyDesc = describe(k, limit - 1);
        //noinspection JSUnusedAssignment
        let valDesc = describe(v, limit - 1);
        entries.push(`${keyDesc}: ${valDesc}`);
    }
    return `Map{${entries.join(", ")}}`;
}

/**
 * @param {!Set} set
 * @param {!int} limit
 * @returns {!string}
 */
function describe_Set(set, limit) {
    let entries = [];
    for (let e of set) {
        if (entries.length > COLLECTION_CUTOFF) {
            entries.push("[...]");
            break;
        }
        entries.push(describe(e, limit - 1));
    }
    return `Set{${entries.join(", ")}}`;
}

/**
 * @param {!Iterable} seq
 * @param {!int} limit
 * @returns {!string}
 */
function describe_Iterable(seq, limit) {
    let entries = [];
    for (let e of seq) {
        if (entries.length > COLLECTION_CUTOFF) {
            entries.push("[...]");
            break;
        }
        entries.push(describe(e, limit - 1));
    }
    let prefix = Array.isArray(seq) ? "" : seq.constructor.name;
    return `${prefix}[${entries.join(", ")}]`;
}

/**
 * @param {*} value
 * @param {!int} limit
 * @returns {!string}
 */
function describe_Object(value, limit) {
    let entries = [];
    for (let k in value) {
        if (!value.hasOwnProperty(k)) {
            continue;
        }
        if (entries.length > COLLECTION_CUTOFF) {
            entries.push("[...]");
            break;
        }
        let v = value[k];
        let keyDesc = describe(k, limit - 1);
        let valDesc = describe(v, limit - 1);
        entries.push(`${keyDesc}: ${valDesc}`);
    }

    if (value.constructor === undefined) {
        return `[an unknown non-primitive value with no constructor]`;
    }
    let typeName = value.constructor.name;
    let prefix = typeName === {}.constructor.name ? "" : `(Type: ${typeName})`;
    return `${prefix}{${entries.join(", ")}}`;
}

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Determines if two values are currently equivalent.
 *
 * Values that are equal according to === are currently equivalent.
 * NaN is currently equivalent to NaN.
 * Values with an `isEqualTo` method are currently equivalent to values that return true when passed to that method.
 * Collections of the same type that contain currently equivalent entries are currently equivalent.
 * Objects of the same type with equivalent same own properties and iterables are currently equivalent.
 *
 * @param {*} subject
 * @param {*} other
 * @returns {!boolean}
 */
function equate(subject, other) {
    if (subject === other || (isExactlyNaN(subject) && isExactlyNaN(other))) {
        return true;
    }

    // Custom equality.
    let customEquality = tryEquate_custom(subject, other);
    if (customEquality !== undefined) {
        return customEquality;
    }
    if (isAtomic(subject) || isAtomic(other) || !eqType(subject, other)) {
        return false;
    }

    // Collection equality.
    if (subject instanceof Map) {
        return equate_Maps(subject, other);
    }
    if (subject instanceof Set) {
        return equate_Sets(subject, other);
    }
    if (isIndexable(subject)) {
        return equate_Indexables(subject, other);
    }

    // Object equality.
    return equate_Objects(subject, other);
}

const GENERIC_ARRAY_TYPES = [
    Float32Array,
    Float64Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Uint8ClampedArray
];

/**
 * @param {*} v
 * @returns {!boolean}
 */
function isExactlyNaN(v) {
    return typeof v === "number" && isNaN(v);
}

/**
 * @param {*} subject
 * @param {*} other
 * @returns {undefined|!boolean}
 */
function tryEquate_custom(subject, other) {
    if (!isAtomic(subject) && subject.constructor !== undefined && subject.constructor.prototype.hasOwnProperty("isEqualTo")) {
        return subject.isEqualTo(other);
    }
    if (!isAtomic(other) && other.constructor !== undefined && other.constructor.prototype.hasOwnProperty("isEqualTo")) {
        return other.isEqualTo(subject);
    }
    return undefined;
}

/**
 * @param {*} value
 * @returns {!boolean}
 */
function isAtomic(value) {
    return value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean";
}

/**
 * @param {*} value
 * @returns {!boolean}
 */
function isIndexable(value) {
    return Array.isArray(value) || !GENERIC_ARRAY_TYPES.every(t => !(value instanceof t));
}

/**
 * @param {*} subject
 * @param {*} other
 * @returns {!boolean}
 */
function eqType(subject, other) {
    return subject.constructor.name === other.constructor.name;
}

/**
 * @param {!(*[])} subject
 * @param {!(*[])} other
 * @returns {!boolean}
 */
function equate_Indexables(subject, other) {
    if (subject.length !== other.length) {
        return false;
    }
    for (let i = 0; i < subject.length; i++) {
        if (!equate(subject[i], other[i])) {
            return false;
        }
    }
    return true;
}

/**
 * @param {!Iterable} subject
 * @param {!Iterable} other
 * @returns {!boolean}
 */
function equate_Iterables(subject, other) {
    let otherIter = other[Symbol.iterator]();
    for (let subjectItem of subject) {
        let otherItemDone = otherIter.next();
        if (otherItemDone.done || !equate(subjectItem, otherItemDone.value)) {
            return false;
        }
    }
    return otherIter.next().done;
}

/**
 * @param {!Map} subject
 * @param {!Map} other
 * @returns {!boolean}
 */
function equate_Maps(subject, other) {
    if (subject.size !== other.size) {
        return false;
    }
    for (let [k, v] of subject) {
        //noinspection JSUnusedAssignment
        if (!other.has(k)) {
            return false;
        }
        //noinspection JSUnusedAssignment
        let otherV = other.get(k);
        //noinspection JSUnusedAssignment
        if (!equate(v, otherV)) {
            return false;
        }
    }
    return true;
}

/**
 * @param {!Set} subject
 * @param {!Set} other
 * @returns {!boolean}
 */
function equate_Sets(subject, other) {
    if (subject.size !== other.size) {
        return false;
    }
    for (let k of subject) {
        if (!other.has(k)) {
            return false;
        }
    }
    return true;
}

/**
 * @param {!object} obj
 * @returns {!Set}
 */
function objectKeys(obj) {
    let result = new Set();
    for (let k in obj) {
        if (obj.hasOwnProperty(k)) {
            result.add(k);
        }
    }
    return result;
}

/**
 * @param {!object} subject
 * @param {!object} other
 * @returns {!boolean}
 */
function equate_Objects(subject, other) {
    let keys = objectKeys(subject);
    if (!equate_Sets(keys, objectKeys(other))) {
        return false;
    }

    for (let k of keys) {
        if (k === Symbol.iterator) {
            continue;
        }
        if (!equate(subject[k], other[k])) {
            return false;
        }
    }

    let hasSubjectIter = subject[Symbol.iterator] !== undefined;
    let hasOtherIter = other[Symbol.iterator] !== undefined;
    if (hasSubjectIter !== hasOtherIter) {
        return false;
    }
    if (hasSubjectIter && hasOtherIter) {
        if (!equate_Iterables(/** @type {!Iterable} */ subject, /** @type {!Iterable} */ other)) {
            return false;
        }
    }

    return true;
}

class ChordEvent {
    /**
     * @param {!boolean} inProgress
     * @param {!Set<!string>} chord
     * @param {!boolean} altKey
     * @param {!boolean} ctrlKey
     * @param {!boolean} metaKey
     * @param {!boolean} shiftKey
     */
    constructor(inProgress, chord, altKey, ctrlKey, metaKey, shiftKey) {
        this.inProgress = inProgress;
        this.chord = chord;
        this.altKey = altKey;
        this.shiftKey = shiftKey;
        this.ctrlKey = ctrlKey;
        this.metaKey = metaKey;
    }

    /**
     * @param {*} other
     * @return {!boolean}
     */
    isEqualTo(other) {
        return other instanceof ChordEvent &&
            this.inProgress === other.inProgress &&
            equate(this.chord, other.chord) &&
            this.altKey === other.altKey &&
            this.shiftKey === other.shiftKey &&
            this.ctrlKey === other.ctrlKey &&
            this.metaKey === other.metaKey;
    }

    /**
     * @return {!string}
     */
    toString() {
        return `ChordEvent(
    inProgress=${this.inProgress},
    chord=${describe(this.chord)},
    altKey=${this.altKey},
    shiftKey=${this.shiftKey},
    ctrlKey=${this.ctrlKey},
    metaKey=${this.metaKey},
)`;
    }
}

const MODIFIER_KEYS = new Set(["alt", "shift", "control", "meta"]);

class Chorder {
    constructor() {
        this.curModifiers = /** @type {!Set<!string>} */ new Set();
        this.curPressed = /** @type {!Set<!string>} */ new Set();
        this.curChord = /** @type {!Set<!string>} */ new Set();
        this.queuedEvents = /** @type {!Array<!ChordEvent>} */ [];
    }

    /**
     * @param {!boolean} inProgress
     */
    toEvent(inProgress) {
        return new ChordEvent(
            inProgress,
            new Set(this.curChord),
            this.curModifiers.has("alt"),
            this.curModifiers.has("control"),
            this.curModifiers.has("meta"),
            this.curModifiers.has("shift")
        );
    }

    /**
     * @param {!boolean} inProgress
     * @private
     */
    _queueEvent(inProgress) {
        this.queuedEvents.push(this.toEvent(inProgress));
    }

    handleFocusChanged() {
        this.curPressed.clear();
        this.curChord.clear();
        this.curModifiers.clear();
    }

    /**
     * @param {!KeyboardEvent} ev
     */
    handleKeyEvent(ev) {
        let key = ev.key.toLowerCase();
        if (key === 'escape') {
            this.handleFocusChanged();
        }
        if (ev.type === 'keydown') {
            let flag_key_pairs = [
                [ev.altKey, "alt"],
                [ev.shiftKey, "shift"],
                [ev.ctrlKey, "control"],
                [ev.metaKey, "meta"],
            ];
            for (let [b, k] of flag_key_pairs) {
                if (b) {
                    this.curModifiers.add(k);
                } else {
                    this.curModifiers.delete(k);
                }
            }
            if (!MODIFIER_KEYS.has(key)) {
                this.curPressed.add(key);
                this.curChord.add(key);
            }
            this._queueEvent(true);
        } else if (ev.type === 'keyup') {
            if (!MODIFIER_KEYS.has(key)) {
                this.curPressed.delete(key);
                this._queueEvent(this.curPressed.size > 0);
                if (this.curPressed.size === 0) {
                    this.curModifiers.clear();
                    this.curChord.clear();
                }
            }
        } else {
            throw new Error("Not a recognized key event type: " + ev.type);
        }
    }
}

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Performs an action when triggered, but defers the action if it happens too soon after the last one.
 *
 * Triggering multiple times during the cooldown period only results in one action being performed.
 */
class CooldownThrottle {
    /**
     * @param {!function() : void} action
     * @param {!number} cooldownMs
     * @param {!number} slowActionCooldownPumpUpFactor
     * @param {!boolean=false} waitWithRequestAnimationFrame
     * @constructor
     */
    constructor(action, cooldownMs, slowActionCooldownPumpUpFactor=0, waitWithRequestAnimationFrame=false) {
        /** @type {!function() : void} */
        this.action = action;
        /** @type {!number} */
        this.cooldownDuration = cooldownMs;
        /** @type {!number} */
        this.slowActionCooldownPumpupFactor = slowActionCooldownPumpUpFactor;
        /** @type {!boolean} */
        this._waitWithRequestAnimationFrame = waitWithRequestAnimationFrame;

        /**
         * @type {!string}
         * @private
         */
        this._state = 'idle';
        /**
         * @type {!number}
         * @private
         */
        this._cooldownStartTime = -Infinity;
    }

    _triggerIdle() {
        // Still cooling down?
        let remainingCooldownDuration = this.cooldownDuration - (performance.now() - this._cooldownStartTime);
        if (remainingCooldownDuration > 0) {
            this._forceIdleTriggerAfter(remainingCooldownDuration);
            return;
        }

        // Go go go!
        this._state = 'running';
        let t0 = performance.now();
        try {
            this.action();
        } finally {
            let dt = performance.now() - t0;
            this._cooldownStartTime = performance.now() + (dt * this.slowActionCooldownPumpupFactor);
            // Were there any triggers while we were running?
            if (this._state === 'running-and-triggered') {
                this._forceIdleTriggerAfter(this.cooldownDuration);
            } else {
                this._state = 'idle';
            }
        }
    }

    /**
     * Asks for the action to be performed as soon as possible.
     * (No effect if the action was already requested but not performed yet.)
     */
    trigger() {
        switch (this._state) {
            case 'idle':
                this._triggerIdle();
                break;
            case 'waiting':
                // Already triggered. Do nothing.
                break;
            case 'running':
                // Re-trigger.
                this._state = 'running-and-triggered';
                break;
            case 'running-and-triggered':
                // Already re-triggered. Do nothing.
                break;
            default:
                throw new Error('Unrecognized throttle state: ' + this._state);
        }
    }

    /**
     * @private
     */
    _forceIdleTriggerAfter(duration) {
        this._state = 'waiting';

        // setTimeout seems to refuse to run while I'm scrolling with my mouse wheel on chrome in windows.
        // So, for stuff that really has to come back in that case, we also support requestAnimationFrame looping.
        if (this._waitWithRequestAnimationFrame) {
            let iter;
            let start = performance.now();
            iter = () => {
                if (performance.now() < start + duration) {
                    requestAnimationFrame(iter);
                    return;
                }
                this._state = 'idle';
                this._cooldownStartTime = -Infinity;
                this.trigger();
            };
            iter();
        } else {
            setTimeout(() => {
                this._state = 'idle';
                this._cooldownStartTime = -Infinity;
                this.trigger();
            }, duration);
        }
    }


}

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * An observable sequence of events.
 *
 * WARNING: this class is not written to be re-entrant safe! If an observable ends up triggering itself, there may be
 * unexpected bugs.
 */
class Observable {
    /**
     * @param {!function(!function(T):void): (!function():void)} subscribe
     * @template T
     */
    constructor(subscribe) {
        /**
         * @type {!(function(!(function(T): void)): !(function(): void))}
         * @template T
         * @private
         */
        this._subscribe = subscribe;
    }

    /**
     * @param {!function(T):void} observer
     * @returns {!function():void} unsubscriber
     * @template T
     */
    subscribe(observer) {
        return this._subscribe(observer);
    }

    /**
     * @param {T} items
     * @returns {!Observable.<T>} An observable that immediately forwards all the given items to any new subscriber.
     * @template T
     */
    static of(...items) {
        return new Observable(observer => {
            for (let item of items) {
                observer(item);
            }
            return () => {};
        });
    }

    /**
     * Subscribes to the receiving observable for a moment and returns any collected items.
     * @returns {!Array.<T>}
     * @template T
     */
    snapshot() {
        let result = [];
        let unsub = this.subscribe(e => result.push(e));
        unsub();
        return result;
    }

    /**
     * @param {!function(TIn) : TOut} transformFunc
     * @returns {!Observable.<TOut>} An observable with the same items, but transformed by the given function.
     * @template TIn, TOut
     */
    map(transformFunc) {
        return new Observable(observer => this.subscribe(item => observer(transformFunc(item))));
    }

    /**
     * @param {!function(T) : !boolean} predicate
     * @returns {!Observable.<T>} An observable with the same items, but skipping items that don't match the predicate.
     * @template T
     */
    filter(predicate) {
        return new Observable(observer => this.subscribe(item => { if (predicate(item)) { observer(item); }}));
    }

    /**
     * @param {!Observable.<T2>} other
     * @param {!function(T1, T2): TOut} mergeFunc
     * @returns {!Observable.<TOut>}
     * @template T1, T2, TOut
     */
    zipLatest(other, mergeFunc) {
        return new Observable(observer => {
            let has1 = false;
            let has2 = false;
            let last1;
            let last2;
            let unreg1 = this.subscribe(e1 => {
                last1 = e1;
                has1 = true;
                if (has2) {
                    observer(mergeFunc(last1, last2));
                }
            });
            let unreg2 = other.subscribe(e2 => {
                last2 = e2;
                has2 = true;
                if (has1) {
                    observer(mergeFunc(last1, last2));
                }
            });
            return () => { unreg1(); unreg2(); };
        });
    }

    /**
     * Returns an observable that keeps requesting animations frame callbacks and calling observers when they arrive.
     * @returns {!Observable.<undefined>}
     */
    static requestAnimationTicker() {
        return new Observable(observer => {
            let iter;
            let isDone = false;
            iter = () => {
                if (!isDone) {
                    observer(undefined);
                    window.requestAnimationFrame(iter);
                }
            };
            iter();
            return () => { isDone = true; };
        });
    }

    /**
     * @returns {!Observable.<T>} An observable that subscribes to each sub-observables arriving on this observable
     * in turns, only forwarding items from the latest sub-observable.
     * @template T
     */
    flattenLatest() {
        return new Observable(observer => {
            let unregLatest = () => {};
            let isDone = false;
            let unregAll = this.subscribe(subObservable => {
                if (isDone) {
                    return;
                }
                let prevUnreg = unregLatest;
                unregLatest = subObservable.subscribe(observer);
                prevUnreg();
            });
            return () => {
                isDone = true;
                unregLatest();
                unregAll();
            }
        });
    }

    /**
     * @param {!function(T):void} action
     * @returns {!Observable.<T>}
     * @template T
     */
    peek(action) {
        return this.map(e => { action(e); return e; });
    }

    /**
     * @returns {!Observable.<T>} An observable that forwards all the items from all the observables observed by the
     * receiving observable of observables.
     * @template T
     */
    flatten() {
        return new Observable(observer => {
            let unsubs = [];
            unsubs.push(this.subscribe(observable => unsubs.push(observable.subscribe(observer))));
            return () => {
                for (let unsub of unsubs) {
                    unsub();
                }
            }
        });
    }

    /**
     * Starts a timer after each completed send, delays sending any more values until the timer expires, and skips
     * intermediate values when a newer value arrives from the source while the timer is still running down.
     * @param {!number} cooldownMillis
     * @returns {!Observable.<T>}
     * @template T
     */
    throttleLatest(cooldownMillis) {
        return new Observable(observer => {
            let latest = undefined;
            let isKilled = false;
            let throttle = new CooldownThrottle(() => {
                if (!isKilled) {
                    observer(latest);
                }
            }, cooldownMillis);
            let unsub = this.subscribe(e => {
                latest = e;
                throttle.trigger();
            });
            return () => {
                isKilled = true;
                unsub();
            };
        });
    }

    /**
     * @param {!HTMLElement|!HTMLDocument} element
     * @param {!string} eventKey
     * @returns {!Observable.<*>} An observable corresponding to an event fired from an element.
     */
    static elementEvent(element, eventKey) {
        return new Observable(observer => {
            element.addEventListener(eventKey, observer);
            return () => element.removeEventListener(eventKey, observer);
        });
    }

    /**
     *
     * @param {!int} count
     * @returns {!Observable.<T>}
     * @template T
     */
    skip(count) {
        return new Observable(observer => {
            let remaining = count;
            return this.subscribe(item => {
                if (remaining > 0) {
                    remaining -= 1;
                } else {
                    observer(item);
                }
            })
        })
    }

    /**
     * @returns {!Observable.<T>} An observable with the same events, but filtering out any event value that's the same
     * as the previous one.
     * @template T
     */
    whenDifferent(equater = undefined) {
        let eq = equater || ((e1, e2) => e1 === e2);
        return new Observable(observer => {
            let hasLast = false;
            let last = undefined;
            return this.subscribe(item => {
                if (!hasLast || !eq(last, item)) {
                    last = item;
                    hasLast = true;
                    observer(item);
                }
            });
        });
    }
}

class ObservableSource {
    constructor() {
        /**
         * @type {!Array.<!function(T):void>}
         * @private
         * @template T
         */
        this._observers = [];
        /**
         * @type {!Observable.<T>}
         * @private
         * @template T
         */
        this._observable = new Observable(observer => {
            this._observers.push(observer);
            let didRun = false;
            return () => {
                if (!didRun) {
                    didRun = true;
                    this._observers.splice(this._observers.indexOf(observer), 1);
                }
            };
        });
    }

    /**
     * @returns {!Observable.<T>}
     * @template T
     */
    observable() {
        return this._observable;
    }

    /**
     * @param {T} eventValue
     * @template T
     */
    send(eventValue) {
        for (let obs of this._observers) {
            obs(eventValue);
        }
    }
}

class ObservableValue {
    /**
     * @param {T=undefined} initialValue
     * @template T
     */
    constructor(initialValue=undefined) {
        this._value = initialValue;
        this._source = new ObservableSource();
        this._observable = new Observable(observer => {
            observer(this._value);
            return this._source.observable().subscribe(observer);
        });
    }

    /**
     * @returns {!Observable}
     */
    observable() {
        return this._observable;
    }

    /**
     * @param {T} newValue
     * @template T
     */
    set(newValue) {
        this._value = newValue;
        this._source.send(newValue);
    }

    /**
     * @returns {T} The current value.
     * @template T
     */
    get() {
        return this._value;
    }
}

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * A simple linear revision history tracker, for supporting undo and redo functionality.
 */
class Revision {
    /**
     * @param {!Array.<*>} history
     * @param {!int} index
     * @param {!boolean} isWorkingOnCommit
     */
    constructor(history, index, isWorkingOnCommit) {
        if (index < 0 || index >= history.length) {
            throw new Error(`Bad index: ${{history, index, isWorkingOnCommit}}`);
        }
        if (!Array.isArray(history)) {
            throw new Error(`Bad history: ${{history, index, isWorkingOnCommit}}`);
        }

        /** @type {!Array.<*>} */
        this.history = history;
        /** @type {!int} */
        this.index = index;
        /** @type {!boolean} */
        this.isWorkingOnCommit = isWorkingOnCommit;
        /** @type {!ObservableSource} */
        this._changes = new ObservableSource();
        /** @type {!ObservableValue} */
        this._latestActiveCommit = new ObservableValue(this.history[this.index]);
    }

    /**
     * @returns {!Observable.<*>}
     */
    changes() {
        return this._changes.observable();
    }

    /**
     * @returns {!Observable.<*>}
     */
    latestActiveCommit() {
        return this._latestActiveCommit.observable();
    }

    /**
     * Returns a snapshot of the current commit.
     * @returns {*}
     */
    peekActiveCommit() {
        return this._latestActiveCommit.get();
    }

    /**
     * Returns a cleared revision history, starting at the given state.
     * @param {*} state
     */
    static startingAt(state) {
        return new Revision([state], 0, false);
    }

    /**
     * @returns {!boolean}
     */
    isAtBeginningOfHistory() {
        return this.index === 0 && !this.isWorkingOnCommit;
    }

    /**
     * @returns {!boolean}
     */
    isAtEndOfHistory() {
        return this.index === this.history.length - 1;
    }

    /**
     * Throws away all revisions and resets the given state.
     * @param {*} state
     * @returns {void}
     */
    clear(state) {
        this.history = [state];
        this.index = 0;
        this.isWorkingOnCommit = false;
        this._latestActiveCommit.set(state);
        this._changes.send(state);
    }

    /**
     * Indicates that there are pending changes, so that a following 'undo' will return to the current state instead of
     * the previous state.
     * @returns {void}
     */
    startedWorkingOnCommit() {
        this.isWorkingOnCommit = true;
        this._changes.send(undefined);
    }

    /**
     * Indicates that pending changes were discarded, so that a following 'undo' should return to the previous state
     * instead of the current state.
     * @returns {*} The new current state.
     */
    cancelCommitBeingWorkedOn() {
        this.isWorkingOnCommit = false;
        let result = this.history[this.index];
        this._latestActiveCommit.set(result);
        this._changes.send(result);
        return result;
    }

    /**
     * Throws away future states, appends the given state, and marks it as the current state
     * @param {*} newCheckpoint
     * @returns {void}
     */
    commit(newCheckpoint) {
        if (newCheckpoint === this.history[this.index]) {
            this.cancelCommitBeingWorkedOn();
            return;
        }
        this.isWorkingOnCommit = false;
        this.index += 1;
        this.history.splice(this.index, this.history.length - this.index);
        this.history.push(newCheckpoint);
        this._latestActiveCommit.set(newCheckpoint);
        this._changes.send(newCheckpoint);
    }

    /**
     * Marks the previous state as the current state and returns it (or resets to the current state if
     * 'working on a commit' was indicated).
     * @returns {undefined|*} The new current state, or undefined if there's nothing to undo.
     */
    undo() {
        if (!this.isWorkingOnCommit) {
            if (this.index === 0) {
                return undefined;
            }
            this.index -= 1;
        }
        this.isWorkingOnCommit = false;
        let result = this.history[this.index];
        this._latestActiveCommit.set(result);
        this._changes.send(result);
        return result;
    }

    /**
     * Marks the next state as the current state and returns it (or does nothing if there is no next state).
     * @returns {undefined|*} The new current state, or undefined if there's nothing to redo.
     */
    redo() {
        if (this.index + 1 === this.history.length) {
            return undefined;
        }
        this.index += 1;
        this.isWorkingOnCommit = false;
        let result = this.history[this.index];
        this._latestActiveCommit.set(result);
        this._changes.send(result);
        return result;
    }

    /**
     * @returns {!string} A description of the revision.
     */
    toString() {
        return 'Revision(' + describe({
            index: this.index,
            count: this.history.length,
            workingOnCommit: this.isWorkingOnCommit,
            head: this.history[this.index]
        }) + ')';
    }

    /**
     * Determines if two revisions currently have the same state.
     * @param {*|!Revision} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        return other instanceof Revision &&
            this.index === other.index &&
            this.isWorkingOnCommit === other.isWorkingOnCommit &&
            equate(this.history, other.history);
    }
}

let TIMELINE_PITCH = 32;

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!StateSnapshot} ds
 * @param {!function(!int, !number): ![!number, !number]} qubitTimeCoordFunc
 * @param {!PropagatedPauliFrames} propagatedMarkers
 * @param {!int} mi
 * @param {!int} min_t
 * @param {!int} max_t
 * @param {!number} x_pitch
 */
function drawTimelineMarkers(ctx, ds, qubitTimeCoordFunc, propagatedMarkers, mi, min_t, max_t, x_pitch) {
    let dx, dy, wx, wy;
    dx = 0;
    wx = x_pitch;
    wy = 5;
    if (mi === 0) {
        dy = 10;
    } else if (mi === 1) {
        dy = 5;
    } else if (mi === 2) {
        dy = 0;
    } else if (mi === 3) {
        dy = -5;
    }
    for (let t = min_t; t <= max_t; t++) {
        let p = propagatedMarkers.atLayer(t);
        for (let [q, b] of p.bases.entries()) {
            let [x, y] = qubitTimeCoordFunc(q, t);
            if (x === undefined || y === undefined) {
                continue;
            }
            if (b === 'X') {
                ctx.fillStyle = 'red';
            } else if (b === 'Y') {
                ctx.fillStyle = 'green';
            } else if (b === 'Z') {
                ctx.fillStyle = 'blue';
            } else {
                throw new Error('Not a pauli: ' + b);
            }
            ctx.fillRect(x - dx, y - dy, wx, wy);
        }
        for (let q of p.errors) {
            let [x, y] = qubitTimeCoordFunc(q, t - 0.5);
            if (x === undefined || y === undefined) {
                continue;
            }
            ctx.fillStyle = 'magenta';
            ctx.fillRect(x - dx - 8, y - dy - 8, wx + 16, wy + 16);
            ctx.fillStyle = 'black';
            ctx.fillRect(x - dx, y - dy, wx, wy);
        }
        for (let {q1, q2, color} of p.crossings) {
            let [x1, y1] = qubitTimeCoordFunc(q1, t);
            let [x2, y2] = qubitTimeCoordFunc(q2, t);
            if (color === 'X') {
                ctx.strokeStyle = 'red';
            } else if (color === 'Y') {
                ctx.strokeStyle = 'green';
            } else if (color === 'Z') {
                ctx.strokeStyle = 'blue';
            } else {
                ctx.strokeStyle = 'magenta';
            }
            ctx.lineWidth = 8;
            stroke_connector_to(ctx, x1, y1, x2, y2);
            ctx.lineWidth = 1;
        }
    }
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!StateSnapshot} snap
 * @param {!Array<!PropagatedPauliFrames>} propagatedMarkerLayers
 * @param {!function(!int): ![!number, !number]} timesliceQubitCoordsFunc
 */
function drawTimeline(ctx, snap, propagatedMarkerLayers, timesliceQubitCoordsFunc) {
    let w = ctx.canvas.width / 2;

    let qubits = snap.timelineQubits();
    qubits.sort((a, b) => {
        let [x1, y1] = timesliceQubitCoordsFunc(a);
        let [x2, y2] = timesliceQubitCoordsFunc(b);
        if (y1 !== y2) {
            return y1 - y2;
        }
        return x1 - x2;
    });

    let base_y2xy = new Map();
    let prev_y = undefined;
    let cur_x = 0;
    let cur_y = 0;
    let max_run = 0;
    let cur_run = 0;
    for (let q of qubits) {
        let [x, y] = timesliceQubitCoordsFunc(q);
        cur_y += TIMELINE_PITCH;
        if (prev_y !== y) {
            prev_y = y;
            cur_x = w * 1.5;
            max_run = Math.max(max_run, cur_run);
            cur_run = 0;
            cur_y += TIMELINE_PITCH * 0.25;
        } else {
            cur_x += rad * 0.25;
            cur_run++;
        }
        base_y2xy.set(`${x},${y}`, [cur_x, cur_y]);
    }

    let x_pitch = TIMELINE_PITCH + rad*max_run*0.25;
    let coordTransform_t = ([x, y, t]) => {
        let key = `${x},${y}`;
        if (!base_y2xy.has(key)) {
            return [undefined, undefined];
        }
        let [xb, yb] = base_y2xy.get(key);
        return [xb + (t - snap.curLayer)*x_pitch, yb];
    };
    let qubitTimeCoords = (q, t) => {
        let [x, y] = timesliceQubitCoordsFunc(q);
        return coordTransform_t([x, y, t]);
    };
    let num_cols_half = Math.floor(ctx.canvas.width / 4 / x_pitch);
    let min_t = Math.max(0, snap.curLayer - num_cols_half + 1);
    let max_t = snap.curLayer + num_cols_half + 2;

    ctx.save();
    try {
        ctx.clearRect(w, 0, w, ctx.canvas.height);
        for (let mi = 0; mi < propagatedMarkerLayers.length; mi++) {
            if (mi < 4) {
                drawTimelineMarkers(ctx, snap, qubitTimeCoords, propagatedMarkerLayers[mi], mi, min_t, max_t, x_pitch);
            }
        }
        ctx.globalAlpha *= 0.5;
        ctx.fillStyle = 'black';
        ctx.fillRect(w*1.5 - rad*1.3, 0, x_pitch, ctx.canvas.height);
        ctx.globalAlpha *= 2;

        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';

        // Draw wire lines.
        for (let q of qubits) {
            let [x0, y0] = qubitTimeCoords(q, min_t - 1);
            let [x1, y1] = qubitTimeCoords(q, max_t + 1);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }

        // Draw labels.
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let q of qubits) {
            let [x, y] = qubitTimeCoords(q, min_t - 1);
            let qx = snap.circuit.qubitCoordData[q * 2];
            let qy = snap.circuit.qubitCoordData[q * 2 + 1];
            ctx.fillText(`${qx},${qy}:`, x, y);
        }

        for (let time = min_t; time <= max_t; time++) {
            let qubitsCoordsFuncForLayer = q => qubitTimeCoords(q, time);
            let layer = snap.circuit.layers[time];
            if (layer === undefined) {
                continue;
            }
            for (let op of layer.iter_gates_and_markers()) {
                op.id_draw(qubitsCoordsFuncForLayer, ctx);
            }
        }

        // Draw links to timeslice viewer.
        ctx.globalAlpha = 0.25;
        ctx.setLineDash([1, 1]);
        let max_x = 0;
        for (let q of qubits) {
            max_x = Math.max(max_x, timesliceQubitCoordsFunc(q)[0]);
        }
        for (let q of qubits) {
            let [x0, y0] = qubitTimeCoords(q, min_t - 1);
            let [_, y1] = timesliceQubitCoordsFunc(q);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(max_x + 0.25, y1);
            ctx.stroke();
        }
    } finally {
        ctx.restore();
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

const OFFSET_X$1 = -pitch + Math.floor(pitch / 4) + 0.5;
const OFFSET_Y$1 = -pitch + Math.floor(pitch / 4) + 0.5;

/**
 * @param {!number|undefined} x
 * @param {!number|undefined} y
 * @return {![undefined, undefined]|![!number, !number]}
 */
function xyToPos(x, y) {
    if (x === undefined || y === undefined) {
        return [undefined, undefined];
    }
    let focusX = x / pitch;
    let focusY = y / pitch;
    let roundedX = Math.floor(focusX * 2 + 0.5) / 2;
    let roundedY = Math.floor(focusY * 2 + 0.5) / 2;
    let centerX = roundedX*pitch;
    let centerY = roundedY*pitch;
    if (Math.abs(centerX - x) <= rad && Math.abs(centerY - y) <= rad && roundedX % 1 === roundedY % 1) {
        return [roundedX, roundedY];
    }
    return [undefined, undefined];
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!StateSnapshot} snap
 * @param {!function(q: !int): ![!number, !number]} qubitCoordsFunc
 * @param {!PropagatedPauliFrames} propagatedMarkers
 * @param {!int} mi
 */
function drawCrossMarkers(ctx, snap, qubitCoordsFunc, propagatedMarkers, mi) {
    let crossings = propagatedMarkers.atLayer(snap.curLayer).crossings;
    if (crossings !== undefined) {
        for (let {q1, q2, color} of crossings) {
            let [x1, y1] = qubitCoordsFunc(q1);
            let [x2, y2] = qubitCoordsFunc(q2);
            if (color === 'X') {
                ctx.strokeStyle = 'red';
            } else if (color === 'Y') {
                ctx.strokeStyle = 'green';
            } else if (color === 'Z') {
                ctx.strokeStyle = 'blue';
            } else {
                ctx.strokeStyle = 'magenta';
            }
            ctx.lineWidth = 8;
            stroke_connector_to(ctx, x1, y1, x2, y2);
            ctx.lineWidth = 1;
        }
    }
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!StateSnapshot} snap
 * @param {!function(q: !int): ![!number, !number]} qubitCoordsFunc
 * @param {!PropagatedPauliFrames} propagatedMarkers
 * @param {!int} mi
 */
function drawMarkers(ctx, snap, qubitCoordsFunc, propagatedMarkers, mi) {
    let {dx, dy, wx, wy} = marker_placement(mi);
    let basesQubitMap = propagatedMarkers.atLayer(snap.curLayer).bases;

    // Convert qubit indices to draw coordinates.
    let basisCoords = [];
    for (let [q, b] of basesQubitMap.entries()) {
        basisCoords.push([b, qubitCoordsFunc(q)]);
    }

    // Draw a polygon for the marker set.
    if (basisCoords.length > 0) {
        if (basisCoords.every(e => e[0] === 'X')) {
            ctx.fillStyle = 'red';
        } else if (basisCoords.every(e => e[0] === 'Y')) {
            ctx.fillStyle = 'green';
        } else if (basisCoords.every(e => e[0] === 'Z')) {
            ctx.fillStyle = 'blue';
        } else {
            ctx.fillStyle = 'black';
        }
        ctx.strokeStyle = ctx.fillStyle;
        let coords = basisCoords.map(e => e[1]);
        let cx = 0;
        let cy = 0;
        for (let [x, y] of coords) {
            cx += x;
            cy += y;
        }
        cx /= coords.length;
        cy /= coords.length;
        coords.sort((a, b) => {
            let [ax, ay] = a;
            let [bx, by] = b;
            let av = Math.atan2(ay - cy, ax - cx);
            let bv = Math.atan2(by - cy, bx - cx);
            if (ax === cx && ay === cy) {
                av = -100;
            }
            if (bx === cx && by === cy) {
                bv = -100;
            }
            return av - bv;
        });
        beginPathPolygon(ctx, coords);
        ctx.globalAlpha *= 0.25;
        ctx.fill();
        ctx.globalAlpha *= 4;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    if (mi < 4) {
        // Draw individual qubit markers.
        for (let [b, [x, y]] of basisCoords) {
            if (b === 'X') {
                ctx.fillStyle = 'red';
            } else if (b === 'Y') {
                ctx.fillStyle = 'green';
            } else if (b === 'Z') {
                ctx.fillStyle = 'blue';
            } else {
                throw new Error('Not a pauli: ' + b);
            }
            ctx.fillRect(x - dx, y - dy, wx, wy);
        }
    }

    // Show error highlights.
    let errorsQubitSet = propagatedMarkers.atLayer(snap.curLayer).errors;
    for (let q of errorsQubitSet) {
        let [x, y] = qubitCoordsFunc(q);
        ctx.fillStyle = 'magenta';
        ctx.fillRect(x - dx - 8, y - dy - 8, wx + 16, wy + 16);
        ctx.fillStyle = 'black';
        ctx.fillRect(x - dx, y - dy, wx, wy);
    }
}

let _defensive_draw_enabled = true;

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!function} body
 */
function defensiveDraw(ctx, body) {
    ctx.save();
    try {
        if (_defensive_draw_enabled) {
            body();
        }
    } finally {
        ctx.restore();
    }
}

/**
 * @param {!CanvasRenderingContext2D} ctx
 * @param {!StateSnapshot} snap
 */
function draw(ctx, snap) {
    let circuit = snap.circuit;

    let numPropagatedLayers = 0;
    for (let layer of circuit.layers) {
        for (let op of layer.markers) {
            let gate = op.gate;
            if (gate.name === "MARKX" || gate.name === "MARKY" || gate.name === "MARKZ") {
                numPropagatedLayers = Math.max(numPropagatedLayers, op.args[0] + 1);
            }
        }
    }

    let c2dCoordTransform = (x, y) => [x*pitch - OFFSET_X$1, y*pitch - OFFSET_Y$1];
    let qubitDrawCoords = q => {
        let x = circuit.qubitCoordData[2 * q];
        let y = circuit.qubitCoordData[2 * q + 1];
        return c2dCoordTransform(x, y);
    };
    let propagatedMarkerLayers = /** @type {!Array<!PropagatedPauliFrames>} */ [];
    for (let mi = 0; mi < numPropagatedLayers; mi++) {
        propagatedMarkerLayers.push(PropagatedPauliFrames.fromCircuit(circuit, mi));
    }

    let usedQubitCoordSet = new Set();
    for (let q of circuit.allQubits()) {
        let qx = circuit.qubitCoordData[q * 2];
        let qy = circuit.qubitCoordData[q * 2 + 1];
        usedQubitCoordSet.add(`${qx},${qy}`);
    }

    defensiveDraw(ctx, () => {
        ctx.fillStyle = 'white';
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let [focusX, focusY] = xyToPos(snap.curMouseX, snap.curMouseY);

        // Draw the background polygons.
        let lastPolygonLayer = snap.curLayer;
        for (let r = 0; r <= snap.curLayer; r++) {
            for (let op of circuit.layers[r].markers) {
                if (op.gate.name === 'POLYGON') {
                    lastPolygonLayer = r;
                    break;
                }
            }
        }
        let polygonMarkers = [...circuit.layers[lastPolygonLayer].markers];
        polygonMarkers.sort((a, b) => b.id_targets.length - a.id_targets.length);
        for (let op of polygonMarkers) {
            if (op.gate.name === 'POLYGON') {
                op.id_draw(qubitDrawCoords, ctx);
            }
        }

        // Draw the grid of qubits.
        defensiveDraw(ctx, () => {
            let allQubits = circuit.allQubits();
            ctx.strokeStyle = 'black';
            for (let qx = 0; qx < 100; qx += 0.5) {
                for (let qy = qx % 1; qy < 100; qy += 1) {
                    let [x, y] = c2dCoordTransform(qx, qy);
                    if (qx % 1 === 0.5) {
                        ctx.fillStyle = 'pink';
                    } else {
                        ctx.fillStyle = 'white';
                    }
                    let isUnused = !usedQubitCoordSet.has(`${qx},${qy}`);
                    if (isUnused) {
                        ctx.globalAlpha *= 0.25;
                    }
                    ctx.fillRect(x - rad, y - rad, 2*rad, 2*rad);
                    ctx.strokeRect(x - rad, y - rad, 2*rad, 2*rad);
                    if (isUnused) {
                        ctx.globalAlpha *= 4;
                    }
                }
            }
        });

        for (let mi = 0; mi < propagatedMarkerLayers.length; mi++) {
            drawCrossMarkers(ctx, snap, qubitDrawCoords, propagatedMarkerLayers[mi], mi);
        }

        for (let op of circuit.layers[snap.curLayer].iter_gates_and_markers()) {
            if (op.gate.name !== 'POLYGON') {
                op.id_draw(qubitDrawCoords, ctx);
            }
        }

        defensiveDraw(ctx, () => {
            ctx.globalAlpha *= 0.25;
            for (let [qx, qy] of snap.timelineSet.values()) {
                let [x, y] = c2dCoordTransform(qx, qy);
                ctx.fillStyle = 'yellow';
                ctx.fillRect(x - rad * 1.25, y - rad * 1.25, 2.5*rad, 2.5*rad);
            }
        });

        defensiveDraw(ctx, () => {
            ctx.globalAlpha *= 0.5;
            for (let [qx, qy] of snap.focusedSet.values()) {
                let [x, y] = c2dCoordTransform(qx, qy);
                ctx.fillStyle = 'blue';
                ctx.fillRect(x - rad * 1.25, y - rad * 1.25, 2.5*rad, 2.5*rad);
            }
        });

        for (let mi = 0; mi < propagatedMarkerLayers.length; mi++) {
            drawMarkers(ctx, snap, qubitDrawCoords, propagatedMarkerLayers[mi], mi);
        }

        if (focusX !== undefined) {
            ctx.save();
            ctx.globalAlpha *= 0.5;
            let [x, y] = c2dCoordTransform(focusX, focusY);
            ctx.fillStyle = 'red';
            ctx.fillRect(x - rad, y - rad, 2*rad, 2*rad);
            ctx.restore();
        }

        defensiveDraw(ctx, () => {
            ctx.globalAlpha *= 0.25;
            ctx.fillStyle = 'blue';
            if (snap.mouseDownX !== undefined && snap.curMouseX !== undefined) {
                let x1 = Math.min(snap.curMouseX, snap.mouseDownX);
                let x2 = Math.max(snap.curMouseX, snap.mouseDownX);
                let y1 = Math.min(snap.curMouseY, snap.mouseDownY);
                let y2 = Math.max(snap.curMouseY, snap.mouseDownY);
                x1 -= 1;
                x2 += 1;
                y1 -= 1;
                y2 += 1;
                x1 -= OFFSET_X$1;
                x2 -= OFFSET_X$1;
                y1 -= OFFSET_Y$1;
                y2 -= OFFSET_Y$1;
                ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            }
            for (let [qx, qy] of snap.boxHighlightPreview) {
                let [x, y] = c2dCoordTransform(qx, qy);
                ctx.fillRect(x - rad, y - rad, rad*2, rad*2);
            }
        });
    });

    // Scrubber.
    ctx.save();
    try {
        ctx.strokeStyle = 'black';
        for (let k = 0; k < circuit.layers.length; k++) {
            let has_errors = !propagatedMarkerLayers.every(p => p.atLayer(k).errors.size === 0);
            if (k === snap.curLayer) {
                ctx.fillStyle = 'red';
                ctx.fillRect(0, k*5, 10, 4);
            } else if (has_errors) {
                ctx.fillStyle = 'magenta';
                ctx.fillRect(-2, k*5-2, 10+4, 4+4);
                ctx.fillStyle = 'black';
                ctx.fillRect(0, k*5, 10, 4);
            } else {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, k*5, 10, 4);
            }
        }
    } finally {
        ctx.restore();
    }

    drawTimeline(ctx, snap, propagatedMarkerLayers, qubitDrawCoords);
}

/**
 * A copy of the editor state which can be used for tasks such as drawing previews of changes.
 *
 * Technically not immutable, but should be treated as immutable. Should never be mutated.
 */
class StateSnapshot {
    /**
     * @param {!Circuit} circuit
     * @param {!int} curLayer
     * @param {!Map<!string, ![!number, !number]>} focusedSet
     * @param {!Map<!string, ![!number, !number]>} timelineSet
     * @param {!number} curMouseX
     * @param {!number} curMouseY
     * @param {!number} mouseDownX
     * @param {!number} mouseDownY
     * @param {!Array<![!number, !number]>} boxHighlightPreview
     */
    constructor(circuit, curLayer, focusedSet, timelineSet, curMouseX, curMouseY, mouseDownX, mouseDownY, boxHighlightPreview) {
        this.circuit = circuit.copy();
        this.curLayer = curLayer;
        this.focusedSet = new Map(focusedSet.entries());
        this.timelineSet = new Map(timelineSet.entries());
        this.curMouseX = curMouseX;
        this.curMouseY = curMouseY;
        this.mouseDownX = mouseDownX;
        this.mouseDownY = mouseDownY;
        this.boxHighlightPreview = [...boxHighlightPreview];

        while (this.circuit.layers.length <= this.curLayer) {
            this.circuit.layers.push(new Layer());
        }
    }

    /**
     * @returns {!Set<!int>}
     */
    id_usedQubits() {
        return this.circuit.allQubits();
    }

    /**
     * @returns {!Array<!int>}
     */
    timelineQubits() {
        let used = this.id_usedQubits();
        let qubits = [];
        if (this.timelineSet.size > 0) {
            let c2q = this.circuit.coordToQubitMap();
            for (let key of this.timelineSet.keys()) {
                let q = c2q.get(key);
                if (q !== undefined) {
                    qubits.push(q);
                }
            }
        } else {
            qubits.push(...used.values());
        }
        return qubits.filter(q => used.has(q));
    }
}

/**
 * @param {!int} steps
 * @return {!function(x: !number, y: !number): ![!number, !number]}
 */
function rotated45Transform(steps) {
    let vx = [1, 0];
    let vy = [0, 1];
    let s = (x, y) => [x - y, x + y];
    steps %= 8;
    steps += 8;
    steps %= 8;
    for (let k = 0; k < steps; k++) {
        vx = s(vx[0], vx[1]);
        vy = s(vy[0], vy[1]);
    }
    return (x, y) => [vx[0]*x + vy[0]*y, vx[1]*x + vy[1]*y];
}

class EditorState {
    /**
     * @param {!HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.rev = Revision.startingAt('');
        this.canvas = canvas;
        this.curMouseY = /** @type {undefined|!number} */ undefined;
        this.curMouseX = /** @type {undefined|!number} */ undefined;
        this.chorder = new Chorder();
        this.curLayer = 0;
        this.focusedSet = /** @type {!Map<!string, ![!number, !number]>} */  new Map();
        this.timelineSet = /** @type {!Map<!string, ![!number, !number]>} */ new Map();
        this.mouseDownX = /** @type {undefined|!number} */ undefined;
        this.mouseDownY = /** @type {undefined|!number} */ undefined;
        this.obs_val_draw_state = /** @type {!ObservableValue<StateSnapshot>} */ new ObservableValue(this.toSnapshot(undefined));
    }

    /**
     * @return {!Circuit}
     */
    copyOfCurCircuit() {
        let result = Circuit.fromStimCircuit(this.rev.peekActiveCommit());
        while (result.layers.length <= this.curLayer) {
            result.layers.push(new Layer());
        }
        return result;
    }

    clearFocus() {
        this.focusedSet.clear();
        this.force_redraw();
    }

    /**
     * @param {!boolean} preview
     */
    deleteAtFocus(preview) {
        let newCircuit = this.copyOfCurCircuit();
        let c2q = newCircuit.coordToQubitMap();
        for (let key of this.focusedSet.keys()) {
            let q = c2q.get(key);
            if (q !== undefined) {
                newCircuit.layers[this.curLayer].id_pop_at(q);
            }
        }
        this.commit_or_preview(newCircuit, preview);
    }

    /**
     * @param {!boolean} preview
     */
    deleteCurLayer(preview) {
        let c = this.copyOfCurCircuit();
        c.layers.splice(this.curLayer, 1);
        this.commit_or_preview(c, preview);
    }

    /**
     * @param {!boolean} preview
     */
    insertLayer(preview) {
        let c = this.copyOfCurCircuit();
        c.layers.splice(this.curLayer, 0, new Layer());
        this.commit_or_preview(c, preview);
    }

    undo() {
        this.rev.undo();
    }

    redo() {
        this.rev.redo();
    }

    /**
     * @param {!Circuit} newCircuit
     * @param {!boolean} preview
     */
    commit_or_preview(newCircuit, preview) {
        if (preview) {
            this.preview(newCircuit);
        } else {
            this.commit(newCircuit);
        }
    }

    /**
     * @param {!Circuit} newCircuit
     */
    commit(newCircuit) {
        while (newCircuit.layers.length > 0 && newCircuit.layers[newCircuit.layers.length - 1].isEmpty()) {
            newCircuit.layers.pop();
        }
        this.rev.commit(newCircuit.toStimCircuit());
    }

    /**
     * @param {!Circuit} newCircuit
     */
    preview(newCircuit) {
        this.rev.startedWorkingOnCommit();
        this.obs_val_draw_state.set(this.toSnapshot(newCircuit));
    }

    /**
     * @param {undefined|!Circuit} previewCircuit
     * @returns {!StateSnapshot}
     */
    toSnapshot(previewCircuit) {
        if (previewCircuit === undefined) {
            previewCircuit = this.copyOfCurCircuit();
        }
        return new StateSnapshot(
            previewCircuit,
            this.curLayer,
            this.focusedSet,
            this.timelineSet,
            this.curMouseX,
            this.curMouseY,
            this.mouseDownX,
            this.mouseDownY,
            this.currentPositionsBoxesByMouseDrag(this.chorder.curModifiers.has("alt")),
        );
    }

    force_redraw() {
        let previewedCircuit = this.obs_val_draw_state.get().circuit;
        this.obs_val_draw_state.set(this.toSnapshot(previewedCircuit));
    }

    clearCircuit() {
        this.commit(new Circuit(new Float64Array([]), []));
    }

    clearMarkers() {
        let c = this.copyOfCurCircuit();
        for (let layer of c.layers) {
            layer.markers = layer.markers.filter(e => e.gate.name !== 'MARKX' && e.gate.name !== 'MARKY' && e.gate.name !== 'MARKZ');
        }
        this.commit(c);
    }

    /**
     * @param {!boolean} parityLock
     * @returns {!Array<![!int, !int]>}
     */
    currentPositionsBoxesByMouseDrag(parityLock) {
        let curMouseX = this.curMouseX;
        let curMouseY = this.curMouseY;
        let mouseDownX = this.mouseDownX;
        let mouseDownY = this.mouseDownY;
        let result = [];
        if (curMouseX !== undefined && mouseDownX !== undefined) {
            let [sx, sy] = xyToPos(mouseDownX, mouseDownY);
            let x1 = Math.min(curMouseX, mouseDownX);
            let x2 = Math.max(curMouseX, mouseDownX);
            let y1 = Math.min(curMouseY, mouseDownY);
            let y2 = Math.max(curMouseY, mouseDownY);
            let gap = pitch/4 - rad;
            x1 += gap;
            x2 -= gap;
            y1 += gap;
            y2 -= gap;
            x1 = Math.floor(x1 * 2 / pitch + 0.5) / 2;
            x2 = Math.floor(x2 * 2 / pitch + 0.5) / 2;
            y1 = Math.floor(y1 * 2 / pitch + 0.5) / 2;
            y2 = Math.floor(y2 * 2 / pitch + 0.5) / 2;
            let b = 1;
            if (x1 === x2 || y1 === y2) {
                b = 2;
            }
            for (let x = x1; x <= x2; x += 0.5) {
                for (let y = y1; y <= y2; y += 0.5) {
                    if (x % 1 === y % 1) {
                        if (!parityLock || (sx % b === x % b && sy % b === y % b)) {
                            result.push([x, y]);
                        }
                    }
                }
            }
        }
        return result;
    }

    /**
     * @param {!function(!number, !number): ![!number, !number]} coordTransform
     * @param {!boolean} preview
     */
    applyCoordinateTransform(coordTransform, preview) {
        let c = this.copyOfCurCircuit();
        c = c.afterCoordTransform(coordTransform);
        if (!preview) {
            let trans = m => {
                let new_m = new Map();
                for (let [x, y] of m.values()) {
                    [x, y] = coordTransform(x, y);
                    new_m.set(`${x},${y}`, [x, y]);
                }
                return new_m;
            };
            this.timelineSet = trans(this.timelineSet);
            this.focusedSet = trans(this.focusedSet);
        }
        this.commit_or_preview(c, preview);
    }

    /**
     * @param {!int} steps
     * @param {!boolean} preview
     */
    rotate45(steps, preview) {
        let t1 = rotated45Transform(steps);
        let t2 = this.copyOfCurCircuit().afterCoordTransform(t1).coordTransformForRectification();
        this.applyCoordinateTransform((x, y) => {
            [x, y] = t1(x, y);
            return t2(x, y);
        }, preview);
    }

    /**
     * @param {!int} newLayer
     */
    changeCurLayerTo(newLayer) {
        this.curLayer = Math.max(newLayer, 0);
        this.force_redraw();
    }

    /**
     * @param {!Array<![!number, !number]>} newFocus
     * @param {!boolean} unionMode
     * @param {!boolean} xorMode
     */
    changeFocus(newFocus, unionMode, xorMode) {
        if (!unionMode && !xorMode) {
            this.focusedSet.clear();
        }
        for (let [x, y] of newFocus) {
            let k = `${x},${y}`;
            if (xorMode && this.focusedSet.has(k)) {
                this.focusedSet.delete(k);
            } else {
                this.focusedSet.set(k, [x, y]);
            }
        }
        this.force_redraw();
    }

    /**
     * @param {!boolean} preview
     * @param {!int} markIndex
     */
    markFocusInferBasis(preview, markIndex) {
        let newCircuit = this.copyOfCurCircuit().withCoordsIncluded(this.focusedSet.values());
        let c2q = newCircuit.coordToQubitMap();
        let affectedQubits = new Set();
        for (let key of this.focusedSet.keys()) {
            affectedQubits.add(c2q.get(key));
        }

        // Determine which qubits have forced basis based on their operation.
        let forcedBases = new Map();
        let layer = newCircuit.layers[this.curLayer];
        for (let q of [...affectedQubits]) {
            let op = layer.id_ops.get(q);
            if (op !== undefined) {
                if (op.gate.name === 'RX' || op.gate.name === 'MX' || op.gate.name === 'MRX') {
                    forcedBases.set(q, 'X');
                } else if (op.gate.name === 'RY' || op.gate.name === 'MY' || op.gate.name === 'MRY') {
                    forcedBases.set(q, 'Y');
                } else if (op.gate.name === 'R' || op.gate.name === 'M' || op.gate.name === 'MR') {
                    forcedBases.set(q, 'Z');
                } else if (op.gate.name === 'MXX' || op.gate.name === 'MYY' || op.gate.name === 'MZZ') {
                    let opBasis = op.gate.name[1];
                    for (let q of op.id_targets) {
                        forcedBases.set(q, opBasis);
                        affectedQubits.add(q);
                    }
                }
            }
        }

        // Pick a default basis for unforced qubits.
        let seenBases = new Set(forcedBases.values());
        seenBases.delete(undefined);
        let defaultBasis;
        if (seenBases.size === 1) {
            defaultBasis = [...seenBases][0];
        } else {
            defaultBasis = 'Z';
        }

        // Mark each qubit with its inferred basis.
        for (let q of affectedQubits) {
            let basis = forcedBases.get(q);
            if (basis === undefined) {
                basis = defaultBasis;
            }
            let gate = GATE_MAP.get(`MARK${basis}`).withDefaultArgument(markIndex);
            layer.put(new Operation(
                gate,
                new Float32Array([markIndex]),
                new Uint32Array([q]),
            ));
        }

        this.commit_or_preview(newCircuit, preview);
    }

    /**
     * @param {!boolean} preview
     * @param {!Gate} gate
     * @param {!Array<!number>} gate_args
     */
    _writeSingleQubitGateToFocus(preview, gate, gate_args) {
        let newCircuit = this.copyOfCurCircuit().withCoordsIncluded(this.focusedSet.values());
        let c2q = newCircuit.coordToQubitMap();
        for (let key of this.focusedSet.keys()) {
            newCircuit.layers[this.curLayer].put(new Operation(
                gate,
                new Float32Array(gate_args),
                new Uint32Array([c2q.get(key)]),
            ));
        }
        this.commit_or_preview(newCircuit, preview);
    }

    /**
     * @param {!boolean} preview
     * @param {!Gate} gate
     * @param {!Array<!number>} gate_args
     */
    _writeTwoQubitGateToFocus(preview, gate, gate_args) {
        let newCircuit = this.copyOfCurCircuit();
        let [x, y] = xyToPos(this.curMouseX, this.curMouseY);
        let [minX, minY] = minXY(this.focusedSet.values());
        if (x !== undefined && minX !== undefined && !this.focusedSet.has(`${x},${y}`)) {
            let dx = x - minX;
            let dy = y - minY;

            let coords = [];
            for (let [vx, vy] of this.focusedSet.values()) {
                coords.push([vx, vy]);
                coords.push([vx + dx, vy + dy]);
            }

            newCircuit = newCircuit.withCoordsIncluded(coords);
            let c2q = newCircuit.coordToQubitMap();
            for (let k = 0; k < coords.length; k += 2) {
                let [x0, y0] = coords[k];
                let [x1, y1] = coords[k + 1];
                let q0 = c2q.get(`${x0},${y0}`);
                let q1 = c2q.get(`${x1},${y1}`);
                newCircuit.layers[this.curLayer].put(new Operation(
                    gate,
                    new Float32Array(gate_args),
                    new Uint32Array([q0, q1]),
                ));
            }
        }
        this.commit_or_preview(newCircuit, preview);
    }

    /**
     * @param {!boolean} preview
     * @param {!Gate} gate
     * @param {!Array<!number>} gate_args
     */
    _writeVariableQubitGateToFocus(preview, gate, gate_args) {
        if (this.focusedSet.size === 0) {
            return;
        }

        let pairs = [];
        let cx = 0;
        let cy = 0;
        for (let xy of this.focusedSet.values()) {
            pairs.push(xy);
            cx += xy[0];
            cy += xy[1];
        }
        cx /= pairs.length;
        cy /= pairs.length;
        pairs.sort((a, b) => {
            let [x1, y1] = a;
            let [x2, y2] = b;
            return Math.atan2(y1 - cy, x1 - cx) - Math.atan2(y2 - cy, x2 - cx);
        });

        let newCircuit = this.copyOfCurCircuit().withCoordsIncluded(this.focusedSet.values());
        let c2q = newCircuit.coordToQubitMap();
        let qs = new Uint32Array(this.focusedSet.size);
        for (let k = 0; k < pairs.length; k++) {
            let [x, y] = pairs[k];
            qs[k] = c2q.get(`${x},${y}`);
        }

        newCircuit.layers[this.curLayer].put(new Operation(gate, new Float32Array(gate_args), qs));
        this.commit_or_preview(newCircuit, preview);
    }

    /**
     * @param {!boolean} preview
     * @param {!Gate} gate
     * @param {undefined|!Array<!number>=} gate_args
     */
    writeGateToFocus(preview, gate, gate_args=undefined) {
        if (gate_args === undefined) {
            if (gate.defaultArgument === undefined) {
                gate_args = [];
            } else {
                gate_args = [gate.defaultArgument];
            }
        }
        if (gate.num_qubits === 1) {
            this._writeSingleQubitGateToFocus(preview, gate, gate_args);
        } else if (gate.num_qubits === 2) {
            this._writeTwoQubitGateToFocus(preview, gate, gate_args);
        } else {
            this._writeVariableQubitGateToFocus(preview, gate, gate_args);
        }
    }
}

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @return {!boolean}
 */
function shouldControlURL() {
    try {
        return window.self === window.top;
    } catch (_) {
        return false;
    }
}

/**
 * Manages interactions with the browser's history as the app's state changes and frequently updates the URL.
 */
class HistoryPusher {
    constructor() {
        /**
         * @type {!boolean}
         * @private
         */
        this._historyActionsNotWorking = false;
        /**
         * @type {undefined|*}
         * @private
         */
        this._currentMemorableStateObj = undefined;
    }

    /**
     * Indicates that the current state should be preserved in the browser history if the user transitions away from it.
     *
     * Because the state isn't known, any transition will trigger the preservation (possibly creating a duplicate
     * history entry).
     */
    currentStateIsMemorableButUnknown() {
        this._currentMemorableStateObj = {wont_equal_this: true};
    }

    /**
     * Indicates that the current state should be preserved in the browser history if the user transitions away from it.
     * @param {*} stateObj An ===-able object representing the current state, for identifying spurious transitions.
     */
    currentStateIsMemorableAndEqualTo(stateObj) {
        this._currentMemorableStateObj = stateObj;
    }

    /**
     * Indicates that the current state should not be preserved in the browser history if the user transitions away.
     * States are not-memorable by default.
     */
    currentStateIsNotMemorable() {
        this._currentMemorableStateObj = undefined;
    }

    /**
     * @param {*} stateObj An equatable (by ===) object representing the latest state.
     * @param {!string} stateUrlHash A document.location.hash value that will lead to the latest state.
     */
    stateChange(stateObj, stateUrlHash) {
        if (!stateUrlHash.startsWith('#')) {
            throw new Error(`"Expected a hash URL: ${{stateObj, stateUrlHash}}`);
        }
        if (!shouldControlURL()) {
            return;
        }
        if (this._currentMemorableStateObj === stateObj) {
            return;
        }
        if (this._historyActionsNotWorking) {
            // This is worse than using the history API, since it inserts junk after every state change, but it's also
            // better than just randomly losing the circuit.
            document.location.hash = stateUrlHash;
            return;
        }

        try {
            // 'Memorable' states should stay in the history instead of being replaced.
            if (this._currentMemorableStateObj === undefined) {
                history.replaceState(stateObj, "", stateUrlHash);
            } else {
                history.pushState(stateObj, "", stateUrlHash);
                this._currentMemorableStateObj = undefined;
            }
        } catch (ex) {
            // E.g. this happens when running from the filesystem due to same-origin constraints.
            console.warn(
                "Calling 'history.replaceState/pushState' failed. Falling back to setting location.hash.",
                ex);
            this._historyActionsNotWorking = true;
            document.location.hash = stateUrlHash;
        }
    }
}

/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @param {!string} text
 * @return {!string}
 */
function urlWithCircuitHash(text) {
    text = text.
        replaceAll('QUBIT_COORDS', 'Q').
        replaceAll(', ', ',').
        replaceAll(') ', ')').
        replaceAll(' ', '_').
        replaceAll('\n', ';');
    if (text.indexOf('%') !== -1 || text.indexOf('&') !== -1) {
        text = encodeURIComponent(text);
    }
    return "#circuit=" + text;
}

function initCoursera(editorState, resetButton=false){
	const historyPusher = new HistoryPusher();
	const loadCircuitFromSessionConfiguration = () => {
		// Get the coursera session configuration to initialize the circuit
		courseraApi.callMethod({
			type: 'GET_SESSION_CONFIGURATION',
			onSuccess: function(configuration) {
				let circuitstring = resetButton && 'originalCircuit' in configuration ? configuration['originalCircuit'] : configuration['circuit'];
				historyPusher.currentStateIsMemorableAndEqualTo(circuitstring);
				editorState.rev.clear(circuitstring);
				historyPusher.stateChange(circuitstring, urlWithCircuitHash(circuitstring));
				editorState.changeCurLayerTo(configuration['initIndex']);

				editorState.rev.latestActiveCommit().whenDifferent().skip(1).subscribe(jsonText => {
					historyPusher.stateChange(jsonText, urlWithCircuitHash(jsonText));
				});
				editorState.obs_val_draw_state.observable().subscribe(ds => requestAnimationFrame(() => draw(editorState.canvas.getContext('2d'), ds)));

				courseraApi.callMethod({
				    type: "SET_ANSWER",
				    data: {
					answer: circuitstring
				    }
				});
			},
			onError: function(error) {
				console.log(error);
				config = {};
			}
		});
	};
	window.addEventListener('popstate', loadCircuitFromSessionConfiguration);
	loadCircuitFromSessionConfiguration();
}

let toolboxCanvas = /** @type {!HTMLCanvasElement} */ document.getElementById('toolbox');

let DIAM = 28;
let PITCH = DIAM + 4;
let PAD = 10.5;

let COLUMNS = ['H', 'S', 'R', 'M', 'C', '1', '2', '3', '4'];
let DEF_ROW = [1, 2, 2, 2, undefined, -1, -1, -1, -1];

/**
 * @param {!ChordEvent} ev
 * @returns {undefined|!{row: !int, strength: !number}}
 */
function getFocusedRow(ev) {
    if (ev.ctrlKey) {
        return undefined;
    }
    let hasX = +ev.chord.has('x');
    let hasY = +ev.chord.has('y');
    let hasZ = +ev.chord.has('z');
    if ((hasX && !hasY && !hasZ) || (!hasX && hasY && hasZ)) {
        return {row: 0, strength: Math.max(hasX, Math.min(hasY, hasZ))};
    }
    if ((!hasX && hasY && !hasZ) || (hasX && !hasY && hasZ)) {
        return {row: 1, strength: Math.max(hasY, Math.min(hasX, hasZ))};
    }
    if ((!hasX && !hasY && hasZ) || (hasX && hasY && !hasZ)) {
        return {row: 2, strength: Math.max(hasZ, Math.min(hasX, hasY))};
    }
    return undefined;
}
/**
 * @param {!ChordEvent} ev
 * @returns {undefined|!{col: !int, strength: !number}}
 */
function getFocusedCol(ev) {
    if (ev.ctrlKey) {
        return undefined;
    }
    let best = undefined;
    for (let k = 0; k < COLUMNS.length; k++) {
        let s = ev.chord.has(COLUMNS[k].toLowerCase());
        if (s > 0) {
            if (best === undefined || s > best.strength) {
                best = {col: k, strength: s};
            }
        }
    }
    return best;
}

let POS_TO_GATE_DICT = new Map([
    ['0,0', GATE_MAP.get("H_YZ")],
    ['0,1', GATE_MAP.get("H")],
    ['0,2', GATE_MAP.get("H_XY")],
    ['1,0', GATE_MAP.get("SQRT_X")],
    ['1,1', GATE_MAP.get("SQRT_Y")],
    ['1,2', GATE_MAP.get("S")],
    ['2,0', GATE_MAP.get("RX")],
    ['2,1', GATE_MAP.get("RY")],
    ['2,2', GATE_MAP.get("R")],
    ['3,0', GATE_MAP.get("MX")],
    ['3,1', GATE_MAP.get("MY")],
    ['3,2', GATE_MAP.get("M")],
    ['4,0', GATE_MAP.get("CX")],
    ['4,1', GATE_MAP.get("CY")],
    ['4,2', GATE_MAP.get("CZ")],
    ['5,0', GATE_MAP.get("MARKX").withDefaultArgument(0)],
    ['5,1', GATE_MAP.get("MARKY").withDefaultArgument(0)],
    ['5,2', GATE_MAP.get("MARKZ").withDefaultArgument(0)],
    ['6,0', GATE_MAP.get("MARKX").withDefaultArgument(1)],
    ['6,1', GATE_MAP.get("MARKY").withDefaultArgument(1)],
    ['6,2', GATE_MAP.get("MARKZ").withDefaultArgument(1)],
    ['7,0', GATE_MAP.get("MARKX").withDefaultArgument(2)],
    ['7,1', GATE_MAP.get("MARKY").withDefaultArgument(2)],
    ['7,2', GATE_MAP.get("MARKZ").withDefaultArgument(2)],
    ['8,0', GATE_MAP.get("MARKX").withDefaultArgument(3)],
    ['8,1', GATE_MAP.get("MARKY").withDefaultArgument(3)],
    ['8,2', GATE_MAP.get("MARKZ").withDefaultArgument(3)],
    ['5,-1', GATE_MAP.get("MARK").withDefaultArgument(0)],
    ['6,-1', GATE_MAP.get("MARK").withDefaultArgument(1)],
    ['7,-1', GATE_MAP.get("MARK").withDefaultArgument(2)],
    ['8,-1', GATE_MAP.get("MARK").withDefaultArgument(3)],
]);

/**
 * @param {!ChordEvent} ev
 * @returns {{focusedRow: (!{row: !int, strength: !number}|undefined), partialFocusedRow: (!{row: !int, strength: !number}|undefined), focusedCol: (!{col: !int, strength: !number}|undefined), chosenGate: undefined|!Gate}}
 */
function getToolboxFocusedData(ev) {
    let partialFocusedRow = getFocusedRow(ev);
    let focusedCol = getFocusedCol(ev);

    let focusedRow = partialFocusedRow;
    if (focusedCol !== undefined && partialFocusedRow === undefined) {
        let row = DEF_ROW[focusedCol.col];
        if (row === undefined) {
            focusedRow = undefined;
        } else {
            focusedRow = {strength: 0, row: row};
        }
    }
    let chosenGate = undefined;
    if (focusedRow !== undefined && focusedCol !== undefined) {
        let key = `${focusedCol.col},${focusedRow.row}`;
        if (POS_TO_GATE_DICT.has(key)) {
            chosenGate = POS_TO_GATE_DICT.get(key);
        }
    }

    return {partialFocusedRow, focusedRow, focusedCol, chosenGate};
}

/**
 * @param {!ChordEvent} ev
 */
function drawToolbox(ev) {
    toolboxCanvas.width = toolboxCanvas.scrollWidth;
    toolboxCanvas.height = toolboxCanvas.scrollHeight;
    let ctx = toolboxCanvas.getContext('2d');
    ctx.clearRect(0, 0, toolboxCanvas.width, toolboxCanvas.height);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', PAD - 3, PAD + DIAM / 2);
    ctx.fillText('Y', PAD - 3, PAD + DIAM / 2 + PITCH);
    ctx.fillText('Z', PAD - 3, PAD + DIAM / 2 + PITCH * 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let k = 0; k < COLUMNS.length; k++) {
        ctx.fillText(COLUMNS[k], PAD + DIAM / 2 + PITCH * k, PAD);
    }

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    let xGates = ['H_YZ', 'S_X', 'R_X', 'M_X', 'C_X', 'X1', 'X2', 'X3', 'X4'];
    let yGates = ['H',    'S_Y', 'R_Y', 'M_Y', 'C_Y', 'Y1', 'Y2', 'Y3', 'Y4'];
    let zGates = ['H_XY', 'S',   'R',   'M',   'C_Z', 'Z1', 'Z2', 'Z3', 'Z4'];
    let gates = [xGates, yGates, zGates];
    for (let k = 0; k < COLUMNS.length; k++) {
        for (let p = 0; p < 3; p++) {
            ctx.fillRect(PAD + PITCH * k, PAD + PITCH * p, DIAM, DIAM);
            ctx.strokeRect(PAD + PITCH * k, PAD + PITCH * p, DIAM, DIAM);
        }
    }
    ctx.fillStyle = 'black';
    for (let k = 0; k < COLUMNS.length; k++) {
        for (let p = 0; p < 3; p++) {
            let text = gates[p][k];
            let cx = PAD + PITCH * k + DIAM / 2;
            let cy = PAD + PITCH * p + DIAM / 2;
            if (text.indexOf('_') !== -1) {
                let [main, sub] = text.split('_');
                ctx.font = '16pt monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(main, cx, cy);
                ctx.font = sub.length === 1 ? '12pt monospace' : '8pt monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(sub, cx, cy);
            } else {
                ctx.font = '16pt monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, cx, cy);
            }
        }
    }

    performance.now();
    let focus = getToolboxFocusedData(ev);

    if (focus.partialFocusedRow !== undefined) {
        ctx.fillStyle = 'rgba(255, 255, 0, ' + (0.5 * focus.partialFocusedRow.strength) + ')';
        ctx.fillRect(0, PAD + PITCH * focus.partialFocusedRow.row - (PITCH - DIAM) / 2, PAD + PITCH * COLUMNS.length, PITCH);
    }
    if (focus.focusedCol !== undefined) {
        ctx.fillStyle = 'rgba(255, 255, 0, ' + (0.5 * focus.focusedCol.strength) + ')';
        ctx.fillRect( PAD + PITCH * focus.focusedCol.col - (PITCH - DIAM) / 2, 0, PITCH, PAD + PITCH * 3);
    }
    if (focus.focusedRow !== undefined && focus.focusedCol !== undefined) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect( PAD + PITCH * focus.focusedCol.col - (PITCH - DIAM) / 2, PAD + PITCH * focus.focusedRow.row - (PITCH - DIAM) / 2, PITCH, PITCH);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    ctx.fillText("W=SWAP", PAD + PITCH * COLUMNS.length, PAD);
    ctx.fillText("F=C_XYZ", PAD + PITCH * COLUMNS.length, PAD + 20);
    ctx.fillText("P=POLYGON", PAD + PITCH * COLUMNS.length, PAD + 40);
    ctx.fillText("space=unmark", PAD + PITCH * COLUMNS.length, PAD + 60);
    ctx.fillText("I=ISWAP", PAD + PITCH * COLUMNS.length, PAD + 80);
    ctx.fillText("L=TIMELINEFOCUS", PAD + PITCH * COLUMNS.length, PAD + 100);
}

const OFFSET_X = -pitch + Math.floor(pitch / 4) + 0.5;
const OFFSET_Y = -pitch + Math.floor(pitch / 4) + 0.5;

const btnUndo = /** @type{!HTMLButtonElement} */ document.getElementById('btnUndo');
const btnRedo = /** @type{!HTMLButtonElement} */ document.getElementById('btnRedo');
const btnClearMarkers = /** @type{!HTMLButtonElement} */ document.getElementById('btnClearMarkers');
const btnImportExport = /** @type{!HTMLButtonElement} */ document.getElementById('btnShowHideImportExport');
const btnNextLayer = /** @type{!HTMLButtonElement} */ document.getElementById('btnNextLayer');
const btnPrevLayer = /** @type{!HTMLButtonElement} */ document.getElementById('btnPrevLayer');
const btnRotate45 = /** @type{!HTMLButtonElement} */ document.getElementById('btnRotate45');
const btnRotate45Counter = /** @type{!HTMLButtonElement} */ document.getElementById('btnRotate45Counter');
const btnExport = /** @type {!HTMLButtonElement} */ document.getElementById('btnExport');
const btnImport = /** @type {!HTMLButtonElement} */ document.getElementById('btnImport');
const btnReset = /** @type {!HTMLButtonElement} */ document.getElementById('reset');
const txtStimCircuit = /** @type {!HTMLTextAreaElement} */ document.getElementById('txtStimCircuit');

// Prevent typing in the import/export text editor from causing changes in the main circuit editor.
txtStimCircuit.addEventListener('keyup', ev => ev.stopPropagation());
txtStimCircuit.addEventListener('keydown', ev => ev.stopPropagation());

let editorState = /** @type {!EditorState} */ new EditorState(document.getElementById('cvn'));

btnExport.addEventListener('click', _ev => {
    exportCurrentState();
});
btnImport.addEventListener('click', _ev => {
    let text = txtStimCircuit.value;
    let circuit = Circuit.fromStimCircuit(text.replaceAll('\n#!pragma ', '\n'));
    editorState.commit(circuit);
    setAnswer();
});

btnImportExport.addEventListener('click', _ev => {
    let div = /** @type{!HTMLDivElement} */ document.getElementById('divImportExport');
    if (div.style.display === 'none') {
        div.style.display = 'block';
        btnImportExport.textContent = "Hide Import/Export";
        exportCurrentState();
    } else {
        div.style.display = 'none';
        btnImportExport.textContent = "Show Import/Export";
        txtStimCircuit.value = '';
    }
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 0);
});

btnReset.addEventListener('click', _ev => {
	initCoursera(editorState, true);
});

btnUndo.addEventListener('click', _ev => {
    editorState.undo();
    setAnswer();
});
btnRedo.addEventListener('click', _ev => {
    editorState.redo();
    setAnswer();
});

btnClearMarkers.addEventListener('click', _ev => {
    editorState.clearMarkers();
    setAnswer();
});

btnRotate45.addEventListener('click', _ev => {
    editorState.rotate45(+1, false);
    setAnswer();
});
btnRotate45Counter.addEventListener('click', _ev => {
    editorState.rotate45(-1, false);
    setAnswer();
});

btnNextLayer.addEventListener('click', _ev => {
    editorState.changeCurLayerTo(editorState.curLayer + 1);
});
btnPrevLayer.addEventListener('click', _ev => {
    editorState.changeCurLayerTo(editorState.curLayer - 1);
});

window.addEventListener('resize', _ev => {
    editorState.canvas.width = editorState.canvas.scrollWidth;
    editorState.canvas.height = editorState.canvas.scrollHeight;
    editorState.force_redraw();
});

function exportCurrentState() {
    let validStimCircuit = editorState.copyOfCurCircuit().toStimCircuit().
        replaceAll('\nPOLYGON', '\n#!pragma POLYGON').
        replaceAll('\nMARK', '\n#!pragma MARK');
    let txt = txtStimCircuit;
    txt.value = validStimCircuit + '\n';
    txt.focus();
    txt.select();
}

editorState.canvas.addEventListener('mousemove', ev => {
    editorState.curMouseX = ev.offsetX + OFFSET_X;
    editorState.curMouseY = ev.offsetY + OFFSET_Y;

    // Scrubber.
    if (editorState.mouseDownX - OFFSET_X < 10 && editorState.curMouseX - OFFSET_X < 10 && ev.buttons === 1) {
        editorState.changeCurLayerTo(Math.floor(ev.offsetY / 5));
        ev.preventDefault();
        return;
    }

    editorState.force_redraw();
});

editorState.canvas.addEventListener('mousedown', ev => {
    editorState.curMouseX = ev.offsetX + OFFSET_X;
    editorState.curMouseY = ev.offsetY + OFFSET_Y;
    editorState.mouseDownX = ev.offsetX + OFFSET_X;
    editorState.mouseDownY = ev.offsetY + OFFSET_Y;
    if (editorState.mouseDownX - OFFSET_X < 10 && ev.buttons === 1) {
        editorState.changeCurLayerTo(Math.floor(ev.offsetY / 5));
        return;
    }
    editorState.force_redraw();
});

editorState.canvas.addEventListener('mouseup', ev => {
    let highlightedArea = editorState.currentPositionsBoxesByMouseDrag(ev.altKey);
    editorState.mouseDownX = undefined;
    editorState.mouseDownY = undefined;
    editorState.curMouseX = ev.offsetX + OFFSET_X;
    editorState.curMouseY = ev.offsetY + OFFSET_Y;
    editorState.changeFocus(highlightedArea, ev.shiftKey, ev.ctrlKey);
});

/**
 * @return {!Map<!string, !function(preview: !boolean) : void>}
 */
function makeChordHandlers() {
    let res = /** @type {!Map<!string, !function(preview: !boolean) : void>} */ new Map();

    res.set('shift+t', preview => editorState.rotate45(-1, preview));
    res.set('t', preview => editorState.rotate45(+1, preview));
    res.set('escape', () => editorState.clearFocus);
    res.set('delete', preview => editorState.deleteAtFocus(preview));
    res.set('backspace', preview => editorState.deleteAtFocus(preview));
    res.set('ctrl+delete', preview => editorState.deleteCurLayer(preview));
    res.set('ctrl+insert', preview => editorState.insertLayer(preview));
    res.set('ctrl+backspace', () => editorState.deleteCurLayer);
    res.set('ctrl+z', preview => { if (!preview) editorState.undo(); });
    res.set('ctrl+y', preview => { if (!preview) editorState.redo(); });
    res.set('ctrl+shift+z', preview => { if (!preview) editorState.redo(); });
    res.set('ctrl+c', async preview => { if (!preview) await copyToClipboard(); });
    res.set('ctrl+v', pasteFromClipboard);
    res.set('ctrl+x', async preview => {
        await copyToClipboard();
        editorState.deleteAtFocus(preview);
    });
    res.set('l', preview => {
        if (!preview) {
            editorState.timelineSet = new Map(editorState.focusedSet.entries());
            editorState.force_redraw();
        }
    });
    res.set(' ', preview => {
        let c = editorState.copyOfCurCircuit();
        let c2q = c.coordToQubitMap();
        for (let v of editorState.focusedSet.keys()) {
            let q = c2q.get(v);
            if (q !== undefined) {
                c.layers[editorState.curLayer].id_dropMarkersAt(q);
            }
        }
        editorState.commit_or_preview(c, preview);
    });
    res.set('q', preview => { if (!preview) editorState.changeCurLayerTo(editorState.curLayer - 1); });
    res.set('e', preview => { if (!preview) editorState.changeCurLayerTo(editorState.curLayer + 1); });

    for (let [key, val] of [
        ['1', 0],
        ['2', 1],
        ['3', 2],
        ['4', 3],
        ['5', 4],
        ['6', 5],
        ['7', 6],
        ['8', 7],
        ['9', 8],
        ['0', 9],
        ['-', 10],
        ['=', 11],
        ['\\', 12],
        ['`', 13],
    ]) {
        res.set(`${key}`, preview => editorState.markFocusInferBasis(preview, val));
        res.set(`${key}+x`, preview => editorState.writeGateToFocus(preview, GATE_MAP.get('MARKX').withDefaultArgument(val)));
        res.set(`${key}+y`, preview => editorState.writeGateToFocus(preview, GATE_MAP.get('MARKY').withDefaultArgument(val)));
        res.set(`${key}+z`, preview => editorState.writeGateToFocus(preview, GATE_MAP.get('MARKZ').withDefaultArgument(val)));
    }

    res.set('p', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [1, 0, 0, 0.5]));
    res.set('alt+p', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [0, 1, 0, 0.5]));
    res.set('shift+p', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [0, 0, 1, 0.5]));
    res.set('p+x', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [1, 0, 0, 0.5]));
    res.set('p+y', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [0, 1, 0, 0.5]));
    res.set('p+z', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [0, 0, 1, 0.5]));
    res.set('p+x+y', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [1, 1, 0, 0.5]));
    res.set('p+x+z', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [1, 0, 1, 0.5]));
    res.set('p+y+z', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [0, 1, 1, 0.5]));
    res.set('p+x+y+z', preview => editorState.writeGateToFocus(preview, GATE_MAP.get("POLYGON"), [1, 1, 1, 0.5]));

    /**
     * @param {!Array<!string>} chords
     * @param {!string} name
     * @param {undefined|!string=}inverse_name
     */
    function addGateChords(chords, name, inverse_name=undefined) {
        for (let chord of chords) {
            if (res.has(chord)) {
                throw new Error("Chord collision: " + chord);
            }
            res.set(chord, preview => editorState.writeGateToFocus(preview, GATE_MAP.get(name)));
        }
        if (inverse_name !== undefined) {
            addGateChords(chords.map(e => 'shift+' + e), inverse_name);
        }
    }

    addGateChords(['h', 'h+y', 'h+x+z'], "H", "H");
    addGateChords(['h+z', 'h+x+y'], "H_XY", "H_XY");
    addGateChords(['h+x', 'h+y+z'], "H_YZ", "H_YZ");
    addGateChords(['s+x', 's+y+z'], "SQRT_X", "SQRT_X_DAG");
    addGateChords(['s+y', 's+x+z'], "SQRT_Y", "SQRT_Y_DAG");
    addGateChords(['s', 's+z', 's+x+y'], "S", "S_DAG");
    addGateChords(['r+x', 'r+y+z'], "RX");
    addGateChords(['r+y', 'r+x+z'], "RY");
    addGateChords(['r', 'r+z', 'r+x+y'], "R");
    addGateChords(['m+x', 'm+y+z'], "MX");
    addGateChords(['m+y', 'm+x+z'], "MY");
    addGateChords(['m', 'm+z', 'm+x+y'], "M");
    addGateChords(['m+r+x', 'm+r+y+z'], "MRX");
    addGateChords(['m+r+y', 'm+r+x+z'], "MRY");
    addGateChords(['m+r', 'm+r+z', 'm+r+x+y'], "MR");
    addGateChords(['c+x'], "CX", "CX");
    addGateChords(['c+y'], "CY", "CY");
    addGateChords(['c+z'], "CZ", "CZ");
    addGateChords(['c+x+y'], "XCY", "XCY");
    addGateChords(['alt+c+x'], "XCX", "XCX");
    addGateChords(['alt+c+y'], "YCY", "YCY");

    addGateChords(['w'], "SWAP", "SWAP");
    addGateChords(['w+x'], "CXSWAP", undefined);
    addGateChords(['c+w+x'], "CXSWAP", undefined);
    addGateChords(['i+w'], "ISWAP", "ISWAP_DAG");

    addGateChords(['f'], "C_XYZ", "C_ZYX");
    addGateChords(['c+s+x'], "SQRT_XX", "SQRT_XX_DAG");
    addGateChords(['c+s+y'], "SQRT_YY", "SQRT_YY_DAG");
    addGateChords(['c+s+z'], "SQRT_ZZ", "SQRT_ZZ_DAG");

    addGateChords(['c+m+x'], "MXX", "MXX");
    addGateChords(['c+m+y'], "MYY", "MYY");
    addGateChords(['c+m+z'], "MZZ", "MZZ");

    return res;
}

let emulatedClipboard = undefined;
async function copyToClipboard() {
    let c = editorState.copyOfCurCircuit();
    c.layers = [c.layers[editorState.curLayer]];
    if (editorState.focusedSet.size > 0) {
        c.layers[0] = c.layers[0].id_filteredByQubit(q => {
            let x = c.qubitCoordData[q * 2];
            let y = c.qubitCoordData[q * 2 + 1];
            return editorState.focusedSet.has(`${x},${y}`);
        });
        let [x, y] = minXY(editorState.focusedSet.values());
        c = c.shifted(-x, -y);
    }

    let content = c.toStimCircuit();
    try {
        await navigator.clipboard.writeText(content);
        emulatedClipboard = undefined;
    } catch (ex) {
        emulatedClipboard = content;
        console.error(ex);
    }
}

/**
 * @param {!boolean} preview
 */
async function pasteFromClipboard(preview) {
    let text;
    try {
        text = await navigator.clipboard.readText();
    } catch (ex) {
        text = emulatedClipboard;
        console.error(ex);
    }
    if (text === undefined) {
        return;
    }

    let pastedCircuit = Circuit.fromStimCircuit(text);
    if (pastedCircuit.layers.length !== 1) {
        throw new Error(text);
    }
    let newCircuit = editorState.copyOfCurCircuit();
    if (editorState.focusedSet.size > 0) {
        let [x, y] = minXY(editorState.focusedSet.values());
        pastedCircuit = pastedCircuit.shifted(x, y);
    }

    // Include new coordinates.
    let usedCoords = [];
    for (let q = 0; q < pastedCircuit.qubitCoordData.length; q += 2) {
        usedCoords.push([pastedCircuit.qubitCoordData[q], pastedCircuit.qubitCoordData[q + 1]]);
    }
    newCircuit = newCircuit.withCoordsIncluded(usedCoords);
    let c2q = newCircuit.coordToQubitMap();

    // Remove existing content at paste location.
    for (let key of editorState.focusedSet.keys()) {
        let q = c2q.get(key);
        if (q !== undefined) {
            newCircuit.layers[editorState.curLayer].id_pop_at(q);
        }
    }

    // Add content to paste location.
    for (let op of pastedCircuit.layers[0].iter_gates_and_markers()) {
        let newTargets = [];
        for (let q of op.id_targets) {
            let x = pastedCircuit.qubitCoordData[2*q];
            let y = pastedCircuit.qubitCoordData[2*q+1];
            newTargets.push(c2q.get(`${x},${y}`));
        }
        newCircuit.layers[editorState.curLayer].put(new Operation(
            op.gate,
            op.args,
            new Uint32Array(newTargets),
        ));
    }

    editorState.commit_or_preview(newCircuit, preview);
}

function setAnswer(){
	let circuitstring = editorState.copyOfCurCircuit().toStimCircuit();
	courseraApi.callMethod({
	    type: "SET_ANSWER",
	    data: {
		answer: circuitstring
	    }
	});
}

const CHORD_HANDLERS = makeChordHandlers();
/**
 * @param {!KeyboardEvent} ev
 */
function handleKeyboardEvent(ev) {
    editorState.chorder.handleKeyEvent(ev);
    let evs = editorState.chorder.queuedEvents;
    if (evs.length === 0) {
        return;
    }
    let chord_ev = evs[evs.length - 1];
    while (evs.length > 0) {
        evs.pop();
    }

    let pressed = [...chord_ev.chord];
    if (pressed.length === 0) {
        return;
    }
    pressed.sort();
    let key = '';
    if (chord_ev.altKey) {
        key += 'alt+';
    }
    if (chord_ev.ctrlKey) {
        key += 'ctrl+';
    }
    if (chord_ev.metaKey) {
        key += 'meta+';
    }
    if (chord_ev.shiftKey) {
        key += 'shift+';
    }
    for (let e of pressed) {
        key += `${e}+`;
    }
    key = key.substring(0, key.length - 1);

    let handler = CHORD_HANDLERS.get(key);
    if (handler !== undefined) {
        handler(chord_ev.inProgress);
        ev.preventDefault();
	setAnswer();
    } else {
        editorState.preview(editorState.copyOfCurCircuit());
    }
}

document.addEventListener('keydown', handleKeyboardEvent);
document.addEventListener('keyup', handleKeyboardEvent);

editorState.canvas.width = editorState.canvas.scrollWidth;
editorState.canvas.height = editorState.canvas.scrollHeight;
editorState.rev.changes().subscribe(() => {
    editorState.obs_val_draw_state.set(editorState.toSnapshot(undefined));
    drawToolbox(editorState.chorder.toEvent(false));
});
initCoursera(editorState);
window.addEventListener('focus', () => {
    editorState.chorder.handleFocusChanged();
});
window.addEventListener('blur', () => {
    editorState.chorder.handleFocusChanged();
});

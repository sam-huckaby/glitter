#!/usr/bin/env ts-node

/* ============================================================
 * Terminal Native Design Tooling
 * Braille-based pixel renderer + mouse interaction
 * ============================================================
 */

import * as readline from "readline";

/* ============================================================
 * ANSI
 * ============================================================
 */

const ANSI = {
	reset: "\x1b[0m",
	whiteBg: "\x1b[47m",
	blackFg: "\x1b[30m",
	clear: "\x1b[2J",
	home: "\x1b[H",

	mouseOn: "\x1b[?1000h\x1b[?1002h\x1b[?1006h",
	mouseOff: "\x1b[?1000l\x1b[?1002l\x1b[?1006l",
};

/* ============================================================
 * Braille
 * ============================================================
 */

const DOT = {
	1: 0x01,
	2: 0x02,
	3: 0x04,
	4: 0x08,
	5: 0x10,
	6: 0x20,
	7: 0x40,
	8: 0x80,
};

const DOT_MAP = [
	[DOT[1], DOT[4]],
	[DOT[2], DOT[5]],
	[DOT[3], DOT[6]],
	[DOT[7], DOT[8]],
];

/* ============================================================
 * Pixel Canvas
 * ============================================================
 */

class PixelCanvas {
	width: number;
	height: number;
	data: Uint8Array;

	constructor(w: number, h: number) {
		this.width = w;
		this.height = h;
		this.data = new Uint8Array(w * h);
	}

	idx(x: number, y: number) {
		return y * this.width + x;
	}

	clear() {
		this.data.fill(0);
	}

	set(x: number, y: number) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
		this.data[this.idx(x, y)] = 1;
	}

	get(x: number, y: number) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
		return this.data[this.idx(x, y)];
	}
}

/* ============================================================
 * Braille Buffer
 * ============================================================
 */

class BrailleBuffer {
	cols: number;
	rows: number;
	cells: Uint8Array;

	constructor(pixelW: number, pixelH: number) {
		this.cols = Math.ceil(pixelW / 2);
		this.rows = Math.ceil(pixelH / 4);
		this.cells = new Uint8Array(this.cols * this.rows);
	}

	set(px: number, py: number) {
		const cx = Math.floor(px / 2);
		const cy = Math.floor(py / 4);
		if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;

		const sx = px % 2;
		const sy = py % 4;
		this.cells[cy * this.cols + cx] |= DOT_MAP[sy][sx];
	}

	toString() {
		let out = "";
		for (let y = 0; y < this.rows; y++) {
			for (let x = 0; x < this.cols; x++) {
				out += String.fromCharCode(
					0x2800 + this.cells[y * this.cols + x]
				);
			}
			out += "\n";
		}
		return out;
	}
}

/* ============================================================
 * Frame
 * ============================================================
 */

interface Frame {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

function drawFrame(canvas: PixelCanvas, f: Frame) {
	for (let x = f.left; x <= f.right; x++) {
		canvas.set(x, f.top);
		canvas.set(x, f.bottom);
	}

	for (let y = f.top; y <= f.bottom; y++) {
		canvas.set(f.left, y);
		canvas.set(f.right, y);
	}
}

/* ============================================================
 * Render
 * ============================================================
 */

function render(canvas: PixelCanvas) {
	const buf = new BrailleBuffer(canvas.width, canvas.height);
	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			if (canvas.get(x, y)) buf.set(x, y);
		}
	}
	return buf.toString();
}

/* ============================================================
 * Setup
 * ============================================================
 */

const PIXEL_WIDTH = 160;
const PIXEL_HEIGHT = 96;

const canvas = new PixelCanvas(PIXEL_WIDTH, PIXEL_HEIGHT);

const frame: Frame = {
	left: 8,
	right: PIXEL_WIDTH - 9,
	top: 8,
	bottom: PIXEL_HEIGHT - 9,
};

function draw() {
	canvas.clear();
	drawFrame(canvas, frame);

	process.stdout.write(ANSI.home);
	process.stdout.write(ANSI.whiteBg + ANSI.blackFg);
	process.stdout.write(render(canvas));
	process.stdout.write(ANSI.reset);
}

/* ============================================================
 * Mouse interaction
 * ============================================================
 */

type DragEdge = "left" | "right" | "top" | "bottom" | null;

let dragging: DragEdge = null;

function cellToPixel(x: number, y: number) {
	return {
		px: (x - 1) * 2,
		py: (y - 1) * 4,
	};
}

function hitTest(px: number, py: number): DragEdge {
	const T = 2; // snap threshold (pixels)

	if (Math.abs(px - frame.left) <= T) return "left";
	if (Math.abs(px - frame.right) <= T) return "right";
	if (Math.abs(py - frame.top) <= T) return "top";
	if (Math.abs(py - frame.bottom) <= T) return "bottom";

	return null;
}

function clamp() {
	frame.left = Math.max(0, Math.min(frame.left, frame.right - 4));
	frame.right = Math.min(
		PIXEL_WIDTH - 1,
		Math.max(frame.right, frame.left + 4)
	);
	frame.top = Math.max(0, Math.min(frame.top, frame.bottom - 4));
	frame.bottom = Math.min(
		PIXEL_HEIGHT - 1,
		Math.max(frame.bottom, frame.top + 4)
	);
}

/* ============================================================
 * Input
 * ============================================================
 */

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on("data", (buf) => {
	const s = buf.toString();

	// mouse event
	const match = s.match(/\x1b\[<(\d+);(\d+);(\d+)([mM])/);
	if (!match) return;

	const [, , cx, cy, state] = match;
	const { px, py } = cellToPixel(+cx, +cy);

	if (state === "M") {
		if (!dragging) dragging = hitTest(px, py);

		if (dragging === "left") frame.left = px;
		if (dragging === "right") frame.right = px;
		if (dragging === "top") frame.top = py;
		if (dragging === "bottom") frame.bottom = py;

		clamp();
		draw();
	}

	if (state === "m") {
		dragging = null;
	}
});

/* ============================================================
 * Boot
 * ============================================================
 */

process.stdout.write(ANSI.clear);
process.stdout.write(ANSI.mouseOn);
process.stdout.write(ANSI.home);

draw();

process.on("exit", () => {
	process.stdout.write(ANSI.mouseOff);
	process.stdout.write(ANSI.reset);
});


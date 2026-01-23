#!/usr/bin/env ts-node

/**
 * Terminal-Native Design Tooling
 *
 * Rendering backend:
 *   Unicode Braille (2×4 pixels per cell)
 *
 * Logical pixel resolution:
 *   width  = cols * 2
 *   height = rows * 4
 *
 * This file establishes:
 *  - pixel canvas
 *  - braille rasterizer
 *  - 1-pixel frame drawing
 *  - ANSI renderer
 *
 * Mouse + interaction comes next.
 */

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
};

/* ============================================================
 * Braille dot constants
 *
 * Dot layout:
 *
 *  1 4
 *  2 5
 *  3 6
 *  7 8
 * ============================================================
 */

const BRAILLE = {
	DOT_1: 0x01,
	DOT_2: 0x02,
	DOT_3: 0x04,
	DOT_4: 0x08,
	DOT_5: 0x10,
	DOT_6: 0x20,
	DOT_7: 0x40,
	DOT_8: 0x80,
};

/**
 * Lookup table:
 * [subY][subX]
 */
const BRAILLE_DOT_MAP: number[][] = [
	[BRAILLE.DOT_1, BRAILLE.DOT_4], // y = 0
	[BRAILLE.DOT_2, BRAILLE.DOT_5], // y = 1
	[BRAILLE.DOT_3, BRAILLE.DOT_6], // y = 2
	[BRAILLE.DOT_7, BRAILLE.DOT_8], // y = 3
];

/* ============================================================
 * Pixel Canvas (authoritative model)
 * ============================================================
 */

class PixelCanvas {
	readonly width: number;
	readonly height: number;
	private pixels: Uint8Array;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.pixels = new Uint8Array(width * height);
	}

	index(x: number, y: number): number {
		return y * this.width + x;
	}

	inBounds(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	}

	set(x: number, y: number): void {
		if (!this.inBounds(x, y)) return;
		this.pixels[this.index(x, y)] = 1;
	}

	clear(x: number, y: number): void {
		if (!this.inBounds(x, y)) return;
		this.pixels[this.index(x, y)] = 0;
	}

	get(x: number, y: number): number {
		if (!this.inBounds(x, y)) return 0;
		return this.pixels[this.index(x, y)];
	}

	clearAll(): void {
		this.pixels.fill(0);
	}
}

/* ============================================================
 * Braille Raster Buffer
 * ============================================================
 */

class BrailleBuffer {
	readonly cols: number;
	readonly rows: number;
	private cells: Uint8Array;

	constructor(pixelWidth: number, pixelHeight: number) {
		this.cols = Math.ceil(pixelWidth / 2);
		this.rows = Math.ceil(pixelHeight / 4);
		this.cells = new Uint8Array(this.cols * this.rows);
	}

	clear(): void {
		this.cells.fill(0);
	}

	private index(x: number, y: number): number {
		return y * this.cols + x;
	}

	setPixel(px: number, py: number): void {
		const cellX = Math.floor(px / 2);
		const cellY = Math.floor(py / 4);

		if (
			cellX < 0 ||
			cellY < 0 ||
			cellX >= this.cols ||
			cellY >= this.rows
		) {
			return;
		}

		const subX = px % 2;
		const subY = py % 4;

		const mask = BRAILLE_DOT_MAP[subY][subX];
		this.cells[this.index(cellX, cellY)] |= mask;
	}

	toString(): string {
		let out = "";

		for (let y = 0; y < this.rows; y++) {
			for (let x = 0; x < this.cols; x++) {
				const mask = this.cells[this.index(x, y)];
				out += String.fromCharCode(0x2800 + mask);
			}
			out += "\n";
		}

		return out;
	}
}

/* ============================================================
 * Renderer
 * ============================================================
 */

function render(canvas: PixelCanvas): string {
	const buffer = new BrailleBuffer(canvas.width, canvas.height);

	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			if (canvas.get(x, y)) {
				buffer.setPixel(x, y);
			}
		}
	}

	return buffer.toString();
}

/* ============================================================
 * Frame drawing
 *
 * 1-pixel-wide walls.
 * Frame is editable.
 * White area outside is locked.
 * ============================================================
 */

interface Frame {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

function drawFrame(canvas: PixelCanvas, frame: Frame): void {
	const { left, right, top, bottom } = frame;

	// horizontal edges
	for (let x = left; x <= right; x++) {
		canvas.set(x, top);
		canvas.set(x, bottom);
	}

	// vertical edges
	for (let y = top; y <= bottom; y++) {
		canvas.set(left, y);
		canvas.set(right, y);
	}
}

/* ============================================================
 * Demo setup
 * ============================================================
 */

// logical pixel resolution
const PIXEL_WIDTH = 160;
const PIXEL_HEIGHT = 96;

const INSET = 8;

const frame: Frame = {
	left: INSET,
	right: PIXEL_WIDTH - INSET - 1,
	top: INSET,
	bottom: PIXEL_HEIGHT - INSET - 1,
};

const canvas = new PixelCanvas(PIXEL_WIDTH, PIXEL_HEIGHT);

function draw() {
	canvas.clearAll();
	drawFrame(canvas, frame);

	process.stdout.write(ANSI.home);
	process.stdout.write(ANSI.whiteBg + ANSI.blackFg);
	process.stdout.write(render(canvas));
	process.stdout.write(ANSI.reset);
}

/* ============================================================
 * Boot
 * ============================================================
 */

process.stdout.write(ANSI.clear);
process.stdout.write(ANSI.home);

draw();

/* ============================================================
 * NEXT (intentionally not implemented yet)
 * ============================================================
 *
 * - enable mouse reporting:
 *     ESC[?1000h
 *     ESC[?1002h
 *     ESC[?1006h
 *
 * - convert terminal cell → pixel:
 *     pixelX = (cellX - 1) * 2
 *     pixelY = (cellY - 1) * 4
 *
 * - hit testing frame edges
 * - drag resize constraints
 * - hover highlighting
 * - snapping
 *
 * This file is the rendering substrate.
 * Interaction comes next.
 */


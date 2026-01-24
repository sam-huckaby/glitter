// layers.ts

export const BRAILLE_DOTS = [
	[0x01, 0x08], // y = 0
	[0x02, 0x10], // y = 1
	[0x04, 0x20], // y = 2
	[0x40, 0x80], // y = 3
];

export interface Layer {
	id: string;
	name: string;
	visible: boolean;

	widthCells: number;
	heightCells: number;

	buffer: Uint8Array;
}

export class Scene {
	layers: Layer[] = [];
	activeLayerId: string | null = null;

	widthCells: number;
	heightCells: number;

	constructor(widthCells: number, heightCells: number) {
		this.widthCells = widthCells;
		this.heightCells = heightCells;
	}

	// -----------------------
	// Layer management
	// -----------------------

	addLayer(name: string): Layer {
		if (this.layers.some(l => l.name === name)) {
			throw new Error(`Layer "${name}" already exists`);
		}

		const layer: Layer = {
			id: crypto.randomUUID(),
			name,
			visible: true,
			widthCells: this.widthCells,
			heightCells: this.heightCells,
			buffer: new Uint8Array(
				this.widthCells * this.heightCells
			),
		};

		this.layers.push(layer);
		this.activeLayerId = layer.id;

		return layer;
	}

	setActiveLayer(name: string) {
		const layer = this.layers.find(l => l.name === name);
		if (!layer) {
			throw new Error(`Layer "${name}" not found`);
		}
		this.activeLayerId = layer.id;
	}

	get activeLayer(): Layer {
		const layer = this.layers.find(
			l => l.id === this.activeLayerId
		);
		if (!layer) {
			throw new Error("No active layer selected");
		}
		return layer;
	}

	// -----------------------
	// Drawing primitives
	// -----------------------

	setPixel(x: number, y: number) {
		const layer = this.activeLayer;

		const cellX = Math.floor(x / 2);
		const cellY = Math.floor(y / 4);

		if (
			cellX < 0 ||
			cellY < 0 ||
			cellX >= layer.widthCells ||
			cellY >= layer.heightCells
		) {
			return;
		}

		const dotX = x % 2;
		const dotY = y % 4;

		const dotMask = BRAILLE_DOTS[dotY][dotX];
		const index = cellY * layer.widthCells + cellX;

		layer.buffer[index] |= dotMask;
	}

	drawBox(x: number, y: number, w: number, h: number) {
		// top + bottom
		for (let i = x; i < x + w; i++) {
			this.setPixel(i, y);
			this.setPixel(i, y + h - 1);
		}

		// sides
		for (let j = y; j < y + h; j++) {
			this.setPixel(x, j);
			this.setPixel(x + w - 1, j);
		}
	}

	// -----------------------
	// Rendering
	// -----------------------

	render(): string {
		const final = new Uint8Array(
			this.widthCells * this.heightCells
		);

		for (const layer of this.layers) {
			if (!layer.visible) continue;

			for (let i = 0; i < final.length; i++) {
				final[i] |= layer.buffer[i];
			}
		}

		let output = "";

		for (let y = 0; y < this.heightCells; y++) {
			for (let x = 0; x < this.widthCells; x++) {
				const value = final[y * this.widthCells + x];
				output += String.fromCharCode(0x2800 + value);
			}
			output += "\n";
		}

		return output;
	}
}


// Layer system that handles math and stuff

import {
	SceneDoc,
	LayerDoc,
	ComponentDoc,
	BoxComponentDoc,
	Rect,
	validateSceneDoc,
} from "./sceneDoc";

export const BRAILLE_DOTS = [
	[0x01, 0x08],
	[0x02, 0x10],
	[0x04, 0x20],
	[0x40, 0x80],
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
	doc: SceneDoc;
	layers: Layer[] = [];
	activeLayerId: string | null = null;

	constructor(
		public widthCells: number,
		public heightCells: number
	) {
		this.doc = {
			schemaVersion: 1,
			units: "px",
			size: {
				widthCells,
				heightCells,
			},
			layers: [],
			components: [],
			state: { nextId: 1 },
		};
	}

	// ─────────────────────────
	// Layer Management
	// ─────────────────────────

	addLayer(name: string): Layer {
		if (this.doc.layers.some(l => l.id === name)) {
			throw new Error(`Layer "${name}" already exists`);
		}

		const layerDoc: LayerDoc = {
			id: name,
			name,
			visible: true,
		};

		const layer: Layer = {
			id: layerDoc.id,
			name: layerDoc.name,
			visible: layerDoc.visible,
			widthCells: this.widthCells,
			heightCells: this.heightCells,
			buffer: new Uint8Array(this.widthCells * this.heightCells),
		};

		this.doc.layers.push(layerDoc);
		this.layers.push(layer);
		this.activeLayerId = layer.id;
		return layer;
	}

	setActiveLayer(name: string) {
		const layer = this.layers.find(l => l.id === name);
		if (!layer) throw new Error(`Layer "${name}" not found`);
		this.activeLayerId = layer.id;
	}

	get activeLayer(): Layer {
		const layer = this.layers.find(
			l => l.id === this.activeLayerId
		);
		if (!layer) throw new Error("No active layer");
		return layer;
	}

	get widthPx(): number {
		return this.widthCells * 2;
	}

	get heightPx(): number {
		return this.heightCells * 4;
	}

	toDoc(): SceneDoc {
		if (typeof (globalThis as any).structuredClone === "function") {
			return (globalThis as any).structuredClone(this.doc);
		}
		return JSON.parse(JSON.stringify(this.doc));
	}

	static fromDoc(doc: SceneDoc): Scene {
		validateSceneDoc(doc);
		const scene = new Scene(doc.size.widthCells, doc.size.heightCells);
		scene.doc = JSON.parse(JSON.stringify(doc));

		// build runtime layers
		scene.layers = [];
		for (const layerDoc of scene.doc.layers) {
			scene.layers.push({
				id: layerDoc.id,
				name: layerDoc.name,
				visible: layerDoc.visible,
				widthCells: scene.widthCells,
				heightCells: scene.heightCells,
				buffer: new Uint8Array(scene.widthCells * scene.heightCells),
			});
		}

		scene.activeLayerId = scene.layers[scene.layers.length - 1]?.id ?? null;
		return scene;
	}

	addBox(opts: {
		layerId?: string;
		rect: Rect;
		id?: string;
		meta?: BoxComponentDoc["meta"];
	}): BoxComponentDoc {
		const layerId = opts.layerId ?? this.activeLayerId;
		if (!layerId) throw new Error("No active layer");
		if (!this.doc.layers.some(l => l.id === layerId)) {
			throw new Error(`Layer "${layerId}" not found`);
		}

		const { x, y, w, h } = opts.rect;
		const maxX = x + w;
		const maxY = y + h;
		if (
			x < 0 ||
			y < 0 ||
			w < 1 ||
			h < 1 ||
			maxX > this.widthPx ||
			maxY > this.heightPx
		) {
			throw new Error(
				`cannot create box outside of the canvas. Canvas height: ${this.heightPx}, canvas width: ${this.widthPx}`
			);
		}

		const id = opts.id ?? this.nextComponentId();
		if (this.doc.components.some(c => c.id === id)) {
			throw new Error(`Component "${id}" already exists`);
		}

		const comp: BoxComponentDoc = {
			id,
			type: "box",
			layerId,
			rect: { ...opts.rect },
			meta: opts.meta,
		};

		this.doc.components.push(comp);
		return comp;
	}

	getComponentById(id: string): ComponentDoc | undefined {
		return this.doc.components.find(c => c.id === id);
	}

	updateBoxRect(id: string, rect: Rect): void {
		const comp = this.getComponentById(id);
		if (!comp) throw new Error(`Component "${id}" not found`);
		if (comp.type !== "box") throw new Error(`Component "${id}" is not a box`);
		comp.rect = { ...rect };
	}

	private nextComponentId(): string {
		const id = `c${this.doc.state.nextId}`;
		this.doc.state.nextId++;
		return id;
	}

	// ─────────────────────────
	// Drawing Primitives
	// ─────────────────────────

	setPixel(x: number, y: number) {
		const layer = this.activeLayer;

		const cellX = Math.floor(x / 2);
		const cellY = Math.floor(y / 4);

		if (
			cellX < 0 ||
			cellY < 0 ||
			cellX >= layer.widthCells ||
			cellY >= layer.heightCells
		) return;

		const dotX = x % 2;
		const dotY = y % 4;

		const mask = BRAILLE_DOTS[dotY][dotX];
		const index = cellY * layer.widthCells + cellX;

		layer.buffer[index] |= mask;
	}

	drawBox(x: number, y: number, w: number, h: number) {
		for (let i = x; i < x + w; i++) {
			this.setPixel(i, y);
			this.setPixel(i, y + h - 1);
		}

		for (let j = y; j < y + h; j++) {
			this.setPixel(x, j);
			this.setPixel(x + w - 1, j);
		}
	}

	// ─────────────────────────
	// Rendering
	// ─────────────────────────

	render(overlay?: OverlayRect): string {
		const activeLayerId = this.activeLayerId;
		const colorActive = "\x1b[38;5;208m";
		const colorOverlay = overlay?.color ?? "\x1b[38;5;245m";
		const colorReset = "\x1b[0m";
		let colorOn = false;
		let overlayOn = false;

		// clear runtime buffers
		for (const layer of this.layers) {
			layer.buffer.fill(0);
		}

		// rasterize components
		const prevActive = this.activeLayerId;
		for (const comp of this.doc.components) {
			if (comp.type !== "box") continue;
			const runtimeLayer = this.layers.find(l => l.id === comp.layerId);
			if (!runtimeLayer) continue;
			if (!runtimeLayer.visible) continue;

			this.activeLayerId = runtimeLayer.id;
			this.drawBox(
				comp.rect.x,
				comp.rect.y,
				comp.rect.w,
				comp.rect.h
			);
		}
		this.activeLayerId = prevActive;

		const final = new Uint8Array(
			this.widthCells * this.heightCells
		);
		const activeMask = new Uint8Array(final.length);
		const overlayBuffer = overlay
			? new Uint8Array(final.length)
			: null;

		if (overlayBuffer && overlay?.rect) {
			drawDashedRect(overlayBuffer, this.widthCells, this.heightCells, overlay.rect);
		}

		// composite in doc order
		for (const layerDoc of this.doc.layers) {
			if (!layerDoc.visible) continue;
			const layer = this.layers.find(l => l.id === layerDoc.id);
			if (!layer) continue;
			for (let i = 0; i < final.length; i++) {
				final[i] |= layer.buffer[i];
			}
		}

		const activeLayer = this.layers.find(l => l.id === activeLayerId);
		if (activeLayer?.visible) {
			for (let i = 0; i < final.length; i++) {
				if (activeLayer.buffer[i] !== 0) activeMask[i] = 1;
			}
		}

		let out = "";
		for (let y = 0; y < this.heightCells; y++) {
			for (let x = 0; x < this.widthCells; x++) {
				const index = y * this.widthCells + x;
				const isActive = activeMask[index] === 1;
				const overlayValue = overlayBuffer ? overlayBuffer[index] : 0;
				const useOverlay = overlayValue !== 0;
				const cellValue = final[index] | overlayValue;

				if (useOverlay) {
					if (!overlayOn) {
						out += colorOverlay;
						overlayOn = true;
						colorOn = false;
					}
				} else {
					if (overlayOn) {
						out += colorReset;
						overlayOn = false;
					}
					if (isActive && !colorOn) {
						out += colorActive;
						colorOn = true;
					}
					if (!isActive && colorOn) {
						out += colorReset;
						colorOn = false;
					}
				}

				out += String.fromCharCode(0x2800 + cellValue);
			}
			if (overlayOn || colorOn) {
				out += colorReset;
				colorOn = false;
				overlayOn = false;
			}
			out += "\n";
		}

		return out;
	}

	cycleActiveLayer(direction: 1 | -1): void {
		const layers = this.doc.layers;
		if (layers.length === 0) return;
		const currentIndex = layers.findIndex(l => l.id === this.activeLayerId);
		const baseIndex = currentIndex === -1 ? 0 : currentIndex;
		const nextIndex = (baseIndex + direction + layers.length) % layers.length;
		this.activeLayerId = layers[nextIndex].id;
	}
}

export type OverlayRect = {
	rect: Rect;
	color?: string;
};

function drawDashedRect(
	buffer: Uint8Array,
	widthCells: number,
	heightCells: number,
	rect: Rect
): void {
	const maxX = widthCells * 2 - 1;
	const maxY = heightCells * 4 - 1;
	const xStart = clamp(rect.x, 0, maxX);
	const yStart = clamp(rect.y, 0, maxY);
	const xEnd = clamp(rect.x + rect.w - 1, 0, maxX);
	const yEnd = clamp(rect.y + rect.h - 1, 0, maxY);
	const step = 2;

	for (let x = xStart; x <= xEnd; x += step) {
		setPixelInBuffer(buffer, widthCells, heightCells, x, yStart);
		setPixelInBuffer(buffer, widthCells, heightCells, x, yEnd);
	}

	for (let y = yStart; y <= yEnd; y += step) {
		setPixelInBuffer(buffer, widthCells, heightCells, xStart, y);
		setPixelInBuffer(buffer, widthCells, heightCells, xEnd, y);
	}
}

function setPixelInBuffer(
	buffer: Uint8Array,
	widthCells: number,
	heightCells: number,
	x: number,
	y: number
): void {
	const cellX = Math.floor(x / 2);
	const cellY = Math.floor(y / 4);
	if (cellX < 0 || cellY < 0 || cellX >= widthCells || cellY >= heightCells) {
		return;
	}
	const dotX = x % 2;
	const dotY = y % 4;
	const mask = BRAILLE_DOTS[dotY][dotX];
	const index = cellY * widthCells + cellX;
	buffer[index] |= mask;
}

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

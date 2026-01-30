export type Rect = {
	x: number;
	y: number;
	w: number;
	h: number;
};

export type BoxComponentDoc = {
	id: string;
	type: "box";
	layerId: string;
	rect: Rect;
	meta?: {
		name?: string;
		locked?: boolean;
		[key: string]: unknown;
	};
};

export type ImageComponentDoc = {
	id: string;
	type: "image";
	layerId: string;
	rect: Rect;
	meta?: {
		name?: string;
		locked?: boolean;
		[key: string]: unknown;
	};
};

export type ComponentDoc = BoxComponentDoc | ImageComponentDoc;

export type LayerDoc = {
	// ids are the human-facing names (stable, git-friendly)
	id: string;
	name: string;
	visible: boolean;
};

export type SceneDoc = {
	schemaVersion: 1;
	units: "px";
	size: {
		widthCells: number;
		heightCells: number;
	};
	layers: LayerDoc[];
	components: ComponentDoc[];
	state: {
		nextId: number;
	};
	meta?: Record<string, unknown>;
};

export function validateSceneDoc(doc: SceneDoc): void {
	if (doc.schemaVersion !== 1) {
		throw new Error(`Unsupported schemaVersion: ${doc.schemaVersion}`);
	}

	if (doc.units !== "px") {
		throw new Error(`Unsupported units: ${doc.units}`);
	}

	const layerIds = new Set<string>();
	for (const layer of doc.layers) {
		if (layer.id !== layer.name) {
			throw new Error(
				`Layer id must equal name (got id="${layer.id}", name="${layer.name}")`
			);
		}
		if (layerIds.has(layer.id)) {
			throw new Error(`Duplicate layer name/id: "${layer.id}"`);
		}
		layerIds.add(layer.id);
	}

	const componentIds = new Set<string>();
	for (const comp of doc.components) {
		if (componentIds.has(comp.id)) {
			throw new Error(`Duplicate component id: "${comp.id}"`);
		}
		componentIds.add(comp.id);

		const compType = (comp as { type?: string }).type;
		if (compType !== "box" && compType !== "image") {
			throw new Error(`Unsupported component type: "${String(compType)}"`);
		}

		if (!layerIds.has(comp.layerId)) {
			throw new Error(
				`Component "${comp.id}" references missing layer "${comp.layerId}"`
			);
		}

		validateRect(comp.rect, `component "${comp.id}" rect`);
	}

	if (!Number.isFinite(doc.state.nextId) || doc.state.nextId < 1) {
		throw new Error(`Invalid state.nextId: ${String(doc.state.nextId)}`);
	}
}

export function validateRect(rect: Rect, name = "rect"): void {
	if (
		!Number.isFinite(rect.x) ||
		!Number.isFinite(rect.y) ||
		!Number.isFinite(rect.w) ||
		!Number.isFinite(rect.h)
	) {
		throw new Error(`Invalid ${name}: non-finite number`);
	}

	if (rect.w < 1 || rect.h < 1) {
		throw new Error(`Invalid ${name}: w/h must be >= 1`);
	}
}

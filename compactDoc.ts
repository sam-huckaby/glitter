import { BoxComponentDoc, ImageComponentDoc, SceneDoc } from "./sceneDoc";

export type CompactDoc = {
	/** The schema version */
	v: 1;
	/** The width of the scene/image */
	w: number;
	/** The height of the scene/image */
	h: number;
	/** The canonical names of the layers */
	layers: string[];
	/** The components that are in the scene */
	nodes: CompactNode[];
	/** A description node to help convey meaning between users and agents */
	meta?: Record<string, unknown>;
};

/** These are the currently and future supported node types */
export type CompactNodeType = "box" | "text" | "image" | "button";

/**
* An entry in the nodes array for a scene. Shape:
* - CompactNodeType - one of: "box", "text", "image", or "button"
* - Name - any string
* - Parent Layer - string (must exist in the top-level layers array)
* - Dimensions - [ X, Y, Width, Height ]
* - (optional) Meta - Record<string, unknown> that is used to convey meaning between users and agents at the node-level
*/
export type CompactNode = [
	CompactNodeType | string,
	string,
	string,
	[number, number, number, number],
	Record<string, unknown>?
];

export type CompactWarning = {
	type: "unsupportedNode";
	nodeType: string;
	nodeId: string;
};

const SUPPORTED_NODE_TYPES = new Set<CompactNodeType>([
	"box",
	"text",
	"image",
	"button",
]);

export function compactFromSceneDoc(doc: SceneDoc): CompactDoc {
	const widthPx = doc.size.widthCells * 2;
	const heightPx = doc.size.heightCells * 4;

	const nodes: CompactNode[] = [];
	for (const comp of doc.components) {
		if (comp.type !== "box" && comp.type !== "image") continue;
		const meta = comp.meta as Record<string, unknown> | undefined;
		const node: CompactNode = meta && Object.keys(meta).length > 0
			? [comp.type, comp.id, comp.layerId, rectToArray(comp.rect), meta]
			: [comp.type, comp.id, comp.layerId, rectToArray(comp.rect)];
		nodes.push(node);
	}

	const compact: CompactDoc = {
		v: 1,
		w: widthPx,
		h: heightPx,
		layers: doc.layers.map(layer => layer.id),
		nodes,
	};

	if (doc.meta && Object.keys(doc.meta).length > 0) {
		compact.meta = doc.meta;
	}

	return compact;
}

export function sceneDocFromCompact(doc: CompactDoc): {
	doc: SceneDoc;
	warnings: CompactWarning[];
} {
	validateCompactDoc(doc);

	const widthCells = doc.w / 2;
	const heightCells = doc.h / 4;

	const layerDocs = doc.layers.map(id => ({
		id,
		name: id,
		visible: true,
	}));

	const warnings: CompactWarning[] = [];
	const components: Array<BoxComponentDoc | ImageComponentDoc> = [];
	const componentIds = new Set<string>();

	for (const node of doc.nodes) {
		const [type, id, layerId, rectArray, meta] = node;
		if (!SUPPORTED_NODE_TYPES.has(type as CompactNodeType)) {
			warnings.push({
				type: "unsupportedNode",
				nodeType: String(type),
				nodeId: id,
			});
			continue;
		}

		if (type !== "box" && type !== "image") {
			warnings.push({
				type: "unsupportedNode",
				nodeType: String(type),
				nodeId: id,
			});
			continue;
		}

		componentIds.add(id);
		components.push({
			id,
			type,
			layerId,
			rect: arrayToRect(rectArray),
			meta,
		});
	}

	const docOut: SceneDoc = {
		schemaVersion: 1,
		units: "px",
		size: {
			widthCells,
			heightCells,
		},
		layers: layerDocs,
		components,
		state: {
			nextId: nextComponentId(componentIds),
		},
	};

	if (doc.meta && Object.keys(doc.meta).length > 0) {
		docOut.meta = doc.meta;
	}

	return { doc: docOut, warnings };
}

function validateCompactDoc(doc: CompactDoc): void {
	if (doc.v !== 1) {
		throw new Error(`Unsupported compact schema version: ${doc.v}`);
	}

	if (!Number.isFinite(doc.w) || !Number.isFinite(doc.h)) {
		throw new Error("Invalid size: w/h must be finite numbers");
	}
	if (doc.w < 2 || doc.h < 4) {
		throw new Error("Invalid size: w/h too small");
	}
	if (doc.w % 2 !== 0 || doc.h % 4 !== 0) {
		throw new Error("Invalid size: w must be divisible by 2 and h by 4");
	}

	if (!Array.isArray(doc.layers)) {
		throw new Error("Invalid layers: expected array");
	}
	const layerIds = new Set<string>();
	for (const layerId of doc.layers) {
		if (typeof layerId !== "string" || layerId.length === 0) {
			throw new Error("Invalid layer id");
		}
		if (layerIds.has(layerId)) {
			throw new Error(`Duplicate layer id: "${layerId}"`);
		}
		layerIds.add(layerId);
	}

	if (!Array.isArray(doc.nodes)) {
		throw new Error("Invalid nodes: expected array");
	}
	const nodeIds = new Set<string>();
	for (const node of doc.nodes) {
		if (!Array.isArray(node) || node.length < 4 || node.length > 5) {
			throw new Error("Invalid node: expected tuple of length 4 or 5");
		}
		const [type, id, layerId, rect] = node;
		if (typeof type !== "string") {
			throw new Error("Invalid node type");
		}
		if (typeof id !== "string" || id.length === 0) {
			throw new Error("Invalid node id");
		}
		if (nodeIds.has(id)) {
			throw new Error(`Duplicate node id: "${id}"`);
		}
		nodeIds.add(id);
		if (typeof layerId !== "string" || !layerIds.has(layerId)) {
			throw new Error(`Unknown layer id: "${String(layerId)}"`);
		}
		validateRectArray(rect);
		if (node.length === 5 && !isPlainObject(node[4])) {
			throw new Error("Invalid node meta: expected object");
		}
	}

	if (doc.meta && !isPlainObject(doc.meta)) {
		throw new Error("Invalid meta: expected object");
	}
}

function rectToArray(rect: { x: number; y: number; w: number; h: number }): [number, number, number, number] {
	return [rect.x, rect.y, rect.w, rect.h];
}

function arrayToRect(rect: [number, number, number, number]) {
	const [x, y, w, h] = rect;
	return { x, y, w, h };
}

function validateRectArray(rect: unknown): void {
	if (!Array.isArray(rect) || rect.length !== 4) {
		throw new Error("Invalid rect: expected [x,y,w,h]");
	}
	for (const value of rect) {
		if (!Number.isFinite(value)) {
			throw new Error("Invalid rect: non-finite number");
		}
	}
	const w = rect[2];
	const h = rect[3];
	if (w < 1 || h < 1) {
		throw new Error("Invalid rect: w/h must be >= 1");
	}
}

function nextComponentId(ids: Set<string>): number {
	let nextId = 1;
	while (ids.has(`c${nextId}`)) {
		nextId++;
	}
	return nextId;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

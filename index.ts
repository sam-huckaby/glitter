import * as readline from "readline";
import { tokenize } from "./tokenizer";
import { parseCommand } from "./parser";
import { execute, PendingAction } from "./commandExecutor";
import { OverlayRect, Scene } from "./layers";
import { PixelCanvas } from "./PixelCanvas";
import { createMouseInput, MouseEvent } from "./mouseInput";

// Get terminal dimensions with fallback
const TERM_HEIGHT = Math.max(process.stdout.rows || 24, 10); // minimum 10 lines
const TERM_WIDTH = Math.max(process.stdout.columns || 80, 40); // minimum 40 chars

// Reserve last line for command prompt
const DESIGN_HEIGHT = TERM_HEIGHT - 2; // leave 1 line + 1 padding
const COMMAND_ROW = TERM_HEIGHT - 1; // position at bottom
const LAYER_COLOR = "\x1b[38;5;208m";
const COLOR_RESET = "\x1b[0m";
let errorMessage: string | null = null;
let pendingAction: PendingAction | null = null;

const canvas = new PixelCanvas();
const scene = new Scene(TERM_WIDTH, DESIGN_HEIGHT);

const mouse = createMouseInput();

// ---- readline MUST exist before render() ----


const rl = readline.createInterface({
	input: mouse.input,
	output: process.stdout,
	prompt: "$ ",
});

readline.emitKeypressEvents(mouse.input);
if (mouse.input.setRawMode) {
	mouse.input.setRawMode(true);
}

mouse.input.on("keypress", (str, key) => {
	if (pendingAction && key?.name === "escape") {
		pendingAction = null;
		render();
		return;
	}
	if (errorMessage && shouldClearError(str, key)) {
		errorMessage = null;
		render();
		return;
	}
	if (!key?.ctrl) return;
	if (key.name === "n") {
		scene.cycleActiveLayer(-1);
		render();
		return;
	}
	if (key.name === "p") {
		scene.cycleActiveLayer(1);
		render();
	}
});

// ---- initial scene ----

scene.addLayer("frame");

// Startup frame is a normal resizable component (pixel units)
const boxPaddingCells = 2;
const boxX = boxPaddingCells * 2;
const boxY = boxPaddingCells * 4;
const minBoxWidth = 20 * 2;
const minBoxHeight = 5 * 4;
const boxWidth = Math.max(minBoxWidth, scene.widthPx - boxX * 2);
const boxHeight = Math.max(minBoxHeight, scene.heightPx - boxY * 2);
scene.addBox({
	id: "frameBox",
	layerId: "frame",
	rect: { x: boxX, y: boxY, w: boxWidth, h: boxHeight },
});
scene.addLayer("components");

// ---- rendering ----

function render() {
	const overlay: OverlayRect | undefined = pendingAction?.previewRect
		? { rect: pendingAction.previewRect }
		: undefined;
	canvas.draw(scene.render(overlay));

	// move cursor to command row
	process.stdout.write(`\x1b[${COMMAND_ROW};1H`);
	process.stdout.write("\x1b[0K");

	if (errorMessage) {
		process.stdout.write("\x1b[41m"); // red bg
		process.stdout.write(
			errorMessage.slice(0, process.stdout.columns)
		);
		process.stdout.write("\x1b[0m");
		return;
	}

	const activeLayer = scene.layers.find(l => l.id === scene.activeLayerId);
	const layerName = activeLayer?.name ?? "none";
	if (pendingAction) {
		rl.setPrompt(
			`${LAYER_COLOR}[${layerName}]${COLOR_RESET} $ :add box (drag to place, Esc to cancel)`
		);
	} else {
		rl.setPrompt(`${LAYER_COLOR}[${layerName}]${COLOR_RESET} $ `);
	}

	rl.prompt(true);
}

// ---- mouse resize interaction ----

type Edge = "n" | "s" | "e" | "w";
type DragState = {
	componentId: string;
	edge: Edge;
	startMousePx: { x: number; y: number };
	startRect: { x: number; y: number; w: number; h: number };
};

const EDGE_THRESHOLD_PX = 2;
const MIN_W_PX = 2;
const MIN_H_PX = 2;

let drag: DragState | null = null;

mouse.events.on("mouse", (ev: MouseEvent) => {
	if (ev.yCell > DESIGN_HEIGHT) return;
	if (ev.xCell < 1 || ev.yCell < 1) return;

	const mousePx = {
		x: (ev.xCell - 1) * 2,
		y: (ev.yCell - 1) * 4,
	};

	if (pendingAction) {
		if (handlePendingAction(ev, mousePx)) return;
	}

	if (ev.kind === "down") {
		if (ev.button !== 0) return;

		const hit = hitTestTopmostBoxEdge(scene, mousePx.x, mousePx.y, EDGE_THRESHOLD_PX);
		if (!hit) return;

		drag = {
			componentId: hit.componentId,
			edge: hit.edge,
			startMousePx: mousePx,
			startRect: { ...hit.rect },
		};
		return;
	}

	if (ev.kind === "up") {
		if (drag) {
			drag = null;
			render();
		}
		return;
	}

	if (ev.kind === "move") {
		if (!drag) return;

		const dx = mousePx.x - drag.startMousePx.x;
		const dy = mousePx.y - drag.startMousePx.y;
		const next = resizeRect(
			drag.startRect,
			drag.edge,
			dx,
			dy,
			{
				minW: MIN_W_PX,
				minH: MIN_H_PX,
				maxW: scene.widthPx,
				maxH: scene.heightPx,
			}
		);

		scene.updateBoxRect(drag.componentId, next);
		render();
	}
});

// ---- input handling ----

rl.on("line", line => {
	if (pendingAction) {
		pendingAction = null;
	}
	try {
		runCommandLine(line);
	} catch (err) {
		showError(String(err));
	}

	render();
});

function runCommandLine(line: string) {
	const tokens = tokenize(line);
	const ast = parseCommand(tokens, line);
	const result = execute(scene, ast);

	if (result.type === "needsInteraction") {
		pendingAction = result.pendingAction;
	}

	if (result.type === "quit") shutdown();
}

// ---- error display ----

function showError(msg: string) {
	errorMessage = msg;
}

// ---- shutdown ----

function shutdown() {
	mouse.disable();
	mouse.dispose();
	canvas.destroy();
	if (mouse.input.setRawMode) {
		mouse.input.setRawMode(false);
	}
	rl.close();
	process.exit(0);
}

// ---- initial draw ----
mouse.enable();
render();

// ---- helpers ----

function hitTestTopmostBoxEdge(
	scene: Scene,
	px: number,
	py: number,
	threshold: number
): { componentId: string; edge: Edge; rect: { x: number; y: number; w: number; h: number } } | null {
	for (let i = scene.doc.components.length - 1; i >= 0; i--) {
		const comp = scene.doc.components[i];
		if (comp.type !== "box") continue;
		if (comp.meta?.locked) continue;
		if (comp.layerId !== scene.activeLayerId) continue;

		const edge = hitTestBoxEdge(comp.rect, px, py, threshold);
		if (!edge) continue;
		return { componentId: comp.id, edge, rect: comp.rect };
	}
	return null;
}

function hitTestBoxEdge(
	rect: { x: number; y: number; w: number; h: number },
	px: number,
	py: number,
	threshold: number
): Edge | null {
	const left = rect.x;
	const right = rect.x + rect.w - 1;
	const top = rect.y;
	const bottom = rect.y + rect.h - 1;

	if (px < left - threshold || px > right + threshold) return null;
	if (py < top - threshold || py > bottom + threshold) return null;

	let best: { edge: Edge; d: number } | null = null;

	if (py >= top - threshold && py <= bottom + threshold) {
		const dl = Math.abs(px - left);
		if (dl <= threshold) best = pickBest(best, { edge: "w", d: dl });
		const dr = Math.abs(px - right);
		if (dr <= threshold) best = pickBest(best, { edge: "e", d: dr });
	}

	if (px >= left - threshold && px <= right + threshold) {
		const dt = Math.abs(py - top);
		if (dt <= threshold) best = pickBest(best, { edge: "n", d: dt });
		const db = Math.abs(py - bottom);
		if (db <= threshold) best = pickBest(best, { edge: "s", d: db });
	}

	return best?.edge ?? null;
}

function pickBest(
	current: { edge: Edge; d: number } | null,
	next: { edge: Edge; d: number }
): { edge: Edge; d: number } {
	if (!current) return next;
	if (next.d < current.d) return next;
	return current;
}

function resizeRect(
	rect: { x: number; y: number; w: number; h: number },
	edge: Edge,
	dx: number,
	dy: number,
	limits: { minW: number; minH: number; maxW: number; maxH: number }
): { x: number; y: number; w: number; h: number } {
	let { x, y, w, h } = rect;

	const maxX = limits.maxW - 1;
	const maxY = limits.maxH - 1;

	if (edge === "e") {
		const maxW = maxX - x + 1;
		w = clamp(rect.w + dx, limits.minW, maxW);
	}

	if (edge === "s") {
		const maxH = maxY - y + 1;
		h = clamp(rect.h + dy, limits.minH, maxH);
	}

	if (edge === "w") {
		const right = rect.x + rect.w - 1;
		const minX = 0;
		const maxXForMinW = right - (limits.minW - 1);
		x = clamp(rect.x + dx, minX, maxXForMinW);
		w = right - x + 1;
	}

	if (edge === "n") {
		const bottom = rect.y + rect.h - 1;
		const minY = 0;
		const maxYForMinH = bottom - (limits.minH - 1);
		y = clamp(rect.y + dy, minY, maxYForMinH);
		h = bottom - y + 1;
	}

	return { x, y, w, h };
}

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

function shouldClearError(
	str: string,
	key?: { ctrl?: boolean; meta?: boolean; alt?: boolean; name?: string }
): boolean {
	if (key?.ctrl || key?.meta || key?.alt) return false;
	if (key?.name === "backspace" || key?.name === "delete") return true;
	return str.length === 1 && /[ -~]/.test(str);
}

function handlePendingAction(
	ev: MouseEvent,
	mousePx: { x: number; y: number }
): boolean {
	if (!pendingAction) return false;
	if (pendingAction.kind !== "createBoxDrag") return false;
	const constraints = pendingAction.constraints ?? {
		withinFrame: true,
		minW: 80,
		minH: 40,
	};

	if (ev.kind === "down") {
		if (ev.button !== 0) return true;
		if (!isPointInCanvas(mousePx)) return true;
		pendingAction.startedAt = { px: mousePx.x, py: mousePx.y };
		pendingAction.previewRect = {
			x: mousePx.x,
			y: mousePx.y,
			w: 1,
			h: 1,
		};
		render();
		return true;
	}

	if (!pendingAction.startedAt) return true;

	if (ev.kind === "move") {
		const rect = clampRectToCanvas(
			normalizeRect(pendingAction.startedAt, mousePx)
		);
		pendingAction.previewRect = rect;
		render();
		return true;
	}

	if (ev.kind === "up") {
		const rect = finalizeCreateRect(
			pendingAction.startedAt,
			mousePx,
			constraints.minW,
			constraints.minH
		);
		const command = `:add box x=${rect.x} y=${rect.y} w=${rect.w} h=${rect.h}`;
		pendingAction = null;
		try {
			runCommandLine(command);
		} catch (err) {
			showError(String(err));
		}
		render();
		return true;
	}

	return true;
}

function normalizeRect(
	start: { px: number; py: number },
	end: { x: number; y: number }
): { x: number; y: number; w: number; h: number } {
	const x = Math.min(start.px, end.x);
	const y = Math.min(start.py, end.y);
	const w = Math.abs(end.x - start.px) + 1;
	const h = Math.abs(end.y - start.py) + 1;
	return { x, y, w, h };
}

function clampRectToCanvas(rect: { x: number; y: number; w: number; h: number }) {
	let { x, y, w, h } = rect;

	if (x < 0) {
		w -= -x;
		x = 0;
	}
	if (y < 0) {
		h -= -y;
		y = 0;
	}
	if (x + w > scene.widthPx) {
		w = scene.widthPx - x;
	}
	if (y + h > scene.heightPx) {
		h = scene.heightPx - y;
	}

	w = Math.max(1, w);
	h = Math.max(1, h);
	return { x, y, w, h };
}

function finalizeCreateRect(
	start: { px: number; py: number },
	end: { x: number; y: number },
	minW: number,
	minH: number
): { x: number; y: number; w: number; h: number } {
	const isClick = start.px === end.x && start.py === end.y;
	if (isClick) {
		return clampRectToCanvas({ x: start.px, y: start.py, w: minW, h: minH });
	}

	let rect = clampRectToCanvas(normalizeRect(start, end));
	if (rect.w < minW || rect.h < minH) {
		rect = enforceMinSize(rect, minW, minH);
	}
	return rect;
}

function enforceMinSize(
	rect: { x: number; y: number; w: number; h: number },
	minW: number,
	minH: number
): { x: number; y: number; w: number; h: number } {
	let w = Math.max(rect.w, minW);
	let h = Math.max(rect.h, minH);
	let x = rect.x;
	let y = rect.y;

	if (x + w > scene.widthPx) {
		x = Math.max(0, scene.widthPx - w);
	}
	if (y + h > scene.heightPx) {
		y = Math.max(0, scene.heightPx - h);
	}

	return clampRectToCanvas({ x, y, w, h });
}

function isPointInCanvas(point: { x: number; y: number }): boolean {
	return (
		point.x >= 0 &&
		point.y >= 0 &&
		point.x < scene.widthPx &&
		point.y < scene.heightPx
	);
}

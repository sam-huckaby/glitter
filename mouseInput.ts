import { EventEmitter } from "events";
import { PassThrough } from "stream";

export type MouseEvent = {
	/**
	 * Kind of mouse event:
	 * - down: clicked a button down
	 * - up: released a button that was down
	 * - move: mouse changed position
	 */
	kind: "down" | "up" | "move";
	/**
	* The horizontal position in the terminal window
	*/
	xCell: number;
	/**
	* The vertical position in the terminal window
	*/
	yCell: number;
	button: number;
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
};

export type MouseInput = {
	input: PassThrough & {
		isTTY?: boolean;
		rows?: number;
		columns?: number;
		setRawMode?: (mode: boolean) => void;
	};
	events: EventEmitter;
	enable: () => void;
	disable: () => void;
	dispose: () => void;
};

const ENABLE_MOUSE = "\x1b[?1000h\x1b[?1002h\x1b[?1006h";
const DISABLE_MOUSE = "\x1b[?1000l\x1b[?1002l\x1b[?1006l";

export function createMouseInput(): MouseInput {
	const events = new EventEmitter();
	const input = new PassThrough();

	(input as any).isTTY = (process.stdin as any).isTTY;
	(input as any).rows = (process.stdin as any).rows;
	(input as any).columns = (process.stdin as any).columns;
	(input as any).setRawMode = (process.stdin as any).setRawMode?.bind(
		process.stdin
	);

	let buffer = "";

	function handleData(chunk: Buffer) {
		buffer += chunk.toString("utf8");

		const parsed = consumeMouseSequences(buffer);
		buffer = parsed.rest;

		if (parsed.forward.length) {
			input.write(parsed.forward, "utf8");
		}

		for (const ev of parsed.events) {
			events.emit("mouse", ev);
		}
	}

	process.stdin.on("data", handleData);
	process.stdin.resume();

	return {
		input: input as any,
		events,
		enable() {
			process.stdout.write(ENABLE_MOUSE);
		},
		disable() {
			process.stdout.write(DISABLE_MOUSE);
		},
		dispose() {
			process.stdin.off("data", handleData);
			input.end();
		},
	};
}

function consumeMouseSequences(buf: string): {
	forward: string;
	rest: string;
	events: MouseEvent[];
} {
	let i = 0;
	let forward = "";
	const events: MouseEvent[] = [];

	while (i < buf.length) {
		if (buf[i] === "\x1b" && buf.startsWith("\x1b[<", i)) {
			const end = findMouseSequenceEnd(buf, i + 3);
			if (end === -1) break;

			const seq = buf.slice(i, end + 1);
			const ev = parseSgrMouse(seq);
			if (ev) events.push(ev);

			i = end + 1;
			continue;
		}

		forward += buf[i];
		i++;
	}

	return {
		forward,
		rest: buf.slice(i),
		events,
	};
}

function findMouseSequenceEnd(buf: string, start: number): number {
	for (let i = start; i < buf.length; i++) {
		const c = buf[i];
		if (c === "M" || c === "m") return i;
	}
	return -1;
}

function parseSgrMouse(seq: string): MouseEvent | null {
	// \x1b[<b;x;yM (press/move) or \x1b[<b;x;ym (release)
	if (!seq.startsWith("\x1b[<")) return null;
	const kindChar = seq[seq.length - 1];
	const body = seq.slice(3, -1);
	const parts = body.split(";");
	if (parts.length !== 3) return null;

	const b = Number(parts[0]);
	const xCell = Number(parts[1]);
	const yCell = Number(parts[2]);
	if (!Number.isFinite(b) || !Number.isFinite(xCell) || !Number.isFinite(yCell)) {
		return null;
	}

	const shift = (b & 4) === 4;
	const alt = (b & 8) === 8;
	const ctrl = (b & 16) === 16;
	const isMotion = (b & 32) === 32;
	const button = b & 3;

	let kind: MouseEvent["kind"];
	if (kindChar === "m") {
		kind = "up";
	} else {
		kind = isMotion ? "move" : "down";
	}

	return {
		kind,
		xCell,
		yCell,
		button,
		shift,
		alt,
		ctrl,
	};
}

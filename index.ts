import readline from "readline";
import { tokenize } from "./tokenizer";
import { parseCommand } from "./parser";
import { execute } from "./commandExecutor";
import { Scene } from "./layers";
import { PixelCanvas } from "./PixelCanvas";

// Get terminal dimensions with fallback
const TERM_HEIGHT = Math.max(process.stdout.rows || 24, 10); // minimum 10 lines
const TERM_WIDTH = Math.max(process.stdout.columns || 80, 40); // minimum 40 chars

// Reserve last line for command prompt
const DESIGN_HEIGHT = TERM_HEIGHT - 2; // leave 1 line + 1 padding
const COMMAND_ROW = TERM_HEIGHT - 1; // position at bottom

const canvas = new PixelCanvas();
const scene = new Scene(TERM_WIDTH, DESIGN_HEIGHT);

// ---- readline MUST exist before render() ----

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "$ ",
});

// ---- initial scene ----

scene.addLayer("frame");
// Draw box that fits within the dynamic scene size with padding
const boxPadding = 2;
const boxX = boxPadding;
const boxY = boxPadding;
const boxWidth = Math.max(20, TERM_WIDTH - boxPadding * 4); // min width 20
const boxHeight = Math.max(5, DESIGN_HEIGHT - boxPadding * 4); // min height 5
scene.drawBox(boxX, boxY, boxWidth, boxHeight);
scene.addLayer("components");

// ---- rendering ----

function render() {
	canvas.draw(scene.render());

	// move cursor to command row
	process.stdout.write(`\x1b[${COMMAND_ROW};1H`);
	process.stdout.write("\x1b[0K");

	rl.prompt(true);
}

// ---- input handling ----

rl.on("line", line => {
	try {
		const tokens = tokenize(line);
		const ast = parseCommand(tokens, line);
		const result = execute(scene, ast);

		if (result.type === "quit") shutdown();
	} catch (err) {
		showError(String(err));
	}

	render();
});

// ---- error display ----

function showError(msg: string) {
	process.stdout.write(`\x1b[${COMMAND_ROW};1H`);
	process.stdout.write("\x1b[41m"); // red bg
	process.stdout.write(
		msg.slice(0, process.stdout.columns)
	);
	process.stdout.write("\x1b[0m");
}

// ---- shutdown ----

function shutdown() {
	canvas.destroy();
	rl.close();
	process.exit(0);
}

// ---- initial draw ----
render();


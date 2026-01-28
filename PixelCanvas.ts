export class PixelCanvas {
	constructor() {
		// hide cursor
		process.stdout.write("\x1b[?25l");
	}

	destroy() {
		// restore cursor
		process.stdout.write("\x1b[H\x1b[2J");
		process.stdout.write("\x1b[?25h");
		process.stdout.write("\x1b[0m");
	}

	draw(buffer: string) {
		// move cursor home and clear entire screen
		process.stdout.write("\x1b[H\x1b[2J");

		// draw framebuffer
		process.stdout.write(buffer);
	}
}

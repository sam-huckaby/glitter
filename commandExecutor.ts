import { Scene } from "./layers";
import { CommandAST } from "./ast";
import { asString, asNumber } from "./valueUtils";

export type ExecResult =
	| { type: "render" }
	| { type: "quit" }
	| { type: "none" };

export function execute(
	scene: Scene,
	cmd: CommandAST
): ExecResult {
	switch (cmd.name) {
		case "q":
		case "quit":
			return { type: "quit" };

		case "layer":
			if (cmd.args[0]?.value === "add") {
				const name = asString(cmd.args[1], "layer name");
				scene.addLayer(name);
				return { type: "render" };
			}

			if (cmd.args[0]?.value === "select") {
				const name = asString(cmd.args[1], "layer name");
				scene.setActiveLayer(name);
				return { type: "render" };
			}
			break;

		case "add":
			if (cmd.args[0]?.value === "box") {
				const n = cmd.namedArgs;
				scene.addBox({
					rect: {
						x: asNumber(n.x, "x"),
						y: asNumber(n.y, "y"),
						w: asNumber(n.w, "w"),
						h: asNumber(n.h, "h"),
					},
				});
				return { type: "render" };
			}
	}

	return { type: "none" };
}

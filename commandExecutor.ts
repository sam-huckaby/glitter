import { Scene } from "./layers";
import { CommandAST, IncompleteCommand } from "./ast";
import { asString, asNumber } from "./valueUtils";

export type ExecResult =
	| { type: "render" }
	| { type: "quit" }
	| { type: "needsInteraction"; pendingAction: PendingAction }
	| { type: "none" };

export type PendingAction = {
	kind: "createBoxDrag";
	layerId: string;
	startedAt?: { px: number; py: number };
	previewRect?: { x: number; y: number; w: number; h: number };
	constraints?: { withinFrame: boolean; minW: number; minH: number };
	cancelKey?: "Escape";
};

export function execute(
	scene: Scene,
	cmd: CommandAST | IncompleteCommand
): ExecResult {
	if (cmd.type === "incomplete") {
		if (cmd.name === "add" && cmd.args[0]?.value === "box") {
			const layerId = scene.activeLayerId;
			if (!layerId) throw new Error("No active layer");
			return {
				type: "needsInteraction",
				pendingAction: {
					kind: "createBoxDrag",
					layerId,
					constraints: {
						withinFrame: true,
						minW: 80,
						minH: 40,
					},
					cancelKey: "Escape",
				},
			};
		}
	}

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

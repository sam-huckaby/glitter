#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import os from "os";

// CONFIGURATION
// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your existing design CLI script
const YOUR_CLI_PATH = path.join(__dirname, "index.ts");

// Create the server instance
const server = new McpServer({
	name: "Design Layout Tool",
	version: "0.1.0",
});

// TODO: This whole file needs to be read over and updated to fit this project
const EXAMPLE_JSON_STRUCTURE = `
{
  "v": 1,
  "w": 410,
  "h": 228,
  "layers": ["frame", "components"],
  "nodes": [
    ["box", "frameBox", "frame", [4, 8, 402, 212]],
    ["box", "c1", "components", [45, 34, 65, 45]]
  ]
}
`;

/**
 * TOOL DEFINITION
 * This tool halts the AI, opens your local app, and returns the edits.
 */
server.tool(
	// The name of the tool
	"review_and_edit_design",

	// Give the agent a detailed description to help it understand how to use this tool
	`Opens a local GUI for the user to visually edit the UI layout. 

	IMPORTANT BEHAVIOR:
	- This tool BLOCKS execution. The AI must wait until the user closes the window.
	- The tool returns the *modified* JSON layout after the user is done.

	DATA FORMAT:
	- Use the 'Compact JSON' format.
	- Coordinate system: (0,0) is top-left.
	- Nodes are arrays: ["type", "id", "layer", [x, y, w, h]].

	EXAMPLE INPUT:
	${EXAMPLE_JSON_STRUCTURE}
	`,

	// The parameters required from the agent
	{
		initial_layout_json: z.string().describe("The compact JSON string of the layout to review"),
	},

	// The actual callback that the agent is invoking
	async ({ initial_layout_json }) => {
		// 1. Create a temporary file to exchange state
		const tempDir = os.tmpdir();
		const tempFilePath = path.join(tempDir, `design_draft_${Date.now()}.json`);

		try {
			// Write the AI's proposed design to disk
			fs.writeFileSync(tempFilePath, initial_layout_json, "utf-8");

			// 2. BLOCKING CALL: Spawn your CLI tool
			// The AI "waits" here because spawnSync blocks the event loop
			// We use 'npx ts-node' to run your TS script directly
			console.error(`[MCP] Launching user interface...`);

			const result = spawnSync("bun", [YOUR_CLI_PATH, tempFilePath], {
				stdio: "inherit", // Pass stdin/out/err to the user so they see the app
				shell: true       // Ensure compatibility across OS
			});

			if (result.error) {
				throw new Error(`Failed to launch design tool: ${result.error.message}`);
			}

			// 3. Read the modified state back
			if (!fs.existsSync(tempFilePath)) {
				return {
					content: [{ type: "text", text: "Error: The design file was lost or not saved." }],
					isError: true,
				};
			}

			const modifiedJson = fs.readFileSync(tempFilePath, "utf-8");

			// Cleanup
			fs.unlinkSync(tempFilePath);

			// 4. Return the new ground truth to the AI
			return {
				content: [{ type: "text", text: modifiedJson }],
			};

		} catch (error: any) {
			return {
				content: [{ type: "text", text: `Tool error: ${error.message}` }],
				isError: true,
			};
		}
	}
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Design MCP Server running on stdio...");
}

main();

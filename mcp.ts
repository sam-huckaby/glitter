#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import os from "os";

// CONFIGURATION
// Path to your existing design CLI script
const YOUR_CLI_PATH = path.resolve("./index.ts");

// Create the server instance
const server = new McpServer({
	name: "Design Layout Tool",
	version: "0.1.0",
});

// TODO: This whole file needs to be read over and updated to fit this project

/**
 * TOOL DEFINITION
 * This tool halts the AI, opens your local app, and returns the edits.
 */
server.tool(
	"review_and_edit_design",
	{
		initial_layout_json: z.string().describe("The compact JSON string of the layout to review"),
	},
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

			const result = spawnSync("npx", ["ts-node", YOUR_CLI_PATH, tempFilePath], {
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

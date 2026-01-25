export type Value =
	| { type: "number"; value: number }
	| { type: "string"; value: string }
	| { type: "identifier"; value: string };

export interface CommandAST {
	type: "command";
	name: string;
	args: Value[];
	namedArgs: Record<string, Value>;
	raw: string;
}

export interface IncompleteCommand {
	type: "incomplete";
	name: string;
	args: Value[];
	namedArgs: Record<string, Value>;
	raw: string;
	reason: "missingRect";
}

export type ParsedCommand = CommandAST | IncompleteCommand;

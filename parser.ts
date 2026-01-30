import { Token } from "./tokenizer";
import { CommandAST, ParsedCommand, Value } from "./ast";

export function parseCommand(
	tokens: Token[],
	raw: string
): ParsedCommand {
	let i = 0;

	function peek() {
		return tokens[i];
	}

	function consume(type: string) {
		const token = tokens[i];
		if (token.type !== type) {
			throw new Error(
				`Expected ${type}, got ${token.type}`
			);
		}
		i++;
		return token;
	}

	consume("colon");

	const name = consume("identifier").value!;

	const args: Value[] = [];
	const namedArgs: Record<string, Value> = {};

	while (peek().type !== "eof") {
		const token = peek();

		if (token.type === "identifier") {
			const ident = token.value!;
			const next = tokens[i + 1];

			if (next?.type === "equals") {
				i += 2;

				const valueToken = tokens[i++];
				const value = tokenToValue(valueToken);

				namedArgs[ident] = value;
				continue;
			}

			i++;
			args.push({
				type: "identifier",
				value: ident,
			});
			continue;
		}

		if (
			token.type === "number" ||
			token.type === "string"
		) {
			i++;
			args.push(tokenToValue(token));
			continue;
		}

		throw new Error(`Unexpected token`);
	}

	if (
		name === "add" &&
		(args[0]?.value === "box" || args[0]?.value === "image") &&
		Object.keys(namedArgs).length === 0
	) {
		return {
			type: "incomplete",
			name,
			args,
			namedArgs,
			raw,
			reason: "missingRect",
		};
	}

	return {
		type: "command",
		name,
		args,
		namedArgs,
		raw,
	};
}

function tokenToValue(token: Token): Value {
	if (token.type === "number") {
		return {
			type: "number",
			value: Number(token.value),
		};
	}

	if (token.type === "string") {
		return {
			type: "string",
			value: token.value!,
		};
	}

	return {
		type: "identifier",
		value: token.value!,
	};
}

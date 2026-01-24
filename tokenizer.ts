export type TokenType =
	| "colon"
	| "identifier"
	| "number"
	| "string"
	| "equals"
	| "eof";

export interface Token {
	type: TokenType;
	value?: string;
	pos: number;
}

export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	const isAlpha = (c: string) =>
		/[a-zA-Z_]/.test(c);
	const isAlnum = (c: string) =>
		/[a-zA-Z0-9_-]/.test(c);
	const isDigit = (c: string) =>
		/[0-9]/.test(c);

	while (i < input.length) {
		const c = input[i];

		if (c === " " || c === "\t") {
			i++;
			continue;
		}

		if (c === ":") {
			tokens.push({ type: "colon", pos: i++ });
			continue;
		}

		if (c === "=") {
			tokens.push({ type: "equals", pos: i++ });
			continue;
		}

		if (c === '"') {
			let value = "";
			i++;

			while (i < input.length && input[i] !== '"') {
				value += input[i++];
			}

			i++; // closing quote

			tokens.push({
				type: "string",
				value,
				pos: i,
			});
			continue;
		}

		if (isDigit(c)) {
			let num = "";
			while (i < input.length && isDigit(input[i])) {
				num += input[i++];
			}

			tokens.push({
				type: "number",
				value: num,
				pos: i,
			});
			continue;
		}

		if (isAlpha(c)) {
			let ident = "";
			while (i < input.length && isAlnum(input[i])) {
				ident += input[i++];
			}

			tokens.push({
				type: "identifier",
				value: ident,
				pos: i,
			});
			continue;
		}

		throw new Error(`Unexpected character "${c}"`);
	}

	tokens.push({ type: "eof", pos: i });
	return tokens;
}


import { Value } from "./ast";

export function asString(
	v: Value | undefined,
	name = "value"
): string {
	if (!v) {
		throw new Error(`Missing ${name}`);
	}

	if (v.type === "string" || v.type === "identifier") {
		return v.value;
	}

	throw new Error(
		`Expected ${name} to be a string`
	);
}

export function asNumber(
	v: Value | undefined,
	name = "value"
): number {
	if (!v) {
		throw new Error(`Missing ${name}`);
	}

	if (v.type === "number") {
		return v.value;
	}

	throw new Error(
		`Expected ${name} to be a number`
	);
}


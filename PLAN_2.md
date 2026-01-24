
## Overview

This epic defines the work required to implement a **fully structured command system** for the terminal-native design tooling project.

The command system must support:

- human text input (`:add button x=10 y=20`)
- AI-generated structured commands
- deterministic execution
- undo / redo
- replayable command history
- future scripting and automation

This system is not a programming language.

It is a **command grammar** whose sole purpose is to convert user intent into structured state changes.

---

## High-Level Architecture

```

Command Line Input
↓
Tokenizer
↓
Parser
↓
Command AST
↓
Command Executor
↓
Scene Graph Mutation
↓
History Stack
↓
Undo / Redo / Replay

```

Humans and AI must interact with the **same AST format**.

---

## Goals

- Simple to type
- Easy to learn
- Easy to autocomplete
- Easy to generate by AI
- Fully deterministic
- Fully serializable
- Replayable from history

---

## Non-Goals

- No loops
- No variables
- No conditionals
- No functions
- No macros
- No arbitrary expressions (initially)

This is **not a programming language**.

---

## Command Syntax Overview

All commands begin with `:`.

```

:command [target] [arguments]

```

---

## Example Commands

### Core

```

:q
:quit
:help
:history
:undo
:redo

```

---

### Frame Management

```

:frame new
:frame new id=main
:frame delete main
:frame select main
:frame list

```

---

### Component Creation

```

:add button
:add button x=10 y=20 w=80 h=24
:add text "Hello world"
:add input placeholder="Email"

```

---

### Selection

```

:select frame main
:select node button-3
:select last

```

---

### Layout & Geometry

```

:move x=10 y=20
:resize w=100 h=40
:align center
:align left

```

---

### Export

```

:export svg
:export svg ./out/home.svg
:export json

```

---

## Tokenizer Epic

### Purpose

Convert raw command strings into meaningful tokens.

---

### Token Types

| Token | Example |
|------|--------|
| COLON | `:` |
| IDENTIFIER | `add`, `button`, `frame` |
| NUMBER | `10`, `42` |
| STRING | `"Log in"` |
| EQUALS | `=` |
| DASH | `-` |
| EOF | end of input |

---

### Tokenizer Rules

- Whitespace separates tokens
- Quoted strings preserve spaces
- Numbers parse as floats
- Identifiers include:

```

[a-zA-Z_][a-zA-Z0-9_-]*

```

---

### Example Tokenization

Input:

```

:add button x=10 y=20 text="Log in"

````

Output:

```ts
[
  { type: "COLON", value: ":" },
  { type: "IDENTIFIER", value: "add" },
  { type: "IDENTIFIER", value: "button" },
  { type: "IDENTIFIER", value: "x" },
  { type: "EQUALS" },
  { type: "NUMBER", value: 10 },
  { type: "IDENTIFIER", value: "y" },
  { type: "EQUALS" },
  { type: "NUMBER", value: 20 },
  { type: "IDENTIFIER", value: "text" },
  { type: "EQUALS" },
  { type: "STRING", value: "Log in" }
]
````

---

### Subtasks

* [ ] Define token enum
* [ ] Implement tokenizer scanner
* [ ] Support quoted strings
* [ ] Support escaped quotes
* [ ] Track token position (for errors)
* [ ] Emit EOF token
* [ ] Unit tests for tokenization

---

## Parser Epic

### Purpose

Convert tokens into structured **Command AST nodes**.

---

### Grammar (Initial)

```
command     → ":" identifier arguments?
arguments   → argument*
argument    → identifier "=" value
value       → number | string | identifier
```

---

### Example Parse

Input:

```
:add button x=10 y=20
```

AST:

```ts
{
  type: "Command",
  name: "add",
  target: "button",
  args: {
    x: 10,
    y: 20
  }
}
```

---

### Command AST Types

```ts
interface CommandAST {
  type: "command";
  name: string;
  target?: string;
  args: Record<string, Value>;
  raw: string;
}
```

---

### Value Types

```ts
type Value =
  | number
  | string
  | boolean
  | IdentifierValue;
```

---

### Parsing Responsibilities

* validate syntax
* produce meaningful errors
* enforce command structure
* normalize arguments

---

### Example Errors

```
:add button x=
             ^
Expected value after '='
```

```
:add button x=ten
             ^
Invalid number literal
```

---

### Subtasks

* [ ] Recursive descent parser
* [ ] Token lookahead
* [ ] Helpful error messages
* [ ] Command normalization
* [ ] AST validation
* [ ] Parser test suite

---

## Command Registry Epic

### Purpose

Map parsed commands → executable behavior.

---

### Command Definition

```ts
interface CommandDefinition {
  name: string;
  execute(ast: CommandAST): CommandResult;
  undo?(result: CommandResult): void;
}
```

---

### Example

```ts
registerCommand({
  name: "add",
  execute(ast) {
    return addComponent(ast.target, ast.args);
  },
  undo(result) {
    removeNode(result.nodeId);
  }
});
```

---

### Subtasks

* [ ] Command registry
* [ ] Argument validation
* [ ] Required / optional args
* [ ] Auto-generated help output

---

## History & Undo Epic

### Purpose

Track all commands as immutable events.

---

### History Model

```ts
interface HistoryEntry {
  id: number;
  command: CommandAST;
  result: CommandResult;
  timestamp: number;
}
```

---

### Stack Structure

```
[ executed commands ]
           ↑
      current index
```

---

### Behavior

* `undo` reverses last command
* `redo` reapplies command
* branching clears redo stack
* commands must be reversible

---

### Example

```
:add button x=10 y=10
:add text "Login"
:undo
:redo
```

---

### Replay Capability

History can be replayed from scratch:

```ts
for (entry of history) {
  execute(entry.command);
}
```

This enables:

* deterministic playback
* bug reproduction
* exporting sessions
* AI reasoning over design steps

---

### Subtasks

* [ ] History stack
* [ ] Undo pointer
* [ ] Redo support
* [ ] Command replay
* [ ] History serialization
* [ ] `:history` command

---

## Human + AI Interoperability

### Humans Write

```
:add button x=10 y=20
```

---

### AI Emits

```json
{
  "type": "command",
  "name": "add",
  "target": "button",
  "args": {
    "x": 10,
    "y": 20
  }
}
```

Both execute through the same pipeline.

---

## Why This Matters

With this system:

* mouse actions → commands
* keyboard actions → commands
* CLI input → commands
* agents → commands
* history → commands
* undo → inverse commands
* export → command replay

Everything becomes unified.

---

## Final Outcome

After this epic, the project will have:

✅ formal command grammar
✅ tokenizer
✅ parser
✅ AST
✅ deterministic execution
✅ undo / redo
✅ replayable history
✅ agent-native interface

This transforms the system from:

> “interactive demo”

into:

> **a programmable design engine.**

---

## Recommended Implementation Order

1. Tokenizer
2. Parser
3. AST types
4. Command registry
5. Execution pipeline
6. History tracking
7. Undo / redo
8. Replay
9. Help & introspection

---

## Long-Term Extensions

* command autocomplete
* fuzzy matching
* macro recording
* scripting mode
* layout expressions
* constraint DSL
* collaboration playback


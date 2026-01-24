# Glitter Agent Onboarding

A concise guide for AI agents to start working in the Glitter repository.

## Project Overview

Glitter is a terminal-native design tool that renders pixel-art using Unicode braille characters (2x4 pixel grid per terminal cell). Designs are Git-shareable and structured so AI agents can understand and modify them without special training.

## Tech Stack

| Component | Details |
|-----------|---------|
| Runtime | Bun (primary), Node.js fallback via ts-node |
| Language | TypeScript (100%) |
| Dependencies | Minimal - only dev deps (typescript, @types/node, ts-node) |

## Quick Commands

**Start the app:**
```bash
bun run start
```

**REPL commands (prefix with `:`):**
| Command | Description |
|---------|-------------|
| `:quit` or `:q` | Exit the application |
| `:layer add <name>` | Create a new layer |
| `:layer select <name>` | Switch active layer |
| `:add box x=<n> y=<n> w=<n> h=<n>` | Draw a box |

## Architecture Overview

```
User Input → tokenizer.ts → parser.ts → commandExecutor.ts → layers.ts → PixelCanvas.ts → Terminal
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `index.ts` | Main entry point; REPL setup, render loop |
| `ast.ts` | AST type definitions (Value, CommandAST) |
| `tokenizer.ts` | Lexical analysis - input string to tokens |
| `parser.ts` | Tokens to AST conversion |
| `commandExecutor.ts` | Executes commands against the Scene |
| `layers.ts` | Layer system + braille math rendering |
| `PixelCanvas.ts` | Terminal control (cursor, screen clearing) |
| `valueUtils.ts` | Type coercion helpers (asString, asNumber) |

## Rendering Concept

- Each terminal cell = one braille character = 2x4 pixel grid
- Pixels are set via binary OR operations on braille dot masks
- Layers composite via OR into a final buffer before output
- `BRAILLE_DOTS` constant in `layers.ts` maps (x,y) to dot masks

## Common Tasks Walkthrough

### Adding a New Command

1. Open `commandExecutor.ts`
2. Add a new case in the `switch (cmd.name)` block
3. Extract args using `asString()`/`asNumber()` from `valueUtils.ts`
4. Call appropriate `Scene` method
5. Return `{ type: "render" }` to trigger redraw

**Example:** Adding `:clear` command
```typescript
case "clear":
    scene.clearActiveLayer();
    return { type: "render" };
```

### Adding a New Drawing Primitive

1. Open `layers.ts`
2. Add method to `Scene` class (e.g., `drawLine`, `drawCircle`)
3. Use `this.setPixel(x, y)` to set individual pixels
4. Expose via new command in `commandExecutor.ts`

**Example:** Adding `drawLine`
```typescript
drawLine(x1: number, y1: number, x2: number, y2: number) {
    // Bresenham's algorithm or similar
    // Call this.setPixel() for each point
}
```

### Adding Layer Features

- Create layer: `scene.addLayer(name)`
- Switch layer: `scene.setActiveLayer(name)`
- Access current: `scene.activeLayer`
- Toggle visibility: Modify `layer.visible` property

## Testing Guidance

No automated tests exist yet. Manual testing workflow:

1. **Start:** `bun run start`
2. **Test commands:** Try each command variant
   - `:layer add test`
   - `:layer select test`
   - `:add box x=5 y=5 w=10 h=8`
3. **Test errors:** Verify error handling
   - Missing args: `:add box x=5`
   - Unknown command: `:unknown`
   - Invalid layer: `:layer select nonexistent`
4. **Test exit:** `:quit` should restore cursor and exit cleanly

## Current State & Limitations

- Early stage - core infrastructure only
- No automated tests (planned in TASKS.md)
- No tsconfig.json (uses Bun defaults)
- Single drawing primitive (box) implemented

## Related Documentation

| File | Contents |
|------|----------|
| `README.md` | Project philosophy and motivation |
| `TASKS.md` | Roadmap of planned features |

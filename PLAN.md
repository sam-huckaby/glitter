# 📘 Project Summary

## Terminal-Native Design Tooling (TNDT)

### Mission

Build a **terminal-native UX wireframing and layout system** that allows both humans and coding agents to design interfaces **entirely from the CLI**, without GUI tooling.

The system treats the terminal as a **graphics backend**, not a text UI.

Rendering is achieved through:

* Unicode braille characters (2×4 pixels per cell)
* 24-bit ANSI color
* pixel-accurate mouse input
* deterministic rasterization

The goal is to reach functional parity with early-stage visual design tools (e.g. wireframe-mode Figma), while remaining fully operable via:

* CLI input
* structured JSON
* agent-driven manipulation

---

# 🧱 Core Architecture

```
┌───────────────────────────────┐
│        Scene Graph             │
│  (frames, nodes, constraints)  │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│        Layout Engine           │
│ (box model, snapping, rules)   │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│      Pixel Rasterizer          │
│ (logical pixel buffer)         │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│     Braille Renderer           │
│ (2×4 unicode glyph encoding)   │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       ANSI Terminal            │
│ (mouse, keyboard, color)       │
└───────────────────────────────┘
```

---

# 🎯 Design Principles

* Pixel coordinates are the source of truth
* Characters are an implementation detail
* All geometry must be serializable
* Humans and agents operate on the same data model
* Rendering is stateless and idempotent
* Interaction modifies state → redraw

---

# 🧩 Current Capabilities

✅ Braille pixel raster backend
✅ Logical pixel canvas
✅ 1-pixel-wide frame rendering
✅ Mouse input (SGR mode)
✅ Edge hit-testing
✅ Drag-resize frame walls
✅ Canvas clamping

---

# 🚧 Next Development Phases

Below are **eight discrete, agent-executable task definitions**, each independent but composable.

---

# ✅ TASK 1 — Hover Highlighting & Resize Cursors

### Goal

Provide visual feedback when the cursor is near an interactive surface.

---

### Requirements

* Detect mouse move without click
* Perform hit testing against:

  * left wall
  * right wall
  * top wall
  * bottom wall
* Highlight the hovered edge visually

---

### Visual Behavior

* Wall under hover renders brighter or inverted
* Only one edge may be active at a time
* No geometry mutation occurs until mouse-down

---

### Optional Enhancements

* Cursor glyph hints (← → ↑ ↓)
* Edge glow (double-pixel brightness)
* Dotted preview line

---

### Deliverables

* `hoverEdge: DragEdge | null`
* non-destructive render overlay
* no performance degradation during movement

---

### Agent Notes

* Terminal sends mouse-move events via mode `1002`
* Hover should not mutate frame geometry
* Rendering must remain deterministic

---

# ✅ TASK 2 — Draggable Corner Handles

### Goal

Allow resizing from corners, not only edges.

---

### Requirements

* Four interactive handles:

  * top-left
  * top-right
  * bottom-left
  * bottom-right
* Each handle allows diagonal resizing
* Handles snap to pixel grid

---

### Visual Design

* Small 3×3 pixel square
* Drawn inside the frame
* High-contrast appearance

---

### Interaction Rules

* Dragging corner moves two edges simultaneously
* Minimum frame size enforced
* Cannot escape white canvas

---

### Deliverables

* Handle hit-testing
* Diagonal drag support
* Visual affordances

---

# ✅ TASK 3 — Multiple Frames / Artboards

### Goal

Support more than one design surface in a document.

---

### Requirements

* Multiple independent frames
* Each frame has:

  * id
  * bounds
  * z-index
* One active frame at a time

---

### Interaction Rules

* Click selects frame
* Active frame renders highlighted
* Inactive frames render dimmed

---

### Data Model

```ts
interface FrameNode {
  id: string;
  bounds: Rect;
  children: Node[];
}
```

---

### Deliverables

* Scene graph root
* Active frame tracking
* Rendering order

---

# ✅ TASK 4 — Snapping & Alignment Guides

### Goal

Provide precision layout behavior.

---

### Snap Targets

* canvas edges
* other frame edges
* center lines
* pixel grid (optional)

---

### Behavior

* Snap within configurable threshold (e.g. 4px)
* Visual guide lines appear when snapping
* Snapping can be temporarily disabled via modifier key

---

### Deliverables

* Snap engine
* Guide overlay renderer
* Deterministic snapping rules

---

# ✅ TASK 5 — Component Primitives

### Goal

Allow placement of UI components inside frames.

---

### Initial Primitives

* Rectangle
* Text block
* Button
* Input field
* Navigation bar

---

### Requirements

* Components exist only inside frames
* Each component has:

  * bounding box
  * type
  * props
* Components render as wireframe outlines

---

### Example Node

```ts
interface ComponentNode {
  id: string;
  type: "button" | "input" | "text";
  bounds: Rect;
  props: Record<string, any>;
}
```

---

### Deliverables

* Component factory
* Renderers per component type
* Hit testing for selection

---

# ✅ TASK 6 — JSON Wireframe DSL

### Goal

Make the entire system agent-operable.

---

### Requirements

* Complete scene serializable to JSON
* JSON must support:

  * frames
  * components
  * layout metadata
* JSON must be round-trippable

---

### Example

```json
{
  "frames": [
    {
      "id": "main",
      "bounds": { "x": 8, "y": 8, "w": 144, "h": 80 },
      "children": [
        {
          "type": "button",
          "bounds": { "x": 20, "y": 20, "w": 40, "h": 12 },
          "text": "Submit"
        }
      ]
    }
  ]
}
```

---

### Deliverables

* JSON schema
* import/export pipeline
* validation layer

---

# ✅ TASK 7 — Layout Constraints System

### Goal

Support responsive design logic.

---

### Constraints

* pin left/right/top/bottom
* fixed size
* percentage sizing
* aspect ratio lock

---

### Example

```ts
constraints: {
  left: true,
  right: false,
  width: "50%",
}
```

---

### Behavior

* Recalculate bounds when frame resizes
* Deterministic layout resolution
* No recursive ambiguity

---

### Deliverables

* Constraint solver
* Dependency ordering
* Resize propagation

---

# ✅ TASK 8 — Export Pipelines (SVG / PNG)

### Goal

Bridge terminal designs into real design workflows.

---

### Export Targets

* SVG (primary)
* PNG (secondary)

---

### Requirements

* Pixel-perfect export
* Same coordinate system
* No terminal artifacts
* Headless rendering

---

### SVG Mapping

* Pixels → viewBox units
* Frames → `<rect>`
* Components → semantic elements

---

### Deliverables

* SVG generator
* Optional PNG rasterizer
* CLI export command

---

# 🧭 Recommended Implementation Order

```
1. Hover highlighting
2. Corner handles
3. Multiple frames
4. Snapping guides
5. Components
6. JSON DSL
7. Layout constraints
8. Export pipeline
```

Each step builds naturally on the previous.

---

# 🧠 Final Note

You are not building a TUI.

You are building:

> **A design system whose display backend happens to be a terminal.**

Everything from here on out is geometry, state, and constraint solving.

The braille renderer is effectively your GPU.


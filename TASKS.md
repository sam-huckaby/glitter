# Future tasks to implement

## Core Features

These are the essential features already planned or partially implemented:

* **Selection Overlay Layer**

  * Highlight selected components or elements.
  * Support multi-select with Shift+Click.
  * Visual distinction between active layer and background layers.

* **Mouse Drag to Resize Elements/Components**

  * Drag edges or corners to resize.
  * Snap to grid option.
  * Maintain aspect ratio with Shift modifier.

* **Mouse Drag → AST Command Emission**

  * Emit AST (Abstract Syntax Tree) commands for drag actions.
  * Track element movement, resizing, and transformations.
  * Allow chaining of commands for batch editing.

* **Resize Handles Drawn via Braille Math**

  * Use braille patterns for compact, precise visualization of handles.
  * Integrate with command history for undo/redo.

* **Up/Down Arrow Navigation Through Past Commands**

  * Allow prompt history browsing using arrow keys.
  * Support search/filtering of past commands.
  * Highlight current selection in command history.

* **Undo / Redo**

  * Multi-level undo/redo stack.
  * Support for AST command reversal.
  * Visual feedback for undo/redo actions.

* **`:help` Command**

  * Display a list of available commands and shortcuts.
  * Context-sensitive help for current selection or layer.

* **Active-Layer Shown in Prompt**

  * Display which layer/component is currently active.
  * Auto-update when selection changes.
  * Optional color-coding per layer.

* **Add FPS / Render Timing**

  * Real-time display of frames per second.
  * Profiling of render times per component/layer.
  * Optional logging for performance debugging.

---

## User Interaction Enhancements

* **Keyboard Shortcuts**

  * Customizable hotkeys for selection, undo/redo, layer switching.
  * Arrow keys for nudging elements.
  * Ctrl/Cmd + drag for duplicating elements.

* **Contextual Menus**

  * Right-click options for elements/layers.
  * Quick access to resize, rename, hide/show layers.

* **Multi-Selection Manipulation**

  * Group elements together for resizing/moving.
  * Align and distribute multiple components.

* **Snap-to Guidelines**

  * Grid snapping for precise placement.
  * Dynamic guidelines showing alignment with other elements.

* **Layer Management**

  * Rename, reorder, hide/show layers.
  * Lock/unlock layers for editing.
  * Merge layers into a single group.

---

## Command & Prompt Features

* **Command Autocomplete**

  * Predictive suggestions for commands.
  * Auto-completion for element names and attributes.

* **Command Macros / Templates**

  * Save frequently used command sequences.
  * Reuse commands on multiple elements.

* **Command Logging**

  * Persistent history across sessions.
  * Exportable command logs for debugging or replay.

* **Command Aliases**

  * Define short names for frequently used commands.
  * Support custom syntax mapping.

---

## Visual Feedback & Rendering

* **Selection Visualization**

  * Semi-transparent overlay for selected elements.
  * Animated handles when hovered or active.

* **Live Preview Mode**

  * Render changes instantly during drag or resize.
  * Show AST transformation effects in real-time.

* **FPS / Timing Overlay**

  * Optional toggle for performance metrics.
  * Highlight slow-rendering layers/components.

* **Error / Warning Indicators**

  * Highlight invalid commands or failed AST operations.
  * Inline tooltip explanations.

* **Braille Math Visualizations**

  * For dense or precise resize handles.
  * Optional toggle for display simplification.

---

## Advanced / Stretch Features

* **AST Visualization Panel**

  * Show current AST tree for selected elements.
  * Support interactive node selection and editing.

* **Layer Animations**

  * Animate transitions between states.
  * Smooth resizing, movement, and opacity changes.

* **Physics-based Interaction**

  * Drag interactions with momentum or spring effects.
  * Collision detection for overlapping elements.

* **Versioning**

  * Snapshot states for branching edits.
  * Revert to previous visual states.

* **Collaboration Features**

  * Multi-user editing with shared layers.
  * Live command syncing across clients.

* **Accessibility Enhancements**

  * Keyboard-only mode for all operations.
  * Screen reader-friendly prompts and feedback.

* **Plugin / Extension Support**

  * Allow external scripts to modify elements or commands.
  * Custom rendering or AST transformation plugins.

---

## Developer / Debug Features

* **Debug Overlay**

  * Show bounding boxes, element IDs, AST nodes.
  * Visualize command flow for debugging.

* **Performance Profiling**

  * Measure rendering, AST parsing, and command execution times.
  * Log performance per frame or per layer.

* **Test Harness**

  * Scriptable UI tests using commands or AST scripts.
  * Replayable command sequences for automated testing.


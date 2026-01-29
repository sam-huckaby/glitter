# Workflow for this tool

## Why did I start this?

This project started because someone told me they thought that an AI coding harness and Git is all we really need now. I don't agree, but in the spirit of exploration, I decided to try and figure out what we would need to reach that goal.

In my opinion, we are losing a lot of collaboration by moving every developer into their own bubble, asking them to build their own things, and simply accepting the rough design-work that an AI presents us with. AI produces designs - no argument there - but they are TRAINED designs, which mean they will always share some common looks and feels. You might prompt them into cute things, but ultimately the underlying model's ideas about design is the same for both me and some guy in Akron.

## Some small goals

I have a couple of goals with this project:

- To make designs in the terminal (objectively cool)
- To make designs that make sense to share via Git
- To make designs that AI agents can understand and implement without special training
- To make designs that AI agents can ask the user to modify dynamically

I may build things beyond these key goals, but ultimately this project will be a success only if those four criteria are met.

## Compact design schema

This tool can export and import an ultra-compact JSON format meant to be easy for AI agents to generate and consume.

### Commands

- `:w [filename]` saves the current scene. If no filename is provided, it uses the last opened/saved file (and errors if none).
- `:e [filename]` loads a compact JSON file and replaces the current scene.
- `:wq [filename]` saves and quits. If no filename is provided, it uses the last opened/saved file (and errors if none).
- `:help` shows a brief command reference.

Filenames can include dots or paths without quotes (e.g. `:w ./scene.json`).

You can also load a file at startup with `bun index.ts path/to/design.json`. If the file is missing, the app exits with code `2`.

### Schema v1

```json
{
  "v": 1,
  "w": 160,
  "h": 96,
  "layers": ["frame", "components"],
  "nodes": [
    ["box", "frameBox", "frame", [4, 8, 152, 80], {"name": "Frame"}]
  ],
  "meta": {
    "title": "Landing",
    "note": "AI intent here"
  }
}
```

- `v`: schema version.
- `w`, `h`: canvas size in px (must be divisible by 2 and 4).
- `layers`: ordered layer IDs (render order).
- `nodes`: ordered components (z-order), each is `[type, id, layerId, rect, meta?]`.
- `rect`: `[x,y,w,h]` in px.
- `meta`: optional object at the document and node level.

Supported node types today: `box` only. Other types (`text`, `image`, `button`) are allowed in the file but will be skipped with a warning.

## Inspiration and design notes

I am not a designer. I'm just digruntled.

Pixels in this terminal project are just braille characters, which are super, duper, incredibly awesome. Essentially braille characters just let us do basic binary math with OR operators to get a bunch of hard stuff for free.
I don't love advanced math, and this rendering engine basically avoids anything super complicated.

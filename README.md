# TTRPG Prep PDF Templates for reMarkable Paper Pro & Paper Pro Move

A collection of printable PDF templates for tabletop RPG session prep, sized for the exact screen dimensions of the reMarkable Paper Pro and reMarkable Paper Pro Move.

The repo started as a single Lazy GM prep sheet and has since grown into a multi-system, multi-device template collection.

## Available Templates

| Template | System | Device | Languages |
|---|---|---|---|
| Lazy GM Session Prep | system-agnostic | Paper Pro | EN, DE |
| Adversary Cards | Daggerheart | Paper Pro | EN, DE |
| Adversary Cards | Daggerheart | Paper Pro Move | EN, DE |
| Lazy GM Session Prep (native template) | system-agnostic | Paper Pro, Paper Pro Move | EN, DE |

Prebuilt PDFs are attached to each [GitHub release](https://github.com/n3rdc4ptn/ttrpg-prep-templates/releases) so you can download them directly without running the toolchain.

## How to use

Install dependencies:

```bash
bun install
```

Run the development server for live preview of the Lazy GM template (English):

```bash
bun dev
```

Render PDFs:

```bash
# Render every template in the repo
bun run render

# Or render a single template by passing its HTML path
bun run render templates/system-agnostic/lazy-gm-session-prep/paper-pro/en.html
```

Each rendered PDF is padded to 10 pages (the source template is repeated) so you have a ready-made stack of blank prep sheets to fill in at the table. Output files are written to `output/` and named `<template>.<device>.<lang>.pdf`.

Named shortcuts are also available:

```bash
bun run render:lazy-gm          # Lazy GM, English, Paper Pro
bun run render:lazy-gm:de       # Lazy GM, German, Paper Pro
bun run render:adversary        # Daggerheart adversary, English, Paper Pro Move
bun run render:adversary:de     # Daggerheart adversary, German, Paper Pro Move
```

## Native reMarkable templates

Besides the PDFs, the Lazy GM sheet is also available as a native reMarkable page template (SVG + PNG). A native template shows up in the device's template picker, so you can put it behind any page of any notebook instead of importing a PDF.

It follows the eight steps from *Return of the Lazy Dungeon Master* in book order: characters, strong start, scenes, secrets and clues, locations, NPCs, monsters, rewards.

```bash
bun run render:remarkable
```

This writes `output/remarkable/<device>/lazy-gm-session-prep-<lang>.{svg,png}` at the native screen resolution (Paper Pro 1620×2160, Paper Pro Move 954×1696) plus `output/remarkable/templates-entry.json` with the matching `templates.json` entries. Text is converted to outlines, so the templates don't depend on fonts installed on the device.

### Installing on the device

Custom templates need developer mode (Settings → Software → Advanced → Developer mode; the menu path varies a little between software versions). **Turning it on factory-resets the tablet**, so sync everything to the cloud first. Afterwards the device shows its SSH password on the *About* page in Settings.

With the tablet connected via USB (`10.11.99.1`):

```bash
scripts/install-remarkable.sh 10.11.99.1 paper-pro de       # Paper Pro, German
scripts/install-remarkable.sh 10.11.99.1 paper-pro-move de  # Paper Pro Move, German
```

The script remounts the root filesystem writable, backs up `templates.json` once (`templates.json.bak`), copies the SVG and PNG to `/usr/share/remarkable/templates/`, adds the entry (only if it's missing) and restarts the UI. The template then appears under *Planners*.

Software updates replace the system partition and remove custom templates; just run the script again afterwards.

## Repository layout

```
templates/
  <system>/                   # system-agnostic, daggerheart, ...
    <template-name>/          # lazy-gm-session-prep, adversary, ...
      <device>/               # paper-pro, paper-pro-move
        en.html, de.html, ...
shared/
  base.css                    # shared base styles
  card.css                    # shared card styles (used by adversary cards)
  paper-pro.css               # 179.7mm × 239.6mm page size
  paper-pro-move.css          # 91.8mm × 163.2mm page size
  paper-pro-adversary.css     # adversary-specific Paper Pro sizing
scripts/
  render.ts                   # HTML → PDF
  remarkable.ts               # native reMarkable templates (SVG + PNG)
  install-remarkable.sh       # copy a template onto the tablet via SSH
```

## Adding a new template

1. Create a folder under `templates/<system>/<template-name>/<device>/`. `<system>` is `system-agnostic` or the name of a specific RPG (e.g. `daggerheart`). `<device>` is `paper-pro` or `paper-pro-move`.
2. Add one HTML file per language: `en.html`, `de.html`, etc.
3. In each HTML file, link the shared stylesheets:
   ```html
   <link rel="stylesheet" href="../../../../shared/base.css">
   <link rel="stylesheet" href="../../../../shared/paper-pro.css">
   ```
   Replace `paper-pro.css` with `paper-pro-move.css` for Move templates.
4. Render with `bun run render templates/<system>/<template-name>/<device>/<lang>.html`, or just `bun run render` to build everything.

Page size is driven by the device CSS — `shared/paper-pro.css` (179.7mm × 239.6mm) and `shared/paper-pro-move.css` (91.8mm × 163.2mm). To add a new device, drop a new CSS file in `shared/` with the `@page` rule and reference it from your template.

## Contribution

I'm happy to collaborate on this project — please open issues or PRs.

## License

Template code © Moritz Marby
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

This work includes material taken from the [Lazy GM's Resource Document](https://slyflourish.com/lazy_gm_resource_document.html) by Michael E. Shea of [SlyFlourish.com](https://slyflourish.com/), available under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

Daggerheart templates are unofficial fan-made resources and are not affiliated with or endorsed by Darrington Press.

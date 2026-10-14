#!/usr/bin/env bun
// Builds native reMarkable page templates (SVG + PNG) for the Lazy GM
// session prep sheet. Unlike the PDFs, these show up in the device's
// template picker and can be used as the background of any notebook page.
//
// Text is converted to outlines so the SVGs look identical on the device,
// independent of the fonts installed there.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";

type Device = {
  id: string;
  width: number; // px
  height: number; // px
  pxPerMm: number;
};

// Screen resolution of each device in portrait orientation.
const DEVICES: Device[] = [
  { id: "paper-pro", width: 1620, height: 2160, pxPerMm: 1620 / 179.7 },
  { id: "paper-pro-move", width: 954, height: 1696, pxPerMm: 954 / 91.8 },
];

type Lang = "de" | "en";

// The eight steps from "Return of the Lazy Dungeon Master", in book order.
const STEPS: Record<Lang, string[]> = {
  en: [
    "Characters",
    "Strong Start",
    "Potential Scenes",
    "Secrets and Clues",
    "Fantastic Locations",
    "Important NPCs",
    "Relevant Monsters",
    "Magic Item Rewards",
  ],
  de: [
    "Charaktere",
    "Strong Start",
    "Potenzielle Szenen",
    "Geheimnisse",
    "Fantastische Orte",
    "Wichtige NPCs",
    "Kämpfe & Monster",
    "Loot & Schätze",
  ],
};

const SESSION_LABEL: Record<Lang, string> = { en: "Session:", de: "Session:" };

const TEMPLATE_NAME: Record<Lang, string> = {
  en: "Lazy GM Session Prep",
  de: "Lazy GM Session Prep (DE)",
};

// Same proportions as shared/base.css and the device CSS files (in mm).
const MARGIN = { top: 13, side: 2, bottom: 2 };
const GAP = 1;
const PADDING = 2;
const HEADING_PT = 8;
const LETTER_SPACING_EM = 0.1;
const BORDER_MM = 0.25;
const ACCENT = "#808080";

// Rows of the grid: two full-width rows for steps 1 and 2, then three rows
// of two boxes for steps 3–8. Weights are relative row heights.
const ROWS: { steps: number[]; weight: number }[] = [
  { steps: [0], weight: 0.7 },
  { steps: [1], weight: 0.8 },
  { steps: [2, 3], weight: 1 },
  { steps: [4, 5], weight: 1 },
  { steps: [6, 7], weight: 1 },
];

const fontPath = resolve(
  "node_modules/@fontsource/gelasio/files/gelasio-latin-700-normal.woff",
);
const font = opentype.parse((await Bun.file(fontPath).arrayBuffer()) as ArrayBuffer);

// Path.toPathData() occasionally emits NaN, so serialize the commands ourselves.
function pathData(path: opentype.Path): string {
  const n = (v: number) => (Math.round(v * 100) / 100).toString();
  return path.commands
    .map((c) => {
      switch (c.type) {
        case "M":
        case "L":
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case "Q":
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case "C":
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}

function textPath(text: string, x: number, y: number, size: number): { d: string; width: number } {
  const scale = size / font.unitsPerEm;
  const spacing = LETTER_SPACING_EM * size;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  const parts: string[] = [];
  let cursor = x;
  glyphs.forEach((glyph, i) => {
    parts.push(pathData(glyph.getPath(cursor, y, size)));
    cursor += (glyph.advanceWidth ?? 0) * scale + spacing;
    const next = glyphs[i + 1];
    if (next) cursor += (font.getKerningValue(glyph, next) || 0) * scale;
  });
  return { d: parts.join(""), width: cursor - spacing - x };
}

function buildSvg(device: Device, lang: Lang): string {
  const mm = (v: number) => v * device.pxPerMm;
  const r = (v: number) => Math.round(v * 100) / 100;
  const stroke = Math.max(2, Math.round(mm(BORDER_MM)));

  const left = mm(MARGIN.side);
  const top = mm(MARGIN.top);
  const innerW = device.width - 2 * mm(MARGIN.side);
  const innerH = device.height - top - mm(MARGIN.bottom);
  const gap = mm(GAP);
  const totalWeight = ROWS.reduce((s, row) => s + row.weight, 0);
  const rowSpace = innerH - gap * (ROWS.length - 1);

  // One heading size per page: 8pt, shrunk if any heading would overflow
  // its box (the Paper Pro Move's half-width boxes are narrow).
  let headingSize = mm((HEADING_PT * 25.4) / 72);
  for (const row of ROWS) {
    const w = (innerW - gap * (row.steps.length - 1)) / row.steps.length;
    for (const step of row.steps) {
      const label = `${step + 1} · ${STEPS[lang][step]}`.toUpperCase();
      const natural = textPath(label, 0, 0, headingSize).width;
      const maxWidth = w - 2 * mm(PADDING);
      if (natural > maxWidth) headingSize *= maxWidth / natural;
    }
  }

  const shapes: string[] = [];
  const text: string[] = [];
  let y = top;

  for (const row of ROWS) {
    const h = (rowSpace * row.weight) / totalWeight;
    const w = (innerW - gap * (row.steps.length - 1)) / row.steps.length;
    row.steps.forEach((step, col) => {
      const x = left + col * (w + gap);
      const half = stroke / 2;
      shapes.push(
        `<rect x="${r(x + half)}" y="${r(y + half)}" width="${r(w - stroke)}" height="${r(h - stroke)}"/>`,
      );

      const tx = x + mm(PADDING);
      const baseline = y + mm(PADDING) + headingSize * 0.8;
      const label = `${step + 1} · ${STEPS[lang][step]}`.toUpperCase();
      text.push(textPath(label, tx, baseline, headingSize).d);

      if (step === 1) {
        // "Session:" field, placed like the .move-right span in the PDF.
        const session = SESSION_LABEL[lang].toUpperCase();
        text.push(textPath(session, x + w - mm(PADDING) - mm(45), baseline, headingSize).d);
      }

      const ruleY = baseline + headingSize * 0.2 + mm(1);
      shapes.push(
        `<line x1="${r(tx)}" y1="${r(ruleY)}" x2="${r(x + w - mm(PADDING))}" y2="${r(ruleY)}"/>`,
      );
    });
    y += h + gap;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${device.width}" height="${device.height}" viewBox="0 0 ${device.width} ${device.height}">
  <title>${TEMPLATE_NAME[lang]}</title>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g fill="none" stroke="${ACCENT}" stroke-width="${stroke}">
    ${shapes.join("\n    ")}
  </g>
  <path fill="#000000" d="${text.join("")}"/>
</svg>
`;
}

const outRoot = resolve("output/remarkable");
const entries: Record<Lang, object> = { de: {}, en: {} };

for (const device of DEVICES) {
  const outDir = `${outRoot}/${device.id}`;
  await mkdir(outDir, { recursive: true });
  for (const lang of Object.keys(STEPS) as Lang[]) {
    const filename = `lazy-gm-session-prep-${lang}`;
    const svg = buildSvg(device, lang);
    const png = new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
    await Bun.write(`${outDir}/${filename}.svg`, svg);
    await Bun.write(`${outDir}/${filename}.png`, png);
    entries[lang] = {
      name: TEMPLATE_NAME[lang],
      filename,
      iconCode: "",
      landscape: false,
      categories: ["Planners"],
    };
    console.log(`Wrote ${outDir}/${filename}.{svg,png} (${device.width}×${device.height})`);
  }
}

await Bun.write(
  `${outRoot}/templates-entry.json`,
  JSON.stringify(Object.values(entries), null, 2).replace(//g, "\\ue9fe") + "\n",
);
console.log(`Wrote ${outRoot}/templates-entry.json`);

"use client";

import { useMemo } from "react";

/**
 * A deterministic, QR-shaped SVG generated from the URL string — not a real encoder.
 * "Save to phone" in this prototype has no second device to actually scan a code with,
 * so a genuine QR payload would be untestable work; this gives the same visual promise
 * ("scan this to load your plan") and is honestly labelled as simulated.
 */
export function PseudoQrCode({
  value,
  size = 176,
}: {
  value: string;
  size?: number;
}) {
  const gridSize = 21;
  const cellSize = size / gridSize;
  const cells = useMemo(
    () => generatePseudoQrCells(value, gridSize),
    [value, gridSize],
  );

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Gesimuleerde QR-kode om die skakel na jou foon te dra"
        className="rounded-md border border-(--panel-border)"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {cells.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x * cellSize}
            y={y * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#14171a"
          />
        ))}
        <QrFinderPattern x={0} y={0} cellSize={cellSize} />
        <QrFinderPattern
          x={(gridSize - 7) * cellSize}
          y={0}
          cellSize={cellSize}
        />
        <QrFinderPattern
          x={0}
          y={(gridSize - 7) * cellSize}
          cellSize={cellSize}
        />
      </svg>
      <span className="text-[10px] text-(--text-secondary)">
        Gesimuleerde QR-kode
      </span>
    </div>
  );
}

function QrFinderPattern({
  x,
  y,
  cellSize,
}: {
  x: number;
  y: number;
  cellSize: number;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={cellSize * 7} height={cellSize * 7} fill="#14171a" />
      <rect
        x={cellSize}
        y={cellSize}
        width={cellSize * 5}
        height={cellSize * 5}
        fill="#ffffff"
      />
      <rect
        x={cellSize * 2}
        y={cellSize * 2}
        width={cellSize * 3}
        height={cellSize * 3}
        fill="#14171a"
      />
    </g>
  );
}

function isInsideFinderZone(x: number, y: number, gridSize: number): boolean {
  const topLeft = x < 7 && y < 7;
  const topRight = x >= gridSize - 7 && y < 7;
  const bottomLeft = x < 7 && y >= gridSize - 7;

  return topLeft || topRight || bottomLeft;
}

/** Mulberry32 — a tiny seeded PRNG, so the same URL always renders the same "code". */
function mulberry32(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePseudoQrCells(
  value: string,
  gridSize: number,
): Array<[number, number]> {
  let seed = 0;
  for (let index = 0; index < value.length; index += 1) {
    seed = (Math.imul(seed, 31) + value.charCodeAt(index)) >>> 0;
  }

  const random = mulberry32(seed || 1);
  const cells: Array<[number, number]> = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (isInsideFinderZone(x, y, gridSize)) continue;
      if (random() > 0.55) cells.push([x, y]);
    }
  }

  return cells;
}

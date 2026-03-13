"use client";

import { theme } from "../theme";

export function AsciiLogo() {
  const t = theme;
  const grid = [
    [0,1,0,0,0,1,0],
    [0,2,0,0,0,2,0],
    [0,2,0,0,0,2,0],
    [2,2,2,2,2,2,2],
    [3,3,3,3,3,3,3],
    [3,0,0,0,0,0,3],
    [3,0,3,0,3,0,3],
    [3,0,3,0,3,0,3],
    [3,0,0,0,0,0,3],
    [3,3,3,3,3,3,3],
    [3,3,3,3,3,3,3],
    [2,2,2,2,2,2,2],
  ];

  const colors: Record<number, string> = {
    0: "transparent",
    1: t.textPrimary + "4d",  // 30% opacity
    2: t.textPrimary + "99",  // 60% opacity
    3: t.textPrimary,
  };

  const cellSize = 4;

  return (
    <div
      className="select-none"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
        gap: "1px",
      }}
    >
      {grid.flat().map((val, i) => (
        <div key={i} style={{ backgroundColor: colors[val], width: cellSize, height: cellSize }} />
      ))}
    </div>
  );
}

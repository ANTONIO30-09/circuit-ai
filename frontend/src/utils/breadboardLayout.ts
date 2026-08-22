import type { Circuit, Component } from "../types";

export const BOARD_COLS = 63;
const MIN_COL = 1;

const TWO_PIN_TYPES = new Set([
  "resistor", "capacitor", "led", "battery", "switch",
  "potentiometer", "crystal", "buzzer",
]);

const PLACEMENT_ROWS = ["A", "B", "C", "D", "G", "H", "I", "J"] as const;

export interface PinPlacement {
  pinId: string;
  row: string;
  col: number;
  net: string;
}

function clampCol(col: number, span = 1): number {
  const maxStart = BOARD_COLS - span + 1;
  return Math.max(MIN_COL, Math.min(maxStart, col));
}

function occKey(row: string, col: number): string {
  return `${row}:${col}`;
}

class OccupancyGrid {
  private occupied = new Set<string>();

  isFree(row: string, col: number): boolean {
    return !this.occupied.has(occKey(row, col));
  }

  isSpanFree(row: string, col: number, span: number): boolean {
    for (let i = 0; i < span; i++) {
      if (!this.isFree(row, col + i)) return false;
    }
    return col >= MIN_COL && col + span - 1 <= BOARD_COLS;
  }

  mark(row: string, col: number, span = 1): void {
    for (let i = 0; i < span; i++) {
      this.occupied.add(occKey(row, col + i));
    }
  }

  findSpan(rows: readonly string[], span: number): { row: string; col: number } | null {
    for (const row of rows) {
      for (let col = MIN_COL; col <= BOARD_COLS - span + 1; col++) {
        if (this.isSpanFree(row, col, span)) {
          this.mark(row, col, span);
          return { row, col };
        }
      }
    }
    return null;
  }
}

const MODULE_TYPES = new Set([
  "sensor_analog", "sensor_digital", "lcd_i2c", "keypad_matrix", "servo", "relay", "ic",
]);

function spanForComponent(c: Component): number {
  if (c.type === "microcontroller" && c.pins.length > 2) {
    return Math.ceil(c.pins.length / 2);
  }
  if (c.pins.length === 2 && TWO_PIN_TYPES.has(c.type)) return 2;
  if (MODULE_TYPES.has(c.type)) {
    // +1 columna de padding: el glyph visual del modulo es mas ancho que sus pines
    return Math.max(c.pins.length, 1) + 1;
  }
  return Math.max(c.pins.length, 1);
}

function isValidPos(row: string | undefined, col: number | undefined, span: number): boolean {
  if (!row || col == null) return false;
  if (!PLACEMENT_ROWS.includes(row as (typeof PLACEMENT_ROWS)[number]) && row !== "E" && row !== "F") {
    return false;
  }
  return col >= MIN_COL && col + span - 1 <= BOARD_COLS;
}

function placeMicrocontroller(c: Component, grid: OccupancyGrid, forced?: { row: string; col: number }): PinPlacement[] {
  const half = Math.ceil(c.pins.length / 2);
  const span = half;
  let startCol = forced?.col ?? MIN_COL;

  if (forced) {
    startCol = clampCol(forced.col, span);
  } else {
    for (let col = MIN_COL; col <= BOARD_COLS - span + 1; col++) {
      let ok = true;
      for (let i = 0; i < span; i++) {
        if (!grid.isFree("E", col + i) || !grid.isFree("F", col + i)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        startCol = col;
        break;
      }
    }
    startCol = clampCol(startCol, span);
  }

  grid.mark("E", startCol, span);
  grid.mark("F", startCol, span);

  const topPins = c.pins.slice(0, half);
  const botPins = c.pins.slice(half);
  const result: PinPlacement[] = [];

  topPins.forEach((p, i) => {
    result.push({ pinId: p.id, row: "E", col: startCol + i, net: p.net });
  });
  botPins.forEach((p, i) => {
    result.push({ pinId: p.id, row: "F", col: startCol + i, net: p.net });
  });

  return result;
}

function placeLinear(c: Component, row: string, startCol: number): PinPlacement[] {
  return c.pins.map((p, i) => ({
    pinId: p.id,
    row,
    col: startCol + i,
    net: p.net,
  }));
}

function sortComponents(components: Component[]): Component[] {
  return [...components].sort((a, b) => {
    const rank = (c: Component) => {
      if (c.type === "microcontroller") return 0;
      if (c.type === "battery") return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });
}

/** Auto-colocación dentro de filas A-J y columnas 1-63. */
export function assignBreadboardLayout(circuit: Circuit): Record<string, PinPlacement> {
  const grid = new OccupancyGrid();
  const pinMap: Record<string, PinPlacement> = {};

  for (const c of sortComponents(circuit.components)) {
    const span = spanForComponent(c);

    if (c.type === "microcontroller" && c.pins.length > 2) {
      const forced =
        c.breadboard_pos && isValidPos("E", c.breadboard_pos.col, span)
          ? { row: "E", col: c.breadboard_pos.col }
          : undefined;
      for (const p of placeMicrocontroller(c, grid, forced)) {
        pinMap[p.pinId] = p;
      }
      continue;
    }

    const pos = c.breadboard_pos;
    const canUsePos =
      pos &&
      (PLACEMENT_ROWS as readonly string[]).includes(pos.row) &&
      isValidPos(pos.row, pos.col, span) &&
      grid.isSpanFree(pos.row, pos.col, span);

    if (canUsePos && pos) {
      grid.mark(pos.row, pos.col, span);
      for (const p of placeLinear(c, pos.row, pos.col)) {
        pinMap[p.pinId] = p;
      }
      continue;
    }

    const slot = grid.findSpan(PLACEMENT_ROWS, span);
    if (slot) {
      for (const p of placeLinear(c, slot.row, slot.col)) {
        pinMap[p.pinId] = p;
      }
    } else {
      // Último recurso: apilar en fila J desde col 1
      const fallbackCol = clampCol(MIN_COL, span);
      grid.mark("J", fallbackCol, span);
      for (const p of placeLinear(c, "J", fallbackCol)) {
        pinMap[p.pinId] = p;
      }
    }
  }

  return pinMap;
}

const POWER_COLOR = "#e03131";
const GROUND_COLOR = "#212529";

const SIGNAL_PALETTE = [
  "#2b8a3e", // verde
  "#1864ab", // azul
  "#f08c00", // amarillo/naranja señal
  "#7950f2", // violeta
  "#0ca678", // teal
  "#ae3ec9", // magenta
  "#495057", // gris
  "#15aabf", // cyan
  "#d6336c", // rosa
  "#82c91e", // lima
];

const POWER_RE = /^(VCC|VDD|5V|3V3|3\.3V|\+5V|PLUS|POS|ALIM|V\+)$/i;
const GROUND_RE = /^(GND|VSS|GROUND|TIERRA|V-|NEG)$/i;

function normalizeNetId(id: string): string {
  return id.trim().toUpperCase();
}

export function isPowerNet(netId: string): boolean {
  const id = normalizeNetId(netId);
  return POWER_RE.test(id) || id.includes("VCC") || id.includes("VDD") || id === "5V" || id === "3V3";
}

export function isGroundNet(netId: string): boolean {
  const id = normalizeNetId(netId);
  return GROUND_RE.test(id) || id.includes("GND") || id.includes("VSS");
}

/** Asignación estricta: VCC→rojo, GND→negro, señales→paleta rotativa. Ignora color_hint salvo hex explícito. */
export function buildNetColorMap(nets: { id: string; color_hint?: string | null }[]): Record<string, string> {
  const map: Record<string, string> = {};
  let signalIdx = 0;

  for (const net of nets) {
    if (isPowerNet(net.id)) {
      map[net.id] = POWER_COLOR;
    } else if (isGroundNet(net.id)) {
      map[net.id] = GROUND_COLOR;
    }
  }

  for (const net of nets) {
    if (map[net.id]) continue;
    if (net.color_hint?.startsWith("#")) {
      map[net.id] = net.color_hint;
      continue;
    }
    map[net.id] = SIGNAL_PALETTE[signalIdx % SIGNAL_PALETTE.length];
    signalIdx++;
  }

  return map;
}

export function resolveNetColor(netId: string, colorMap: Record<string, string>): string {
  return colorMap[netId] ?? SIGNAL_PALETTE[0];
}

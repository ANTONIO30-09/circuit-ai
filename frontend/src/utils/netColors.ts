const POWER_COLOR = "#e03131";
const GROUND_COLOR = "#212529";

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

const GOLDEN_ANGLE = 137.508;

/**
 * Asignación estricta: VCC->rojo, GND->negro, señales-> hues maximamente
 * separados via angulo dorado, con semilla aleatoria por generacion para
 * que cada circuito nuevo tenga una paleta completamente distinta.
 */
export function buildNetColorMap(nets: { id: string; color_hint?: string | null }[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const net of nets) {
    if (isPowerNet(net.id)) {
      map[net.id] = POWER_COLOR;
    } else if (isGroundNet(net.id)) {
      map[net.id] = GROUND_COLOR;
    }
  }

  const startHue = Math.random() * 360;
  let signalIdx = 0;

  for (const net of nets) {
    if (map[net.id]) continue;
    if (net.color_hint?.startsWith("#")) {
      map[net.id] = net.color_hint;
      continue;
    }
    const hue = (startHue + signalIdx * GOLDEN_ANGLE) % 360;
    const sat = 65 + (signalIdx % 3) * 10; // varia un poco saturacion entre 65-85%
    const light = 38 + (signalIdx % 2) * 10; // varia luminosidad entre 38-48%
    map[net.id] = `hsl(${hue.toFixed(1)}, ${sat}%, ${light}%)`;
    signalIdx++;
  }

  return map;
}

export function resolveNetColor(netId: string, colorMap: Record<string, string>): string {
  return colorMap[netId] ?? "#495057";
}

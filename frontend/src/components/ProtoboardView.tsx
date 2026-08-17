import { useMemo, useState, type ReactElement } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group, Shape } from "react-konva";
import type Konva from "konva";
import type { Circuit, Component } from "../types";
import { assignBreadboardLayout, BOARD_COLS } from "../utils/breadboardLayout";
import { buildNetColorMap, resolveNetColor } from "../utils/netColors";

const HOLE = 16;
const MARGIN_LEFT = 40;
const TOP_MARGIN = 100; // espacio para que arqueen los cables por encima de la fila A

const TWO_PIN_TYPES = new Set(["resistor", "capacitor", "led", "battery", "switch", "potentiometer", "crystal", "buzzer"]);

const SHADOW = {
  soft: { shadowColor: "rgba(0,0,0,0.35)", shadowBlur: 5, shadowOffset: { x: 1, y: 2 }, shadowOpacity: 0.7 },
  medium: { shadowColor: "rgba(0,0,0,0.45)", shadowBlur: 8, shadowOffset: { x: 2, y: 3 }, shadowOpacity: 0.75 },
  wire: { shadowColor: "rgba(0,0,0,0.4)", shadowBlur: 3, shadowOffset: { x: 0, y: 1.5 }, shadowOpacity: 0.55 },
} as const;

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const ROW_DEFS: { key: string; gapBefore: number; isRail?: boolean }[] = [
  { key: "RAILT_PLUS", gapBefore: 0, isRail: true },
  { key: "RAILT_MINUS", gapBefore: HOLE, isRail: true },
  { key: "A", gapBefore: 22 },
  { key: "B", gapBefore: HOLE },
  { key: "C", gapBefore: HOLE },
  { key: "D", gapBefore: HOLE },
  { key: "E", gapBefore: HOLE },
  { key: "F", gapBefore: 24 },
  { key: "G", gapBefore: HOLE },
  { key: "H", gapBefore: HOLE },
  { key: "I", gapBefore: HOLE },
  { key: "J", gapBefore: HOLE },
  { key: "RAILB_MINUS", gapBefore: 22, isRail: true },
  { key: "RAILB_PLUS", gapBefore: HOLE, isRail: true },
];
const MAIN_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function colX(col: number) {
  return MARGIN_LEFT + col * HOLE;
}

interface PinLayout {
  pinId: string;
  x: number;
  y: number;
  net: string;
}

// Cable curvo tipo jumper: arquea hacia arriba, altura proporcional a la distancia
function CurvedWire({ x1, y1, x2, y2, color, laneOffset, maxRise }: { x1: number; y1: number; x2: number; y2: number; color: string; laneOffset: number; maxRise: number }) {
  const dist = Math.abs(x2 - x1);
  const rawHeight = Math.min(Math.max(dist * 0.28, 14), 55) + laneOffset;
  const arcHeight = Math.min(rawHeight, maxRise);
  const midX = (x1 + x2) / 2;
  const controlY = Math.min(y1, y2) - arcHeight;

  return (
    <Group>
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(midX, controlY, x2, y2);
          ctx.strokeShape(shape);
        }}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={2.4}
        opacity={0.5}
        lineCap="round"
        {...SHADOW.wire}
      />
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(midX, controlY, x2, y2);
          ctx.strokeShape(shape);
        }}
        stroke={color}
        strokeWidth={2}
        opacity={0.92}
        lineCap="round"
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={2}
        shadowOffset={{ x: 0, y: 1 }}
        shadowOpacity={0.4}
      />
    </Group>
  );
}

export default function ProtoboardView({ circuit }: { circuit: Circuit }) {
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clamped = Math.min(Math.max(newScale, 0.3), 3);
    setScale(clamped);
    setStagePos({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    });
  }

  const { rowY, pinLayouts, componentGroups, netColorMap } = useMemo(() => {
    let y = 0;
    const rowYmap: Record<string, number> = {};
    for (const def of ROW_DEFS) {
      y += def.gapBefore;
      rowYmap[def.key] = y;
    }

    const placements = assignBreadboardLayout(circuit);
    const pinMap: Record<string, PinLayout> = {};

    for (const [pinId, p] of Object.entries(placements)) {
      pinMap[pinId] = {
        pinId,
        x: colX(p.col),
        y: rowYmap[p.row],
        net: p.net,
      };
    }

    const groups = circuit.components.map((c) => ({
      component: c,
      pins: c.pins.map((p) => pinMap[p.id]).filter(Boolean),
    }));

    return {
      rowY: rowYmap,
      pinLayouts: pinMap,
      componentGroups: groups,
      netColorMap: buildNetColorMap(circuit.nets),
    };
  }, [circuit]);

  const boardWidth = colX(BOARD_COLS + 1);
  const boardHeight = rowY["RAILB_PLUS"] + 24;
  const shiftedRowY: Record<string, number> = {};
  for (const k in rowY) shiftedRowY[k] = rowY[k] + TOP_MARGIN;

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "radial-gradient(ellipse at 50% 30%, #3a3a3a 0%, #1e1e1e 70%)", position: "relative" }}>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 5, background: "#3a3a3a", padding: "4px 10px", borderRadius: 6, fontSize: 11, color: "#e9ecef", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
        🖱️ Scroll para zoom · Arrastrá para mover
      </div>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight - 120}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onWheel={handleWheel}
        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
      >
        <Layer>
          <Rect
            x={0}
            y={TOP_MARGIN}
            width={boardWidth}
            height={boardHeight}
            cornerRadius={8}
            fillLinearGradientStartPoint={{ x: 0, y: TOP_MARGIN }}
            fillLinearGradientEndPoint={{ x: 0, y: TOP_MARGIN + boardHeight }}
            fillLinearGradientColorStops={[0, "#faf6ee", 0.45, "#f5f0e6", 1, "#e3dcc8"]}
            stroke="#b8b09a"
            strokeWidth={1}
            {...SHADOW.medium}
          />
          <Rect
            x={2}
            y={TOP_MARGIN + 2}
            width={boardWidth - 4}
            height={boardHeight - 4}
            cornerRadius={6}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1}
          />

          <Line points={[MARGIN_LEFT - 10, shiftedRowY["RAILT_PLUS"], boardWidth - 20, shiftedRowY["RAILT_PLUS"]]} stroke="#c92a2a" strokeWidth={3} opacity={0.9} shadowColor="rgba(0,0,0,0.3)" shadowBlur={2} shadowOffset={{ x: 0, y: 1 }} />
          <Line points={[MARGIN_LEFT - 10, shiftedRowY["RAILT_MINUS"], boardWidth - 20, shiftedRowY["RAILT_MINUS"]]} stroke="#1864ab" strokeWidth={3} opacity={0.9} shadowColor="rgba(0,0,0,0.3)" shadowBlur={2} shadowOffset={{ x: 0, y: 1 }} />
          <Line points={[MARGIN_LEFT - 10, shiftedRowY["RAILB_MINUS"], boardWidth - 20, shiftedRowY["RAILB_MINUS"]]} stroke="#1864ab" strokeWidth={3} opacity={0.9} shadowColor="rgba(0,0,0,0.3)" shadowBlur={2} shadowOffset={{ x: 0, y: 1 }} />
          <Line points={[MARGIN_LEFT - 10, shiftedRowY["RAILB_PLUS"], boardWidth - 20, shiftedRowY["RAILB_PLUS"]]} stroke="#c92a2a" strokeWidth={3} opacity={0.9} shadowColor="rgba(0,0,0,0.3)" shadowBlur={2} shadowOffset={{ x: 0, y: 1 }} />
          <Text x={8} y={shiftedRowY["RAILT_PLUS"] - 5} text="+" fontSize={12} fill="#e03131" fontStyle="bold" />
          <Text x={8} y={shiftedRowY["RAILT_MINUS"] - 5} text="-" fontSize={12} fill="#1864ab" fontStyle="bold" />
          <Text x={8} y={shiftedRowY["RAILB_MINUS"] - 5} text="-" fontSize={12} fill="#1864ab" fontStyle="bold" />
          <Text x={8} y={shiftedRowY["RAILB_PLUS"] - 5} text="+" fontSize={12} fill="#e03131" fontStyle="bold" />

          {ROW_DEFS.map((def) => {
            const isMain = MAIN_ROWS.includes(def.key);
            return (
              <Group key={def.key}>
                {isMain && <Text x={12} y={shiftedRowY[def.key] - 5} text={def.key} fontSize={10} fill="#868e96" />}
                {Array.from({ length: BOARD_COLS }).map((_, i) => (
                  <Group key={i}>
                    <Circle x={colX(i + 1)} y={shiftedRowY[def.key] + 0.5} radius={2.2} fill="rgba(0,0,0,0.12)" />
                    <Circle x={colX(i + 1)} y={shiftedRowY[def.key]} radius={2} fill={def.isRail ? "#9a9590" : "#7a7570"} />
                    <Circle x={colX(i + 1)} y={shiftedRowY[def.key] - 0.3} radius={0.8} fill="#3d3a36" />
                  </Group>
                ))}
              </Group>
            );
          })}

          <Rect
            x={0}
            y={(shiftedRowY["E"] + shiftedRowY["F"]) / 2 - 4}
            width={boardWidth}
            height={8}
            fillLinearGradientStartPoint={{ x: 0, y: (shiftedRowY["E"] + shiftedRowY["F"]) / 2 - 4 }}
            fillLinearGradientEndPoint={{ x: 0, y: (shiftedRowY["E"] + shiftedRowY["F"]) / 2 + 4 }}
            fillLinearGradientColorStops={[0, "#c9c2a8", 0.5, "#d8d3c0", 1, "#c9c2a8"]}
          />

          {componentGroups.map(({ component, pins }) => (
            <ComponentGlyph key={component.id} component={component} pins={pins.map((p) => ({ ...p, y: p.y + TOP_MARGIN }))} />
          ))}

          {[...circuit.nets]
            .map((net) => ({ net, points: net.connected_pins.map((pid) => pinLayouts[pid]).filter(Boolean) }))
            .filter((n) => n.points.length >= 2)
            .sort((a, b) => Math.min(...a.points.map((p) => p.x)) - Math.min(...b.points.map((p) => p.x)))
            .map(({ net, points }, netIdx) => {
            const color = resolveNetColor(net.id, netColorMap);
            const laneOffset = (netIdx % 10) * 9;
            const wires: ReactElement[] = [];
            for (let i = 0; i < points.length - 1; i++) {
              const a = points[i];
              const b = points[i + 1];
              wires.push(
                <CurvedWire
                  key={`${net.id}-${i}`}
                  x1={a.x} y1={a.y + TOP_MARGIN}
                  x2={b.x} y2={b.y + TOP_MARGIN}
                  color={color}
                  laneOffset={laneOffset}
                  maxRise={TOP_MARGIN - 15}
                />
              );
            }
            return (
              <Group key={net.id}>
                {wires}
                {points.map((p) => (
                  <Circle
                    key={p.pinId}
                    x={p.x}
                    y={p.y + TOP_MARGIN}
                    radius={3}
                    fill={color}
                    stroke={darken(color.startsWith("#") ? color : "#5c5f66", 30)}
                    strokeWidth={0.5}
                    {...SHADOW.soft}
                  />
                ))}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

function ComponentGlyph({ component, pins }: { component: Component; pins: { x: number; y: number }[] }) {
  if (pins.length === 0) return null;

  if (component.type === "microcontroller" && pins.length > 2) {
    const half = Math.ceil(pins.length / 2);
    const top = pins.slice(0, half);
    const bot = pins.slice(half);
    const x0 = Math.min(...pins.map((p) => p.x)) - 10;
    const x1 = Math.max(...pins.map((p) => p.x)) + 10;
    const yTop = top[0].y - 6;
    const yBot = bot[0].y + 6;
    return (
      <Group>
        <Rect
          x={x0}
          y={yTop}
          width={x1 - x0}
          height={yBot - yTop}
          cornerRadius={3}
          fillLinearGradientStartPoint={{ x: x0, y: yTop }}
          fillLinearGradientEndPoint={{ x: x0, y: yBot }}
          fillLinearGradientColorStops={[0, "#4a4a4a", 0.4, "#2b2b2b", 1, "#1a1a1a"]}
          stroke="#111"
          strokeWidth={0.5}
          {...SHADOW.medium}
        />
        <Rect x={x0 + 2} y={yTop + 2} width={x1 - x0 - 4} height={3} cornerRadius={1} fill="rgba(255,255,255,0.08)" />
        <Circle x={x0 + 8} y={yTop + 8} radius={2.5} fill="#dee2e6" shadowColor="rgba(0,0,0,0.5)" shadowBlur={2} shadowOffset={{ x: 0, y: 1 }} />
        <Text x={x0 + 6} y={(yTop + yBot) / 2 - 5} text={component.id} fontSize={9} fill="#f8f9fa" fontStyle="bold" />
        {top.map((p, i) => <Line key={i} points={[p.x, p.y, p.x, yTop]} stroke="#8a8478" strokeWidth={1.8} lineCap="round" />)}
        {bot.map((p, i) => <Line key={i} points={[p.x, p.y, p.x, yBot]} stroke="#8a8478" strokeWidth={1.8} lineCap="round" />)}
      </Group>
    );
  }

  if (pins.length === 2 && TWO_PIN_TYPES.has(component.type)) {
    const [a, b] = pins;
    const midY = a.y;
    const colors: Record<string, string> = {
      resistor: "#d9b382", capacitor: "#4263eb", battery: "#212529",
      switch: "#495057", crystal: "#adb5bd", buzzer: "#495057",
    };
    const ledColorMap: Record<string, string> = { red: "#e03131", green: "#2b8a3e", yellow: "#f08c00", blue: "#1864ab" };
    let fill = colors[component.type] || "#868e96";
    if (component.type === "led") {
      const key = (component.subtype || component.value || component.label || "").toLowerCase();
      const found = Object.keys(ledColorMap).find((k) => key.includes(k));
      fill = found ? ledColorMap[found] : "#e03131";
    }
    const w = Math.abs(b.x - a.x);
    const x0 = Math.min(a.x, b.x);
    const bodyX = x0 + w * 0.15;
    const bodyW = Math.max(w * 0.7, 6);
    const cx = (a.x + b.x) / 2;
    return (
      <Group>
        <Line points={[a.x, a.y, b.x, b.y]} stroke="#adb5bd" strokeWidth={2} lineCap="round" shadowColor="rgba(0,0,0,0.2)" shadowBlur={1} shadowOffset={{ x: 0, y: 1 }} />
        {component.type === "led" ? (
          <Group>
            <Circle x={cx} y={midY + 1.5} radius={7} fill="rgba(0,0,0,0.15)" />
            <Circle
              x={cx}
              y={midY}
              radius={7}
              fillRadialGradientStartPoint={{ x: cx - 2, y: midY - 3 }}
              fillRadialGradientEndPoint={{ x: cx, y: midY }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={8}
              fillRadialGradientColorStops={[0, lighten(fill, 60), 0.55, fill, 1, darken(fill, 40)]}
              stroke={darken(fill, 50)}
              strokeWidth={0.8}
              {...SHADOW.soft}
            />
            <Circle x={cx - 2} y={midY - 2} radius={2} fill="rgba(255,255,255,0.45)" />
          </Group>
        ) : (
          <Rect
            x={bodyX}
            y={midY - 5}
            width={bodyW}
            height={10}
            cornerRadius={3}
            fillLinearGradientStartPoint={{ x: bodyX, y: midY - 5 }}
            fillLinearGradientEndPoint={{ x: bodyX, y: midY + 5 }}
            fillLinearGradientColorStops={[0, lighten(fill, 25), 0.5, fill, 1, darken(fill, 30)]}
            stroke={darken(fill, 40)}
            strokeWidth={0.8}
            {...SHADOW.soft}
          />
        )}
        <Text x={x0} y={component.type === "led" ? midY - 22 : midY + 14} text={component.id} fontSize={8} fill="#1a1a1a" fontStyle="bold" />
        {component.value && (
          <Text x={x0} y={component.type === "led" ? midY - 22 + 10 : midY + 14 + 10} text={String(component.value)} fontSize={6} fill="#495057" />
        )}
      </Group>
    );
  }

  const x0 = Math.min(...pins.map((p) => p.x)) - 6;
  const x1 = Math.max(...pins.map((p) => p.x)) + 6;
  const y0 = pins[0].y - 26;
  return (
    <Group>
      <Rect
        x={x0}
        y={y0}
        width={x1 - x0}
        height={22}
        cornerRadius={3}
        fillLinearGradientStartPoint={{ x: x0, y: y0 }}
        fillLinearGradientEndPoint={{ x: x0, y: y0 + 22 }}
        fillLinearGradientColorStops={[0, "#40c057", 0.5, "#2f9e44", 1, "#237032"]}
        stroke="#1a1a1a"
        strokeWidth={0.8}
        {...SHADOW.soft}
      />
      <Text x={x0 + 4} y={y0 + 4} text={component.id} fontSize={8} fill="#fff" fontStyle="bold" />
      {pins.map((p, i) => <Line key={i} points={[p.x, p.y, p.x, y0 + 22]} stroke="#495057" strokeWidth={1.8} lineCap="round" />)}
    </Group>
  );
}

import { Handle, Position } from "@xyflow/react";
import type { Component } from "../types";

const STROKE = "#1a1a1a";
const BODY_FILL = "#d8d3a0";
const BODY_BORDER = "#7a1f1f";
const REF_COLOR = "#000000";
const VALUE_COLOR = "#7a1f1f";
const PIN_NUM_COLOR = "#c92a2a";

function ResistorSymbol() {
  return (
    <svg width="70" height="24" viewBox="0 0 70 24">
      <line x1="0" y1="12" x2="14" y2="12" stroke={STROKE} strokeWidth="1.5" />
      <polyline points="14,12 19,4 26,20 33,4 40,20 47,4 54,20 56,12" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <line x1="56" y1="12" x2="70" y2="12" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}

function CapacitorSymbol() {
  return (
    <svg width="70" height="24" viewBox="0 0 70 24">
      <line x1="0" y1="12" x2="30" y2="12" stroke={STROKE} strokeWidth="1.5" />
      <line x1="30" y1="2" x2="30" y2="22" stroke={STROKE} strokeWidth="2" />
      <line x1="40" y1="2" x2="40" y2="22" stroke={STROKE} strokeWidth="2" />
      <line x1="40" y1="12" x2="70" y2="12" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}

function LedSymbol() {
  return (
    <svg width="70" height="30" viewBox="0 0 70 30">
      <line x1="0" y1="15" x2="26" y2="15" stroke={STROKE} strokeWidth="1.5" />
      <polygon points="26,4 26,26 46,15" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <line x1="46" y1="4" x2="46" y2="26" stroke={STROKE} strokeWidth="2" />
      <line x1="46" y1="15" x2="70" y2="15" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}

function BatterySymbol() {
  return (
    <svg width="70" height="30" viewBox="0 0 70 30">
      <line x1="0" y1="15" x2="28" y2="15" stroke={STROKE} strokeWidth="1.5" />
      <line x1="28" y1="4" x2="28" y2="26" stroke={STROKE} strokeWidth="2.5" />
      <line x1="35" y1="9" x2="35" y2="21" stroke={STROKE} strokeWidth="1" />
      <line x1="42" y1="4" x2="42" y2="26" stroke={STROKE} strokeWidth="2.5" />
      <line x1="49" y1="9" x2="49" y2="21" stroke={STROKE} strokeWidth="1" />
      <line x1="49" y1="15" x2="70" y2="15" stroke={STROKE} strokeWidth="1.5" />
      <text x="18" y="6" fontSize="9" fill={STROKE}>+</text>
      <text x="54" y="6" fontSize="9" fill={STROKE}>-</text>
    </svg>
  );
}

function SwitchSymbol() {
  return (
    <svg width="70" height="24" viewBox="0 0 70 24">
      <line x1="0" y1="16" x2="20" y2="16" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="22" cy="16" r="2" fill={STROKE} />
      <line x1="24" y1="15" x2="50" y2="6" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="48" cy="16" r="2" fill={STROKE} />
      <line x1="50" y1="16" x2="70" y2="16" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}


function CrystalSymbol() {
  return (
    <svg width="70" height="24" viewBox="0 0 70 24">
      <line x1="0" y1="12" x2="26" y2="12" stroke={STROKE} strokeWidth="1.5" />
      <rect x="26" y="3" width="18" height="18" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <line x1="22" y1="4" x2="22" y2="20" stroke={STROKE} strokeWidth="1.5" />
      <line x1="48" y1="4" x2="48" y2="20" stroke={STROKE} strokeWidth="1.5" />
      <line x1="44" y1="12" x2="70" y2="12" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}

const TWO_PIN_SYMBOLS: Record<string, () => JSX.Element> = {
  resistor: ResistorSymbol,
  capacitor: CapacitorSymbol,
  led: LedSymbol,
  battery: BatterySymbol,
  switch: SwitchSymbol,
  potentiometer: ResistorSymbol,
  crystal: CrystalSymbol,
};

function PinHandles({ pinId, position }: { pinId: string; position: Position }) {
  return (
    <>
      <Handle type="source" position={position} id={pinId} style={{ background: "#1864ab", border: `1px solid ${STROKE}`, width: 6, height: 6 }} />
      <Handle type="target" position={position} id={pinId} style={{ background: "#1864ab", border: `1px solid ${STROKE}`, width: 6, height: 6, opacity: 0 }} />
    </>
  );
}

export default function CircuitNode({ data }: { data: { component: Component } }) {
  const c = data.component;
  const isTwoPin = c.pins.length === 2 && TWO_PIN_SYMBOLS[c.type];

  if (isTwoPin) {
    const Symbol = TWO_PIN_SYMBOLS[c.type];
    const [p1, p2] = c.pins;
    return (
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: REF_COLOR, fontFamily: "sans-serif" }}>{c.id}</div>
        {c.value && <div style={{ fontSize: 10, color: VALUE_COLOR, fontFamily: "sans-serif" }}>{c.value}</div>}
        <div style={{ position: "relative" }}>
          <Symbol />
          <div style={{ position: "absolute", left: -4, top: -10, fontSize: 8, color: PIN_NUM_COLOR }}>1</div>
          <div style={{ position: "absolute", right: -4, top: -10, fontSize: 8, color: PIN_NUM_COLOR }}>2</div>
          <div style={{ position: "absolute", left: 0, top: "50%" }}>
            <PinHandles pinId={p1.id} position={Position.Left} />
          </div>
          <div style={{ position: "absolute", right: 0, top: "50%" }}>
            <PinHandles pinId={p2.id} position={Position.Right} />
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#495057", fontFamily: "sans-serif" }}>{c.label}</div>
      </div>
    );
  }

  const pins = c.pins;
  const mid = Math.ceil(pins.length / 2);
  const leftPins = pins.slice(0, mid);
  const rightPins = pins.slice(mid);
  const rowH = 20;
  const bodyH = Math.max(leftPins.length, rightPins.length) * rowH + 16;

  return (
    <div
      style={{
        border: `1.5px solid ${BODY_BORDER}`,
        background: BODY_FILL,
        color: "#1a1a1a",
        minWidth: 200,
        fontFamily: "monospace",
        boxShadow: "1px 1px 3px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ textAlign: "center", padding: "3px 4px", borderBottom: `1px solid ${BODY_BORDER}` }}>
        <span style={{ fontWeight: 700, color: REF_COLOR, fontSize: 12, fontFamily: "sans-serif" }}>{c.id}</span>
        {c.board && <span style={{ fontSize: 10, marginLeft: 6, color: VALUE_COLOR }}>{c.board}</span>}
        {c.subtype && <span style={{ fontSize: 10, marginLeft: 6, color: VALUE_COLOR }}>{c.subtype}</span>}
        {c.value && <div style={{ fontSize: 9, color: VALUE_COLOR }}>{c.value}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", minHeight: bodyH }}>
        <div>
          {leftPins.map((p, idx) => {
            const pinName = p.id.split(".").slice(1).join(".");
            return (
              <div key={p.id} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", paddingLeft: 14, fontSize: 10, gap: 4 }}>
                <PinHandles pinId={p.id} position={Position.Left} />
                <span style={{ color: PIN_NUM_COLOR, fontSize: 8, minWidth: 10 }}>{idx + 1}</span>
                <span>{pinName}</span>
              </div>
            );
          })}
        </div>
        <div>
          {rightPins.map((p, idx) => {
            const pinName = p.id.split(".").slice(1).join(".");
            return (
              <div key={p.id} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 14, fontSize: 10, gap: 4 }}>
                <span>{pinName}</span>
                <span style={{ color: PIN_NUM_COLOR, fontSize: 8, minWidth: 10, textAlign: "right" }}>{leftPins.length + idx + 1}</span>
                <PinHandles pinId={p.id} position={Position.Right} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 9, color: "#495057", borderTop: `1px solid #a89968`, padding: "1px 4px", fontFamily: "sans-serif" }}>
        {c.label}
      </div>
    </div>
  );
}

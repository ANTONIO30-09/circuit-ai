import { Handle, Position } from "@xyflow/react";
import type { Component } from "../types";

const TYPE_COLORS: Record<string, string> = {
  microcontroller: "#4c6ef5",
  battery: "#f03e3e",
  led: "#fab005",
  resistor: "#495057",
  capacitor: "#495057",
  switch: "#495057",
  sensor_analog: "#12b886",
  sensor_digital: "#12b886",
  lcd_i2c: "#7048e8",
  keypad_matrix: "#7048e8",
  servo: "#e64980",
  relay: "#e64980",
  buzzer: "#e64980",
};

function PinHandles({ pinId, position, color }: { pinId: string; position: Position; color: string }) {
  return (
    <>
      <Handle
        type="source"
        position={position}
        id={pinId}
        style={{ background: color, top: "50%" }}
      />
      <Handle
        type="target"
        position={position}
        id={pinId}
        style={{ background: color, top: "50%", opacity: 0 }}
      />
    </>
  );
}

export default function CircuitNode({ data }: { data: { component: Component } }) {
  const c = data.component;
  const color = TYPE_COLORS[c.type] || "#868e96";
  const pins = c.pins;
  const mid = Math.ceil(pins.length / 2);
  const leftPins = pins.slice(0, mid);
  const rightPins = pins.slice(mid);

  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 8,
        background: "#1a1b1e",
        color: "#f8f9fa",
        minWidth: 160,
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      <div
        style={{
          background: color,
          color: "#000",
          padding: "4px 8px",
          fontWeight: 700,
          borderRadius: "6px 6px 0 0",
        }}
      >
        {c.id} {c.board ? `(${c.board})` : ""} {c.subtype ? `(${c.subtype})` : ""}
      </div>
      <div style={{ padding: "6px 8px" }}>
        <div>{c.label || c.type}</div>
        {c.value && <div style={{ opacity: 0.7 }}>{c.value}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          {leftPins.map((p) => {
            const pinName = p.id.split(".").slice(1).join(".");
            return (
              <div key={p.id} style={{ position: "relative", padding: "2px 6px" }}>
                <PinHandles pinId={p.id} position={Position.Left} color={color} />
                {pinName}
              </div>
            );
          })}
        </div>
        <div>
          {rightPins.map((p) => {
            const pinName = p.id.split(".").slice(1).join(".");
            return (
              <div key={p.id} style={{ position: "relative", padding: "2px 6px", textAlign: "right" }}>
                <PinHandles pinId={p.id} position={Position.Right} color={color} />
                {pinName}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

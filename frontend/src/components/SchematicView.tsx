import { useMemo } from "react";
import Dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Circuit } from "../types";
import CircuitNode from "./CircuitNode";

const nodeTypes = { circuitNode: CircuitNode };

const NET_COLORS: Record<string, string> = {
  red: "#c92a2a",
  black: "#212529",
  orange: "#e8590c",
  yellow: "#f08c00",
  green: "#2b8a3e",
  blue: "#1864ab",
};

function resolveColor(hint?: string | null): string {
  if (!hint) return "#37474f";
  if (hint.startsWith("#")) return hint;
  return NET_COLORS[hint.toLowerCase()] || "#37474f";
}

function estimateNodeSize(pinCount: number, isTwoPin: boolean) {
  if (isTwoPin) return { width: 90, height: 70 };
  const rows = Math.ceil(pinCount / 2);
  return { width: 210, height: Math.max(rows * 20 + 50, 90) };
}

function layoutWithDagre(circuit: Circuit) {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 70, ranksep: 130 });
  g.setDefaultEdgeLabel(() => ({}));

  const TWO_PIN_TYPES = new Set(["resistor", "capacitor", "led", "battery", "switch", "potentiometer"]);

  for (const c of circuit.components) {
    const isTwoPin = c.pins.length === 2 && TWO_PIN_TYPES.has(c.type);
    const { width, height } = estimateNodeSize(c.pins.length, isTwoPin);
    g.setNode(c.id, { width, height });
  }

  const edgePairs: { source: string; target: string }[] = [];
  for (const net of circuit.nets) {
    for (let i = 0; i < net.connected_pins.length - 1; i++) {
      const s = net.connected_pins[i].split(".")[0];
      const t = net.connected_pins[i + 1].split(".")[0];
      if (s !== t) {
        g.setEdge(s, t);
        edgePairs.push({ source: s, target: t });
      }
    }
  }

  Dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const c of circuit.components) {
    const pos = g.node(c.id);
    positions[c.id] = { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 };
  }
  return positions;
}

export default function SchematicView({ circuit }: { circuit: Circuit }) {
  const nodes: Node[] = useMemo(() => {
    const positions = layoutWithDagre(circuit);
    return circuit.components.map((c) => ({
      id: c.id,
      type: "circuitNode",
      position: positions[c.id] || { x: 0, y: 0 },
      data: { component: c },
    }));
  }, [circuit]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    for (const net of circuit.nets) {
      for (let i = 0; i < net.connected_pins.length - 1; i++) {
        const sourcePin = net.connected_pins[i];
        const targetPin = net.connected_pins[i + 1];
        const sourceComp = sourcePin.split(".")[0];
        const targetComp = targetPin.split(".")[0];
        const color = resolveColor(net.color_hint);
        result.push({
          id: `${net.id}-${i}`,
          source: sourceComp,
          sourceHandle: sourcePin,
          target: targetComp,
          targetHandle: targetPin,
          type: "smoothstep",
          label: i === 0 ? net.id : undefined,
          style: { stroke: color, strokeWidth: 1.3 },
          labelStyle: { fill: "#1a1a1a", fontSize: 8, fontFamily: "monospace" },
          labelBgStyle: { fill: "#d8d3a0", fillOpacity: 0.8 },
        });
      }
    }
    return result;
  }, [circuit]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#c7c294" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 0.85 }}
      >
        <Background variant={BackgroundVariant.Lines} color="#b3ae80" gap={20} size={0.5} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

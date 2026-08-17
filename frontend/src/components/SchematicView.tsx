import { useEffect, useMemo, useState } from "react";
import Dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Circuit } from "../types";
import CircuitNode from "./CircuitNode";
import { buildNetColorMap, resolveNetColor } from "../utils/netColors";

const nodeTypes = { circuitNode: CircuitNode };

function estimateNodeSize(pinCount: number, isTwoPin: boolean) {
  if (isTwoPin) return { width: 90, height: 70 };
  const rows = Math.ceil(pinCount / 2);
  return { width: 210, height: Math.max(rows * 20 + 50, 90) };
}

function layoutWithDagre(circuit: Circuit) {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 90, ranksep: 160, ranker: "tight-tree" });
  g.setDefaultEdgeLabel(() => ({}));

  const TWO_PIN_TYPES = new Set(["resistor", "capacitor", "led", "battery", "switch", "potentiometer", "crystal"]);

  for (const c of circuit.components) {
    const isTwoPin = c.pins.length === 2 && TWO_PIN_TYPES.has(c.type);
    const { width, height } = estimateNodeSize(c.pins.length, isTwoPin);
    g.setNode(c.id, { width, height });
  }

  for (const net of circuit.nets) {
    for (let i = 0; i < net.connected_pins.length - 1; i++) {
      const s = net.connected_pins[i].split(".")[0];
      const t = net.connected_pins[i + 1].split(".")[0];
      if (s !== t) {
        g.setEdge(s, t);
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
  const initialNodes: Node[] = useMemo(() => {
    const positions = layoutWithDagre(circuit);
    return circuit.components.map((c) => ({
      id: c.id,
      type: "circuitNode",
      position: positions[c.id] || { x: 0, y: 0 },
      data: { component: c },
    }));
  }, [circuit]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  function onNodesChange(changes: NodeChange[]) {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }

  const netColorMap = useMemo(() => buildNetColorMap(circuit.nets), [circuit.nets]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    for (const net of circuit.nets) {
      for (let i = 0; i < net.connected_pins.length - 1; i++) {
        const sourcePin = net.connected_pins[i];
        const targetPin = net.connected_pins[i + 1];
        const sourceComp = sourcePin.split(".")[0];
        const targetComp = targetPin.split(".")[0];
        const color = resolveNetColor(net.id, netColorMap);
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
  }, [circuit, netColorMap]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#c7c294" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 0.85 }}
      >
        <Background variant={BackgroundVariant.Lines} color="#b3ae80" gap={20} size={0.5} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

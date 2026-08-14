import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Circuit } from "../types";
import CircuitNode from "./CircuitNode";

const nodeTypes = { circuitNode: CircuitNode };

const COL_WIDTH = 320;
const ROW_HEIGHT = 260;
const COLS = 4;

export default function SchematicView({ circuit }: { circuit: Circuit }) {
  const nodes: Node[] = useMemo(
    () =>
      circuit.components.map((c, i) => ({
        id: c.id,
        type: "circuitNode",
        position: {
          x: (i % COLS) * COL_WIDTH,
          y: Math.floor(i / COLS) * ROW_HEIGHT,
        },
        data: { component: c },
      })),
    [circuit]
  );

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    for (const net of circuit.nets) {
      for (let i = 0; i < net.connected_pins.length - 1; i++) {
        const sourcePin = net.connected_pins[i];
        const targetPin = net.connected_pins[i + 1];
        const sourceComp = sourcePin.split(".")[0];
        const targetComp = targetPin.split(".")[0];
        result.push({
          id: `${net.id}-${i}`,
          source: sourceComp,
          sourceHandle: sourcePin,
          target: targetComp,
          targetHandle: targetPin,
          label: net.id,
          style: { stroke: net.color_hint || "#868e96", strokeWidth: 2 },
          labelStyle: { fill: "#f8f9fa", fontSize: 10 },
          labelBgStyle: { fill: "#1a1b1e" },
        });
      }
    }
    return result;
  }, [circuit]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background color="#333" />
        <Controls />
      </ReactFlow>
    </div>
  );
}

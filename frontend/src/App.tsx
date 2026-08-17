import { useState } from "react";
import { generateCircuit } from "./api/generateCircuit";
import SchematicView from "./components/SchematicView";
import ProtoboardView from "./components/ProtoboardView";
import type { Circuit } from "./types";

export default function App() {
  const [text, setText] = useState("");
  const [circuit, setCircuit] = useState<Circuit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"schematic" | "protoboard">("schematic");

  async function handleGenerate() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateCircuit(text);
      setCircuit(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#f8f9fa", color: "#1a1a1a", overflow: "hidden" }}>
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #dee2e6", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0, color: "#1864ab", fontSize: 18, whiteSpace: "nowrap" }}>circuit-ai</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describí el ejercicio de electrónica..."
            rows={1}
            style={{ flex: 1, background: "#fff", color: "#1a1a1a", border: "1px solid #ced4da", borderRadius: 6, padding: "6px 8px", fontFamily: "inherit", resize: "none" }}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ padding: "6px 20px", borderRadius: 6, border: "none", background: loading ? "#adb5bd" : "#1864ab", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
        {circuit && (
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            <button
              onClick={() => setView("schematic")}
              style={{ padding: "4px 14px", borderRadius: 6, border: "1px solid #1864ab", background: view === "schematic" ? "#1864ab" : "#fff", color: view === "schematic" ? "#fff" : "#1864ab", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              Esquemático
            </button>
            <button
              onClick={() => setView("protoboard")}
              style={{ padding: "4px 14px", borderRadius: 6, border: "1px solid #1864ab", background: view === "protoboard" ? "#1864ab" : "#fff", color: view === "protoboard" ? "#fff" : "#1864ab", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              Protoboard
            </button>
          </div>
        )}
        {error && <div style={{ color: "#e03131", marginTop: 6, fontSize: 13 }}>{error}</div>}
        {circuit?.warnings && circuit.warnings.length > 0 && (
          <div style={{ color: "#e8590c", marginTop: 6, fontSize: 12 }}>
            {circuit.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {circuit ? (
          view === "schematic" ? <SchematicView circuit={circuit} /> : <ProtoboardView circuit={circuit} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
            Ingresá un ejercicio y generá el circuito
          </div>
        )}
      </div>
    </div>
  );
}

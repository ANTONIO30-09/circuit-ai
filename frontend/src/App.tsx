import { useState } from "react";
import { generateCircuit } from "./api/generateCircuit";
import SchematicView from "./components/SchematicView";
import type { Circuit } from "./types";

export default function App() {
  const [text, setText] = useState("");
  const [circuit, setCircuit] = useState<Circuit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0f0f10",
        color: "#f8f9fa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ padding: 16, borderBottom: "1px solid #333" }}>
        <h2 style={{ margin: "0 0 12px 0" }}>circuit-ai</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describí el ejercicio de electrónica..."
            rows={3}
            style={{
              flex: 1,
              background: "#1a1b1e",
              color: "#f8f9fa",
              border: "1px solid #333",
              borderRadius: 6,
              padding: 8,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: "0 20px",
              borderRadius: 6,
              border: "none",
              background: loading ? "#495057" : "#4c6ef5",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
        {error && <div style={{ color: "#f03e3e", marginTop: 8 }}>{error}</div>}
        {circuit?.warnings && circuit.warnings.length > 0 && (
          <div style={{ color: "#fab005", marginTop: 8, fontSize: 13 }}>
            {circuit.warnings.map((w, i) => (
              <div key={i}>⚠ {w}</div>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        {circuit ? (
          <SchematicView circuit={circuit} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
            Ingresá un ejercicio y generá el circuito
          </div>
        )}
      </div>
    </div>
  );
}

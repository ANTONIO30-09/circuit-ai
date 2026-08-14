import type { Circuit } from "../types";

const API_URL = "http://localhost:8000";

export async function generateCircuit(text: string): Promise<Circuit> {
  const res = await fetch(`${API_URL}/generate-circuit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error generando el circuito");
  }

  return res.json();
}

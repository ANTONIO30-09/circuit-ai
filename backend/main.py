import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from google.genai.errors import ServerError
from dotenv import load_dotenv
from schema import Circuit
from system_prompt import SYSTEM_PROMPT

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL = "gemini-flash-lite-latest"

class ExerciseInput(BaseModel):
    text: str

def call_gemini_with_backoff(prompt: str, max_retries: int = 3) -> dict:
    last_error = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=Circuit,
                    temperature=0.2,
                ),
            )
            return response.parsed
        except ServerError as e:
            last_error = e
            wait = 2 ** attempt
            time.sleep(wait)
    raise last_error

@app.post("/generate-circuit")
def generate_circuit(payload: ExerciseInput):
    try:
        circuit = call_gemini_with_backoff(payload.text)
        if circuit is None:
            raise ValueError("Respuesta vacía o no parseable")
    except Exception as e:
        retry_prompt = f"{payload.text}\n\nEl intento anterior falló: {e}\nCorregilo."
        try:
            circuit = call_gemini_with_backoff(retry_prompt)
            if circuit is None:
                raise ValueError("Respuesta vacía tras reintento")
        except Exception as e2:
            raise HTTPException(422, f"IA no pudo generar circuito válido: {e2}")
    return circuit.model_dump()

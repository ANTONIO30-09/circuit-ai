# circuit-ai

Generador de diagramas de circuitos electronicos a partir de descripciones en lenguaje natural, pensado para estudiantes de Ingenieria en Sistemas / Electronica sin experiencia previa en hardware.

Dado el enunciado de un ejercicio o practica de laboratorio, el sistema calcula los componentes necesarios, valida su consistencia electrica y genera una representacion estructurada (JSON) lista para renderizar como esquematico y como diagrama de protoboard.

## Motivacion

Proyecto personal desarrollado para acompanar las practicas de la materia de Microprocesadores/Sistemas Embebidos (UNIFRANZ, 6to semestre), que incluyen circuitos con microcontroladores PIC16F877A y ESP32, sensores analogicos/digitales, displays LCD I2C, teclados matriciales y actuadores (servos, reles).

## Arquitectura

```mermaid
flowchart TD
    A["Texto del ejercicio"] --> B["FastAPI backend<br/>valida input"]
    B --> C["Gemini API<br/>(gemini-flash-latest)<br/>genera JSON estructurado"]
    C --> D["Validadores Pydantic<br/>rechaza circuitos inconsistentes:<br/>pines duplicados, nets huerfanas,<br/>pinouts invalidos"]
    D -->|"schema invalido"| C
    D -->|"schema valido"| E["JSON validado<br/>(components + nets)"]
    E --> F["Frontend React<br/>(en desarrollo)"]
    F --> G["Esquematico<br/>React Flow"]
    F --> H["Protoboard<br/>Konva.js"]
```

## Por que este diseno

El punto critico del sistema no es la IA en si, sino el **contrato de datos** entre la IA y el renderer. En vez de dejar que el modelo "invente" nombres de pines o estructuras libres, el backend define:

- Un **schema Pydantic estricto** que la IA debe cumplir (`response_schema` de la API de Gemini), evitando texto libre o markdown.
- Una **tabla fija de pinouts reales** (PIC16F877A, ESP32) contra la que se valida cada asignacion de pin, el modelo no puede inventar un pin que no exista fisicamente en la placa.
- **Validadores de consistencia electrica**: todo pin referenciado en una net debe existir, los ids de pines deben ser unicos en todo el circuito, y los componentes polarizados deben tener nombres de pin coherentes (`ANODE`/`CATHODE`, `VCC`/`GND`).
- Un **reintento automatico**: si la IA genera algo que viola el schema, el error de validacion se le devuelve como contexto y se le pide corregirlo, antes de fallar la request.

Este enfoque redujo drasticamente los errores de inconsistencia (pines duplicados, nets huerfanas) que aparecian en las primeras iteraciones del proyecto.

## Tech stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) - servidor HTTP async
- [Pydantic v2](https://docs.pydantic.dev/) - validacion de schema y reglas de negocio
- [Google Gemini API](https://ai.google.dev/) (`google-genai` SDK) - generacion del circuito via structured output, tier gratuito

**Frontend** *(en desarrollo)*
- React + Vite + TypeScript
- [React Flow](https://reactflow.dev/) - vista esquematica (nodos = componentes, edges = nets)
- [Konva.js](https://konvajs.org/) (`react-konva`) - vista de protoboard interactiva

## Componentes soportados

| Categoria | Tipos |
|---|---|
| Pasivos | `resistor`, `capacitor`, `potentiometer` |
| Fuente/control | `battery`, `switch`, `relay` |
| Salida | `led`, `buzzer`, `servo` |
| Microcontrolador | `microcontroller` (boards: `PIC16F877A`, `ESP32`, con pinout real validado) |
| Perifericos | `lcd_i2c`, `keypad_matrix` |
| Sensores | `sensor_analog` (LM35, LDR), `sensor_digital` (HC-SR04, IR, PIR) |

## Estructura del proyecto
circuit-ai/
backend/
main.py (Endpoint FastAPI + llamada a Gemini con backoff)
schema.py (Modelos Pydantic + validadores de consistencia + pinouts)
system_prompt.py (Prompt de dominio: reglas electricas y de pinout)
requirements.txt
.env.example
frontend/ (en desarrollo)
## Instalacion

### Requisitos
- Python 3.12+
- Una API key gratuita de Gemini: https://aistudio.google.com/apikey

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Editá `.env` y pegá tu `GEMINI_API_KEY`.

```bash
uvicorn main:app --reload --port 8000
```

### Probar el endpoint

```bash
curl -X POST http://localhost:8000/generate-circuit \
  -H "Content-Type: application/json" \
  -d '{"text": "Encender un LED rojo con una pila de 9V"}'
```

## Ejemplo de salida

```json
{
  "components": [
    {
      "id": "BAT1",
      "type": "battery",
      "pins": [
        {"id": "BAT1.VCC", "net": "VCC"},
        {"id": "BAT1.GND", "net": "GND"}
      ]
    }
  ],
  "nets": [
    {"id": "VCC", "connected_pins": ["BAT1.VCC", "R1.1"], "color_hint": "red"}
  ],
  "warnings": []
}
```

## Estado del proyecto

- [x] Schema y validadores de consistencia electrica
- [x] Integracion con Gemini API (structured output + reintento)
- [x] Soporte de microcontroladores (PIC16F877A, ESP32) con pinout real
- [x] Soporte de perifericos y sensores comunes de laboratorio
- [x] Validado contra 5 practicas reales del semestre
- [ ] Frontend: vista esquematica (React Flow)
- [ ] Frontend: vista de protoboard (Konva)
- [ ] Validaciones electricas adicionales (cortos, corrientes excesivas)

## Autor

Anton - Ing. en Sistemas, UNIFRANZ

from pydantic import BaseModel, model_validator
from typing import Literal, Optional

# --- Pinouts reales, fijos, no editables por la IA ---
PINOUTS = {
    "PIC16F877A": {
        "RA0","RA1","RA2","RA3","RA4","RA5",
        "RB0","RB1","RB2","RB3","RB4","RB5","RB6","RB7",
        "RC0","RC1","RC2","RC3","RC4","RC5","RC6","RC7",
        "RD0","RD1","RD2","RD3","RD4","RD5","RD6","RD7",
        "RE0","RE1","RE2",
        "VDD","VSS","MCLR","OSC1","OSC2",
    },
    "ESP32": {
        "GPIO0","GPIO2","GPIO4","GPIO5","GPIO12","GPIO13","GPIO14","GPIO15",
        "GPIO16","GPIO17","GPIO18","GPIO19","GPIO21","GPIO22","GPIO23",
        "GPIO25","GPIO26","GPIO27","GPIO32","GPIO33","GPIO34","GPIO35","GPIO36","GPIO39",
        "3V3","GND","EN",
    },
}

# --- Pines obligatorios por tipo de componente (nombres exactos) ---
FIXED_PIN_TEMPLATES = {
    "battery": {"VCC", "GND"},
    "led": {"ANODE", "CATHODE"},
    "resistor": {"1", "2"},
    "capacitor": {"1", "2"},
    "switch": {"1", "2"},
    "potentiometer": {"1", "2", "WIPER"},
    "relay": {"COIL1", "COIL2", "COM", "NO", "NC"},
    "servo": {"SIGNAL", "VCC", "GND"},
    "buzzer": {"VCC", "GND"},
    "lcd_i2c": {"VCC", "GND", "SDA", "SCL"},
    "keypad_matrix": {"ROW1", "ROW2", "ROW3", "ROW4", "COL1", "COL2", "COL3", "COL4"},
    "crystal": {"1", "2"},
}

SENSOR_ANALOG_SUBTYPES = {
    "LM35": {"VCC", "GND", "OUT"},
    "LDR": {"VCC", "GND", "OUT"},
}

SENSOR_DIGITAL_SUBTYPES = {
    "HC-SR04": {"VCC", "GND", "TRIG", "ECHO"},
    "IR": {"VCC", "GND", "OUT"},
    "PIR": {"VCC", "GND", "OUT"},
}

ComponentType = Literal[
    "resistor", "led", "capacitor", "battery", "switch", "potentiometer",
    "relay", "servo", "buzzer", "microcontroller", "lcd_i2c",
    "keypad_matrix", "sensor_analog", "sensor_digital", "wire", "ic", "crystal",
]


class Pin(BaseModel):
    id: str  # formato obligatorio: "<component_id>.<NOMBRE_PIN>"
    net: str


class BreadboardPos(BaseModel):
    row: str
    col: int


class SchematicPos(BaseModel):
    x: int
    y: int
    rotation: int


class Component(BaseModel):
    id: str
    type: ComponentType
    board: Optional[Literal["PIC16F877A", "ESP32"]] = None  # solo si type == microcontroller
    subtype: Optional[str] = None  # solo si type == sensor_analog / sensor_digital
    value: Optional[str] = None
    label: Optional[str] = None
    pins: list[Pin]
    breadboard_pos: Optional[BreadboardPos] = None
    schematic_pos: Optional[SchematicPos] = None

    @model_validator(mode="after")
    def check_pin_format(self):
        for pin in self.pins:
            if "." not in pin.id:
                raise ValueError(
                    f"Componente '{self.id}': pin id '{pin.id}' debe tener formato '<component_id>.<NOMBRE_PIN>'"
                )
            comp_prefix, pin_name = pin.id.split(".", 1)
            if comp_prefix != self.id:
                raise ValueError(
                    f"Componente '{self.id}': pin id '{pin.id}' debe empezar con '{self.id}.'"
                )
        return self

    @model_validator(mode="after")
    def check_pin_names(self):
        pin_names = {p.id.split(".", 1)[1] for p in self.pins}

        if self.type == "microcontroller":
            if self.board is None:
                raise ValueError(f"Componente '{self.id}': type=microcontroller requiere 'board'")
            valid = PINOUTS[self.board]
            invalid = pin_names - valid
            if invalid:
                raise ValueError(
                    f"Componente '{self.id}' (board={self.board}): pines inválidos {invalid}. "
                    f"Pines válidos: {sorted(valid)}"
                )

        elif self.type == "sensor_analog":
            if self.subtype not in SENSOR_ANALOG_SUBTYPES:
                raise ValueError(
                    f"Componente '{self.id}': subtype '{self.subtype}' inválido para sensor_analog. "
                    f"Opciones: {list(SENSOR_ANALOG_SUBTYPES)}"
                )
            required = SENSOR_ANALOG_SUBTYPES[self.subtype]
            if pin_names != required:
                raise ValueError(
                    f"Componente '{self.id}' (subtype={self.subtype}): pines deben ser exactamente {required}, recibí {pin_names}"
                )

        elif self.type == "sensor_digital":
            if self.subtype not in SENSOR_DIGITAL_SUBTYPES:
                raise ValueError(
                    f"Componente '{self.id}': subtype '{self.subtype}' inválido para sensor_digital. "
                    f"Opciones: {list(SENSOR_DIGITAL_SUBTYPES)}"
                )
            required = SENSOR_DIGITAL_SUBTYPES[self.subtype]
            if pin_names != required:
                raise ValueError(
                    f"Componente '{self.id}' (subtype={self.subtype}): pines deben ser exactamente {required}, recibí {pin_names}"
                )

        elif self.type in FIXED_PIN_TEMPLATES:
            required = FIXED_PIN_TEMPLATES[self.type]
            if pin_names != required:
                raise ValueError(
                    f"Componente '{self.id}' (type={self.type}): pines deben ser exactamente {required}, recibí {pin_names}"
                )

        # "wire" e "ic" genérico: sin validación estricta de nombres de pines
        return self


class Net(BaseModel):
    id: str
    connected_pins: list[str]
    color_hint: Optional[str] = None


class Circuit(BaseModel):
    components: list[Component]
    nets: list[Net]
    warnings: list[str] = []

    @model_validator(mode="after")
    def check_circuit_consistency(self):
        all_pin_ids = [p.id for c in self.components for p in c.pins]

        duplicates = {pid for pid in all_pin_ids if all_pin_ids.count(pid) > 1}
        if duplicates:
            raise ValueError(f"Pin ids duplicados entre componentes: {duplicates}")

        pin_id_set = set(all_pin_ids)

        net_ids = {n.id for n in self.nets}
        pin_nets = {p.net for c in self.components for p in c.pins}
        missing_nets = pin_nets - net_ids
        if missing_nets:
            raise ValueError(f"Pines referencian nets inexistentes: {missing_nets}")

        for net in self.nets:
            invalid = [pid for pid in net.connected_pins if pid not in pin_id_set]
            if invalid:
                raise ValueError(f"Net '{net.id}' referencia pin ids inexistentes: {invalid}")

        return self

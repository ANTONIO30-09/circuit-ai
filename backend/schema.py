from pydantic import BaseModel, model_validator
from typing import Literal, Optional

class Pin(BaseModel):
    id: str
    net: str

class BreadboardPos(BaseModel):
    row: str
    col: int

class SchematicPos(BaseModel):
    x: int
    y: int
    rotation: int

class Polarity(BaseModel):
    anode_pin: str
    cathode_pin: str

class Component(BaseModel):
    id: str
    type: Literal["resistor", "led", "capacitor", "battery", "ic", "wire", "switch", "potentiometer"]
    value: Optional[str] = None
    label: Optional[str] = None
    pins: list[Pin]
    breadboard_pos: Optional[BreadboardPos] = None
    schematic_pos: Optional[SchematicPos] = None
    polarity: Optional[Polarity] = None

class Net(BaseModel):
    id: str
    connected_pins: list[str]
    color_hint: Optional[str] = None

class Circuit(BaseModel):
    components: list[Component]
    nets: list[Net]
    warnings: list[str] = []

    @model_validator(mode="after")
    def check_nets_consistency(self):
        net_ids = {n.id for n in self.nets}
        pin_nets = {p.net for c in self.components for p in c.pins}
        missing = pin_nets - net_ids
        if missing:
            raise ValueError(f"Pines referencian nets inexistentes: {missing}")
        return self

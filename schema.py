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
    def check_consistency(self):
        all_pin_ids = [p.id for c in self.components for p in c.pins]

        # 1. pin ids únicos en todo el circuito
        duplicates = {pid for pid in all_pin_ids if all_pin_ids.count(pid) > 1}
        if duplicates:
            raise ValueError(f"Pin ids duplicados entre componentes: {duplicates}")

        pin_id_set = set(all_pin_ids)

        # 2. todo net referenciado por un pin existe en nets
        net_ids = {n.id for n in self.nets}
        pin_nets = {p.net for c in self.components for p in c.pins}
        missing_nets = pin_nets - net_ids
        if missing_nets:
            raise ValueError(f"Pines referencian nets inexistentes: {missing_nets}")

        # 3. connected_pins de cada net deben ser pin ids reales
        for net in self.nets:
            invalid = [pid for pid in net.connected_pins if pid not in pin_id_set]
            if invalid:
                raise ValueError(f"Net '{net.id}' referencia pin ids inexistentes: {invalid}")

        # 4. polarity anode/cathode deben ser pin ids reales del componente
        for c in self.components:
            if c.polarity:
                comp_pin_ids = {p.id for p in c.pins}
                if c.polarity.anode_pin not in comp_pin_ids or c.polarity.cathode_pin not in comp_pin_ids:
                    raise ValueError(f"Componente '{c.id}': polarity no coincide con sus pines reales")

        return self

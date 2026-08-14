export interface Pin {
  id: string;
  net: string;
}

export interface BreadboardPos {
  row: string;
  col: number;
}

export interface SchematicPos {
  x: number;
  y: number;
  rotation: number;
}

export interface Component {
  id: string;
  type: string;
  board?: string | null;
  subtype?: string | null;
  value?: string | null;
  label?: string | null;
  pins: Pin[];
  breadboard_pos?: BreadboardPos | null;
  schematic_pos?: SchematicPos | null;
}

export interface Net {
  id: string;
  connected_pins: string[];
  color_hint?: string | null;
}

export interface Circuit {
  components: Component[];
  nets: Net[];
  warnings: string[];
}

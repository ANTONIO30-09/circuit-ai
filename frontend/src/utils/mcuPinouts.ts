export interface FullPinout {
  left: string[];
  right: string[];
}

export const FULL_PINOUTS: Record<string, FullPinout> = {
  PIC16F877A: {
    left: [
      "OSC1", "OSC2",
      "RA0", "RA1", "RA2", "RA3", "RA4", "RA5",
      "RE0", "RE1", "RE2",
      "MCLR",
    ],
    right: [
      "RB7", "RB6", "RB5", "RB4", "RB3", "RB2", "RB1", "RB0",
      "VDD", "VSS",
      "RD7", "RD6", "RD5", "RD4",
      "RC7", "RC6", "RC5", "RC4",
      "RD3", "RD2", "RD1", "RD0",
      "RC3", "RC2", "RC1", "RC0",
    ],
  },
  ESP32: {
    left: [
      "EN", "3V3", "GND",
      "GPIO36", "GPIO39", "GPIO34", "GPIO35", "GPIO32", "GPIO33",
      "GPIO25", "GPIO26", "GPIO27", "GPIO14", "GPIO12", "GPIO13",
    ],
    right: [
      "GPIO23", "GPIO22", "GPIO21", "GPIO19", "GPIO18", "GPIO5",
      "GPIO17", "GPIO16", "GPIO4", "GPIO2", "GPIO15", "GPIO0",
    ],
  },
};

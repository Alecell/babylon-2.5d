import Decimal from "decimal.js";

export type Positions = "top" | "bottom" | "right" | "left" | "front" | "back" | "center";

export type Events = {
    "on-land": (speed: Decimal) => void;
};

export type FrictionForce = { horizontal: number; vertical: number };

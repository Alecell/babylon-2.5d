import Decimal from "decimal.js";

export type Positions = "top" | "bottom" | "right" | "left" | "front" | "back" | "center";

export type Events = {
    "hit-ground": (speed: Decimal) => void;
};

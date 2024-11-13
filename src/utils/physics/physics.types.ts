import Decimal from "decimal.js";

export type Positions = "top" | "bottom" | "right" | "left" | "front" | "back" | "center";

export type PhysicsEvents = {
    "on-land": (speed: Decimal) => void;
    "on-change-grounded": (grounded: boolean) => void;
};

export type FrictionForce = { horizontal: number; vertical: number };

export type Velocities = {
    horizontalVelocity: Decimal;
    verticalVelocity: Decimal;
};

export type PrevState = {
    isGrounded: boolean;
    velocities: Velocities;
};

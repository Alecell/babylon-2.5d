import { Vector2 } from "@babylonjs/core";
import Decimal from "decimal.js";
import { ForceComponents } from "./force.types";
import { FrictionForce } from "./physics.types";

export class Force {
    direction: Vector2;
    magnitude: Decimal;
    key: string;

    // TODO: Talvez seja bom usar o Vector2 unificado ao inves de usar direction e magnitude separados, pode ser bom pra performance
    constructor(direction: Vector2, magnitude: Decimal, key?: string) {
        this.direction = direction.clone().normalize(); // Clone to avoid external mutations
        this.magnitude = magnitude;
        this.key = key || this.generateKey();
    }

    scale(friction: Decimal, opposingMagnitude: Decimal = new Decimal(0)): Vector2 {
        const netMagnitude = Decimal.max(0, this.magnitude.minus(opposingMagnitude));
        this.magnitude = netMagnitude.times(1 - friction.toNumber());
        return this.direction.scale(this.magnitude.toNumber());
    }

    isZero(): boolean {
        return this.magnitude.lessThan(0.01);
    }

    private generateKey(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

export class ForceManager {
    private forces: { [key: string]: Force } = {};

    addForce({
        direction,
        magnitude,
        key,
    }: {
        direction: Vector2;
        magnitude: Decimal;
        key?: string;
    }): string {
        const force = new Force(direction, magnitude, key);
        this.forces[force.key] = force;
        return force.key;
    }

    addOnForce(key: string, magnitude: Decimal, direction?: Vector2): void {
        const force = this.forces[key];
        if (force) {
            force.magnitude = force.magnitude.plus(magnitude);
        } else if (direction) {
            this.addForce({ direction, magnitude, key });
        } else {
            throw new Error("[ForceManager.addOnForce] Force not found and direction not provided");
        }
    }

    applyForces(frictions: FrictionForce): {
        horizontalVelocity: Decimal;
        verticalVelocity: Decimal;
    } {
        const totalForce = new Vector2(0, 0);
        const opposingForces = this.sumForcesByComponents();

        this.forces = Object.fromEntries(
            Object.entries(this.forces).filter(([, force]) => {
                const hasMagnitude = !force.isZero();

                if (hasMagnitude) {
                    const direction = this.getDirection(force);
                    const opposingMagnitude = this.getOpposingMagnitude(force, opposingForces);
                    totalForce.addInPlace(
                        force.scale(new Decimal(frictions[direction]), opposingMagnitude)
                    );
                }

                return hasMagnitude;
            })
        );

        return {
            horizontalVelocity: new Decimal(totalForce.x),
            verticalVelocity: new Decimal(totalForce.y),
        };
    }

    sumForcesByComponents(): ForceComponents {
        const forces = Object.values(this.forces);
        let positiveX = 0;
        let negativeX = 0;
        let positiveY = 0;
        let negativeY = 0;

        for (let i = 0; i < forces.length; i++) {
            const force = forces[i];
            const forceVector = force.direction.scale(force.magnitude.toNumber());

            if (forceVector.x > 0) positiveX += forceVector.x;
            else negativeX -= forceVector.x;

            if (forceVector.y > 0) positiveY += forceVector.y;
            else negativeY -= forceVector.y;
        }

        return {
            positiveX: new Decimal(positiveX),
            negativeX: new Decimal(negativeX),
            positiveY: new Decimal(positiveY),
            negativeY: new Decimal(negativeY),
        };
    }

    private getOpposingMagnitude(force: Force, forceComponents: ForceComponents): Decimal {
        const forceVector = force.direction;

        if (forceVector.x > 0) return forceComponents.negativeX;
        if (forceVector.x < 0) return forceComponents.positiveX;
        if (forceVector.y > 0) return forceComponents.negativeY;
        if (forceVector.y < 0) return forceComponents.positiveY;

        return new Decimal(0);
    }

    getDirection(force: Force): "horizontal" | "vertical" {
        const forceVector = force.direction.scale(force.magnitude.toNumber());
        return Math.abs(forceVector.x) > Math.abs(forceVector.y) ? "horizontal" : "vertical";
    }

    removeForce(key: string) {
        delete this.forces[key];
    }
}

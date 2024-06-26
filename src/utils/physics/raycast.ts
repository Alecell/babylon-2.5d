import { Mesh, Ray, Vector3 } from "@babylonjs/core";
import { Positions } from "./physics.types";

/**
 * TODO: refatorar isso pra usar o Vector3.up, down, left, right, forward e backward
 * Não precisa de todos o Orientation que eu coloquei, mas o position ainda é necessario
 */

export function createRay(position: Positions, direction: Vector3, mesh: Mesh) {
    const length = 20;
    const origin = getPosition(position, mesh);

    return new Ray(origin, direction, length);
}

export function getPosition(position: Positions, mesh: Mesh) {
    const origin = mesh.position.clone();

    if (position === "top") {
        origin.y =
            mesh.position.y +
            mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
    }

    if (position === "bottom") {
        origin.y =
            mesh.position.y -
            mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
    }

    if (position === "right") {
        origin.x =
            mesh.position.x +
            mesh.getBoundingInfo().boundingBox.extendSizeWorld.x;
    }

    if (position === "left") {
        origin.x =
            mesh.position.x -
            mesh.getBoundingInfo().boundingBox.extendSizeWorld.x;
    }

    return origin;
}

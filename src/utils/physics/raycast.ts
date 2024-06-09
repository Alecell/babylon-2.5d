import { Mesh, Ray, Vector3 } from "@babylonjs/core";
import { Positions, Orientation } from "./physics.types";

export function createRay(
  position: Positions,
  orientation: Orientation,
  mesh: Mesh
) {
  const length = 20;
  let origin = getPosition(position, mesh);
  let direction = getOrientation(orientation, mesh);

  return new Ray(origin, direction, length);
}

export function getPosition(position: Positions, mesh: Mesh) {
  const threshold = 0.1;
  let origin = mesh.position.clone();

  if (position === "top") {
    origin.y =
      mesh.position.y +
      mesh.getBoundingInfo().boundingBox.extendSizeWorld.y +
      threshold;
  }

  if (position === "bottom") {
    origin.y =
      mesh.position.y -
      mesh.getBoundingInfo().boundingBox.extendSizeWorld.y -
      threshold;
  }

  if (position === "right") {
    origin.x =
      mesh.position.x +
      mesh.getBoundingInfo().boundingBox.extendSizeWorld.x +
      threshold;
  }

  if (position === "left") {
    origin.x =
      mesh.position.x -
      mesh.getBoundingInfo().boundingBox.extendSizeWorld.x -
      threshold;
  }

  return origin;
}

export function getOrientation(orientation: Orientation, mesh: Mesh) {
  let direction = new Vector3(0, 0, 0);

  if (orientation === "top") {
    direction.y = 1;
  }

  if (orientation === "bottom") {
    direction.y = -1;
  }

  if (orientation === "right") {
    direction.x = 1;
  }

  if (orientation === "left") {
    direction.x = -1;
  }

  if (orientation === "forward") {
    direction.z = 1;
  }

  if (orientation === "backward") {
    direction.z = -1;
  }

  return direction;
}

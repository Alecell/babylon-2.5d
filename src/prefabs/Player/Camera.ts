import {
  AbstractMesh,
  FollowCamera,
  Mesh,
  Scene,
  Vector3,
} from "@babylonjs/core";

export class Camera {
  constructor(mesh: Mesh, scene: Scene) {
    const camera = new FollowCamera("Camera", new Vector3(0, 10, -10), scene);
    camera.lockedTarget = mesh as AbstractMesh;
    scene.activeCamera = camera;
  }
}

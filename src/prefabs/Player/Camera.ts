import { AbstractMesh, FollowCamera, Mesh, Scene, Vector3 } from '@babylonjs/core';

export class Camera {
  constructor(mesh: Mesh, scene: Scene) {
    const camera = new FollowCamera("Camera", new Vector3(0, 10, -10), scene);
    camera.lockedTarget = mesh as AbstractMesh;
    camera.radius = 20;
    camera.heightOffset = 8;
    camera.rotationOffset = 0;
    camera.cameraAcceleration = 0.005;
    camera.maxCameraSpeed = 10;
    scene.activeCamera = camera;
  }
}
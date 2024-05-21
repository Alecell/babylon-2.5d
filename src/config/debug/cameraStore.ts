import { Camera, Scene } from '@babylonjs/core';

class DebugCameraObserver {
  private static instance: DebugCameraObserver;
  private currentCameraIndex: number;

  private constructor() {
      this.currentCameraIndex = 0;
  }

  public static getInstance(): DebugCameraObserver {
      if (!DebugCameraObserver.instance) {
          DebugCameraObserver.instance = new DebugCameraObserver();
      }
      return DebugCameraObserver.instance;
  }

  public switchToNextCamera(scene: Scene): void {
      this.currentCameraIndex = (this.currentCameraIndex + 1) % scene.cameras.length;
      scene.activeCamera = scene.cameras[this.currentCameraIndex];
  }

  public getCurrentCamera(scene: Scene): Camera {
      return scene.activeCamera!;
  }
}

const debugCameraObserver = DebugCameraObserver.getInstance();

export {
  debugCameraObserver
}

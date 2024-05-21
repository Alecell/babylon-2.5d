import { ArcRotateCamera, Scene, Vector3, PhysicsViewer } from '@babylonjs/core';
import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui/2D';
import { debugCameraObserver } from './cameraStore';
import switchCameraImage from '../../../assets/images/debug/change-camera.png';

const meshDebugger = (e: KeyboardEvent, scene: Scene) => {
  if (
    e.shiftKey && 
    e.ctrlKey && 
    e.altKey && 
    (e.key === 'M' || e.key === 'm')
  ) {
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show();
    }
  }
}

const physicsDebugger = (e: KeyboardEvent, scene: Scene) => {
  if (
    e.shiftKey && 
    e.ctrlKey && 
    e.altKey && 
    (e.key === 'P' || e.key === 'p')
  ) {
    const physicsViewer = new PhysicsViewer(scene);
    scene.meshes.forEach(mesh => {
      if (mesh.physicsBody) physicsViewer.showBody(mesh.physicsBody);
    })
  }
}

const debugTogglers = (scene: Scene) => {
  window.addEventListener("keydown", (e) => {
    meshDebugger(e, scene);
    physicsDebugger(e, scene);
  });
};

const changeCamera = (scene: Scene) => {
  const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("debugUI");
  const button = Button.CreateImageOnlyButton('switchCamera', switchCameraImage);
  button.width = "100px";
  button.height = "55px";
  button.background = "#333333";
  button.thickness = 0;
  button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  button.onPointerUpObservable.add(function() {
    debugCameraObserver.switchToNextCamera(scene);
  });

  advancedTexture.addControl(button);

  const debugCamera = new ArcRotateCamera("Camera", -Math.PI/2, Math.PI/2, 100, new Vector3(0,20,0), scene);
  debugCamera.attachControl(true)
}

export function debugLayer(scene: Scene) {
  debugTogglers(scene);
  changeCamera(scene);
}

import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import { Player } from '../../prefabs/Player/Player';

export async function Lobby(engine: Engine, canvas: HTMLCanvasElement) {
  const scene = new Scene(engine);

  const camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
  new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

  await Player(scene);
  // MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
  camera.attachControl(canvas, true);

  return scene;
}

import { Scene, SceneLoader } from '@babylonjs/core';

export async function Player(scene: Scene) {
  const player = await SceneLoader.ImportMeshAsync('', './models/Rolance/', 'brave.babylon', scene);

  return player;
}

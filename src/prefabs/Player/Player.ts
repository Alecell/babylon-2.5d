import { Scene, SceneLoader } from '@babylonjs/core';

export async function Player(scene: Scene) {
  const player = await SceneLoader.ImportMeshAsync('', './meshes/player/', 'player.babylon', scene);

  return player;
}

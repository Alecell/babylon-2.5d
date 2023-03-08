import { ISceneLoaderAsyncResult, Mesh, PhysicsImpostor, Scene, SceneLoader } from '@babylonjs/core';
import { APrefab } from '../../interfaces/Prefab';

export class Ground extends APrefab {

  constructor(loaded: ISceneLoaderAsyncResult, scene: Scene) {
    super("Ground", scene);

    loaded.meshes[0].rotation.y = Math.PI/2;
    loaded.meshes[0].rotation.x = 0;
    loaded.meshes[0].position.x = 60;
    loaded.meshes[0].position.y = -3;
    loaded.meshes[0].position.z = 1
    loaded.meshes[0].scaling.x = 0.4;
    loaded.meshes[0].physicsImpostor = new PhysicsImpostor(loaded.meshes[0], PhysicsImpostor.MeshImpostor, { mass: 0, restitution: 0, friction: 1 }, this.scene);
    this._mesh = loaded.meshes[0] as Mesh;
  }

  async init() {
    

  }

  initSounds(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export const createGround = async (scene: Scene) => {
  const loaded = await SceneLoader.ImportMeshAsync('', './meshes/stages/stage-1/', 'fase.babylon', scene);
  return new Ground(loaded, scene);
};

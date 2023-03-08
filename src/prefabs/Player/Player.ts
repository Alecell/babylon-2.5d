import { AbstractMesh, Axis, ISceneLoaderAsyncResult, Mesh, PhysicsImpostor, Scene, SceneLoader } from '@babylonjs/core';
import { APrefab } from '../../interfaces/Prefab';
import { Camera } from './Camera';
import { Controls } from './Controls';
import { Animation } from './Animation';
import { TGenericObject } from '../../utils/types';

class Player extends APrefab {
  private _controls!: Controls;
  private _camera!: Camera;
  private _animation!: Animation;
  protected _mesh: TGenericObject<Mesh>;

  constructor(loaded: ISceneLoaderAsyncResult, scene: Scene) {
    super("Player", scene);

    this._mesh = this.initMeshes(loaded);
    this._mesh["Third Person"].position.z = 1;
    
    this._skeleton = loaded.skeletons[0];
    
    this._camera = new Camera(this._mesh["Third Person"], this.scene);
    this._animation = new Animation(this._skeleton, this.scene);
    this._controls = new Controls(this._mesh["Third Person"], this._animation, this.scene);
    
    this.initPhysics();
    this.freezeRotation(this._mesh["Third Person"]);
  }

  initMeshes(loaded: ISceneLoaderAsyncResult) {
    return loaded.meshes.reduce((obj, mesh) => {
      return {
        ...obj,
        [mesh.name]: mesh as Mesh,
      }
    }, {});
  }

  initPhysics() {
    this._mesh["Third Person"].physicsImpostor = new PhysicsImpostor(
      this._mesh["Third Person"],
      PhysicsImpostor.BoxImpostor,
      { mass: 20, restitution: 0, friction: 0.5 },
      this.scene
    );
  }

  async initSounds() {
    throw new Error('Method not implemented.');
  }
}

export const createPlayer = async (scene: Scene) => {
  const loaded = await SceneLoader.ImportMeshAsync("", "/meshes/player/", "dummy2.babylon", scene);
  return new Player(loaded, scene);
};

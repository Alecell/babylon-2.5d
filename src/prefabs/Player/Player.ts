import {
  ISceneLoaderAsyncResult,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

import { MeshGroup, Prefab } from "../../interfaces/prefab";

import { Camera } from "./Camera";
import { Controls } from "./Controls";
import { Animation } from "./Animation";
import player from "./player.glb";

class Player extends Prefab {
  private _controls!: Controls;
  private _camera!: Camera;
  private _animation!: Animation;

  constructor(loaded: ISceneLoaderAsyncResult, scene: Scene) {
    super("Player", scene);

    this._mesh = this.initMeshes(loaded);
    this._skeleton = loaded.skeletons[0];

    // this._camera = new Camera(this._mesh.base, this.scene);
    // this._animation = new Animation(this._skeleton, this.scene);
    this._controls = new Controls(
      this._mesh.base,
      this._animation,
      this._physics,
      this.scene
    );
  }

  initMeshes(loaded: ISceneLoaderAsyncResult) {
    const meshes = loaded.meshes.reduce((obj, mesh) => {
      return {
        ...obj,
        [mesh.name]: mesh as Mesh,
      };
    }, {} as MeshGroup);

    meshes.base = MeshBuilder.CreateCapsule(
      "Player",
      { height: 4, radius: 1 },
      this.scene
    );

    meshes.base.addChild(meshes["__root__"]);
    meshes["__root__"].scaling = new Vector3(-1, -1, -1);
    meshes["__root__"].position = new Vector3(0, -2, 0);

    const material = new StandardMaterial("playerBaseMaterial", this.scene);
    material.alpha = 0;
    meshes.base.material = material;

    return meshes;
  }

  async initSounds() {
    throw new Error("Method not implemented.");
  }
}

export const createPlayer = async (scene: Scene) => {
  const loaded = await SceneLoader.ImportMeshAsync(
    "",
    "",
    player,
    scene,
    null,
    ".glb"
  );
  return new Player(loaded, scene);
};

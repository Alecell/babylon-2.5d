import {
  ISceneLoaderAsyncResult,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  SceneLoader,
  StandardMaterial,
} from "@babylonjs/core";
import { Prefab } from "../../interfaces/prefab";
import fase from "./fase.babylon";

export class Ground extends Prefab {
  constructor(loaded: ISceneLoaderAsyncResult, scene: Scene) {
    super("Ground", scene);

    this.initMeshes(loaded);
  }

  initMeshes(loaded: ISceneLoaderAsyncResult) {
    loaded.meshes[0].rotation.y = Math.PI / 2;
    loaded.meshes[0].rotation.x = 0;
    loaded.meshes[0].position.x = 60;
    loaded.meshes[0].position.y = -3;
    loaded.meshes[0].position.z = 1;
    loaded.meshes[0].scaling.x = 0.4;

    this._mesh = { base: loaded.meshes[0] as Mesh };
  }

  initSounds(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export const createGround = async (scene: Scene) => {
  const loaded = await SceneLoader.ImportMeshAsync(
    "",
    "",
    fase,
    scene,
    null,
    ".babylon"
  );
  return new Ground(loaded, scene);
};

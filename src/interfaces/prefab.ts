import {
  Mesh,
  NodeMaterial,
  Nullable,
  Scene,
  Skeleton,
  Sound,
  Texture,
} from "@babylonjs/core";

import { GenericObject } from "../types/object";
import { Physics } from "../utils/physics/physics";

export interface MeshGroup {
  base: Mesh;
  [key: string]: Mesh;
}

export abstract class Prefab {
  protected _mesh!: MeshGroup;
  protected _skeleton!: Skeleton;
  protected _parent!: Mesh;
  protected _texture!: Texture;
  protected _sounds!: GenericObject<Sound>;
  protected _physics!: Physics;

  events: Nullable<GenericObject> = {};
  states: Nullable<GenericObject> = {};

  constructor(
    public name: string,
    protected scene: Scene
  ) {
    this._physics = new Physics(this, this.scene);
  }

  abstract initSounds(): Promise<void>;

  get mesh() {
    return this._mesh;
  }

  set mesh(mesh: MeshGroup) {
    // Isso não faz sentido estar aqui, ta chumbado o shader, nao deveria, deveria?
    NodeMaterial.ParseFromFileAsync(
      `${this.name}-material`,
      "/node-materials/genshin-shader-lindao.json",
      this.scene
    ).then((material) => {
      mesh.base.material = material;
      this._mesh = mesh;
    });
  }
}

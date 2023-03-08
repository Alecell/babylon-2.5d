import { Mesh, Nullable, Scene, Skeleton, Sound, Texture, Vector3 } from '@babylonjs/core';
import { prefabStore } from '../stores/Prefab';
import { TGenericObject } from '../utils/types';

export interface IPrefab {
  events: Nullable<TGenericObject>;
  states: Nullable<TGenericObject>;
}

export abstract class APrefab implements IPrefab {
  protected _mesh!: Mesh | TGenericObject<Mesh>;
  protected _skeleton!: Skeleton;
  protected _parent!: Mesh;
  protected _texture!: Texture;
  protected _sounds!: TGenericObject<Sound>;
  
  events = {};
  states = {};

  constructor(public name: string, protected scene: Scene) {
    prefabStore.add(this);
  }

  abstract initSounds(): Promise<void>;

  get mesh() {
    return this._mesh;
  }

  set mesh(mesh: Mesh | TGenericObject<Mesh>) {
    this._mesh = mesh;
  }


  freezeRotation(mesh?: Mesh) {
    if (!mesh) {
      // @ts-ignore
      this._mesh.physicsImpostor?._physicsBody.setAngularFactor(Vector3.Zero());
    } else {
      // @ts-ignore
      mesh.physicsImpostor?._physicsBody.setAngularFactor(Vector3.Zero());
    }
  }
}

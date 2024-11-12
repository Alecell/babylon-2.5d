import { Mesh, Nullable, Scene, Skeleton, Sound, Texture } from "@babylonjs/core";

import { GenericObject } from "../types/object";
import { Physics } from "../utils/physics/physics";
import Decimal from "decimal.js";
import { Friction } from "../utils/physics/friction";

export interface MeshGroup {
    base: Mesh;
    [key: string]: Mesh;
}

// TODO: prefab pra cada tipo de coisa diferente, criatura, chão, item e etc
interface CharacterProperties {
    speed?: Decimal;
    friction?: Nullable<{
        horizontal?: Friction;
        vertical?: Friction;
    }>;
}

export abstract class Prefab {
    protected _mesh!: MeshGroup;
    protected _skeleton!: Skeleton;
    protected _parent!: Mesh;
    protected _texture!: Texture;
    protected _sounds!: GenericObject<Sound>;
    readonly physics: Nullable<Physics> = null;

    abstract properties: Nullable<CharacterProperties>;
    events: GenericObject = {};
    states: GenericObject = {};

    constructor(
        name: string,
        readonly scene: Scene,
        physics = true
    ) {
        if (physics) this.physics = new Physics(this, this.scene);
    }

    abstract initSounds(): Promise<void>;

    get mesh() {
        return this._mesh;
    }

    protected set mesh(mesh: MeshGroup) {
        this._mesh = mesh;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workarround pra evitar o problema de tipagem do d.ts
    set metadata(metadata: any) {
        this._mesh.base.metadata = metadata;
    }
}

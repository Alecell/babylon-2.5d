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
import { GameObjectTypes } from "../../types/enum";
import Decimal from "decimal.js";
import { Friction } from "../../utils/physics/friction";

export class Player extends Prefab {
    private _controls!: Controls;
    private _camera!: Camera;
    private _animation!: Animation;

    properties = {
        speed: new Decimal(0.3),
        friction: {
            horizontal: new Friction(0.1, 0.1),
        },
    };

    constructor(loaded: ISceneLoaderAsyncResult, scene: Scene) {
        super("Player", scene);

        this.mesh = this.initMeshes(loaded);
        this.metadata = { type: GameObjectTypes.PLAYER, friction: this.properties.friction };
        this._skeleton = loaded.skeletons[0];

        // this._camera = new Camera(this._mesh.base, this.scene);
        // this._animation = new Animation(this._skeleton, this.scedne);
        this._controls = new Controls(this);
        this.physics?.events.addListener("on-land", this.oi);
    }

    oi = () => {
        console.log("oi");
    };

    initMeshes(loaded: ISceneLoaderAsyncResult) {
        const meshes = loaded.meshes.reduce((obj, mesh) => {
            return {
                ...obj,
                [mesh.name]: mesh as Mesh,
            };
        }, {} as MeshGroup);

        meshes.base = MeshBuilder.CreateCapsule("Player", { height: 4, radius: 1 }, this.scene);
        // meshes.base.position = new Vector3(0, 200, 0);
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
    const loaded = await SceneLoader.ImportMeshAsync("", "", player, scene, null, ".glb");
    return new Player(loaded, scene);
};

import { ISceneLoaderAsyncResult, Mesh, Scene, SceneLoader } from "@babylonjs/core";
import { Prefab } from "../../interfaces/prefab";
import fase from "./chao-2.babylon";
import { GameObjectTypes } from "../../types/enum";
import { Friction } from "../../utils/physics/friction";

export class Ground extends Prefab {
    properties = {
        friction: {
            horizontal: new Friction(0.1, 1),
        },
    };

    constructor(loaded: ISceneLoaderAsyncResult, scene: Scene) {
        super("Ground", scene, false);
        this.initMeshes(loaded);
        this.metadata = {
            type: GameObjectTypes.GROUND,
            friction: this.properties.friction,
        };
    }

    initMeshes(loaded: ISceneLoaderAsyncResult) {
        loaded.meshes[0].rotation.y = Math.PI / 2;
        loaded.meshes[0].rotation.x = 0;
        loaded.meshes[0].position.x = 66;
        loaded.meshes[0].position.y = 10;
        loaded.meshes[0].position.z = -3;
        loaded.meshes[0].scaling.x = 4;
        loaded.meshes[0].scaling.z = 4;
        loaded.meshes[0].scaling.y = 4;

        this._mesh = { base: loaded.meshes[0] as Mesh };
    }

    initSounds(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export const createGround = async (scene: Scene) => {
    const loaded = await SceneLoader.ImportMeshAsync("", "", fase, scene, null, ".babylon");
    return new Ground(loaded, scene);
};

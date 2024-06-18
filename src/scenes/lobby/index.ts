import {
    Curve3,
    Engine,
    HavokPlugin,
    HemisphericLight,
    MeshBuilder,
    Scene,
    Vector3,
} from "@babylonjs/core";

import { createGround } from "../../prefabs/Ground/Ground";
import { createPlayer } from "../../prefabs/Player/Player";
import { meshLoader } from "../../utils/meshLoader";
import { gameStore } from "../../store/game";
import { Map } from "../../interfaces/map";

export async function Lobby(engine: Engine, canvas: HTMLCanvasElement) {
    const scene = new Scene(engine);

    new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
    const [Player, Ground] = await meshLoader([
        createPlayer(scene),
        createGround(scene),
    ]);

    const points = [
        new Vector3(-14.39, 0, -4.66),
        Vector3.Zero(),
        new Vector3(18.9, 0, 6.52),
        new Vector3(41.6, 0, 17.49),
        new Vector3(66.3, 0, -3.14),
        new Vector3(86.23, 0, -6.14),
        new Vector3(106.23, 0, -8.83),
    ];

    const catmullRom = Curve3.CreateCatmullRomSpline(points, 60);

    points.forEach((point) => {
        const sphere = MeshBuilder.CreateSphere(
            "point",
            { diameter: 0.5 },
            scene
        );
        sphere.position = point;
    });

    gameStore.map = new Map("lobby", catmullRom, new Vector3(0, 23, 0), scene);

    const catmullRomSpline = MeshBuilder.CreateLines(
        "catmullRom",
        { points: catmullRom.getPoints() },
        scene
    );

    catmullRomSpline.isPickable = false;

    return scene;
}

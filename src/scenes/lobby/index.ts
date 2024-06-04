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

  var catmullRom = Curve3.CreateCatmullRomSpline(
    [
      Vector3.Zero(),
      new Vector3(10, 0, 5),
      new Vector3(20, 0, 20),
      new Vector3(25, 0, 15),
      new Vector3(35, 0, 0),
      new Vector3(50, 0, 20),
    ],
    60
  );

  gameStore.map = new Map("lobby", catmullRom, scene);

  var catmullRomSpline = MeshBuilder.CreateLines(
    "catmullRom",
    { points: catmullRom.getPoints() },
    scene
  );

  return scene;
}

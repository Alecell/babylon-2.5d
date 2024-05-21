import {
  Engine,
  HavokPlugin,
  HemisphericLight,
  Scene,
  Vector3,
} from "@babylonjs/core";

import { createGround } from "../../prefabs/Ground/Ground";
import { createPlayer } from "../../prefabs/Player/Player";
import { meshLoader } from "../../utils/meshLoader";
import { havokModule } from "../../config/havok";

export async function Lobby(engine: Engine, canvas: HTMLCanvasElement) {
  const scene = new Scene(engine);
  const havokInstance = await havokModule;
  const physicsPlugin = new HavokPlugin(true, havokInstance);
  const gravityVector = new Vector3(0, -9, 0);

  new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
  scene.enablePhysics(gravityVector, physicsPlugin);

  const [Player, Ground] = await meshLoader([
    createPlayer(scene),
    createGround(scene),
  ]);

  return scene;
}

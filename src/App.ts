import { Engine } from "@babylonjs/core";
import { createCanvas } from './config/canva';
import { debugLayer } from './config/debug';
import { Lobby } from './scenes/lobby';

import '@babylonjs/inspector';

const scenes = (engine: Engine, canvas: HTMLCanvasElement) => ({
  lobby: Lobby(engine, canvas)
})

async function App() {
  const canvas = createCanvas();
  const engine = new Engine(canvas, true);
  const scene = await scenes(engine, canvas)['lobby'];

  engine.runRenderLoop(() => {
    scene.render();
  });

  debugLayer(scene);
}

Ammo().then(() => {
  App();
})

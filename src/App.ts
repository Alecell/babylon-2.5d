import { Engine } from "@babylonjs/core";
import { createCanvas } from './config/canva';
import { debug } from './config/debug';
import { Lobby } from './scenes/lobby';

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

  debug(scene);
}

App();

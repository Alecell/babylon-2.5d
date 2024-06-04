import {
  ActionEvent,
  ActionManager,
  ExecuteCodeAction,
  Mesh,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { Animation } from "./Animation";
import { Physics } from "../../utils/physics/physics";

export class Controls {
  speed = 5;
  jumpImpulse = new Vector3(0, 1000, 0);
  input: { [key: string]: boolean } = {};
  isJumping = false;

  constructor(
    private mesh: Mesh,
    private animation: Animation,
    protected physics: Physics,
    scene: Scene
  ) {
    scene.actionManager = new ActionManager(scene);

    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, this.handleKey)
    );
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, this.handleKey)
    );

    scene.onBeforeRenderObservable.add(this.move);
  }

  handleKey = (e: ActionEvent) => {
    this.input[e.sourceEvent.key] = e.sourceEvent.type === "keydown";

    if (e.sourceEvent.type === "keyup") {
      this.mesh.physicsBody?.setLinearVelocity(new Vector3(0, 0, 0));
    }
  };

  move = () => {
    const velocity = this.mesh.physicsBody?.getLinearVelocity();

    if (this.input["a"]) {
      this.mesh.physicsBody?.setLinearVelocity(
        new Vector3(-5, velocity?.y, velocity?.z)
      );
    } else if (this.input["d"]) {
      this.mesh.physicsBody?.setLinearVelocity(
        new Vector3(5, velocity?.y, velocity?.z)
      );
    }
  };
}

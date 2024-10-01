import { ActionEvent, ActionManager, ExecuteCodeAction, Mesh, Scene } from "@babylonjs/core";
import { Animation } from "./Animation";
import { Physics } from "../../utils/physics/physics";

export class Controls {
    input: { [key: string]: boolean } = {};
    isJumping = false;

    constructor(
        private mesh: Mesh,
        private animation: Animation,
        private physics: Physics,
        scene: Scene
    ) {
        scene.actionManager = new ActionManager(scene);

        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, this.handleKey)
        );
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, this.handleKey)
        );

        scene.onBeforeRenderObservable.add(() => {
            this.move();
            this.jump();
        });
    }

    handleKey = (e: ActionEvent) => {
        this.input[e.sourceEvent.key] = e.sourceEvent.type === "keydown";
    };

    move = () => {
        if (this.input["a"]) {
            this.physics.moveLeft();
        } else if (this.input["d"]) {
            this.physics.moveRight();
        }
    };

    jump = () => {
        if (this.input["w"]) {
            this.physics.jump();
        }
    };
}

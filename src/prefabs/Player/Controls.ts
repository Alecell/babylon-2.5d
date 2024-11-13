import { ActionEvent, ActionManager, ExecuteCodeAction, Nullable, Vector2 } from "@babylonjs/core";
import { Player } from "./Player";
import { Physics } from "../../utils/physics/physics";
import Decimal from "decimal.js";

export class Controls {
    physics: Nullable<Physics>;
    input: {
        [key: string]: boolean;
    } = {};
    isJumping = false;
    isGrounded: Nullable<boolean> = null;

    constructor(private player: Player) {
        const { scene } = this.player;
        this.physics = this.player.physics;

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

        this.physics?.events.addListener("on-change-grounded", (isGrounded: boolean) => {
            this.isGrounded = isGrounded;
        });
    }

    handleKey = (e: ActionEvent) => {
        this.input[e.sourceEvent.key] = e.sourceEvent.type === "keydown";
    };

    move = () => {
        if (this.input["a"]) {
            this.physics?.forceManager.addForce({
                key: "movement",
                direction: new Vector2(-1, 0),
                magnitude: this.player.properties.speed,
            });
        } else if (this.input["d"]) {
            this.physics?.forceManager.addForce({
                key: "movement",
                direction: new Vector2(1, 0),
                magnitude: this.player.properties.speed,
            });
        }
    };

    jump = () => {
        if (this.input["w"] && this.isGrounded) {
            this.physics?.forceManager.addForce({
                key: "jump",
                direction: new Vector2(0, -1),
                magnitude: new Decimal(25),
            });
        }
    };
}

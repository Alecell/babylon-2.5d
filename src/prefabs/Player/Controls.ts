import { ActionEvent, ActionManager, ExecuteCodeAction, Mesh, Scene } from "@babylonjs/core";
import { Animation } from "./Animation";
import { Physics } from "../../utils/physics/physics";

export class Controls {
    input: {
        [key: string]: boolean;
    } = {};
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
        this.handleKeyup(e);

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

    /**
     * TODO: Preciso basear isso no movimento de alguma forma, isso dessa forma gera bugs no futuro
     * algo que tenha tipo "was moving" e "is stopped".
     *
     * Por exemplo se eu tinha uma movimentaçào no frame anterior e agora eu não tenho, agora
     * eu aplico o slide, e não quando eu solto o botão.
     *
     * O botao gera o problema de que eu nao slidaria se meu movimento foi causado por uma força
     * externa que não meu botão.
     */
    handleKeyup = (e: ActionEvent) => {
        // if (e.sourceEvent.type !== "keyup") return;
        // if (e.sourceEvent.key === "a" || e.sourceEvent.key === "d") {
        //     this.physics.shouldSlide();
        // }
    };
}

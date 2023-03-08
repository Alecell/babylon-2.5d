import { ActionEvent, ActionManager, Axis, ExecuteCodeAction, Mesh, Nullable, Scene, Vector3 } from '@babylonjs/core';
import { prefabStore } from '../../stores/Prefab';
import { Animation } from './Animation';

export class Controls {
  speed = 15;
  jumpImpulse = new Vector3(0, 600, 0);
  input: {[key: string]: boolean} = {};
  isJumping = false;

  constructor(private mesh: Mesh, private animation: Animation, scene: Scene) {
    scene.actionManager = new ActionManager(scene);
    
    scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, this.handleKey));
    scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, this.handleKey));

    scene.onBeforeRenderObservable.add(this.movement);
  }

  handleKey = (e: ActionEvent) => {
    this.input[e.sourceEvent.key] = e.sourceEvent.type === 'keydown';

    if (e.sourceEvent.type === 'keyup') {
      this.mesh.physicsImpostor?.setLinearVelocity(Vector3.Zero());
      this.animation.idle();
    }
  }

  movement = () => {
    if (this.input["w"]) this.jump();
    else if (this.input["a"] || this.input["d"]) this.move();
  }

  move = () => {
    let movement = this.mesh.physicsImpostor?.getLinearVelocity();

    if (movement) {
      if (this.input["d"]) this.moveRight(movement)
      else if (this.input["a"]) this.moveLeft(movement)

      if (movement.x > this.speed) movement.x = this.speed
      if (movement.x < -this.speed) movement.x = -this.speed

      this.mesh.physicsImpostor?.setLinearVelocity(movement);
    }
  }

  moveRight = (movement: Nullable<Vector3>) => {
    if (movement) {
      movement.x += this.speed;
      this.animation.run();

      if (!(this.mesh.getDirection(Axis.Z).x > 0)) {
        this.mesh.rotate(Axis.Y, Math.PI/2)
      }    
    }
  }

  moveLeft = (movement: Nullable<Vector3>) => {
    if (movement) {
      movement.x -= this.speed;
      this.animation.run();

      if (!(this.mesh.getDirection(Axis.Z).x < 0)) {
        this.mesh.rotate(Axis.Y, Math.PI/-2)
      }    
    }
  }

  jump = () => {
    if (!this.isJumping) {
      this.isJumping = true;
      this.mesh.physicsImpostor?.applyImpulse(this.jumpImpulse, this.mesh.getAbsolutePosition());

      //  TODO: adicionar uma tipagem de que já é feita a checagem e atribuição da tipagem correta do tipo
      // @ts-ignore
      this.mesh.physicsImpostor?.registerOnPhysicsCollide(prefabStore.get('Ground').mesh.physicsImpostor!, () => {
        this.isJumping = false;
      })
    }
  }
}

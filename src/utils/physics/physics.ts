import { Ray, RayHelper, Scene, Vector3 } from "@babylonjs/core";

import { Prefab } from "../../interfaces/prefab";
import { Orientation, Positions } from "./physics.types";
import { gameStore } from "../../store/game";

export class Physics {
  isGrounded = false;
  groundedDistance!: number;

  frontRc!: Ray;
  backRc!: Ray;
  groundFrontRc!: Ray;
  groundBackRc!: Ray;

  frontRcPosition: Positions = "right";
  backRcPosition: Positions = "left";
  groundFrontRcPosition: Positions = "left";
  groundBackRcPosition: Positions = "right";

  constructor(
    private readonly prefab: Prefab,
    private readonly scene: Scene
  ) {
    scene.onBeforeRenderObservable.add(this.preparePhysics);
    scene.onBeforeRenderObservable.add(this.applyPhysics);
  }

  applyPhysics = () => {
    this.updateRaysPosition();
    this.checkGrounded();

    if (!this.isGrounded) this.applyGravity();
  };

  checkGrounded = () => {
    const threshold = 0.2;
    const groundFrontHit = this.scene.pickWithRay(this.groundFrontRc);
    const groundBackHit = this.scene.pickWithRay(this.groundBackRc);

    /**
     * TODO: Isso aqui precisa verificar se o objeto
     * é de uma certa tag, tipo ou coisa assim
     * Não é qualquer objeto que é chão, pode ser agua
     * As vezes um inimigo, ou um objeto que não é chão
     */
    if (
      groundFrontHit &&
      groundBackHit &&
      groundFrontHit?.distance - threshold <= this.groundedDistance &&
      groundBackHit?.distance - threshold <= this.groundedDistance
    ) {
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  };

  applyGravity = () => {
    const gravity = 0.4;
    // this.prefab.mesh.base.position.y -= gravity;
  };

  updateRaysPosition = () => {
    this.frontRc.origin = this.getPosition(this.frontRcPosition);
    this.backRc.origin = this.getPosition(this.backRcPosition);
    this.groundFrontRc.origin = this.getPosition(this.groundFrontRcPosition);
    this.groundBackRc.origin = this.getPosition(this.groundBackRcPosition);
  };

  preparePhysics = () => {
    this.groundedDistance =
      this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.y;

    this.frontRc = this.createRay(this.frontRcPosition, "right");
    this.backRc = this.createRay(this.backRcPosition, "left");
    this.groundBackRc = this.createRay(this.groundBackRcPosition, "bottom");
    this.groundFrontRc = this.createRay(this.groundFrontRcPosition, "bottom");

    const frontRayHelper = new RayHelper(this.frontRc);
    frontRayHelper.show(this.scene);

    const backRayHelper = new RayHelper(this.backRc);
    backRayHelper.show(this.scene);

    const groundBackRayHelper = new RayHelper(this.groundBackRc);
    groundBackRayHelper.show(this.scene);

    const groundFrontRayHelper = new RayHelper(this.groundFrontRc);
    groundFrontRayHelper.show(this.scene);

    this.scene.onBeforeRenderObservable.removeCallback(this.preparePhysics);
  };

  createRay = (position: Positions, orientation: Orientation) => {
    const length = 20;
    let origin = this.getPosition(position);
    let direction = this.getOrientation(orientation);

    return new Ray(origin, direction, length);
  };

  getPosition(position: Positions) {
    let origin = this.prefab.mesh.base.position.clone();

    if (position === "top") {
      origin.y =
        this.prefab.mesh.base.position.y +
        this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.y;
    }

    if (position === "bottom") {
      origin.y =
        this.prefab.mesh.base.position.y -
        this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.y;
    }

    if (position === "right") {
      origin.x =
        this.prefab.mesh.base.position.x +
        this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.x;
    }

    if (position === "left") {
      origin.x =
        this.prefab.mesh.base.position.x -
        this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.x;
    }

    return origin;
  }

  getOrientation(orientation: Orientation) {
    let direction = new Vector3(0, 0, 0);

    if (orientation === "top") {
      direction.y = 1;
    }

    if (orientation === "bottom") {
      direction.y = -1;
    }

    if (orientation === "right") {
      direction.x = 1;
    }

    if (orientation === "left") {
      direction.x = -1;
    }

    if (orientation === "forward") {
      direction.z = 1;
    }

    if (orientation === "backward") {
      direction.z = -1;
    }

    return direction;
  }
}

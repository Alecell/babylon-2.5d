import {
  Nullable,
  PickingInfo,
  Ray,
  RayHelper,
  Scene,
  Vector3,
} from "@babylonjs/core";

import { Prefab } from "../../interfaces/prefab";
import { Positions } from "./physics.types";
import { gameStore } from "../../store/game";
import { createRay, getPosition } from "./raycast";

/**
 * TODO: O jogador não deve poder subir qualquer rampa, a pesar de que provavelmente no jogo não haverá nenhum caminho bloqueado... Será?
 */

export class Physics {
  isGrounded = false;
  mapPoint = 0;
  groundedDistance!: number;

  frontRc!: Ray;
  backRc!: Ray;
  groundFrontRc!: Ray;
  groundBackRc!: Ray;

  frontRcPosition: Positions = "right";
  backRcPosition: Positions = "left";
  groundFrontRcPosition: Positions = "right";
  groundBackRcPosition: Positions = "left";

  constructor(
    private readonly prefab: Prefab,
    private readonly scene: Scene
  ) {
    scene.onBeforeRenderObservable.add(this.preparePhysics);
    scene.onBeforeRenderObservable.add(this.applyPhysics);
  }

  preparePhysics = () => {
    if (gameStore.map) {
      this.prefab.mesh.base.position = gameStore.map.start;
    }

    this.groundedDistance =
      this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.y;

    this.frontRc = createRay(
      this.frontRcPosition,
      "right",
      this.prefab.mesh.base
    );
    this.backRc = createRay(this.backRcPosition, "left", this.prefab.mesh.base);
    this.groundBackRc = createRay(
      this.groundBackRcPosition,
      "bottom",
      this.prefab.mesh.base
    );
    this.groundFrontRc = createRay(
      this.groundFrontRcPosition,
      "bottom",
      this.prefab.mesh.base
    );

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

  applyPhysics = () => {
    this.updateRaysPosition();
    this.checkGrounded();

    if (!this.isGrounded) this.applyGravity();
  };

  updateRaysPosition = () => {
    this.frontRc.origin = getPosition(
      this.frontRcPosition,
      this.prefab.mesh.base
    );
    this.backRc.origin = getPosition(
      this.backRcPosition,
      this.prefab.mesh.base
    );
    this.groundFrontRc.origin = getPosition(
      this.groundFrontRcPosition,
      this.prefab.mesh.base
    );
    this.groundBackRc.origin = getPosition(
      this.groundBackRcPosition,
      this.prefab.mesh.base
    );
  };

  checkGrounded = () => {
    const groundFrontHit = this.scene.pickWithRay(this.groundFrontRc);
    const groundBackHit = this.scene.pickWithRay(this.groundBackRc);

    /**
     * TODO: Isso aqui precisa verificar se o objeto
     * é de uma certa tag, tipo ou coisa assim
     * Não é qualquer objeto que é chão, pode ser agua
     * As vezes um inimigo, ou um objeto que não é chão
     */
    if (groundFrontHit && groundBackHit) {
      console.log(groundFrontHit, groundBackHit);
      console.log(groundFrontHit.distance.toFixed(3));
      console.log(this.prefab.mesh.base.position.y, this.groundedDistance);

      if (this.isOnGround(groundFrontHit, groundBackHit)) {
        this.isGrounded = true;
        console.log("on ground");

        if (this.isClippedOnGround(groundFrontHit, groundBackHit)) {
          this.snapToGroundSurface(groundFrontHit, groundBackHit);
        }
      } else {
        console.log("off ground");
        this.isGrounded = false;
      }
    }
    console.log("--------------------------------");
  };

  isOnGround = (groundFrontHit: PickingInfo, groundBackHit: PickingInfo) => {
    return (
      groundFrontHit?.distance <= this.groundedDistance ||
      groundBackHit?.distance <= this.groundedDistance
    );
  };

  isClippedOnGround = (
    groundFrontHit: PickingInfo,
    groundBackHit: PickingInfo
  ) => {
    return (
      this.groundedDistance > groundFrontHit.distance ||
      this.groundedDistance > groundBackHit.distance
    );
  };

  snapToGroundSurface = (
    groundFrontHit: PickingInfo,
    groundBackHit: PickingInfo
  ) => {
    const distance = Math.min(groundFrontHit.distance, groundBackHit.distance);
    this.prefab.mesh.base.position.y += this.groundedDistance - distance;
  };

  applyGravity = () => {
    const gravity = 0.3;
    this.prefab.mesh.base.position.y -= gravity;
  };

  moveRight = () => {
    if (this.prefab.properties) {
      this.mapPoint += this.prefab.properties.speed;
      this.moveTo(this.mapPoint);
    }
  };

  moveLeft = () => {
    if (this.prefab.properties) {
      this.mapPoint -= this.prefab.properties.speed;
      this.moveTo(this.mapPoint);
    }
  };

  moveTo = (point: number) => {
    if (!gameStore.map) return;
    const points = gameStore.map?.path.getPoints();
    const nextPointIndex = this.findNextPointIndex(points, point);
    const nextPoint = points[nextPointIndex];
    const nextNextPoint = points[nextPointIndex + 1];
    if (nextPoint && nextNextPoint) {
      const ratio =
        (point - this.calculateArcLength(points, nextPointIndex)) /
        Vector3.Distance(nextPoint, nextNextPoint);
      const newPosition = Vector3.Lerp(
        new Vector3(nextPoint.x, this.prefab.mesh.base.position.y, nextPoint.z),
        new Vector3(
          nextNextPoint.x,
          this.prefab.mesh.base.position.y,
          nextNextPoint.z
        ),
        ratio
      );
      this.prefab.mesh.base.position = newPosition;
    }
  };

  findNextPointIndex = (points: Vector3[], arcLength: number) => {
    let accumulatedLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      accumulatedLength += Vector3.Distance(points[i], points[i + 1]);
      if (accumulatedLength > arcLength) {
        return i;
      }
    }
    return points.length - 2; // return the second last index if the arcLength is beyond the total length
  };

  calculateArcLength = (points: Vector3[], endIndex: number) => {
    let accumulatedLength = 0;
    for (let i = 0; i < endIndex; i++) {
      accumulatedLength += Vector3.Distance(points[i], points[i + 1]);
    }
    return accumulatedLength;
  };
}

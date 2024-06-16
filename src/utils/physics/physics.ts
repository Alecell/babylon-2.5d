import {
  AbstractMesh,
  Mesh,
  Nullable,
  PickingInfo,
  Ray,
  RayHelper,
  Scene,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";

import { Prefab } from "../../interfaces/prefab";
import { Positions } from "./physics.types";
import { gameStore } from "../../store/game";
import { createRay, getPosition } from "./raycast";
import Decimal from "decimal.js";

/**
 * TODO: O jogador não deve poder subir qualquer rampa, a pesar de que provavelmente no jogo não haverá nenhum caminho bloqueado... Será?
 */

export class Physics {
  isGrounded = false;
  mapPoint = 0;
  groundedDistance!: Decimal;
  threshold = 0.001;

  baseRc!: Ray;
  frontRc!: Ray;
  backRc!: Ray;
  groundFrontRc!: Ray;
  groundBackRc!: Ray;

  baseRcPosition: Positions = "center";
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
    if (!gameStore.map) throw new Error("Map not found");
    this.prefab.mesh.base.position = gameStore.map.start;

    this.groundedDistance = new Decimal(
      this.prefab.mesh.base.getBoundingInfo().boundingBox.extendSizeWorld.y
    );

    this.baseRc = createRay(
      this.baseRcPosition,
      "bottom",
      this.prefab.mesh.base
    );

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

    const baseRayHelper = new RayHelper(this.baseRc);
    baseRayHelper.show(this.scene);

    this.scene.onBeforeRenderObservable.removeCallback(this.preparePhysics);
  };

  applyPhysics = () => {
    this.updateRaysPosition();
    this.checkGrounded();

    // Fazer um predicado que pegue tudo, mas exclua o player em si
    const baseHit = this.scene.pickWithRay(this.baseRc, (mesh) => {
      // console.log(mesh);
      return true;
    });
    // console.log(baseHit);

    if (!this.isGrounded) this.applyGravity();
  };

  updateRaysPosition = () => {
    this.baseRc.origin = getPosition(
      this.baseRcPosition,
      this.prefab.mesh.base
    );
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
      // console.log(groundFrontHit.getNormal());
      // console.log(groundFrontHit, groundBackHit);
      // console.log(
      //   this.prefab.mesh.base.position.y,
      //   this.groundedDistance.toNumber()
      // );

      if (this.isOnGround(groundFrontHit, groundBackHit)) {
        this.isGrounded = true;
        // console.log("on ground");

        if (this.isClippedOnGround(groundFrontHit, groundBackHit)) {
          this.snapToGroundSurface(groundFrontHit, groundBackHit);
        }
      } else {
        // console.log("off ground");
        this.isGrounded = false;
      }
    }
    // console.log("--------------------------------");
  };

  isOnGround = (groundFrontHit: PickingInfo, groundBackHit: PickingInfo) => {
    return (
      this.groundedDistance.greaterThanOrEqualTo(
        groundFrontHit.distance - this.threshold
      ) ||
      this.groundedDistance.greaterThanOrEqualTo(
        groundBackHit.distance - this.threshold
      )
    );
  };

  isClippedOnGround = (
    groundFrontHit: PickingInfo,
    groundBackHit: PickingInfo
  ) => {
    return (
      this.groundedDistance.greaterThan(groundFrontHit.distance) ||
      this.groundedDistance.greaterThan(groundBackHit.distance)
    );
  };

  snapToGroundSurface = (
    groundFrontHit: PickingInfo,
    groundBackHit: PickingInfo
  ) => {
    const distance = Decimal.min(
      groundFrontHit.distance,
      groundBackHit.distance
    );
    this.prefab.mesh.base.position.y = new Decimal(
      this.prefab.mesh.base.position.y
    )
      .plus(this.groundedDistance.minus(distance))
      .toNumber();
  };

  applyGravity = () => {
    const gravity = new Decimal(0.3);
    this.prefab.mesh.base.position.y = new Decimal(
      this.prefab.mesh.base.position.y
    )
      .minus(gravity)
      .toNumber();
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
    const nextPoint = this.findPoint(points[nextPointIndex]);
    const nextNextPoint = this.findPoint(points[nextPointIndex + 1]);
    if (nextPoint && nextNextPoint) {
      const ratio =
        (point - this.calculateArcLength(points, nextPointIndex)) /
        Vector3.Distance(nextPoint, nextNextPoint);
      const newPosition = Vector3.Lerp(nextPoint, nextNextPoint, ratio);
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

  findPoint = (point: Vector3) => {
    const prefabNextPoint = new Vector3(
      point.x,
      this.prefab.mesh.base.position.y,
      point.z
    );

    const slopeRay = new Ray(prefabNextPoint, Vector3.Down(), 20);
    const hit = this.scene.pickWithRay(slopeRay, this.isGround);
    if (hit && hit.distance) {
      const distance = new Decimal(hit.distance);
      const slopeDistance = distance.minus(this.groundedDistance);
      console.log("hit", hit);
      console.log("distance", distance.toNumber());
      console.log("slopeDistance", slopeDistance.toNumber());
      console.log("groundedDistance", this.groundedDistance.toNumber());
      console.log("----------------------------------------");
      if (slopeDistance.greaterThan(0)) {
        const prefabNextPointY = new Decimal(prefabNextPoint.y);
        prefabNextPoint.y = prefabNextPointY.minus(slopeDistance).toNumber();
        return prefabNextPoint;
      }

      if (slopeDistance.lessThan(0)) {
        const prefabNextPointY = new Decimal(prefabNextPoint.y);
        prefabNextPoint.y = prefabNextPointY.plus(slopeDistance).toNumber();
        return prefabNextPoint;
      }
    }

    return prefabNextPoint;
  };

  /**
   * TODO: O modo de verificação do chao baseado no `name` é muito ruim
   * preciso colocar algo baseado em Tags ou Metadata
   */
  isGround = (mesh: AbstractMesh) => {
    if (mesh.name === "Plane") return true;
    return false;
  };

  calculateArcLength = (points: Vector3[], endIndex: number) => {
    let accumulatedLength = 0;
    for (let i = 0; i < endIndex; i++) {
      accumulatedLength += Vector3.Distance(points[i], points[i + 1]);
    }
    return accumulatedLength;
  };
}

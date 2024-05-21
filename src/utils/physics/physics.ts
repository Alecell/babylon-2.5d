import {
  Mesh,
  MeshBuilder,
  Quaternion,
  Ray,
  RayHelper,
  Scene,
  Vector3,
} from "@babylonjs/core";

import { Prefab } from "../../interfaces/prefab";

export class Physics {
  frontRc?: Ray;
  backRc?: Ray;
  groundFrontRc?: Ray;
  groundBackRc?: Ray;

  constructor(
    private readonly prefab: Prefab,
    private readonly scene: Scene
  ) {
    const cube = MeshBuilder.CreateBox("cube", { size: 1 }, scene);
    scene.onBeforeRenderObservable.add(this.preparePhysics);
    scene.onBeforeRenderObservable.add(this.applyPhysics);
  }

  applyPhysics = () => {
    if (this.groundFrontRc) {
      this.groundFrontRc = this.createRay("left", "bottom");
      const hit = this.scene.pickWithRay(this.groundFrontRc);
      if (hit?.hit) {
        console.log("HITTED", hit);
        // O raycast atingiu um mesh
        // Você pode adicionar sua lógica aqui
      }
    }

    // const origin = this.prefab.mesh.base.position;
    // const direction = new Vector3(0, -1, 0);
    // const length = 5;
    // const ray = new Ray(origin, direction, length);
    // const rayHelper = new RayHelper(ray);
    // rayHelper.show(this.scene);
    // const hit = this.scene.pickWithRay(ray);
    // if (hit && hit.pickedMesh) {
    //   console.log("HITTED", hit.pickedMesh);
    //   // O raycast atingiu um mesh
    //   // Você pode adicionar sua lógica aqui
    // }
  };

  preparePhysics = () => {
    this.frontRc = this.createRay("right", "right");
    this.backRc = this.createRay("left", "left");
    this.groundBackRc = this.createRay("right", "bottom");
    this.groundFrontRc = this.createRay("left", "bottom");

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

  createRay = (
    position: "top" | "bottom" | "right" | "left" | "front" | "back",
    orientation: "top" | "bottom" | "right" | "left" | "forward" | "backward"
  ) => {
    const length = 5;
    let origin = this.getPosition(position);
    let direction = this.getOrientation(orientation);

    return new Ray(origin, direction, length);
  };

  getPosition(
    position: "top" | "bottom" | "right" | "left" | "front" | "back"
  ) {
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

  getOrientation(
    orientation: "top" | "bottom" | "right" | "left" | "forward" | "backward"
  ) {
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

import {
    AbstractMesh,
    Nullable,
    PickingInfo,
    Ray,
    RayHelper,
    Scene,
    Vector3,
} from "@babylonjs/core";
import Decimal from "decimal.js";

import { Prefab } from "../../interfaces/prefab";
import { Positions } from "./physics.types";
import { gameStore } from "../../store/game";
import { createRay, getPosition } from "./raycast";

/**
 * TODO O jogador não deve poder subir qualquer rampa, a pesar de que provavelmente no jogo não haverá nenhum caminho bloqueado... Será?
 *
 * TODO: Fazer o player pulas
 *
 * TODO: os raycasts laterais precisam sempre apontar para a direção do chao seja pra frente ou pra tras
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
        if (!this.prefab.properties) throw new Error("Map not found");
        this.prefab.mesh.base.position = gameStore.map.start;
        this.mapPoint = this.getInitialMapPoint();

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
        this.backRc = createRay(
            this.backRcPosition,
            "left",
            this.prefab.mesh.base
        );
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

    getInitialMapPoint = () => {
        if (!gameStore.map) return 0;
        let closestPointIndex = 0;
        let minDistance = Vector3.Distance(
            gameStore.map.start,
            gameStore.map.path.getPoints()[0]
        );

        for (let i = 1; i < gameStore.map.path.getPoints().length; i++) {
            const distance = Vector3.Distance(
                gameStore.map.start,
                gameStore.map.path.getPoints()[i]
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestPointIndex = i;
            }
        }

        let mapPoint = 0;
        for (let i = 0; i < closestPointIndex; i++) {
            mapPoint += Vector3.Distance(
                gameStore.map.path.getPoints()[i],
                gameStore.map.path.getPoints()[i + 1]
            );
        }

        return mapPoint;
    };

    applyPhysics = () => {
        this.updateRaysPosition();
        this.checkGrounded();

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
        const groundFrontHit = this.scene.pickWithRay(
            this.groundFrontRc,
            this.isGround
        );
        const groundBackHit = this.scene.pickWithRay(
            this.groundBackRc,
            this.isGround
        );
        const baseHit = this.scene.pickWithRay(this.baseRc, this.isGround);

        /**
         * TODO: Isso aqui precisa verificar se o objeto
         * é de uma certa tag, tipo ou coisa assim
         * Não é qualquer objeto que é chão, pode ser agua
         * As vezes um inimigo, ou um objeto que não é chão
         *
         * TODO: Na mesma linha do nem tudo é chao, tambem precisamos ter uma tag
         * para paredes, oq é e oq nao é parede, caso o contrario o player vai escalar a parede e fodase
         *
         * TODO: No futuro não podemos verificar o basehit e o groundFontHit e groundBackHit no mesmo lugar
         *
         * TODO: O modo de fazer o player ficar atachado a curva da rampa pode causar problemas
         * quando falamos de pulo com movimentação. No futuro precisa verificar se o player está
         * no chao pra aplciar a questao da rampa que fixa o Y dele
         */
        if (groundFrontHit || groundBackHit || baseHit) {
            if (this.isOnGround(groundFrontHit, groundBackHit, baseHit)) {
                this.isGrounded = true;

                if (
                    this.isClippedOnGround(
                        groundFrontHit,
                        groundBackHit,
                        baseHit
                    )
                ) {
                    this.snapToGroundSurface(
                        groundFrontHit,
                        groundBackHit,
                        baseHit
                    );
                }
            } else {
                this.isGrounded = false;
            }
        }
    };

    isOnGround = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let onGround = false;

        if (baseHit?.hit) {
            const baseRcReachedGround =
                this.groundedDistance.greaterThanOrEqualTo(
                    baseHit.distance - this.threshold
                );

            if (baseRcReachedGround) {
                onGround = true;
            }
        } else if (groundFrontHit?.hit || groundBackHit?.hit) {
            const frontDistance = groundFrontHit ? groundFrontHit.distance : 0;
            const backDistance = groundBackHit ? groundBackHit.distance : 0;

            const frontRcReachedGround =
                this.groundedDistance.greaterThanOrEqualTo(
                    frontDistance - this.threshold
                );
            const backRcReachedGround =
                this.groundedDistance.greaterThanOrEqualTo(
                    backDistance - this.threshold
                );

            if (frontRcReachedGround || backRcReachedGround) {
                onGround = true;
            }
        }

        return onGround;
    };

    isClippedOnGround = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let isClipped = false;

        if (baseHit) {
            isClipped = this.groundedDistance.greaterThan(baseHit.distance);
        } else if (groundFrontHit || groundBackHit) {
            const frontDistance = groundFrontHit ? groundFrontHit.distance : 0;
            const backDistance = groundBackHit ? groundBackHit.distance : 0;

            const frontRcReachedGround =
                this.groundedDistance.greaterThan(frontDistance);
            const backRcReachedGround =
                this.groundedDistance.greaterThan(backDistance);

            if (frontRcReachedGround || backRcReachedGround) {
                isClipped = true;
            }
        }

        return isClipped;
    };

    snapToGroundSurface = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let playerPosition = null;

        if (baseHit && baseHit.hit) {
            const distance = new Decimal(baseHit.distance);
            const prefabPositionY = new Decimal(
                this.prefab.mesh.base.position.y
            );
            playerPosition = prefabPositionY
                .plus(this.groundedDistance.minus(distance))
                .toNumber();
        } else if (groundFrontHit && groundFrontHit.hit) {
            const distance = new Decimal(groundFrontHit.distance);
            const prefabPositionY = new Decimal(
                this.prefab.mesh.base.position.y
            );
            playerPosition = prefabPositionY
                .plus(this.groundedDistance.minus(distance))
                .toNumber();
        } else if (groundBackHit && groundBackHit.hit) {
            const distance = new Decimal(groundBackHit.distance);
            const prefabPositionY = new Decimal(
                this.prefab.mesh.base.position.y
            );
            playerPosition = prefabPositionY
                .plus(this.groundedDistance.minus(distance))
                .toNumber();
        }

        if (playerPosition) {
            this.prefab.mesh.base.position.y = playerPosition;
        }
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

            if (!slopeDistance.equals(0)) {
                const prefabNextPointY = new Decimal(prefabNextPoint.y);
                prefabNextPoint.y = prefabNextPointY
                    .minus(slopeDistance)
                    .toNumber();
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

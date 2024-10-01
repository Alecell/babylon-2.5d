import { AbstractMesh, Nullable, PickingInfo, Ray, RayHelper, Scene, Vector3 } from "@babylonjs/core";
import Decimal from "decimal.js";

import { Prefab } from "../../interfaces/prefab";
import { Positions } from "./physics.types";
import { gameStore } from "../../store/game";
import { createRay, getPosition } from "./raycast";

/**
 * TODO O jogador não deve poder subir qualquer rampa, a pesar de que provavelmente no jogo não haverá nenhum caminho bloqueado... Será?
 *
 * TODO: os raycasts laterais precisam sempre apontar para a direção do chao seja pra frente ou pra tras
 *
 * TODO: As movimentação
 *
 * TODO: Fator de "deslisamento" do player, quando ele se move pra frente ou pra tras (fator que muda de acordo com o tipo de chão. Quem determina o fator é uma variavel no player e uma no chao), ele não deve se mover em linha reta, ele deve se mover em uma curva
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

    gravity: Decimal = new Decimal(1);
    verticalSpeed = new Decimal(0);

    constructor(
        private readonly prefab: Prefab,
        private readonly scene: Scene
    ) {
        scene.onBeforeRenderObservable.add(this.preparePhysics);
        scene.onBeforeRenderObservable.add(this.applyPhysics);
    }

    /**
     * TODO: preciso me acostumar com colocar esse tipo de erro em condicional
     * a parada é que nesses casos aqui se eu não tiver a parada tem algo MUITO errado, então
     * essas verificação jogando erros são validas
     */
    preparePhysics = () => {
        if (!gameStore.map) throw new Error("[preparePhysics] Map not found");
        if (!this.prefab.properties) throw new Error("[preparePhysics] Map not found");

        const mesh = this.prefab.mesh.base;
        const { extendSizeWorld } = mesh.getBoundingInfo().boundingBox;

        mesh.position = gameStore.map.start;
        this.mapPoint = this.getInitialMapPoint();
        this.groundedDistance = new Decimal(extendSizeWorld.y);

        this.baseRc = createRay(this.baseRcPosition, Vector3.Down(), mesh);
        this.frontRc = createRay(this.frontRcPosition, Vector3.Right(), mesh);
        this.backRc = createRay(this.backRcPosition, Vector3.Left(), mesh);
        this.groundBackRc = createRay(this.groundBackRcPosition, Vector3.Down(), mesh);
        this.groundFrontRc = createRay(this.groundFrontRcPosition, Vector3.Down(), mesh);

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
        if (!gameStore.map) throw new Error("[getInitialMapPoint] Map not found");

        const mapCurvePoints = gameStore.map.path.getPoints();
        const firstMapPoint = mapCurvePoints[0];

        let mapPoint = 0;
        let closestPointIndex = 0;
        let minDistance = Vector3.Distance(gameStore.map.start, firstMapPoint);

        for (let i = 1; i < mapCurvePoints.length; i++) {
            const distance = Vector3.Distance(gameStore.map.start, mapCurvePoints[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestPointIndex = i;
            }
        }

        for (let i = 0; i < closestPointIndex; i++) {
            mapPoint += Vector3.Distance(mapCurvePoints[i], mapCurvePoints[i + 1]);
        }

        return mapPoint;
    };

    applyPhysics = () => {
        if (!this.isGrounded) {
            this.applyGravity();
        }

        if (this.isGrounded) {
            this.verticalSpeed = new Decimal(0);
        }

        this.updateRaysPosition();
        this.checkGrounded();
    };

    updateRaysPosition = () => {
        const mesh = this.prefab.mesh.base;

        this.baseRc.origin = getPosition(this.baseRcPosition, mesh);
        this.frontRc.origin = getPosition(this.frontRcPosition, mesh);
        this.backRc.origin = getPosition(this.backRcPosition, mesh);
        this.groundFrontRc.origin = getPosition(this.groundFrontRcPosition, mesh);
        this.groundBackRc.origin = getPosition(this.groundBackRcPosition, mesh);
    };

    checkGrounded = () => {
        const groundFrontHit = this.scene.pickWithRay(this.groundFrontRc, this.isGround);
        const groundBackHit = this.scene.pickWithRay(this.groundBackRc, this.isGround);
        const baseHit = this.scene.pickWithRay(this.baseRc, this.isGround);

        if (!groundFrontHit || !groundBackHit || !baseHit) {
            throw new Error("[checkGrounded] Some raycast hit werent defined");
        }

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
        if (this.isOnGround(groundFrontHit, groundBackHit, baseHit)) {
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        if (this.willClipOnGround(groundFrontHit, groundBackHit, baseHit)) {
            this.isGrounded = true;
            this.snapToGroundSurface(groundFrontHit, groundBackHit, baseHit);
        }
    };

    isOnGround = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let onGround = false;

        if (baseHit?.hit) {
            const baseRcReachedGround = this.groundedDistance.greaterThanOrEqualTo(
                baseHit.distance - this.threshold
            );

            if (baseRcReachedGround) {
                onGround = true;
            }
        } else if (groundFrontHit?.hit || groundBackHit?.hit) {
            const frontDistance = groundFrontHit ? groundFrontHit.distance : 0;
            const backDistance = groundBackHit ? groundBackHit.distance : 0;

            const frontRcReachedGround = this.groundedDistance.greaterThanOrEqualTo(
                frontDistance - this.threshold
            );
            const backRcReachedGround = this.groundedDistance.greaterThanOrEqualTo(
                backDistance - this.threshold
            );

            if (frontRcReachedGround || backRcReachedGround) {
                onGround = true;
            }
        }

        return onGround;
    };

    willClipOnGround = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let willClip = false;

        if (this.scene.deltaTime && !this.verticalSpeed.isZero()) {
            const positionChange = this.verticalSpeed.times(new Decimal(this.scene.deltaTime).div(1000));
            const feetPosition = this.groundedDistance.minus(this.prefab.mesh.base.position.y).neg();
            const nextFeetPosition = feetPosition.minus(positionChange);

            if (baseHit && baseHit.pickedPoint) {
                willClip = new Decimal(baseHit.pickedPoint.y).greaterThan(nextFeetPosition);
            } else {
                if (groundFrontHit && groundFrontHit.pickedPoint) {
                    willClip = new Decimal(groundFrontHit.pickedPoint.y).greaterThan(nextFeetPosition);
                }

                if (groundBackHit && groundBackHit.pickedPoint) {
                    willClip = new Decimal(groundBackHit.pickedPoint.y).greaterThan(nextFeetPosition);
                }
            }
        }

        return willClip;
    };

    snapToGroundSurface = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let playerPosition = null;

        if (baseHit && baseHit.hit) {
            const distance = new Decimal(baseHit.distance);
            const prefabPositionY = new Decimal(this.prefab.mesh.base.position.y);
            playerPosition = prefabPositionY.plus(this.groundedDistance.minus(distance)).toNumber();
        } else if (groundFrontHit && groundFrontHit.hit) {
            const distance = new Decimal(groundFrontHit.distance);
            const prefabPositionY = new Decimal(this.prefab.mesh.base.position.y);
            playerPosition = prefabPositionY.plus(this.groundedDistance.minus(distance)).toNumber();
        } else if (groundBackHit && groundBackHit.hit) {
            const distance = new Decimal(groundBackHit.distance);
            const prefabPositionY = new Decimal(this.prefab.mesh.base.position.y);
            playerPosition = prefabPositionY.plus(this.groundedDistance.minus(distance)).toNumber();
        }

        if (playerPosition) {
            this.prefab.mesh.base.position.y = playerPosition;
        }
    };

    /**
     * TODO: preciso de uma formula pra gravidade, de uma forma que o player acelere caindo
     */
    applyGravity = () => {
        if (this.scene.deltaTime) {
            const deltaTime = new Decimal(this.scene.deltaTime).div(1000);

            // Atualizar a velocidade com base na aceleração da gravidade
            this.verticalSpeed = this.verticalSpeed.plus(this.gravity);

            // Atualizar a posição com base na velocidade
            const positionChange = this.verticalSpeed.times(deltaTime);
            this.prefab.mesh.base.position.y = new Decimal(this.prefab.mesh.base.position.y)
                .minus(positionChange)
                .toNumber();
        }
    };

    jump = () => {
        if (this.isGrounded) {
            this.verticalSpeed = new Decimal(-25);
            this.isGrounded = false;
        }
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
        const prefabNextPoint = new Vector3(point.x, this.prefab.mesh.base.position.y, point.z);

        if (this.isGrounded) {
            const slopeRay = new Ray(prefabNextPoint, Vector3.Down(), 20);
            const hit = this.scene.pickWithRay(slopeRay, this.isGround);

            if (hit && hit.distance) {
                const distance = new Decimal(hit.distance);
                const slopeDistance = distance.minus(this.groundedDistance);

                if (!slopeDistance.equals(0)) {
                    const prefabNextPointY = new Decimal(prefabNextPoint.y);
                    prefabNextPoint.y = prefabNextPointY.minus(slopeDistance).toNumber();
                    return prefabNextPoint;
                }
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

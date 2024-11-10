import {
    AbstractMesh,
    Nullable,
    PickingInfo,
    Ray,
    RayHelper,
    Scene,
    Vector2,
    Vector3,
} from "@babylonjs/core";
import Decimal from "decimal.js";

import { Prefab } from "../../interfaces/prefab";
import { Events, FrictionForce, Positions } from "./physics.types";
import { gameStore } from "../../store/game";
import { createRay, getPosition } from "./raycast";
import { GameObjectTypes } from "../../types/enum";
import { Friction } from "./friction";

class Force {
    direction: Vector2;
    magnitude: Decimal;
    key: string;

    constructor(direction: Vector2, magnitude: Decimal, key?: string) {
        this.direction = direction.normalize();
        this.magnitude = magnitude;
        this.key = key || this.generateKey();
    }

    scale(friction: number): Vector2 {
        const force = this.direction.scale(this.magnitude.toNumber());
        this.magnitude = this.magnitude.times(1 - friction);
        return force;
    }

    isZero(): boolean {
        return this.magnitude.lessThan(0.01);
    }

    private generateKey(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

class ForceManager {
    private forces: { [key: string]: Force } = {};

    addForce({
        direction,
        magnitude,
        key,
    }: {
        direction: Vector2;
        magnitude: Decimal;
        key?: string;
    }): string {
        // TODO: O força pode ser apenas um vector2, a magnitude estaria imbutida no vetor sem precisar passa-la como um parametro extra
        const force = new Force(direction, magnitude, key);
        this.forces[force.key] = force;
        return force.key;
    }

    applyForces(frictions: FrictionForce): {
        horizontalVelocity: Decimal;
        verticalVelocity: Decimal;
    } {
        let totalForce = new Vector2(0, 0);

        this.forces = Object.fromEntries(
            Object.entries(this.forces).filter(([, force]) => {
                if (!force.isZero()) {
                    totalForce = totalForce.add(force.scale(frictions.horizontal));
                    return true;
                }
                return false;
            })
        );

        const horizontalVelocity = new Decimal(totalForce.x);
        const verticalVelocity = new Decimal(totalForce.y);

        return { horizontalVelocity, verticalVelocity };
    }

    removeForce(key: string) {
        delete this.forces[key];
    }
}

/**
 * TODO O jogador não deve poder subir qualquer rampa, a pesar de que provavelmente no jogo não haverá nenhum caminho bloqueado... Será?
 *
 * TODO: os raycasts laterais precisam sempre apontar para a direção do chao seja pra frente ou pra tras
 *
 * TODO: Trocar todos os numbers para Decimal
 *
 * TODO: Faz sentido definir uma força limite para o jogador? Assim poderiamos ter algo como uma aceleração
 * mas quem iria controlar isso? A fisica ou o controle? 🤔
 */

export class Physics {
    private _mapPoint = 0;
    private _events: Partial<Events> = {};

    private _baseRc!: Ray;
    private _frontRc!: Ray;
    private _backRc!: Ray;
    private _groundFrontRc!: Ray;
    private _groundBackRc!: Ray;

    private _baseRcPosition: Positions = "center";
    private _frontRcPosition: Positions = "right";
    private _backRcPosition: Positions = "left";
    private _groundFrontRcPosition: Positions = "right";
    private _groundBackRcPosition: Positions = "left";

    private _isGrounded = false;
    private _groundedDistance!: Decimal;
    private _threshold = 0.001;
    private _gravity = new Decimal(1);
    private _verticalSpeed = new Decimal(0);

    forceManager = new ForceManager();

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
        this._mapPoint = this.getInitialMapPoint();
        this._groundedDistance = new Decimal(extendSizeWorld.y);

        this._baseRc = createRay(this._baseRcPosition, Vector3.Down(), mesh);
        this._frontRc = createRay(this._frontRcPosition, Vector3.Right(), mesh);
        this._backRc = createRay(this._backRcPosition, Vector3.Left(), mesh);
        this._groundBackRc = createRay(this._groundBackRcPosition, Vector3.Down(), mesh);
        this._groundFrontRc = createRay(this._groundFrontRcPosition, Vector3.Down(), mesh);

        const frontRayHelper = new RayHelper(this._frontRc);
        frontRayHelper.show(this.scene);

        const backRayHelper = new RayHelper(this._backRc);
        backRayHelper.show(this.scene);

        const groundBackRayHelper = new RayHelper(this._groundBackRc);
        groundBackRayHelper.show(this.scene);

        const groundFrontRayHelper = new RayHelper(this._groundFrontRc);
        groundFrontRayHelper.show(this.scene);

        const baseRayHelper = new RayHelper(this._baseRc);
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
        const prevGrounded = this._isGrounded;
        const frictions = this.getFriction();
        const velocities = this.forceManager.applyForces(frictions);

        if (!this._isGrounded || !this._verticalSpeed.isZero()) {
            this.applyGravity();
        }

        this.updateRaysPosition();
        this.checkGrounded();
        this.handleLand(prevGrounded);
        this.movement(velocities.horizontalVelocity);
    };

    getFriction = (): FrictionForce => {
        const horizontal = this.getHorizontalFriction();

        return {
            horizontal,
            vertical: 0,
        };
    };

    getHorizontalFriction = () => {
        let friction = 0;

        if (this._isGrounded) {
            const frictions = [];
            const frontHit = this.scene.pickWithRay(this._frontRc, this.isGround);
            const backHit = this.scene.pickWithRay(this._backRc, this.isGround);
            const baseHit = this.scene.pickWithRay(this._baseRc, this.isGround);

            frictions.push(this.prefab.properties?.friction?.horizontal);

            if (baseHit?.hit) {
                frictions.push(baseHit.pickedMesh?.metadata?.friction.horizontal);
            } else if (frontHit?.hit) {
                frictions.push(frontHit.pickedMesh?.metadata?.friction.horizontal);
            } else if (backHit?.hit) {
                frictions.push(backHit.pickedMesh?.metadata?.friction.horizontal);
            }

            friction = Friction.calculateNormalizedWeightedAverage(frictions);
        }

        return friction;
    };

    updateRaysPosition = () => {
        const mesh = this.prefab.mesh.base;

        this._baseRc.origin = getPosition(this._baseRcPosition, mesh);
        this._frontRc.origin = getPosition(this._frontRcPosition, mesh);
        this._backRc.origin = getPosition(this._backRcPosition, mesh);
        this._groundFrontRc.origin = getPosition(this._groundFrontRcPosition, mesh);
        this._groundBackRc.origin = getPosition(this._groundBackRcPosition, mesh);
    };

    checkGrounded = () => {
        const groundFrontHit = this.scene.pickWithRay(this._groundFrontRc, this.isGround);
        const groundBackHit = this.scene.pickWithRay(this._groundBackRc, this.isGround);
        const groundBaseHit = this.scene.pickWithRay(this._baseRc, this.isGround);

        if (!groundFrontHit || !groundBackHit || !groundBaseHit) {
            throw new Error("[checkGrounded] Some raycast hit werent defined");
        }

        /**
         *
         * TODO: Na mesma linha do nem tudo é chao, tambem precisamos ter uma tag
         * para paredes, oq é e oq nao é parede, caso o contrario o player vai escalar a parede e fodase
         *
         */
        this._isGrounded = this.isOnGround(groundFrontHit, groundBackHit, groundBaseHit);

        if (this.willClipOnGround(groundFrontHit, groundBackHit, groundBaseHit)) {
            this._isGrounded = true;
            this.snapToGroundSurface(groundFrontHit, groundBackHit, groundBaseHit);
        }
    };

    isOnGround = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        baseHit: Nullable<PickingInfo>
    ) => {
        let onGround = false;

        if (groundFrontHit?.hit || groundBackHit?.hit || baseHit?.hit) {
            const baseDistance = baseHit?.hit ? baseHit.distance : 0;
            const frontDistance = groundFrontHit?.hit ? groundFrontHit.distance : 0;
            const backDistance = groundBackHit?.hit ? groundBackHit.distance : 0;

            const baseRcReachedGround = this._groundedDistance.greaterThanOrEqualTo(
                baseDistance - this._threshold
            );
            const frontRcReachedGround = this._groundedDistance.greaterThanOrEqualTo(
                frontDistance - this._threshold
            );
            const backRcReachedGround = this._groundedDistance.greaterThanOrEqualTo(
                backDistance - this._threshold
            );

            if (baseRcReachedGround || frontRcReachedGround || backRcReachedGround) {
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

        if (this.scene.deltaTime && !this._verticalSpeed.isZero()) {
            const positionChange = this._verticalSpeed.times(
                new Decimal(this.scene.deltaTime).div(1000)
            );
            const feetPosition = this._groundedDistance.minus(this.prefab.mesh.base.position.y).neg();
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
            playerPosition = prefabPositionY.plus(this._groundedDistance.minus(distance)).toNumber();
        } else if (groundFrontHit && groundFrontHit.hit) {
            const distance = new Decimal(groundFrontHit.distance);
            const prefabPositionY = new Decimal(this.prefab.mesh.base.position.y);
            playerPosition = prefabPositionY.plus(this._groundedDistance.minus(distance)).toNumber();
        } else if (groundBackHit && groundBackHit.hit) {
            const distance = new Decimal(groundBackHit.distance);
            const prefabPositionY = new Decimal(this.prefab.mesh.base.position.y);
            playerPosition = prefabPositionY.plus(this._groundedDistance.minus(distance)).toNumber();
        }

        if (playerPosition) {
            this.prefab.mesh.base.position.y = playerPosition;
        }
    };

    handleLand = (prevGrounded: boolean) => {
        if (this._isGrounded && !prevGrounded) {
            this._verticalSpeed = new Decimal(0);
            this._events["on-land"]?.(this._verticalSpeed);
        }
    };

    applyGravity = () => {
        if (this.scene.deltaTime) {
            const deltaTime = new Decimal(this.scene.deltaTime).div(1000);

            this._verticalSpeed = this._verticalSpeed.plus(this._gravity); // TODO: aplicar a gravidade como uma força de decaimento

            const positionChange = this._verticalSpeed.times(deltaTime);
            this.prefab.mesh.base.position.y = new Decimal(this.prefab.mesh.base.position.y)
                .minus(positionChange)
                .toNumber();
        }
    };

    // TODO: criar função de "pulo no ar" pode ser a mesma ou outra, mas precisa disso com uma força vindo de outra variavel
    jump = () => {
        if (this._isGrounded) {
            // TODO: essa força aqui tem q ser parametrizavel
            this._verticalSpeed = new Decimal(-25);
        }
    };

    // TODO: nao existe moveRight e moveLeft, existe um applyForce dado um botao apertado e isso que deve ser feito no lado do controller
    moveRight = () => {
        if (this.prefab.properties?.speed) {
            this.forceManager.addForce({
                key: "movement",
                direction: new Vector2(1, 0),
                magnitude: this.prefab.properties.speed,
            });
        }
    };

    moveLeft = () => {
        if (this.prefab.properties?.speed) {
            this.forceManager.addForce({
                key: "movement",
                direction: new Vector2(-1, 0),
                magnitude: this.prefab.properties.speed,
            });
        }
    };

    movement = (horizontalVelocity: Decimal) => {
        this._mapPoint += horizontalVelocity.toNumber();
        this.moveTo(this._mapPoint);
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

        if (this._isGrounded) {
            const slopeRay = new Ray(prefabNextPoint, Vector3.Down(), 20);
            const hit = this.scene.pickWithRay(slopeRay, this.isGround);

            if (hit && hit.distance) {
                const distance = new Decimal(hit.distance);
                const slopeDistance = distance.minus(this._groundedDistance);

                if (!slopeDistance.equals(0)) {
                    const prefabNextPointY = new Decimal(prefabNextPoint.y);
                    prefabNextPoint.y = prefabNextPointY.minus(slopeDistance).toNumber();
                    return prefabNextPoint;
                }
            }
        }

        return prefabNextPoint;
    };

    isGround = (mesh: AbstractMesh) => mesh.metadata?.type === GameObjectTypes.GROUND;

    calculateArcLength = (points: Vector3[], endIndex: number) => {
        let accumulatedLength = 0;
        for (let i = 0; i < endIndex; i++) {
            accumulatedLength += Vector3.Distance(points[i], points[i + 1]);
        }
        return accumulatedLength;
    };

    addEventListener = (event: keyof Events, cb: Events[keyof Events]) => {
        this._events[event] = cb;
    };
}

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
import { ForceManager } from "./force";

/**
 * TODO O jogador não deve poder subir qualquer rampa, a pesar de que provavelmente no jogo não haverá nenhum caminho bloqueado... Será?
 *
 * TODO: os raycasts laterais precisam sempre apontar para a direção do chao seja pra frente ou pra tras
 *
 * TODO: Trocar todos os numbers para Decimal
 *
 * TODO: Faz sentido definir uma força limite para o jogador? Assim poderiamos ter algo como uma aceleração
 * mas quem iria controlar isso? A fisica ou o controle? 🤔
 *
 * TODO: Se o player iniciar com os raycasts fora do chao ele precisa cair e seus raycasts entrarem no chao, atualmente
 * quando ele iniciar com os raycasts fora do chao, quando os raycasts atingem o chao o player flutua pq a gravidade
 * para de atuar quando o raycast atinge o chao
 *
 * TODO: O role do event listener poderia ser com uma classe separada de eventListener
 * assim eu definiria um events.addEventListener e a declaracao na classe seria
 * events = new Events() e dentro dela teria o eventListener, mas poderia ter, sei la
 * os eventos disponiveis e etc num events.list ou algo assim
 *
 * TODO: Fazer o pulo funcionar usando forças, fazer a gravidade ser uma força contraria
 * e funcionar a partir de uma força no controls
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
    private velocities: {
        horizontalVelocity: Decimal;
        verticalVelocity: Decimal;
    } = {
        horizontalVelocity: new Decimal(0),
        verticalVelocity: new Decimal(0),
    };

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

        if (!this._isGrounded || !this.velocities.verticalVelocity.isZero()) {
            this.applyGravity();
        }

        this.updateRaysPosition();
        this.checkGrounded();
        this.handleLand(prevGrounded);
        this.movement();

        const frictions = this.getFriction();
        this.velocities = this.forceManager.applyForces(frictions);

        console.log({
            horizontal: this.velocities.horizontalVelocity.toNumber(),
            vertical: this.velocities.verticalVelocity.toNumber(),
        });
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
        groundBaseHit: Nullable<PickingInfo>
    ) => {
        let onGround = false;

        if (groundFrontHit?.hit || groundBackHit?.hit || groundBaseHit?.hit) {
            const baseDistance = groundBaseHit?.hit ? groundBaseHit.distance : 0;
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
        groundBaseHit: Nullable<PickingInfo>
    ) => {
        let willClip = false;

        if (!this.velocities.verticalVelocity.isZero()) {
            const positionChange = this.velocities.verticalVelocity.times(
                new Decimal(this.scene.deltaTime).div(1000)
            );
            const feetPosition = this._groundedDistance.minus(this.prefab.mesh.base.position.y).neg();
            const nextFeetPosition = feetPosition.minus(positionChange);

            if (groundBaseHit && groundBaseHit?.pickedPoint) {
                willClip = new Decimal(groundBaseHit.pickedPoint.y).greaterThan(nextFeetPosition);
            } else {
                if (groundFrontHit && groundFrontHit?.pickedPoint) {
                    willClip = new Decimal(groundFrontHit.pickedPoint.y).greaterThan(nextFeetPosition);
                }

                if (groundBackHit && groundBackHit?.pickedPoint) {
                    willClip = new Decimal(groundBackHit.pickedPoint.y).greaterThan(nextFeetPosition);
                }
            }
        }

        return willClip;
    };

    snapToGroundSurface = (
        groundFrontHit: Nullable<PickingInfo>,
        groundBackHit: Nullable<PickingInfo>,
        groundBaseHit: Nullable<PickingInfo>
    ) => {
        const playerPosition = new Decimal(this.prefab.mesh.base.position.y);
        let distance: Decimal | null = null;

        if (groundBaseHit && groundBaseHit.hit) {
            distance = new Decimal(groundBaseHit.distance);
        } else if (groundFrontHit && groundFrontHit.hit) {
            distance = new Decimal(groundFrontHit.distance);
        } else if (groundBackHit && groundBackHit.hit) {
            distance = new Decimal(groundBackHit.distance);
        }

        if (distance) {
            const newPosition = playerPosition.plus(this._groundedDistance.minus(distance));
            this.prefab.mesh.base.position.y = newPosition.toNumber();
        }
    };

    handleLand = (prevGrounded: boolean) => {
        if (this._isGrounded && !prevGrounded) {
            this.forceManager.removeForce("gravity");
            this._events["on-land"]?.(this.velocities.verticalVelocity);
        }
    };

    applyGravity = () => {
        if (this.scene.deltaTime) {
            const deltaTime = new Decimal(this.scene.deltaTime).div(1000);

            this.forceManager.addOnForce("gravity", this._gravity, new Vector2(0, 1));

            const positionChange = this.velocities.verticalVelocity.times(deltaTime);
            this.prefab.mesh.base.position.y = new Decimal(this.prefab.mesh.base.position.y)
                .minus(positionChange)
                .toNumber();
        }
    };

    jump = () => {
        if (this._isGrounded) {
            // TODO: essa força aqui tem q ser parametrizavel
            this.forceManager.addForce({
                key: "jump",
                direction: new Vector2(0, -1),
                magnitude: new Decimal(25),
            });
        }
    };

    movement = () => {
        this._mapPoint += this.velocities.horizontalVelocity.toNumber();
        this.moveTo(this._mapPoint);
    };

    /**
     * TODO: quase ctz que aqui precisa ter um scene.deltaTime em
     * algum lugar pra fazer o movimento ser constante independente
     * do fps.
     */
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

    calculateArcLength = (points: Vector3[], endIndex: number) => {
        let accumulatedLength = 0;
        for (let i = 0; i < endIndex; i++) {
            accumulatedLength += Vector3.Distance(points[i], points[i + 1]);
        }
        return accumulatedLength;
    };

    isGround = (mesh: AbstractMesh) => mesh.metadata?.type === GameObjectTypes.GROUND;

    addEventListener = (event: keyof Events, cb: Events[keyof Events]) => {
        this._events[event] = cb;
    };
}

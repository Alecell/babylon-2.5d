import {
    AbstractMesh,
    FollowCamera,
    Mesh,
    Scene,
    Vector3,
} from "@babylonjs/core";

/**
 * TODO: Fazer a câmera seguir o player
 *
 * TODO: Fazer a câmera rotacionar junto com o player no trilho do mapa, ou seja
 * a camera tera um "script" que ela seguirá de acordo com onde o player está no mapa
 * é como se fosse um outro trilho, mas para a camera em si
 */

export class Camera {
    constructor(mesh: Mesh, scene: Scene) {
        const camera = new FollowCamera(
            "Camera",
            new Vector3(0, 10, -10),
            scene
        );
        camera.lockedTarget = mesh as AbstractMesh;
        scene.activeCamera = camera;
    }
}

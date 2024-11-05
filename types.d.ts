// Images
declare module "*.jpg";
declare module "*.png";
declare module "*.env";

// 3D types
declare module "*.glb";
declare module "*.babylon";
declare module "*.stl";

// Physics
declare module "ammo.js";

// Overwrite babylon types
/**
 * TODO: por algum motivo isso não ta funcionando
 * deveria sobrescrever o tipo do AbstractMesh do babylon
 * mas não está.
 * - Quando mudo pra @babylonjs/core funciona o autocomplete, mas quebra os imports (não testei o build),
 * - Quando importo o tipo do Metadata de outro arquivo funciona o autocomplete e os imports, mas quebra o build
 * - Quando declaro o tipo do Metadata aqui, não funciona o autocomplete, mas funciona o build e os imports
 *
 * ** Quando digo que funciona o build é que ele não quebra, não sei se ele tipa corretamente no build**
 */
// declare module "@babylonjs/core/Meshes/abstractMesh" {
//     interface AbstractMesh {
//         metadata: any;
//     }
// }

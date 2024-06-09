import { Curve3, Scene, Sound, Vector3 } from "@babylonjs/core";
import { GenericObject } from "../types/object";

export class Map {
  protected _bgMusic!: Sound;
  protected _sounds!: GenericObject<Sound>;

  constructor(
    public name: string,
    public readonly path: Curve3,
    public readonly start: Vector3,
    protected readonly scene: Scene
  ) {}
}

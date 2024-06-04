import { Curve3, Scene, Sound } from "@babylonjs/core";
import { GenericObject } from "../types/object";

export class Map {
  protected _bgMusic!: Sound;
  protected _sounds!: GenericObject<Sound>;

  constructor(
    public name: string,
    protected readonly path: Curve3,
    protected readonly scene: Scene
  ) {}
}

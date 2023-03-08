import { Animatable, Scene, Skeleton } from '@babylonjs/core';

export type TAnimationsTypes = 'idle' | 'run';

export type TAnimations<T> = {
  [type in TAnimationsTypes]: T;
};

export class Animation {
  private activeAnimation: TAnimationsTypes = 'idle'
  private animations: TAnimations<Animatable>;

  private deactivate: TAnimations<Function> = {
    idle: () => this.animations.idle!.weight = 0,
    run: () => this.animations.run!.weight = 0,
  }

  constructor(private skeleton: Skeleton, private scene: Scene) {
    this.animations = {
      idle: this.scene.beginWeightedAnimation(this.skeleton, 0, 89, 0, true),
      run: this.scene.beginWeightedAnimation(this.skeleton, 119, 135, 0, true)
    }
  }

  idle() {
    if (this.activeAnimation !== 'idle') {
      this.animations.idle.weight = 1.0;
      this.deactivate[this.activeAnimation]();
      this.activeAnimation = 'idle';
    }
  }

  run() {
    if (this.activeAnimation !== 'run') {
      this.animations.run.weight = 1.0;
      this.deactivate[this.activeAnimation]();
      this.activeAnimation = 'run';
    }
  }
}
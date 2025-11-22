/// <reference types="vite/client" />

// this keeps vite-style asset imports from raising TS warnings:
declare module "*.png" {
  const value: string;
  export = value;
}

// Type declarations for noa-engine (if types are not available)
declare module "noa-engine" {
  export class Engine {
    constructor(options: any);
    debug: boolean;
    showFPS: boolean;
    camera: any;
    world: any;
    entities: any;
    inputs: any;
    rendering: any;
    registry: {
      registerMaterial(name: string, options: any): void;
      registerBlock(id: number, options: any): number;
    };
    playerEntity: number;
    targetedBlock: any;
    timeScale: number;
    setBlock(id: number, x: number, y: number, z: number): void;
    addBlock(id: number, x: number, y: number, z: number): void;
    setPaused(paused: boolean): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }
}

// Type declarations for voxel-crunch
declare module "voxel-crunch" {
  export function encode(
    chunk: ArrayLike<number>,
    runs?: Uint8Array
  ): Uint8Array;
  export function decode(
    runs: Uint8Array,
    chunk: ArrayLike<number>
  ): ArrayLike<number>;
}

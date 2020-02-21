/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import * as THREE from 'three';
import { Destructible, ObservableSet, observe, unobserve, Observer } from '@pixano/core';
import { SceneView } from './scene-view';
import { Cuboid } from './types';
import { findPtsInBox } from './utils';


/** An invisible plane used for raycasting on the ground. */
export class GroundPlot extends THREE.Mesh implements Destructible {
  constructor() {
    const geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide });
    // make sure the transparent ground does not write to the depthMap
    // so that it does not hide anything behind it (e.g.: box aopacity)
    material.depthWrite = false;
    super(geometry, material);
  }

  destroy() {
    this.geometry.dispose();
    (<THREE.MeshBasicMaterial>this.material).dispose();
  }
}


/** Flat rectangle parametrized by two vertices and its orientation. */
export class GroundRectangle extends THREE.Mesh implements Destructible {
  private _bottomLeft: THREE.Vector3;
  get bottomLeft() {
    return this._bottomLeft;
  }
  set bottomLeft(value) {
    this._bottomLeft = value;
    this.updateAttitude();
  }

  private _topRight: THREE.Vector3;
  get topRight() {
    return this._topRight;
  }
  set topRight(value) {
    this._topRight = value;
    this.updateAttitude();
  }

  get color() {
    return (<THREE.MeshBasicMaterial>this.material).color.getHex();
  }
  set color(value: number) {
    (<THREE.MeshBasicMaterial>this.material).color.set(value);
  }

  //@ts-ignore
  constructor(bottomLeft: THREE.Vector3, topRight: THREE.Vector3, heading: number, color=0xffffff) {
    const geometry = new THREE.PlaneBufferGeometry(1, 1);
    geometry.lookAt(new THREE.Vector3(0, 0, 1));
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    super(geometry, material);

    this.color = color;
    this.rotateZ(heading);
    this._bottomLeft = bottomLeft;
    this._topRight = topRight;
  }

  destroy() {
    this.geometry.dispose();
    (<THREE.MeshBasicMaterial>this.material).dispose();
  }

  private updateAttitude() {
    this.position.lerpVectors(this.bottomLeft, this.topRight, 0.5);
    const diag = new THREE.Vector3().subVectors(this.topRight, this.bottomLeft);
    const l = Math.abs(diag.x * Math.cos(this.rotation.z) + diag.y * Math.sin(this.rotation.z));
    const w = Math.abs(- diag.x * Math.sin(this.rotation.z) + diag.y * Math.cos(this.rotation.z));
    this.scale.set(l, w, 1);
  }
}


/** A simple colored disk */
export class GroundDisc extends THREE.Mesh {
  get color() {
    return (<THREE.MeshBasicMaterial>this.material).color.getHex();
  }
  set color(value: number) {
    (<THREE.MeshBasicMaterial>this.material).color.set(value);
  }

  constructor(radius=1., color=0xffffff) {
    const geometry = new THREE.CircleGeometry(radius, 32);
    geometry.lookAt(new THREE.Vector3(0, 0, 1));
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    super(geometry, material);
    this.color = color;
  }

  destroy() {
    this.geometry.dispose();
    (<THREE.MeshBasicMaterial>this.material).dispose();
  }
}


/** Simple Scatter plot. */
export class PointCloudPlot extends THREE.Points implements Destructible {
    get positionBuffer(): Float32Array {
      const attr = <THREE.BufferAttribute>(<THREE.BufferGeometry>this.geometry).getAttribute('position');
      return (<Float32Array>attr.array).subarray(0, attr.count * 3);
    }
    set positionBuffer(value) {
      const attr = <THREE.BufferAttribute>(<THREE.BufferGeometry>this.geometry).getAttribute('position');
      if (attr.array != value) {
        attr.copyArray(value);
        attr.count = value.length / 3;
      }
      attr.needsUpdate = true;
    }

    get colors(): Float32Array {
      const attr = <THREE.BufferAttribute>(<THREE.BufferGeometry>this.geometry).getAttribute('color');
      return (<Float32Array>attr.array).subarray(0, attr.count * 3);
    }
    set colors(value) {
      const attr = <THREE.BufferAttribute>(<THREE.BufferGeometry>this.geometry).getAttribute('color');
      if (attr.array != value) {
        attr.copyArray(value);
        attr.count = value.length / 3;
      }
      attr.needsUpdate = true;
    }

    constructor(maxPts=300000) {
      const positionBuffer = new Float32Array(maxPts * 3)
      positionBuffer.fill(0);
      const colorBuffer = new Float32Array(maxPts * 3);
      colorBuffer.fill(1);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colorBuffer, 3));

      const material = new THREE.PointsMaterial({
        vertexColors: THREE.VertexColors,
        opacity: 1,
        size: 1.7,
        fog: false,
        flatShading : true,
        sizeAttenuation: false
      });

      super(geometry, material);
      this.frustumCulled = false;
    }

    public plusSize() {
      //@ts-ignore
      this.material.size = Math.min(this.material.size + 0.2, 5);
    }

    public minusSize() {
      //@ts-ignore
      this.material.size = Math.max(this.material.size - 0.2, 0.3);
    }

    public destroy() {
      this.geometry.dispose();
      // @ts-ignore
      this.material.dispose();
    }
  }


/** Cuboid plot with edges and translucid faces. */
export class CuboidPlot extends THREE.Group implements Destructible {
  private colors: THREE.Color[];

  set color(c: number) {
    for (const color of this.colors) {
      color.set(c);
    }
  }

  constructor(cuboid: Cuboid) {
    super();

    const [x, y, z] = cuboid.position;
    const [l, w, h] = cuboid.size;
    const color = 0xffffff;
    const opacity = 0.5;
    const boxGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial(
        {transparent: true, opacity});
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    this.add(box);
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial(
      {linewidth: 1, color: color});
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.add(edges);
    const triGeometry = new THREE.Geometry();
    triGeometry.vertices.push(
      new THREE.Vector3(0, -1 / 2, -1 / 2),
      new THREE.Vector3(1 / 2, 0, -1 / 2),
      new THREE.Vector3(1 / 2, 0, -1 / 2),
      new THREE.Vector3(0, 1 / 2, -1 / 2));
    const tri = new THREE.LineSegments(triGeometry, edgesMaterial);
    this.add(tri);
    this.rotateZ(cuboid.heading);
    this.scale.set(l, w, h);
    this.position.set(x, y, z);

    this.colors = [boxMaterial.color, edgesMaterial.color];
  }

  destroy() {
    this.traverse((child) => {
      if ( child instanceof THREE.Mesh || child instanceof THREE.LineSegments ) {
        child.geometry.dispose();
        (<THREE.Material>child.material).dispose();
      }
    });
  }
}


/**
 * Manages the plots for a list of editable cuboids.
 */
export class CuboidSetManager implements Destructible {
  private viewer: SceneView;
  readonly plotsMap = new Map<Cuboid, CuboidPlot>();
  readonly annotationsMap = new Map<CuboidPlot, Cuboid>();

  private observers = new Map<object, Observer>();  // to ensure proper disposal

  // Setup
  constructor(viewer: SceneView, annotations: ObservableSet<Cuboid>) {
    const observer = observe(annotations, (op, value) => {
      if (op === "add") {
        this.createCuboidPlot(value);
      } else if (op === "delete") {
        this.deleteCuboidPlot(value);
      } else if (op === "clear") {
        for (const cuboid of this.plotsMap.keys()) {
          this.deleteCuboidPlot(cuboid);
        }
      }
    });
    this.observers.set(annotations, observer);

    for (const cuboid of annotations) {
      this.createCuboidPlot(cuboid);
    }
    this.viewer = viewer;
  }

  createCuboidPlot(cuboid: Cuboid) {
    const plot = new CuboidPlot(cuboid);
    //@ts-ignore
    plot.color = cuboid['color'] || 0xffffff;

    const observer = observe(cuboid, (prop: string, value: any) => {
      if (prop == "position") {
        plot.position.set(value[0], value[1], value[2]);
      }
      else if (prop == "size") {
        plot.scale.set(value[0], value[1], value[2]);
      }
      else if (prop == "heading") {
        plot.rotation.set(0, 0, value);
      } else if (prop == "color") {
        plot.color = value;
      }
    });
    this.observers.set(cuboid, observer);

    this.viewer.scene.add(plot);
    this.plotsMap.set(cuboid, plot);
    this.annotationsMap.set(plot, cuboid);
  }

  deleteCuboidPlot(cuboid: Cuboid) {
    const plot = this.plotsMap.get(cuboid)!;
    this.viewer.scene.remove(plot);
    plot.destroy();
    this.plotsMap.delete(cuboid);
    this.annotationsMap.delete(plot);
  }

  destroy() {
    for (const [target, observer] of this.observers) {
      unobserve(target, observer);
    }
    for (const cuboid of this.plotsMap.keys()) {
      this.deleteCuboidPlot(cuboid);
    }
  }
}


/** Continously updates the colors of pointcloud points inside cuboids. */
export class InnerPointsPainter implements Destructible {
  private pclPlot: PointCloudPlot;
  private innerPoints = new Map<Cuboid, Uint32Array>();
  private observers = new Map<object, Observer>();

  constructor(pclPlot: PointCloudPlot, cuboids: ObservableSet<Cuboid>) {
    this.pclPlot = pclPlot;

    const observer = observe(cuboids, (op, value?) => {
      if (op === "add") {
        this.innerPoints.set(value, new Uint32Array(0));
        this.updateInnerPoints(value);
        this.updateColorBuffer();

        const observer = observe(value, (op) => {
          if (op === "position" || op === "size"  || op === "heading" || op === "color") {
            this.updateInnerPoints(value);
            this.updateColorBuffer();
          }
        });
        this.observers.set(value, observer);
      } else if (op === "delete") {
        const colors = this.pclPlot.colors;
        for (const i of this.innerPoints.get(value)!) {
          colors[i * 3] = 1.;
          colors[i * 3 + 1] = 1.;
          colors[i * 3 + 2] = 1.;
        }
        this.innerPoints.delete(value);
        unobserve(value, this.observers.get(value)!);
        this.observers.delete(value);
        this.updateColorBuffer();
      } else if (op === "clear") {
        this.innerPoints.clear();
        for (const [target, observer] of this.observers.entries()) {
          if (target !== cuboids) {
            unobserve(target, observer);
          }
        }
        this.blankColorBuffer();
      }
    });
    this.observers.set(cuboids, observer);
  }

  updateInnerPoints(cuboid: Cuboid) {
    const oldInnerPoints = this.innerPoints.get(cuboid)!;
    const newInnerPoints = findPtsInBox(this.pclPlot.positionBuffer, cuboid);
    const colors = this.pclPlot.colors;
    for (const i of oldInnerPoints) {  // restore default colors
      colors[i * 3] = 1.;
      colors[i * 3 + 1] = 1.;
      colors[i * 3 + 2] = 1.;
    }

    this.innerPoints.set(cuboid, newInnerPoints);
    this.updateColorBuffer();
  }

  updateColorBuffer() { // Only the inner points are updated!
    const colors = this.pclPlot.colors;

    for (const [cuboid, innerPoints] of this.innerPoints.entries()) {
      if ("color" in cuboid) {
        const color = new THREE.Color(cuboid['color']);
        for (const i of innerPoints) {
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
      }
    }

    this.pclPlot.colors = colors;
  }

  blankColorBuffer() {
    const colors = this.pclPlot.colors;
    colors.fill(1.);
    this.pclPlot.colors = colors;
  }

  destroy() {
    for (const [target, observer] of this.observers.entries()) {
      unobserve(target, observer);
    }
  }
}
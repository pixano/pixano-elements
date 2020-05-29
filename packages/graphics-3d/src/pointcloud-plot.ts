/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible } from '@pixano/core';

const numMax = 300000;

/** Simple Scatter plot. */
export class PointCloudPlot extends THREE.Points implements Destructible {

  maxPts: number;

    get positionBuffer(): Float32Array {
      const attr = (this.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
      return (attr.array as Float32Array).subarray(0, attr.count * 3);
    }

    set positionBuffer(value) {
      const attr = (this.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
      if (attr.array !== value) {
        attr.copyArray(value);
        attr.count = value.length / 3;
      }
      attr.needsUpdate = true;
    }

    get count() {
      const attr = (this.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
      return attr.count;
    }

    get colors(): Float32Array {
      const attr = (this.geometry as THREE.BufferGeometry).getAttribute('color') as THREE.BufferAttribute;
      return (attr.array as Float32Array).subarray(0, attr.count * 3);
    }
    set colors(value) {
      const attr = (this.geometry as THREE.BufferGeometry).getAttribute('color') as THREE.BufferAttribute;
      if (attr.array !== value) {
        attr.copyArray(value);
        attr.count = value.length / 3;
      }
      attr.needsUpdate = true;
    }

    constructor(maxPts: number = numMax) {
      const positionBuffer = new Float32Array(maxPts * 3)
      positionBuffer.fill(0);
      const colorBuffer = new Float32Array(maxPts * 3);
      colorBuffer.fill(1);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colorBuffer, 3));

      const material = new THREE.PointsMaterial({
        vertexColors: true,
        opacity: 1,
        size: 1.7,
        fog: false,
        flatShading : true,
        sizeAttenuation: false
      });

      super(geometry, material);
      this.frustumCulled = false;
      this.maxPts = maxPts;
    }

    public plusSize() {
      // @ts-ignore
      this.material.size = Math.min(this.material.size + 0.2, 5);
    }

    public minusSize() {
      // @ts-ignore
      this.material.size = Math.max(this.material.size - 0.2, 0.3);
    }

    public destroy() {
      this.geometry.dispose();
      // @ts-ignore
      this.material.dispose();
    }
}

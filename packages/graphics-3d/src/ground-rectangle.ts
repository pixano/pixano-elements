/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';
import { Destructible } from '@pixano/core';

/** Flat rectangle parametrized by two vertices and its orientation. */
export class GroundRectangle extends THREE.Mesh implements Destructible {

    private _bottomLeft: THREE.Vector3;

    private _topRight: THREE.Vector3;

    get bottomLeft() {
        return this._bottomLeft;
    }

    set bottomLeft(value) {
        this._bottomLeft = value;
        this.updateAttitude();
    }

    get topRight() {
        return this._topRight;
    }

    set topRight(value) {
        this._topRight = value;
        this.updateAttitude();
    }

    get color() {
        return this.material.color.getHex();
    }

    set color(value: number) {
        this.material.color.set(value);
    }

    get material() {
        return super.material as THREE.MeshBasicMaterial;
    }

    set material(material) {
        super.material = material;
    }

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
        this.material.dispose();
    }

    private updateAttitude() {
        this.position.lerpVectors(this.bottomLeft, this.topRight, 0.5);
        const diag = new THREE.Vector3().subVectors(this.topRight, this.bottomLeft);
        const l = Math.abs(diag.x * Math.cos(this.rotation.z) + diag.y * Math.sin(this.rotation.z));
        const w = Math.abs(- diag.x * Math.sin(this.rotation.z) + diag.y * Math.cos(this.rotation.z));
        this.scale.set(l, w, 1);
    }
}
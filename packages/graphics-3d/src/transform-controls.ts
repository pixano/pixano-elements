/**
 * Custom transform controls inspired
 * by mrdoob / https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/TransformControls.js
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import {
	BoxBufferGeometry,
	BufferGeometry,
	Color,
	CylinderBufferGeometry,
	DoubleSide,
	Euler,
	Float32BufferAttribute,
	Line,
	LineBasicMaterial,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	OctahedronBufferGeometry,
	PlaneBufferGeometry,
	Quaternion,
	Raycaster,
	TorusBufferGeometry,
	Camera,
	Vector3,
	PerspectiveCamera,
	OrthographicCamera
} from "three";

export class TransformControls extends Object3D {

	domElement: HTMLElement;

	// API
	camera: Camera;
	object: Object3D | undefined;
	// Whether or not the controls are enabled.
	enabled: boolean = true;
	// The current transformation axis.
	axis: string | null = null;
	mode: string = "scale";
	translationSnap: number | null = null;
	rotationSnap: number | null = null;
	space: string = "local";
	// The size of the helper UI (axes/planes). Default is 1.
	size: number = 1;
	// Whether or not dragging is currently performed. Read-only property.
	dragging: boolean = false;
	showX: boolean = true;
	showY: boolean = true;
	showZ: boolean = true;
	visible: boolean = false;
	readonly isTransformControls: true = true;
	gizmo = new TransformControlsGizmo();
	plane = new TransformControlsPlane();
	changeEvent: any = { type: "change" };
	mouseDownEvent: any = { type: "mouseDown" };
	objectChangeEvent: any = { type: "objectChange" };
	mouseUpEvent: any = { type: "mouseUp", mode: this.mode };

	// Reusable utility variables

	ray = new Raycaster();

	_tempVector = new Vector3();
	_tempVector2 = new Vector3();
	_tempQuaternion = new Quaternion();
	_unit = {
		X: new Vector3(1, 0, 0),
		Y: new Vector3(0, 1, 0),
		Z: new Vector3(0, 0, 1)
	};

	pointStart = new Vector3();
	pointEnd = new Vector3();
	offset = new Vector3();
	rotationAxis = new Vector3();
	startNorm = new Vector3();
	endNorm = new Vector3();
	rotationAngle = 0;

	cameraPosition = new Vector3();
	cameraQuaternion = new Quaternion();
	cameraScale = new Vector3();

	parentPosition = new Vector3();
	parentQuaternion = new Quaternion();
	parentQuaternionInv = new Quaternion();
	parentScale = new Vector3();

	worldPositionStart = new Vector3();
	worldQuaternionStart = new Quaternion();
	worldScaleStart = new Vector3();

	worldPosition = new Vector3();
	worldQuaternion = new Quaternion();
	worldQuaternionInv = new Quaternion();
	worldScale = new Vector3();

	eye = new Vector3();

	positionStart = new Vector3();
	quaternionStart = new Quaternion();
	scaleStart = new Vector3();

	scaleSnap: number | null = null;

	// Gizmo direction is same as axis
	xDirection: boolean = true;
	yDirection: boolean = true;
	zDirection: boolean = true;

	constructor(object: Camera, domElement: HTMLElement) {
		super();
		this.camera = object;
		this.domElement = domElement;
		this.add(this.gizmo);
		this.add(this.plane);

		this.defineProperty("camera", this.camera);
		this.defineProperty("object", this.object);
		this.defineProperty("enabled", this.enabled);
		this.defineProperty("axis", this.axis);
		this.defineProperty("mode", this.mode);
		this.defineProperty("translationSnap", this.translationSnap);
		this.defineProperty("rotationSnap", this.rotationSnap);
		this.defineProperty("space", this.space);
		this.defineProperty("size", this.size);
		this.defineProperty("dragging", this.dragging);
		this.defineProperty("showX", this.showX);
		this.defineProperty("showY", this.showY);
		this.defineProperty("showZ", this.showZ);


		this.defineProperty("worldPosition", this.worldPosition);
		this.defineProperty("worldPositionStart", this.worldPositionStart);
		this.defineProperty("worldQuaternion", this.worldQuaternion);
		this.defineProperty("worldQuaternionStart", this.worldQuaternionStart);
		this.defineProperty("cameraPosition", this.cameraPosition);
		this.defineProperty("cameraQuaternion", this.cameraQuaternion);
		this.defineProperty("pointStart", this.pointStart);
		this.defineProperty("pointEnd", this.pointEnd);
		this.defineProperty("rotationAxis", this.rotationAxis);
		this.defineProperty("rotationAngle", this.rotationAngle);
		this.defineProperty("eye", this.eye);

		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerHover = this.onPointerHover.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);

		domElement.addEventListener("mousedown", this.onPointerDown, false);
		domElement.addEventListener("touchstart", this.onPointerDown, false);
		document.addEventListener("mousemove", this.onPointerHover, false);
		domElement.addEventListener("touchmove", this.onPointerHover, false);
		domElement.addEventListener("touchmove", this.onPointerMove, false);
		document.addEventListener("mouseup", this.onPointerUp, false);
		domElement.addEventListener("touchend", this.onPointerUp, false);
		domElement.addEventListener("touchcancel", this.onPointerUp, false);
		domElement.addEventListener("touchleave", this.onPointerUp, false);

		// show configured axis for default mode
		this.setMode(this.mode);
	}

	// Set current object
	attach(object: Object3D): this {
		this.object = object;
		this.visible = true;
		return this;
	}

	// Detatch from object
	detach(): this {
		this.object = undefined;
		this.visible = false;
		this.axis = null;
		return this;
	}

	getMode(): string {
		return this.mode;
	}

	setMode(mode: string): void {
		this.mode = mode;
		if (this.mode === "rotate") {
			this.showX = false;
			this.showY = false;
			this.showZ = true;
		} else if (this.mode === "scale") {
			this.showX = true;
			this.showY = true;
			this.showZ = true;
		} else if (this.mode === "translate") {
			this.showX = true;
			this.showY = true;
			this.showZ = false;
		}
	}

	setTranslationSnap(translationSnap: number | null): void {
		this.translationSnap = translationSnap;
	}

	setRotationSnap(rotationSnap: number | null): void {
		this.rotationSnap = rotationSnap;
	}

	setSize(size: number): void {
		this.size = size;
	}

	setSpace(space: string): void {
		this.space = space;
	}

	dispose(): void {
		this.domElement.removeEventListener("mousedown", this.onPointerDown);
		this.domElement.removeEventListener("touchstart", this.onPointerDown);
		document.removeEventListener("mousemove", this.onPointerHover);
		document.removeEventListener("mousemove", this.onPointerMove);
		this.domElement.removeEventListener("touchmove", this.onPointerHover);
		this.domElement.removeEventListener("touchmove", this.onPointerMove);
		document.removeEventListener("mouseup", this.onPointerUp);
		this.domElement.removeEventListener("touchend", this.onPointerUp);
		this.domElement.removeEventListener("touchcancel", this.onPointerUp);
		this.domElement.removeEventListener("touchleave", this.onPointerUp);

		this.traverse((child) => {
			if (child instanceof Mesh || child instanceof Line) {
				child.geometry.dispose();
			}

			if (child instanceof Mesh || child instanceof Line) {
				(child.material as THREE.Material).dispose();
			}

		});
	}

	// Defined getter, setter and store for a property
	defineProperty(propName, defaultValue) {

		let propValue = defaultValue;
		const scope = this;
		Object.defineProperty(scope, propName, {
			get: () => {
				return propValue !== undefined ? propValue : defaultValue;
			},
			set: (value) => {
				if (propValue !== value) {
					propValue = value;
					scope.plane[propName] = value;
					scope.gizmo[propName] = value;
					scope.dispatchEvent({ type: `${propName}-changed`, value });
					scope.dispatchEvent(scope.changeEvent);
				}
			}

		});

		scope[propName] = defaultValue;
		this.plane[propName] = defaultValue;
		this.gizmo[propName] = defaultValue;

	}

	// updateMatrixWorld	updates key transformation variables
	updateMatrixWorld() {

		if (this.object !== undefined) {
			this.object.updateMatrixWorld();
			if (this.object.parent === null) {
				console.error('TransformControls: The attached 3D object must be a part of the scene graph.');
			} else {
				this.object.parent.matrixWorld.decompose(this.parentPosition, this.parentQuaternion, this.parentScale);
			}
			this.object.matrixWorld.decompose(this.worldPosition, this.worldQuaternion, this.worldScale);
			this.parentQuaternionInv.copy(this.parentQuaternion).inverse();
			this.worldQuaternionInv.copy(this.worldQuaternion).inverse();
		}
		this.camera.updateMatrixWorld();
		this.camera.matrixWorld.decompose(this.cameraPosition, this.cameraQuaternion, this.cameraScale);
		if (this.camera instanceof PerspectiveCamera) {
			this.eye.copy(this.cameraPosition).sub(this.worldPosition).normalize();
		} else if (this.camera instanceof OrthographicCamera) {
			this.eye.copy(this.cameraPosition).normalize();
		}
		super.updateMatrixWorld();
	}

	pointerHover(pointer) {

		if (this.object === undefined || this.dragging === true || (pointer.button !== undefined && pointer.button !== 0)) return;

		this.ray.setFromCamera(pointer, this.camera);
		const intersect = this.ray.intersectObjects(this.gizmo.picker[this.mode].children, true)[0] || false;
		if (intersect) {
			this.axis = intersect.object.name;
		} else {
			this.axis = null;
		}
	}

	pointerDown(pointer) {

		if (this.object === undefined || this.dragging === true || (pointer.button !== undefined && pointer.button !== 0)) return;

		if ((pointer.button === 0 || pointer.button === undefined) && this.axis !== null) {

			this.ray.setFromCamera(pointer, this.camera);
			const planeIntersect = this.ray.intersectObjects([this.plane], true)[0] || false;
			if (planeIntersect) {
				let space = this.space;
				if (this.mode === 'scale') {
					space = 'local';
				} else if (this.axis === 'E' || this.axis === 'XYZE' || this.axis === 'XYZ') {
					space = 'world';
				}
				if (space === 'local' && this.mode === 'rotate') {
					const snap = this.rotationSnap;
					if (this.axis === 'X' && snap) this.object.rotation.x = Math.round(this.object.rotation.x / snap) * snap;
					if (this.axis === 'Y' && snap) this.object.rotation.y = Math.round(this.object.rotation.y / snap) * snap;
					if (this.axis === 'Z' && snap) this.object.rotation.z = Math.round(this.object.rotation.z / snap) * snap;
				}

				this.object.updateMatrixWorld();
				this.object.parent!.updateMatrixWorld();

				this.positionStart.copy(this.object.position);
				this.quaternionStart.copy(this.object.quaternion);
				this.scaleStart.copy(this.object.scale);

				this.object.matrixWorld.decompose(this.worldPositionStart, this.worldQuaternionStart, this.worldScaleStart);

				this.pointStart.copy(planeIntersect.point).sub(this.worldPositionStart);

				// set direction of gizmos for scaling
				this.xDirection = this.gizmo.gizmo.scale.children.find((c) => c.name === 'X')!.scale.x > 0;
				this.yDirection = this.gizmo.gizmo.scale.children.find((c) => c.name === 'Y')!.scale.y > 0;
				this.zDirection = this.gizmo.gizmo.scale.children.find((c) => c.name === 'Z')!.scale.z > 0;

			}
			this.dragging = true;
			this.mouseDownEvent.mode = this.mode;
			this.dispatchEvent(this.mouseDownEvent);
		}
	}

	pointerMove(pointer) {

		let axis = this.axis;
		const mode = this.mode;
		const object = this.object;
		let space = this.space;

		if (mode === 'scale') {
			space = 'local';
		} else if (axis === 'E' || axis === 'XYZE' || axis === 'XYZ') {
			space = 'world';
		}

		if (object === undefined || axis === null || this.dragging === false || (pointer.button !== undefined && pointer.button !== 0)) return;

		this.ray.setFromCamera(pointer, this.camera);
		const planeIntersect = this.ray.intersectObjects([this.plane], true)[0];

		if (!planeIntersect) return;

		this.pointEnd.copy(planeIntersect.point).sub(this.worldPositionStart);

		if (mode === 'translate') {

			// Apply translate
			this.offset.copy(this.pointEnd).sub(this.pointStart);
			if (space === 'local' && axis !== 'XYZ') {
				this.offset.applyQuaternion(this.worldQuaternionInv);
			}

			if (axis.indexOf('X') === - 1) this.offset.x = 0;
			if (axis.indexOf('Y') === - 1) this.offset.y = 0;
			if (axis.indexOf('Z') === - 1) this.offset.z = 0;

			if (space === 'local' && axis !== 'XYZ') {
				this.offset.applyQuaternion(this.quaternionStart).divide(this.parentScale);
			} else {
				this.offset.applyQuaternion(this.parentQuaternionInv).divide(this.parentScale);
			}
			object.position.copy(this.offset).add(this.positionStart);

			// Apply translation snap
			if (this.translationSnap) {
				if (space === 'local') {
					object.position.applyQuaternion(this._tempQuaternion.copy(this.quaternionStart).inverse());
					if (axis.search('X') !== - 1) {
						object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
					}
					if (axis.search('Y') !== - 1) {
						object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
					}
					if (axis.search('Z') !== - 1) {
						object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
					}
					object.position.applyQuaternion(this.quaternionStart);
				}

				if (space === 'world') {
					if (object.parent) {
						object.position.add(this._tempVector.setFromMatrixPosition(object.parent.matrixWorld));
					}
					if (axis.search('X') !== - 1) {
						object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
					}
					if (axis.search('Y') !== - 1) {
						object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
					}
					if (axis.search('Z') !== - 1) {
						object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
					}
					if (object.parent) {

						object.position.sub(this._tempVector.setFromMatrixPosition(object.parent.matrixWorld));

					}
				}
			}
		} else if (mode === 'scale') {
			// edit of original scaling behaviour
			// asymetrical scaling instead of symetrical
			// scaling factor is ratio between clicked point and moving point
			// w.r.t initial center of the box
			// both of opposite scaling gizmos are visible (except when overlapping)
			// instead of only the closer
			let factor = 0.5;
			if (axis.search('XYZ') !== - 1) {
				axis = axis.slice(3);
			} else {
				factor *= -1;
			}

			this._tempVector.copy(this.pointStart);
			this._tempVector2.copy(this.pointEnd);

			this._tempVector.applyQuaternion(this.worldQuaternionInv);
			this._tempVector2.applyQuaternion(this.worldQuaternionInv);

			this._tempVector2.divide(this._tempVector);

			// compute offset to cancel out scaling
			this.offset.copy(this.scaleStart).multiply(this._tempVector2).sub(this.scaleStart);

			if (!this.xDirection) {
				this.offset.x *= -1;
			}
			if (!this.yDirection) {
				this.offset.y *= -1;
			}
			if (!this.zDirection) {
				this.offset.z *= -1;
			}
			if (axis !== 'X') {
				this._tempVector2.x = 1;
				this.offset.x = 0;
			}
			if (axis !== 'Y') {
				this._tempVector2.y = 1;
				this.offset.y = 0;
			}
			if (axis !== 'Z') {
				this._tempVector2.z = 1;
				this.offset.z = 0;
			}
			this.offset.applyQuaternion(this.quaternionStart).divide(this.parentScale);
			object.position.copy(this.positionStart).add(this.offset.multiplyScalar(factor));

			// Apply scale
			object.scale.copy(this.scaleStart).multiply(this._tempVector2);

			if (this.scaleSnap) {
				if (axis.search('X') !== - 1) {
					object.scale.x = Math.round(object.scale.x / this.scaleSnap) * this.scaleSnap || this.scaleSnap;
				}
				if (axis.search('Y') !== - 1) {
					object.scale.y = Math.round(object.scale.y / this.scaleSnap) * this.scaleSnap || this.scaleSnap;
				}
				if (axis.search('Z') !== - 1) {
					object.scale.z = Math.round(object.scale.z / this.scaleSnap) * this.scaleSnap || this.scaleSnap;
				}
			}
		} else if (mode === 'rotate') {

			this.offset.copy(this.pointEnd).sub(this.pointStart);
			const ROTATION_SPEED = 20 / this.worldPosition.distanceTo(this._tempVector.setFromMatrixPosition(this.camera.matrixWorld));

			if (axis === 'E') {
				this.rotationAxis.copy(this.eye);
				this.rotationAngle = this.pointEnd.angleTo(this.pointStart);
				this.startNorm.copy(this.pointStart).normalize();
				this.endNorm.copy(this.pointEnd).normalize();
				this.rotationAngle *= (this.endNorm.cross(this.startNorm).dot(this.eye) < 0 ? 1 : - 1);
			} else if (axis === 'XYZE') {
				this.rotationAxis.copy(this.offset).cross(this.eye).normalize();
				this.rotationAngle = this.offset.dot(this._tempVector.copy(this.rotationAxis).cross(this.eye)) * ROTATION_SPEED;
			} else if (axis === 'X' || axis === 'Y' || axis === 'Z') {
				this.rotationAxis.copy(this._unit[axis]);
				this._tempVector.copy(this._unit[axis]);
				if (space === 'local') {
					this._tempVector.applyQuaternion(this.worldQuaternion);
				}
				this.rotationAngle = this.offset.dot(this._tempVector.cross(this.eye).normalize()) * ROTATION_SPEED;
			}

			// Apply rotation snap

			if (this.rotationSnap) this.rotationAngle = Math.round(this.rotationAngle / this.rotationSnap) * this.rotationSnap;

			this.rotationAngle = this.rotationAngle;

			// Apply rotate
			if (space === 'local' && axis !== 'E' && axis !== 'XYZE') {
				object.quaternion.copy(this.quaternionStart);
				object.quaternion.multiply(this._tempQuaternion.setFromAxisAngle(this.rotationAxis, this.rotationAngle)).normalize();
			} else {
				this.rotationAxis.applyQuaternion(this.parentQuaternionInv);
				object.quaternion.copy(this._tempQuaternion.setFromAxisAngle(this.rotationAxis, this.rotationAngle));
				object.quaternion.multiply(this.quaternionStart).normalize();
			}
		}
		this.dispatchEvent(this.changeEvent);
		this.dispatchEvent(this.objectChangeEvent);
	}

	pointerUp(pointer) {

		if (pointer.button !== undefined && pointer.button !== 0) return;

		if (this.dragging && (this.axis !== null)) {
			this.mouseUpEvent.mode = this.mode;
			this.dispatchEvent(this.mouseUpEvent);
		}
		this.dragging = false;
		if (pointer.button === undefined) this.axis = null;
	}

	// normalize mouse / touch pointer and remap {x,y} to view space.
	getPointer(event) {
		if (document.pointerLockElement) {
			return {
				x: 0,
				y: 0,
				button: event.button
			};
		} else {
			const pointer = event.changedTouches ? event.changedTouches[0] : event;
			const rect = this.domElement.getBoundingClientRect();
			return {
				x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
				y: - (pointer.clientY - rect.top) / rect.height * 2 + 1,
				button: event.button
			};
		}
	}

	// mouse / touch event handlers
	onPointerHover(event) {
		if (!this.enabled) return;

		this.pointerHover(this.getPointer(event));
	}

	onPointerDown(event) {
		if (!this.enabled) return;

		document.addEventListener("mousemove", this.onPointerMove, false);
		this.pointerHover(this.getPointer(event));
		this.pointerDown(this.getPointer(event));
	}

	onPointerMove(event) {
		if (!this.enabled) return;

		this.pointerMove(this.getPointer(event));
	}

	onPointerUp(event) {
		if (!this.enabled) return;

		document.removeEventListener("mousemove", this.onPointerMove, false);
		this.pointerUp(this.getPointer(event));
	}
}

class TransformControlsGizmo extends Object3D {
	type: string = 'TransformControlsGizmo';

	public isTransformControlsGizmo = true;
	object: Object3D | undefined;

	// Gizmo creation
	gizmo: { [key: string]: Object3D } = {};
	picker: { [key: string]: Object3D } = {};
	helper: { [key: string]: Object3D } = {};

	// Reusable utility variables
	tempVector = new Vector3(0, 0, 0);
	tempEuler = new Euler();
	alignVector = new Vector3(0, 1, 0);
	zeroVector = new Vector3(0, 0, 0);
	lookAtMatrix = new Matrix4();
	tempQuaternion = new Quaternion();
	tempQuaternion2 = new Quaternion();
	identityQuaternion = new Quaternion();

	unitX = new Vector3(1, 0, 0);
	unitY = new Vector3(0, 1, 0);
	unitZ = new Vector3(0, 0, 1);

	space: string = "world";
	mode: string = "scale";
	worldQuaternion = new Quaternion();
	worldPosition = new Vector3();
	cameraPosition = new Vector3();
	camera: Camera | null = null;
	size: number = 1;
	worldPositionStart = new Vector3();
	axis: string | null = null;
	eye = new Vector3();
	showX: boolean = true;
	showY: boolean = true;
	showZ: boolean = true;
	rotationAxis = new Vector3();
	dragging: boolean = false;
	worldQuaternionStart = new Quaternion();
	enabled: boolean = true;

	constructor() {
		super();
		// shared materials
		const gizmoMaterial = new MeshBasicMaterial({
			depthTest: false,
			depthWrite: false,
			transparent: true,
			side: DoubleSide,
			fog: false,
			opacity: 0.4
		});

		const gizmoLineMaterial = new LineBasicMaterial({
			depthTest: false,
			depthWrite: false,
			transparent: true,
			linewidth: 1,
			fog: false,
			opacity: 0.4
		});

		// Make unique material for each axis/color
		const matInvisible = gizmoMaterial.clone();
		matInvisible.opacity = 0.15;

		const matHelper = gizmoMaterial.clone();
		matHelper.opacity = 0.33;

		const matRed = gizmoMaterial.clone();
		matRed.color.set(0xff0000);

		const matGreen = gizmoMaterial.clone();
		matGreen.color.set(0x00ff00);

		const matBlue = gizmoMaterial.clone();
		matBlue.color.set(0x0000ff);

		const matWhiteTransparent = gizmoMaterial.clone();
		matWhiteTransparent.opacity = 0.25;

		const matYellowTransparent = matWhiteTransparent.clone();
		matYellowTransparent.color.set(0xffff00);

		const matCyanTransparent = matWhiteTransparent.clone();
		matCyanTransparent.color.set(0x00ffff);

		const matMagentaTransparent = matWhiteTransparent.clone();
		matMagentaTransparent.color.set(0xff00ff);

		const matYellow = gizmoMaterial.clone();
		matYellow.color.set(0xffff00);

		const matLineRed = gizmoLineMaterial.clone();
		matLineRed.color.set(0xff0000);

		const matLineGreen = gizmoLineMaterial.clone();
		matLineGreen.color.set(0x00ff00);

		const matLineBlue = gizmoLineMaterial.clone();
		matLineBlue.color.set(0x0000ff);

		const matLineCyan = gizmoLineMaterial.clone();
		matLineCyan.color.set(0x00ffff);

		const matLineMagenta = gizmoLineMaterial.clone();
		matLineMagenta.color.set(0xff00ff);

		const matLineYellow = gizmoLineMaterial.clone();
		matLineYellow.color.set(0xffff00);

		const matLineGray = gizmoLineMaterial.clone();
		matLineGray.color.set(0x787878);

		const matLineYellowTransparent = matLineYellow.clone();
		matLineYellowTransparent.opacity = 0.25;

		// reusable geometry
		const arrowGeometry = new CylinderBufferGeometry(0, 0.05, 0.2, 12, 1, false);

		const scaleHandleGeometry = new BoxBufferGeometry(0.125, 0.125, 0.125);

		const lineGeometry = new BufferGeometry();
		lineGeometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));

		// Gizmo definitions - custom hierarchy definitions for setupGizmo() function

		const gizmoTranslate = {
			X: [
				[new Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, - Math.PI / 2], null, 'fwd'],
				[new Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, Math.PI / 2], null, 'bwd'],
				[new Line(lineGeometry, matLineRed)]
			],
			Y: [
				[new Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, 'fwd'],
				[new Mesh(arrowGeometry, matGreen), [0, 1, 0], [Math.PI, 0, 0], null, 'bwd'],
				[new Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]]
			],
			Z: [
				[new Mesh(arrowGeometry, matBlue), [0, 0, 1], [Math.PI / 2, 0, 0], null, 'fwd'],
				[new Mesh(arrowGeometry, matBlue), [0, 0, 1], [- Math.PI / 2, 0, 0], null, 'bwd'],
				[new Line(lineGeometry, matLineBlue), null, [0, - Math.PI / 2, 0]]
			],
			XYZ: [
				[new Mesh(new OctahedronBufferGeometry(0.1, 0), matWhiteTransparent.clone()), [0, 0, 0], [0, 0, 0]]
			],
			XY: [
				[new Mesh(new PlaneBufferGeometry(0.295, 0.295), matYellowTransparent.clone()), [0.15, 0.15, 0]],
				[new Line(lineGeometry, matLineYellow), [0.18, 0.3, 0], null, [0.125, 1, 1]],
				[new Line(lineGeometry, matLineYellow), [0.3, 0.18, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]
			],
			YZ: [
				[new Mesh(new PlaneBufferGeometry(0.295, 0.295), matCyanTransparent.clone()), [0, 0.15, 0.15], [0, Math.PI / 2, 0]],
				[new Line(lineGeometry, matLineCyan), [0, 0.18, 0.3], [0, 0, Math.PI / 2], [0.125, 1, 1]],
				[new Line(lineGeometry, matLineCyan), [0, 0.3, 0.18], [0, - Math.PI / 2, 0], [0.125, 1, 1]]
			],
			XZ: [
				[new Mesh(new PlaneBufferGeometry(0.295, 0.295), matMagentaTransparent.clone()), [0.15, 0, 0.15], [- Math.PI / 2, 0, 0]],
				[new Line(lineGeometry, matLineMagenta), [0.18, 0, 0.3], null, [0.125, 1, 1]],
				[new Line(lineGeometry, matLineMagenta), [0.3, 0, 0.18], [0, - Math.PI / 2, 0], [0.125, 1, 1]]
			]
		};

		const pickerTranslate = {
			X: [
				[new Mesh(new CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0.6, 0, 0], [0, 0, - Math.PI / 2]]
			],
			Y: [
				[new Mesh(new CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0.6, 0]]
			],
			Z: [
				[new Mesh(new CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0, 0.6], [Math.PI / 2, 0, 0]]
			],
			XYZ: [
				[new Mesh(new OctahedronBufferGeometry(0.2, 0), matInvisible)]
			],
			XY: [
				[new Mesh(new PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0.2, 0]]
			],
			YZ: [
				[new Mesh(new PlaneBufferGeometry(0.4, 0.4), matInvisible), [0, 0.2, 0.2], [0, Math.PI / 2, 0]]
			],
			XZ: [
				[new Mesh(new PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0, 0.2], [- Math.PI / 2, 0, 0]]
			]
		};

		const helperTranslate = {
			START: [
				[new Mesh(new OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']
			],
			END: [
				[new Mesh(new OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']
			],
			DELTA: [
				[new Line(this.TranslateHelperGeometry(), matHelper), null, null, null, 'helper']
			],
			X: [
				[new Line(lineGeometry, matHelper.clone()), [- 1e3, 0, 0], null, [1e6, 1, 1], 'helper']
			],
			Y: [
				[new Line(lineGeometry, matHelper.clone()), [0, - 1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']
			],
			Z: [
				[new Line(lineGeometry, matHelper.clone()), [0, 0, - 1e3], [0, - Math.PI / 2, 0], [1e6, 1, 1], 'helper']
			]
		};

		const gizmoRotate = {
			X: [
				[new Line(this.CircleGeometry(1, 0.5), matLineRed)],
				[new Mesh(new OctahedronBufferGeometry(0.04, 0), matRed), [0, 0, 0.99], null, [1, 3, 1]],
			],
			Y: [
				[new Line(this.CircleGeometry(1, 0.5), matLineGreen), null, [0, 0, - Math.PI / 2]],
				[new Mesh(new OctahedronBufferGeometry(0.04, 0), matGreen), [0, 0, 0.99], null, [3, 1, 1]],
			],
			Z: [
				[new Line(this.CircleGeometry(1, 0.5), matLineBlue), null, [0, Math.PI / 2, 0]],
				[new Mesh(new OctahedronBufferGeometry(0.04, 0), matBlue), [0.99, 0, 0], null, [1, 3, 1]],
			],
			E: [
				[new Line(this.CircleGeometry(1.25, 1), matLineYellowTransparent), null, [0, Math.PI / 2, 0]],
				[new Mesh(new CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [1.17, 0, 0], [0, 0, - Math.PI / 2], [1, 1, 0.001]],
				[new Mesh(new CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [- 1.17, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.001]],
				[new Mesh(new CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [0, - 1.17, 0], [Math.PI, 0, 0], [1, 1, 0.001]],
				[new Mesh(new CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [0, 1.17, 0], [0, 0, 0], [1, 1, 0.001]],
			],
			XYZE: [
				[new Line(this.CircleGeometry(1, 1), matLineGray), null, [0, Math.PI / 2, 0]]
			]
		};

		const helperRotate = {
			AXIS: [
				[new Line(lineGeometry, matHelper.clone()), [- 1e3, 0, 0], null, [1e6, 1, 1], 'helper']
			]
		};

		const pickerRotate = {
			Z: [
				[new Mesh(new TorusBufferGeometry(1, 0.2, 4, 24), matInvisible), [0, 0, 0], [0, 0, - Math.PI / 2]],
			]
		};

		const gizmoScale = {
			X: [
				[new Mesh(scaleHandleGeometry, matRed), [-1.1, 0, 0], [0, 0, - Math.PI / 2]],
				[new Line(lineGeometry, matLineRed), null, null, [-1.1, 1, 1]]
			],
			Y: [
				[new Mesh(scaleHandleGeometry, matGreen), [0, -1.1, 0]],
				[new Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2], [-1.1, 1, 1]]
			],
			Z: [
				[new Mesh(scaleHandleGeometry, matBlue), [0, 0, -1.1], [Math.PI / 2, 0, 0]],
				[new Line(lineGeometry, matLineBlue), null, [0, - Math.PI / 2, 0], [-1.1, 1, 1]]
			],
			XYZX: [
				[new Mesh(scaleHandleGeometry, matRed.clone()), [1.1, 0, 0], [0, 0, - Math.PI / 2]],
				[new Line(lineGeometry, matLineRed), null, null, [1.1, 1, 1]]
			],
			XYZY: [
				[new Mesh(scaleHandleGeometry, matGreen.clone()), [0, 1.1, 0]],
				[new Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2], [1.1, 1, 1]]
			],
			XYZZ: [
				[new Mesh(scaleHandleGeometry, matBlue.clone()), [0, 0, 1.1], [Math.PI / 2, 0, 0]],
				[new Line(lineGeometry, matLineBlue), null, [0, - Math.PI / 2, 0], [1.1, 1, 1]]
			]
		};
		// hit area
		// quick hack to use scaling on both sides of the cube
		// replace xyz+axis for opposite axis
		const pickerScale = {
			X: [
				[new Mesh(new BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [-1.1, 0, 0]]
			],
			Y: [
				[new Mesh(new BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, -1.1, 0]],
			],
			Z: [
				[new Mesh(new BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, -1.1]],
			],
			XYZX: [
				[new Mesh(new BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [1.1, 0, 0]],
			],
			XYZY: [
				[new Mesh(new BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 1.1, 0]],
			],
			XYZZ: [
				[new Mesh(new BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, 1.1]],
			]
		};

		const helperScale = {
			X: [
				[new Line(lineGeometry, matHelper.clone()), [- 1e3, 0, 0], null, [1e6, 1, 1], 'helper']
			],
			Y: [
				[new Line(lineGeometry, matHelper.clone()), [0, - 1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']
			],
			Z: [
				[new Line(lineGeometry, matHelper.clone()), [0, 0, - 1e3], [0, - Math.PI / 2, 0], [1e6, 1, 1], 'helper']
			]
		};

		this.add(this.gizmo.translate = this.setupGizmo(gizmoTranslate));
		this.add(this.gizmo.rotate = this.setupGizmo(gizmoRotate));
		this.add(this.gizmo.scale = this.setupGizmo(gizmoScale));
		this.add(this.picker.translate = this.setupGizmo(pickerTranslate));
		this.add(this.picker.rotate = this.setupGizmo(pickerRotate));
		this.add(this.picker.scale = this.setupGizmo(pickerScale));
		this.add(this.helper.translate = this.setupGizmo(helperTranslate));
		this.add(this.helper.rotate = this.setupGizmo(helperRotate));
		this.add(this.helper.scale = this.setupGizmo(helperScale));

		// Pickers should be hidden always
		this.picker.translate.visible = false;
		this.picker.rotate.visible = false;
		this.picker.scale.visible = false;
	}

	CircleGeometry(radius, arc) {
		const geometry = new BufferGeometry();
		const vertices: number[] = [];
		for (let i = 0; i <= 64 * arc; ++i) {
			vertices.push(0, Math.cos(i / 32 * Math.PI) * radius, Math.sin(i / 32 * Math.PI) * radius);
		}
		geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
		return geometry;
	}

	// Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position
	TranslateHelperGeometry() {
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));
		return geometry;
	}

	// Creates an Object3D with gizmos described in custom hierarchy definition.
	setupGizmo(gizmoMap: { [key: string]: any[] }) {

		const gizmo = new Object3D();
		for (const name of Object.keys(gizmoMap)) {
			for (let i = gizmoMap[name].length; i--;) {

				const object = gizmoMap[name][i][0].clone();
				const position = gizmoMap[name][i][1];
				const rotation = gizmoMap[name][i][2];
				const scale = gizmoMap[name][i][3];
				const tag = gizmoMap[name][i][4];

				// name and tag properties are essential for picking and updating logic.
				object.name = name;
				object.tag = tag;

				if (position) {
					object.position.set(position[0], position[1], position[2]);
				}
				if (rotation) {
					object.rotation.set(rotation[0], rotation[1], rotation[2]);
				}
				if (scale) {
					object.scale.set(scale[0], scale[1], scale[2]);
				}
				object.updateMatrix();
				const tempGeometry = object.geometry.clone();
				tempGeometry.applyMatrix4(object.matrix);
				object.geometry = tempGeometry;
				object.renderOrder = Infinity;
				object.position.set(0, 0, 0);
				object.rotation.set(0, 0, 0);
				object.scale.set(1, 1, 1);
				gizmo.add(object);
			}
		}
		return gizmo;
	}

	updateMatrixWorld() {

		if (!this.object) {
			return;
		}

		let space = this.space;

		if (this.mode === 'scale') space = 'local'; // scale always oriented to local rotation

		const quaternion = space === "local" ? this.worldQuaternion : this.identityQuaternion;

		// Show only gizmos for current transform mode
		this.gizmo.translate.visible = this.mode === "translate";
		this.gizmo.rotate.visible = this.mode === "rotate";
		this.gizmo.scale.visible = this.mode === "scale";
		this.helper.translate.visible = this.mode === "translate";
		this.helper.rotate.visible = this.mode === "rotate";
		this.helper.scale.visible = this.mode === "scale";


		let handles: Gizmo[] = [];
		handles = handles.concat(this.picker[this.mode].children as Gizmo[]); // interactive area
		handles = handles.concat(this.gizmo[this.mode].children as Gizmo[]); // lines and meshes
		handles = handles.concat(this.helper[this.mode].children as Gizmo[]);

		// eyeDistance increases with unzoom
		const eyeDistance = (this.camera instanceof OrthographicCamera) ?
			60 / (this.size * this.camera.zoom) :
			this.worldPosition.distanceTo(this.cameraPosition);

		for (const handle of handles) {
			// hide aligned to camera
			handle.visible = true;
			handle.rotation.set(0, 0, 0);
			handle.position.copy(this.worldPosition);
			handle.scale.set(1, 1, 1).multiplyScalar(eyeDistance * this.size / 7);

			// TODO: simplify helpers and consider decoupling from gizmo
			// Helper direction lines
			if (handle.tag === 'helper') {
				handle.visible = false;
				if (handle.name === 'AXIS') {
					handle.position.copy(this.worldPositionStart);
					handle.visible = !!this.axis;
					if (this.axis === 'X') {
						this.tempQuaternion.setFromEuler(this.tempEuler.set(0, 0, 0));
						handle.quaternion.copy(quaternion).multiply(this.tempQuaternion);
						if (Math.abs(this.alignVector.copy(this.unitX).applyQuaternion(quaternion).dot(this.eye)) > 0.9) {
							handle.visible = false;
						}
					}
					if (this.axis === 'Y') {
						this.tempQuaternion.setFromEuler(this.tempEuler.set(0, 0, Math.PI / 2));
						handle.quaternion.copy(quaternion).multiply(this.tempQuaternion);
						if (Math.abs(this.alignVector.copy(this.unitY).applyQuaternion(quaternion).dot(this.eye)) > 0.9) {
							handle.visible = false;
						}
					}
					if (this.axis === 'Z') {
						this.tempQuaternion.setFromEuler(this.tempEuler.set(0, Math.PI / 2, 0));
						handle.quaternion.copy(quaternion).multiply(this.tempQuaternion);
						if (Math.abs(this.alignVector.copy(this.unitZ).applyQuaternion(quaternion).dot(this.eye)) > 0.9) {
							handle.visible = false;
						}
					}

					if (this.axis === 'XYZE') {
						this.tempQuaternion.setFromEuler(this.tempEuler.set(0, Math.PI / 2, 0));
						this.alignVector.copy(this.rotationAxis);
						handle.quaternion.setFromRotationMatrix(this.lookAtMatrix.lookAt(this.zeroVector, this.alignVector, this.unitY));
						handle.quaternion.multiply(this.tempQuaternion);
						handle.visible = this.dragging;
					}
					if (this.axis === 'E') {
						handle.visible = false;
					}
					handle.visible = this.axis?.search(handle.name) !== - 1;
				} else if (handle.name === 'START') {
					handle.position.copy(this.worldPositionStart);
					handle.visible = this.dragging;
				} else if (handle.name === 'END') {
					handle.position.copy(this.worldPosition);
					handle.visible = this.dragging;
				} else if (handle.name === 'DELTA') {
					handle.position.copy(this.worldPositionStart);
					handle.quaternion.copy(this.worldQuaternionStart);
					this.tempVector.set(1e-10, 1e-10, 1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(- 1);
					this.tempVector.applyQuaternion(this.worldQuaternionStart.clone().inverse());
					handle.scale.copy(this.tempVector);
					handle.visible = this.dragging;
				} else {
					handle.quaternion.copy(quaternion);
					if (this.dragging) {
						handle.position.copy(this.worldPositionStart);
					} else {
						handle.position.copy(this.worldPosition);
					}
					if (this.axis) {
						// only show axis of interest for XYZx scale mode
						const axis = this.mode === 'scale' ? this.axis?.replace('XYZ', '') : this.axis;
						handle.visible = axis.search(handle.name) !== - 1;
					}
				}
				// If updating helper, skip rest of the loop
				continue;
			}

			// Align handles to current local or world rotation
			handle.quaternion.copy(quaternion);
			if (this.mode === 'translate' || this.mode === 'scale') {
				// Hide translate and scale axis facing the camera
				const AXIS_HIDE_TRESHOLD = 0.99;
				const PLANE_HIDE_TRESHOLD = 0.2;
				const AXIS_FLIP_TRESHOLD = 0.0;

				if (handle.name === 'X' || handle.name === 'XYZX') {
					if (Math.abs(this.alignVector.copy(this.unitX).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'Y' || handle.name === 'XYZY') {
					if (Math.abs(this.alignVector.copy(this.unitY).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'Z' || handle.name === 'XYZZ') {
					if (Math.abs(this.alignVector.copy(this.unitZ).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
					if (this.mode === 'scale') {
						const el = Math.abs(this.alignVector.copy(this.unitZ).applyQuaternion(quaternion).dot(this.eye));
						const lat = Math.abs(this.alignVector.copy(this.unitY).applyQuaternion(quaternion).dot(this.eye));
						const lon = Math.abs(this.alignVector.copy(this.unitX).applyQuaternion(quaternion).dot(this.eye));
						if (el > 0.72 && el < 0.82 && lat > 0.56 && lat < 0.70 ||
							el > 0.72 && el < 0.82 && lon > 0.56 && lon < 0.70) {
							handle.scale.set(1e-10, 1e-10, 1e-10);
							handle.visible = false;
						}
					}
				}
				if (handle.name === 'XY') {
					if (Math.abs(this.alignVector.copy(this.unitZ).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'YZ') {
					if (Math.abs(this.alignVector.copy(this.unitX).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'XZ') {
					if (Math.abs(this.alignVector.copy(this.unitY).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}

				// Flip translate and scale axis ocluded behind another axis
				if (handle.name.search('X') !== - 1) {
					if (this.alignVector.copy(this.unitX).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
						if (handle.tag === 'fwd') {
							handle.visible = false;
						} else if (this.mode === 'translate') {
							handle.scale.x *= - 1;
						}
					} else if (handle.tag === 'bwd') {
						handle.visible = false;
					}
				}
				if (handle.name.search('Y') !== - 1) {
					if (this.alignVector.copy(this.unitY).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
						if (handle.tag === 'fwd') {
							handle.visible = false;
						} else if (this.mode === 'translate') {
							handle.scale.y *= - 1;
						}
					} else if (handle.tag === 'bwd') {
						handle.visible = false;
					}
				}
				if (handle.name.search('Z') !== - 1) {
					if (this.alignVector.copy(this.unitZ).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
						if (handle.tag === 'fwd') {
							handle.visible = false;
						} else if (this.mode === 'translate') {
							handle.scale.z *= - 1;
						}
					} else if (handle.tag === 'bwd') {
						handle.visible = false;
					}
				}

			} else if (this.mode === 'rotate') {

				// Align handles to current local or world rotation
				this.tempQuaternion2.copy(quaternion);
				this.alignVector.copy(this.eye).applyQuaternion(this.tempQuaternion.copy(quaternion).inverse());

				if (handle.name.search("E") !== - 1) {
					handle.quaternion.setFromRotationMatrix(this.lookAtMatrix.lookAt(this.eye, this.zeroVector, this.unitY));
				}
				if (handle.name === 'X') {
					this.tempQuaternion.setFromAxisAngle(this.unitX, Math.atan2(- this.alignVector.y, this.alignVector.z));
					this.tempQuaternion.multiplyQuaternions(this.tempQuaternion2, this.tempQuaternion);
					handle.quaternion.copy(this.tempQuaternion);
				}
				if (handle.name === 'Y') {
					this.tempQuaternion.setFromAxisAngle(this.unitY, Math.atan2(this.alignVector.x, this.alignVector.z));
					this.tempQuaternion.multiplyQuaternions(this.tempQuaternion2, this.tempQuaternion);
					handle.quaternion.copy(this.tempQuaternion);
				}
				if (handle.name === 'Z') {
					this.tempQuaternion.setFromAxisAngle(this.unitZ, Math.atan2(this.alignVector.y, this.alignVector.x));
					this.tempQuaternion.multiplyQuaternions(this.tempQuaternion2, this.tempQuaternion);
					handle.quaternion.copy(this.tempQuaternion);
				}
			}

			// Hide disabled axes
			handle.visible = handle.visible && (handle.name.indexOf("X") === - 1 || this.showX);
			handle.visible = handle.visible && (handle.name.indexOf("Y") === - 1 || this.showY);
			handle.visible = handle.visible && (handle.name.indexOf("Z") === - 1 || this.showZ);
			handle.visible = handle.visible && (handle.name.indexOf("E") === - 1 || (this.showX && this.showY && this.showZ));

			// highlight selected axis
			const material = handle instanceof Mesh ? handle.material as MeshBasicMaterial :
				handle instanceof Line ? handle.material as LineBasicMaterial : null;
			if (material) {
				// keep original opacity stored in _opacity
				// keep original color stored in _color
				(material as any)._opacity = (material as any)._opacity || material.opacity;
				(material as any)._color = (material as any)._color || material.color.clone();
				material.color.copy((material as any)._color);
				material.opacity = (material as any)._opacity;
				if (!this.enabled) {
					material.opacity *= 0.5;
					material.color.lerp(new Color(1, 1, 1), 0.5);
				} else if (this.axis) {
					if (handle.name === this.axis) {
						// mouse is over handle
						material.opacity = 1.0;
						// uncomment to darken color
						// material.color.lerp( new Color( 1, 1, 1 ), 0.5 );
					} else if (this.axis.split('').some((a) => handle.name === a)) {
						// mouse intersects multiple of handles
						material.opacity = 0.4;
					} else {
						// mouse is out handle but close
						material.opacity = 0.4;
					}
				}
			}
		}
		super.updateMatrixWorld();
	};

}

class TransformControlsPlane extends Mesh {

	type = 'TransformControlsPlane';
	isTransformControlsPlane = true;
	unitX = new Vector3(1, 0, 0);
	unitY = new Vector3(0, 1, 0);
	unitZ = new Vector3(0, 0, 1);
	tempVector = new Vector3();
	dirVector = new Vector3();
	alignVector = new Vector3();
	tempMatrix = new Matrix4();
	identityQuaternion = new Quaternion();

	// shared variables
	worldQuaternion = new Quaternion();
	worldPosition = new Vector3();
	space: string = "local";
	mode: string = "scale";
	axis: string | null = null;
	eye = new Vector3();
	cameraQuaternion = new Quaternion();

	constructor() {
		super(new PlaneBufferGeometry(100000, 100000, 2, 2),
			new MeshBasicMaterial({ visible: false, wireframe: true, side: DoubleSide, transparent: true, opacity: 0.1 }));

	}

	updateMatrixWorld() {

		const space = this.space;
		this.position.copy(this.worldPosition);

		if (this.mode === 'scale') this.space = 'local'; // scale always oriented to local rotation

		this.unitX.set(1, 0, 0).applyQuaternion(space === "local" ? this.worldQuaternion : this.identityQuaternion);
		this.unitY.set(0, 1, 0).applyQuaternion(space === "local" ? this.worldQuaternion : this.identityQuaternion);
		this.unitZ.set(0, 0, 1).applyQuaternion(space === "local" ? this.worldQuaternion : this.identityQuaternion);

		// Align the plane for current transform mode, axis and space.
		this.alignVector.copy(this.unitY);

		switch (this.mode) {
			case 'translate':
			case 'scale':
				// TODO remove
				const axis = this.mode === 'scale' ? this.axis?.replace('XYZ', '') : this.axis;
				switch (axis) {
					case 'X':
						this.alignVector.copy(this.eye).cross(this.unitX);
						this.dirVector.copy(this.unitX).cross(this.alignVector);
						break;
					case 'Y':
						this.alignVector.copy(this.eye).cross(this.unitY);
						this.dirVector.copy(this.unitY).cross(this.alignVector);
						break;
					case 'Z':
						this.alignVector.copy(this.eye).cross(this.unitZ);
						this.dirVector.copy(this.unitZ).cross(this.alignVector);
						break;
					case 'XY':
						this.dirVector.copy(this.unitZ);
						break;
					case 'YZ':
						this.dirVector.copy(this.unitX);
						break;
					case 'XZ':
						this.alignVector.copy(this.unitZ);
						this.dirVector.copy(this.unitY);
						break;
					case 'XYZ':
					case 'E':
						this.dirVector.set(0, 0, 0);
						break;
				}
				break;
			case 'rotate':
			default:
				// special case for rotate
				this.dirVector.set(0, 0, 0);
		}

		if (this.dirVector.length() === 0) {
			// If in rotate mode, make the plane parallel to camera
			this.quaternion.copy(this.cameraQuaternion);

		} else {
			this.tempMatrix.lookAt(this.tempVector.set(0, 0, 0), this.dirVector, this.alignVector);
			this.quaternion.setFromRotationMatrix(this.tempMatrix);

		}
		super.updateMatrixWorld();
	}
}

interface Gizmo extends Object3D {
	tag: string;
}

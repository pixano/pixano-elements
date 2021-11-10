/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import * as THREE from 'three';


/** Combination of a scene, a camera, a renderer and the rendered canvas. */
export class SceneView {

	readonly scene: THREE.Scene;

	private _camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

	private renderer: THREE.WebGLRenderer;

	private renderPending: boolean = false;

	/** The canvas element that shows the rendering result. */
	get domElement() {
		return this.renderer.domElement;
	}

	get camera() {
		return this._camera;
	}

	get cameraMode(): "perspective" | "orthographic" {
		return this.camera instanceof THREE.PerspectiveCamera ? "perspective" : "orthographic";
	}
	set cameraMode(mode: "perspective" | "orthographic") {
		if (mode === "perspective") {
			if (this.camera instanceof THREE.PerspectiveCamera) { return; }

			const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.5, 1000);
			camera.position.z = 42;
			camera.position.x = -30;
			camera.up.set(0, 0, 1);
			camera.lookAt(this.scene.position);
			camera.aspect = this.domElement.clientWidth / this.domElement.clientHeight;
			camera.updateProjectionMatrix();

			this._camera = camera;

		} else if (mode === "orthographic") {
			if (this.camera instanceof THREE.OrthographicCamera) { return; }

			const aspect = this.domElement.clientWidth / this.domElement.clientHeight;
			const frustumSize = 20;
			const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2,
				frustumSize / 2, frustumSize / -2, this.camera.near, this.camera.far);
			camera.position.z = this.camera.position.z || 42;
			camera.position.x = this.camera.position.x || -30;
			camera.up.set(0, 0, 1);
			camera.lookAt(this.scene.position);

			this._camera = camera;

		} else {
			throw new Error("invalid argument");
		}
	}

	constructor() {
		this.scene = new THREE.Scene();
		this.scene.add(new THREE.AmbientLight(0xffffff, 1));

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000);
		renderer.gammaFactor = 1.5;
		renderer.outputEncoding = THREE.sRGBEncoding;
		this.renderer = renderer;

		const camera = new THREE.PerspectiveCamera(35, 4 / 3, 1, 1000);
		camera.position.z = 42;
		camera.position.x = -30;
		camera.up.set(0, 0, 1);
		camera.lookAt(this.scene.position);
		camera.updateProjectionMatrix();
		this._camera = camera;
	}

	/** Trigger a rendering of the scene. */
	public render() {
		if (this.renderPending) { return; }

		this.renderPending = true;
		requestAnimationFrame(() => {
			this.renderPending = false;
			this.renderer.render(this.scene, this.camera);
		});
	}

	/**
	 * Recompute camera and renderer and canvas after a window resize.
	 * @listens UIEvent#onresize
	 */
	public onResize() {
		// To be called when the parent changes.
		const parent = this.domElement.parentElement;
		if (parent) {
			this.renderer.setSize(parent.clientWidth, parent.clientHeight);
			const aspect = parent.clientWidth / parent.clientHeight;
			if (this.camera.type === "PerspectiveCamera") {
				this.camera.aspect = aspect;
			} else {
				const frustumSize = 20;
				this.camera.left = frustumSize * aspect / -2;
				this.camera.right = frustumSize * aspect / 2;
			}
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(parent.clientWidth, parent.clientHeight);
			this.render();
		}
	}

	/**
	 * Intersection between click and rendered objects
	 * @param x screen x
	 * @param y screen y
	 * @returns closest intersected object and the intersection point if any,
	 *		otherwise [null, null]
	 */
	public raycast(x: number, y: number, ...objects: THREE.Object3D[]): [THREE.Object3D, THREE.Intersection] | [null, null] {
		const canvasBounds = this.renderer.domElement.getBoundingClientRect();
		const mouse = new THREE.Vector2();
		const raycaster = new THREE.Raycaster();
		// linePrecision is deprecated:
		// raycaster.linePrecision = 0.0;
		raycaster.params.Line!.threshold = 0.0;
		mouse.x = (x - canvasBounds.left) / canvasBounds.width * 2 - 1;
		mouse.y = - (y - canvasBounds.top) / canvasBounds.height * 2 + 1;
		raycaster.setFromCamera(mouse, this.camera);

		let out: [THREE.Object3D, THREE.Intersection] | [null, null] = [null, null];
		let distance = Infinity;
		for (const o of objects) {
			const m = raycaster.intersectObject(o, true);
			if (m.length > 0 && m[0].distance < distance) {
				out = [o, m[0]];
				distance = m[0].distance;
			}
		}
		return out;
	}
}

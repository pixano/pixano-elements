/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { observable, observe, ObservableSet, BasicEventTarget, Observer, unobserve } from '@pixano/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GroundRectangle, GroundDisc, CuboidPlot, CuboidSetManager, PointCloudPlot } from "./plots";
import { SceneView } from './scene-view';
import { Cuboid } from './types';
//@ts-ignore
import { filterPtsInBox, fitToPts, transformCloud } from './utils';

/** Edit mode manager - Handles mode switching and monitors neceassary events */
export class ModeManager {
    private viewer: SceneView;
    private eventTarget: EventTarget;
    private annotations: ObservableSet<Cuboid>;
    private annotationPlots: CuboidSetManager;
    private groundPlot: THREE.Object3D;

    private observers = new Map<object, Observer>();  // to ensure proper disposal

    private mouseUpListener: any;
    private mouseMoveListener: any;
    private lastMouseMouseEvt = new MouseEvent("mousemove");
    private orbitControls: OrbitControls;
    private navigating = false;

    private editMode: EditModeController | null = null;
    private editing = false;  // mousedown
    private updatePending = false;  // mousedown+drag
    public editTarget: Cuboid | null = null;
    private pclPlot: () => PointCloudPlot;

    private createMode: CreateModeController | null = null;

    /** 'edit', 'create' or null depending on the currently active mode. */
    get mode() {
        if (this.editMode) { return 'edit'; }
        if (this.createMode) { return 'create'; }
        return null;
    }

    constructor(
            viewer: SceneView, eventTarget: EventTarget,
            annotations: ObservableSet<Cuboid>,
            annotationPlots: CuboidSetManager,
            groundPlot: THREE.Object3D,
            pclPlot: () => PointCloudPlot) {
        this.viewer = viewer;
        this.pclPlot = pclPlot;
        this.eventTarget = eventTarget;
        this.annotations = annotations;
        this.annotationPlots = annotationPlots;
        this.groundPlot = groundPlot;

        this.orbitControls = new OrbitControls(viewer.camera, viewer.domElement);
        // this.orbitControls.minDistance = 5;
        this.orbitControls.maxDistance = 150;
        this.orbitControls.enableKeys = false;

        // Event
        this.orbitControls.addEventListener("change", () => {
            this.navigating = true;
            this.viewer.render();
        });

        window.addEventListener('keydown', (evt: KeyboardEvent) => {
            if (evt.key === '+') {
                const pcl = this.pclPlot();
                if (pcl) {
                    pcl.plusSize();
                    this.viewer.render();
                }
            } else if (evt.key === '-') {
                const pcl = this.pclPlot();
                if (pcl) {
                    pcl.minusSize();
                    this.viewer.render();
                }
            }
            
          })

        // mouse movement to have the mouse position ready when needed
        this.mouseMoveListener = (evt: MouseEvent) => { this.lastMouseMouseEvt = evt; };
        this.viewer.domElement.addEventListener("mousemove", this.mouseMoveListener);

        // clicks
        this.mouseUpListener = (evt: MouseEvent) => {
            if (this.navigating || this.editing) {
                this.navigating = false;
                this.editing = false;
                return;
            }

            const plot = this.viewer.raycast(
                evt.clientX, evt.clientY, ...this.annotationPlots.plotsMap.values())[0];
            const target = plot ? this.annotationPlots.annotationsMap.get(<CuboidPlot>plot)! : null;
            if (this.editMode && !target) {
                this.setMode();
                this.editTarget = target;
            } else if (this.editMode && target && target != this.editTarget) {
                this.setMode();
                this.editTarget = target;
                this.setMode("edit");
            } else if (this.editMode && target && target == this.editTarget) {
                this.editMode.toggleMode();
                this.viewer.render();
            } else if (!this.editMode && target) {
                this.editTarget = target;
                this.setMode('edit');
            }
        };

        this.viewer.domElement.addEventListener('mouseup', this.mouseUpListener);

        // Track exernal events on annotations
        const observer1 = observe(annotations, (op, value?) => {
            if (op == "add") {
                const observer = observe(value!, op => {
                    if (op === "position" || op === "size" || op === "heading" || op === "color") {
                        this.viewer.render();
                    }
                }, Infinity);
                this.observers.set(value!, observer);
            } else if (op == "delete") {
                this.setMode();
                this.editTarget = null;
                unobserve(value, this.observers.get(value)!);
                this.observers.delete(value!);
            } else if (op == "clear") {
                if (this.editMode) { this.setMode() };
                this.editTarget = null;
                for (const [target, observer] of this.observers.entries()) {
                    if (target != annotations) {  // unobserve cuboids
                        unobserve(target, observer);
                        this.observers.delete(target!);
                    }
                }
            }
        });
        this.observers.set(annotations, observer1);

        const observer2 = observe(annotations, (op: string) => {
            if (op == "add" || op == "delete" || op == "clear") {
                this.viewer.render();
            }
        }, Infinity);
        this.observers.set(annotations, observer2);
    }

    destroy() {
        if (this.editMode)  {
            this.editMode.destroy();
        }
        if (this.createMode)  {
            this.createMode.destroy();
        }

        this.orbitControls.dispose();

        this.viewer.domElement.removeEventListener("mousemove", this.mouseMoveListener);
        this.viewer.domElement.removeEventListener("mouseup", this.mouseUpListener);

        for (const [target, observer] of this.observers) {
            unobserve(target, observer);
        }
    }

    /** Switch to another mode -
     *  @param mode 'edit', 'create' or null
     */
    setMode(mode: string | null = null) {
        // Restore default state
        if (this.editMode)  {
            this.editMode.destroy();
            this.editMode = null;

            if (this.updatePending) {  // commit pending update
                this.eventTarget.dispatchEvent(new CustomEvent("update", { detail: <any>this.editTarget }));
                this.updatePending = false;
            }

            this.eventTarget.dispatchEvent(new CustomEvent("selection", { detail: [] }));
        }

        if (this.createMode)  {
            this.createMode.destroy();
            this.createMode = null;
        }

        if (this.orbitControls.object !== this.viewer.camera) {
            this.orbitControls = new OrbitControls(this.viewer.camera, this.viewer.domElement);
        }
        this.orbitControls.enabled = true;
        this.navigating = false;
        this.editing = false;

        if (mode == "edit") {
            console.debug("entering edit mode");
            if (!this.editTarget) {
                throw new Error("cannot go into edit mode without a target");
            }

            // Set up edit mode
            const targetPlot = this.annotationPlots.plotsMap.get(this.editTarget)!;
            this.editMode = new EditModeController(this.viewer, this.editTarget, targetPlot);

            this.editMode.addEventListener("start", () => {
                this.orbitControls.enabled = false;
                this.editing = true;
            });
            this.editMode.addEventListener("change", () => { this.updatePending = true; });
            this.editMode.addEventListener("stop", () => {
                this.orbitControls.enabled = true;
                if (this.updatePending) {
                    this.eventTarget.dispatchEvent(new CustomEvent("update", { detail: <any>this.editTarget }));
                }
                this.updatePending = false;
            });

            // notify about switch to editing mode
            this.eventTarget.dispatchEvent(new CustomEvent("selection", { detail: [ this.editTarget ] }));

        // Activate creation
        } else if (mode == "create") {
            this.orbitControls.enabled = false;
            this.createMode = new CreateModeController(
                this.viewer, this.groundPlot, this.annotations,
                this.lastMouseMouseEvt, this.pclPlot);
            this.createMode.addEventListener('create', (evt: CustomEvent) => {
                this.editTarget = evt.detail;
                this.setMode("edit");
                this.eventTarget.dispatchEvent(evt);
            });
        }

        this.viewer.render();
    }
}

/**
 * Manages plots and user interaction for editing of a particular object.
 *
 * @fires Event#start when user starts to modify the target
 * @fires Event#change when the target is being changed
 * @fires Event#stop when the user stops editing the target
 */
export class EditModeController extends BasicEventTarget {
    private viewer: SceneView;
    private objControls: TransformControls;
    private updatePending = false;

    constructor(
            viewer: SceneView,
            annotation: Cuboid, plot: CuboidPlot) {
        super();
        this.viewer = viewer;
        this.objControls = new TransformControls(viewer.camera, viewer.domElement);
        this.objControls.space = 'local';
        this.objControls.attach(plot);
        this.viewer.scene.add(this.objControls);

        this.objControls.addEventListener( 'change', () => this.viewer.render() );

        // Events binding
        this.objControls.addEventListener('mouseUp', () => {
            if (this.updatePending) {
                const plot = this.objControls.object!;
                if (this.objControls.mode == 'translate') {
                    annotation.position = plot.position.toArray();
                } else if (this.objControls.mode == 'rotate') {
                    annotation.heading = plot.rotation.z;
                } else if (this.objControls.mode == 'scale') {
                    annotation.size = plot.scale.toArray();
                }
                this.updatePending = false;
            }

            this.dispatchEvent(new Event("stop"));
        });

        this.objControls.addEventListener('objectChange', () => {
            const plot = this.objControls.object!;
            if (this.objControls.mode == 'translate') {
                annotation.position = plot.position.toArray();
            } else if (this.objControls.mode == 'rotate') {
                annotation.heading = plot.rotation.z;
            } else if (this.objControls.mode == 'scale') {
                annotation.size = plot.scale.toArray();
            }

            if (!this.updatePending) {
                this.dispatchEvent(new Event('start'));
            }
            this.updatePending = true;
            this.viewer.render();
            this.dispatchEvent(new Event('change'));
        });
    }

    toggleMode() {
        if ( this.objControls.mode === "translate" ) {
            this.objControls.mode = "rotate";
            this.objControls.showX = false;
			this.objControls.showY = false;
			this.objControls.showZ = true;
        } else if ( this.objControls.mode === "rotate" ) {
            this.objControls.mode = "scale";
            this.objControls.showX = true;
			this.objControls.showY = true;
			this.objControls.showZ = true;
        } else if ( this.objControls.mode === "scale" ) {
            this.objControls.mode = "translate";
            this.objControls.showX = true;
			this.objControls.showY = true;
			this.objControls.showZ = false;
            
        }
    }

    destroy() {
        this.viewer.scene.remove(this.objControls);
        this.objControls.detach();
        this.objControls.dispose();
    }
}


/**
 * Manages plots and user interaction for object creation.
 *
 * @fires Event#start when starting the selection of the creation area
 * @fires Event#change when changing the creation area
 * @fires CustomEvent#create after object creation
 */
export class CreateModeController extends BasicEventTarget {
    private eventListeners: any[] = [];
    private viewer: SceneView;
    private groundPlot: THREE.Object3D;
    //@ts-ignore
    private annotations: Set<Cuboid>;
    private groundCursor: GroundDisc | null;
    private groundRect: GroundRectangle | null = null;
    private pclPlot: () => PointCloudPlot;

    private get state() {
        if (this.groundCursor) { return "pre"; }
        else if (this.groundRect) { return "selecting"; }
        else { return "done"; }
    }

    constructor(
            viewer: SceneView, groundPlot: THREE.Object3D,
            annotations: Set<Cuboid>, mousePos: MouseEvent,
            pclPlot: () => PointCloudPlot) {
        super();
        this.pclPlot = pclPlot;
        this.viewer = viewer;
        this.groundPlot = groundPlot;
        this.annotations = annotations;

        // Create ground cursor to provide visual feedback
        this.groundCursor = new GroundDisc(0.2, 0xff0000);
        this.viewer.scene.add(this.groundCursor);
        const cursorPos = viewer.raycast(mousePos.clientX, mousePos.clientY, groundPlot)[1];
        if (cursorPos) {
            this.groundCursor.position.copy(cursorPos.point);
        }

        // Set event listeners
        let cb1 = this.onMouseDown.bind(this);
        this.viewer.domElement.addEventListener("mousedown", cb1);
        this.eventListeners.push([this.viewer.domElement, "mousedown", cb1]);

        let cb2 = this.onMouseMove.bind(this);
        this.viewer.domElement.addEventListener("mousemove", cb2);
        this.eventListeners.push([this.viewer.domElement, "mousemove", cb2]);

        let cb3 = this.onMouseUp.bind(this);
        this.viewer.domElement.addEventListener("mouseup", cb3);
        this.eventListeners.push([this.viewer.domElement, "mouseup", cb3]);
    }

    destroy() {
        if (this.groundCursor) {
            this.viewer.scene.remove(this.groundCursor);
            this.groundCursor.destroy();
            this.groundCursor = null;
        }
        if (this.groundRect) {
            this.viewer.scene.remove(this.groundRect);
            this.groundRect.destroy();
            this.groundRect = null;
        }

        for (const [target, type, cb] of this.eventListeners) {
            target.removeEventListener(type, cb);
        }
        this.viewer.render();
    }

    onMouseMove(evt: MouseEvent) {
        // Move selection
        if (this.state == "pre") {
            const intersection = this.viewer.raycast(evt.clientX, evt.clientY, this.groundPlot)[1];
            if (!intersection) {
                console.warn("failed to update creation retangle.");
                return;
            }
            this.groundCursor!.position.copy(intersection.point);
            this.viewer.render();

        } else if (this.state == "selecting") {
            const intersection = this.viewer.raycast(evt.clientX, evt.clientY, this.groundPlot)[1];
            if (!intersection) {
                console.warn("failed to update creation retangle.");
                return;
            }
            this.groundRect!.bottomLeft = intersection.point;

            this.dispatchEvent(new Event("change"));
            this.viewer.render();
        }
    }

    onMouseDown() {
        if (this.state == "pre") {
            // Draw selection rectangle
            this.groundRect = new GroundRectangle(
                this.groundCursor!.position, this.groundCursor!.position,
                this.viewer.camera.rotation.z - Math.PI);
            this.viewer.scene.add(this.groundRect);

            // Erase ground cursor
            this.viewer.scene.remove(this.groundCursor!);
            this.groundCursor!.destroy();
            this.groundCursor = null;

            this.viewer.render();

            this.dispatchEvent(new Event("start"));
        }
    }

    onMouseUp() {
        if (this.state == "selecting") {
            // Create new object based on the drawn region
            let x = this.groundRect!.position.x;
            let y = this.groundRect!.position.y;
            let z = this.groundRect!.position.z;
            let l = Math.abs(this.groundRect!.scale.y);
            let w = Math.abs(this.groundRect!.scale.x);
            let h = 5;
            let heading = this.groundRect!.rotation.z - Math.PI / 2;

            console.debug([x, y, z], [l, w, h], heading);
            //@ts-ignore
            const miniPcl = filterPtsInBox(this.pclPlot().positionBuffer, {
                id: '',
                position: [x, y, z],
                size: [l, w, 20],
                heading: heading
            });

            if (miniPcl.length) {
                const trfPcl = transformCloud(miniPcl, [x, y, z], heading);
                const [x1, y1, z1, l1, w1, h1, heading1] = fitToPts(trfPcl);
                x += Math.cos(-heading) * x1 + Math.sin(-heading) * y1;
                y += - Math.sin(-heading) * x1 + Math.cos(-heading) * y1;
                heading += heading1;
                z = z1;
                l = l1;
                w = w1;
                h = h1;
            }

            console.debug([x, y, z], [l, w, h], heading);
            //@ts-ignore
            const cuboid = observable(<Cuboid>{
                position: [x, y, z],
                size: [l, w, h],
                heading: heading
            })

            // Cleanup creation mode
            this.destroy();

            // Add new object to the list of annotations
            this.annotations.add(cuboid);

            // Notify listeners
            this.dispatchEvent(new CustomEvent("create", { detail: cuboid }));
        };
    }
}

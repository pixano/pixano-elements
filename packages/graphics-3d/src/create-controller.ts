/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { observable, BasicEventTarget } from '@pixano/core';
import { SceneView } from './scene-view';
import { GroundRectangle, GroundCross, PointCloudPlot } from './plots';
import { Cuboid } from './types';
import { fitBoxWithAutoZ, getHeightOfPts } from './utils';
import { GroundSegmentation } from './ground-segmentation';

/**
 * Manages plots and user interaction for object creation.
 *
 * @fires Event#start when starting the selection of the creation area
 * @fires Event#change when changing the creation area
 * @fires CustomEvent#create after object creation
 */
export class CreateModeController extends BasicEventTarget {
    public creationMode: "autoFit" | "noFit" | "autoGround" = "autoFit";
    private eventListeners: any[] = [];
    private viewer: SceneView;
    private groundPlot: THREE.Object3D;
    private annotations: Set<Cuboid>;
    private groundCursor: GroundCross | null;
    private groundRect: GroundRectangle | null = null;
    private pcl: PointCloudPlot;
    private groundSegmentation: GroundSegmentation;
    private get state() {
        if (this.groundCursor) { return "pre"; }
        else if (this.groundRect) { return "selecting"; }
        else { return "done"; }
    }

    constructor(
            viewer: SceneView, groundPlot: THREE.Object3D,
            annotations: Set<Cuboid>, mousePos: MouseEvent,
            pcl: PointCloudPlot,
            groundSegmentation: GroundSegmentation) {
        super();
        this.pcl = pcl;
        this.viewer = viewer;
        this.groundPlot = groundPlot;
        this.annotations = annotations;
        this.groundSegmentation = groundSegmentation;

        // put ground plot z at estimated z ground plane at point (0,0) if available
        const [success, z] = this.groundSegmentation.projectToGround([0,0,0]);
        if (success) {
            this.groundPlot.position.setZ(z);
        }

        // Create ground cursor to provide visual feedback
        // Uncomment next line if you want to display a disc insteaf of
        // the vertical and horizontal lines
        // this.groundCursor = new GroundDisc(0.2, 0xff0000);
        this.groundCursor = new GroundCross(0xff0000, this.viewer.camera.rotation.z);
        this.viewer.scene.add(this.groundCursor);
        const cursorPos = viewer.raycast(mousePos.clientX, mousePos.clientY, groundPlot)[1];
        if (cursorPos) {
            this.groundCursor.position.copy(cursorPos.point);
        }

        // Set event listeners
        const cb1 = this.onMouseDown.bind(this);
        this.viewer.domElement.addEventListener("mousedown", cb1);
        this.eventListeners.push([this.viewer.domElement, "mousedown", cb1]);

        const cb2 = this.onMouseMove.bind(this);
        this.viewer.domElement.addEventListener("mousemove", cb2);
        this.eventListeners.push([this.viewer.domElement, "mousemove", cb2]);

        const cb3 = this.onMouseUp.bind(this);
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
        if (this.state === "pre") {
            const intersection = this.viewer.raycast(evt.clientX, evt.clientY, this.groundPlot)[1];
            if (!intersection) {
                console.warn("failed to update creation retangle.");
                return;
            }
            this.groundCursor!.position.copy(intersection.point);
            this.viewer.render();

        } else if (this.state === "selecting") {
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
        if (this.state === "pre") {
            // Draw selection rectangle
            const pos = this.groundCursor!.position;
            this.groundRect = new GroundRectangle(
                pos, pos,
                this.viewer.camera.rotation.z - Math.PI, 0xff0000);
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
        if (this.state === "selecting") {
            // Create new object based on the drawn region
            const x = this.groundRect!.position.x;
            const y = this.groundRect!.position.y;
            const z = this.groundRect!.position.z;
            const l = Math.abs(this.groundRect!.scale.y);
            const w = Math.abs(this.groundRect!.scale.x);
            const heading = this.groundRect!.rotation.z - Math.PI / 2;
            let box = {};

            switch(this.creationMode ) {
                case "autoFit": {
                    box = fitBoxWithAutoZ(this.pcl.positionBuffer, [x, y, z], [l, w], heading, this.groundSegmentation.groundZ);
                    break;
                }
                case "noFit": {
                    const [zMin, zMax] = getHeightOfPts(this.pcl.positionBuffer, [x, y], [l, w], heading);
                    box = {
                        position: [x, y, 0.5*(zMin + zMax)],
                        size: [l, w, zMax - zMin],
                        heading
                    };
                    break;
                }
                case "autoGround": {
                    const defaultHeight = 2;
                    const groundZ = this.groundSegmentation.groundZ == null ? 0 : this.groundSegmentation.groundZ;
                    box = {
                        position: [x, y, groundZ + 0.5*defaultHeight],
                        size: [l, w, defaultHeight],
                        heading
                    };
                }
            }

            const cuboid = observable({
                ...box,
                id: Math.random().toString(36).substring(7)
            } as Cuboid);

            // Cleanup creation mode
            this.destroy();

            // Add new object to the list of annotations
            this.annotations.add(cuboid);

            // Notify listeners
            this.dispatchEvent(new CustomEvent("create", { detail: cuboid }));
        };
    }
}

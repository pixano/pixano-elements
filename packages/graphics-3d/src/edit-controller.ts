/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */


import { TransformControls } from './transform-controls';
import { BasicEventTarget } from '@pixano/core';
import { SceneView } from './scene-view';
import { Cuboid } from './types';
import { CuboidPlot } from './plots';

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
                const obj = this.objControls.object!;
                if (this.objControls.mode === 'translate') {
                    annotation.position = obj.position.toArray() as [number, number, number];
                } else if (this.objControls.mode === 'rotate') {
                    annotation.heading = obj.rotation.z;
                } else if (this.objControls.mode === 'scale') {
                    annotation.position = obj.position.toArray() as [number, number, number];
                    annotation.size = obj.scale.toArray() as [number, number, number];
                }
                this.updatePending = false;
            }

            this.dispatchEvent(new Event("stop"));
        });

        this.objControls.addEventListener('mouseDown', () => {
            this.dispatchEvent(new Event('start'));
        })

        this.objControls.addEventListener('objectChange', () => {
            const obj = this.objControls.object!;
            if (this.objControls.mode === 'translate') {
                annotation.position = obj.position.toArray() as [number, number, number];
            } else if (this.objControls.mode === 'rotate') {
                annotation.heading = obj.rotation.z;
            } else if (this.objControls.mode === 'scale') {
                annotation.position = obj.position.toArray() as [number, number, number];
                annotation.size = obj.scale.toArray() as [number, number, number];
            }

            this.updatePending = true;
            this.viewer.render();
            this.dispatchEvent(new Event('change'));
        });
    }

    /**
     * Toggle edition mode in the following order:
     * scale > rotate > translate
     */
    toggleMode() {
        if ( this.objControls.mode === "translate" ) {
            this.objControls.setMode('scale');
        } else if ( this.objControls.mode === "rotate" ) {
            this.objControls.setMode('translate');
        } else if ( this.objControls.mode === "scale" ) {
            this.objControls.setMode('rotate');
        }
    }

    destroy() {
        this.viewer.scene.remove(this.objControls);
        this.objControls.detach();
        this.objControls.dispose();
    }
}

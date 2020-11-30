/**
 * Implementation of graph canvas editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement } from 'lit-element';
import { Canvas2d } from './pxn-canvas-2d';
import { settings, IGraphSettings } from './graphic-graph';
import { GraphCreateController, GraphsUpdateController } from './controller-graph';
export { settings };

/**
 * Inherit Canvas2d to handle graph shapes (keypoints).
 */
@customElement('pxn-graph' as any)
export class Graph extends Canvas2d {

    public settings: IGraphSettings = settings;

    private selectedNodeIdx: number = -1;

    constructor() {
        super();
        this.setController('create', new GraphCreateController({ renderer: this.renderer, shapes: this.shapes }))
            .setController('edit', new GraphsUpdateController({ renderer: this.renderer, graphics: this.graphics, targetShapes: this.targetShapes, dispatchEvent: this.dispatchEvent }));
    }

    protected firstUpdated() {
        super.firstUpdated();
        window.addEventListener('keyup', (evt: KeyboardEvent) => {
            switch (evt.key) {
                case 'z': case 's':
                case 'd': case 'q': {
                    if (this.selectedNodeIdx !== -1 && this.targetShapes.size === 1 && !evt.ctrlKey) {
                        const obj = [...this.targetShapes][0];
                        if (obj) {
                            this.dispatchEvent(new CustomEvent('update', { detail: [obj.id] }));
                        }
                    }
                    break;
                }
            }
        })
        window.addEventListener('keydown', (evt: KeyboardEvent) => {
            switch (evt.key) {
                case 'z': case 's':
                case 'd': case 'q': {
                    if (this.selectedNodeIdx !== -1 && this.targetShapes.size === 1 && !evt.ctrlKey) {
                        const obj = [...this.targetShapes][0];
                        if (obj) {
                            // translate selected node
                            const xsign = evt.key === 'q' ? -1 : evt.key === 'd' ? 1 : 0;
                            const ysign = evt.key === 'z' ? -1 : evt.key === 's' ? 1 : 0;
                            obj.geometry.vertices[2 * this.selectedNodeIdx] += 0.005 * xsign;
                            obj.geometry.vertices[2 * this.selectedNodeIdx + 1] += 0.005 * ysign;
                        }
                    }
                    break;
                }
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9': {
                    this.selectedNodeIdx = Number(evt.key);
                    break;
                }
            }
        })
    }
}


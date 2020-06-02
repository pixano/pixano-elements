/**
 * Implementation of tracking plugin.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { customElement, property} from 'lit-element';
import { Rectangle } from './pxn-rectangle'
import { ShapeData, TrackData } from './types';
import { trackColors } from './video-utils';
import { getShape, setKeyShape, isKeyShape} from './video-utils';
import { ShapesEditController } from './shapes-manager';

enum displayMode {
    SHOW_ALL = 'show_all',
    SHOW_SELECTED = 'show_selected'
}

export enum Mode {
    ADD_REPLACE_BOX = 'add_replace_box'
}

@customElement('pxn-tracking' as any)
export class Tracking extends Rectangle {

    @property({type: Number})
    public imageIdx: number = 0;

    @property({type: Object})
    public tracks: {[key: string]: TrackData} = {};

    displayMode: displayMode = displayMode.SHOW_ALL;

    @property({ type: Object })
    public selectedTracks: Set<TrackData> = new Set();

    constructor() {
        super();
        this.addEventListener('selection', (evt: any) => {
            if (!evt.detail.length) {
                this.selectedTracks.clear();
                this.dispatchEvent(new CustomEvent('selection-track', { detail : this.selectedTracks}));
            }
        });
        this.addEventListener('update', () => {
            // when updating instance
            // create keyshape
            this.shManager.targetShapes.forEach((s) => {
                const t = [...this.selectedTracks].find((tr) => tr.id === s.id);
                if (t) {
                    setKeyShape(t, this.imageIdx, {...getShape(t, this.imageIdx)!, ...s});
                }
            });
        });
        this.handleTrackSelection();
    }

    /**
     * Extend shape controller onObjectDown to handle track selection
     */
    protected handleTrackSelection() {
        const editController = (this.shManager.modes['edit'] as ShapesEditController);
        editController.doObjectSelection = (shape: ShapeData, isShiftKey: boolean = false) => {
            const firstClick = ShapesEditController.prototype.doObjectSelection.call(editController, shape, isShiftKey);
            const t = this.tracks[shape.id];
            if (isShiftKey) {
                if (!this.selectedTracks.has(t)) {
                    this.selectedTracks.add(this.tracks[shape.id]);
                    this.dispatchEvent(new CustomEvent('selection-track', { detail : this.selectedTracks}));
                }
            } else if (!this.selectedTracks.has(t)) {
                this.selectedTracks.clear();
                this.selectedTracks.add(this.tracks[shape.id]);
                this.dispatchEvent(new CustomEvent('selection-track', { detail : this.selectedTracks}));
            }
            return firstClick;
        }
    }

    /**
     * Called on every property change
     * @param changedProperty 
     */
    protected updated(changedProperties: any) {
        super.updated(changedProperties);
        if (changedProperties.has('imageIdx') || changedProperties.has('image') && this.imageIdx >= 0) {
            this.drawTracks();
        }
        if (changedProperties.has('tracks')) {
            // Called when we initialize the tracks for the first time
            this.drawTracks();
        }
    }

    public drawTracks() {
        this.shapes = this.convertShapes(this.imageIdx) as any;
        // update selection to be displayed
        const selectedIds = [...this.selectedTracks].map((t) => t.id);
        this.selectedShapeIds = selectedIds;
    }

    /**
     * Get rectangle shapes from specific frame
     * @param fIdx 
     */
    public convertShapes(fIdx: number): ShapeData[] {
        const shapes = new Array();
        const tracks = this.displayMode === displayMode.SHOW_ALL ?
                this.tracks : [...this.selectedTracks].reduce((map, obj) => ({...map, [obj.id]: obj}), {});
        Object.keys(tracks).forEach((tid: string) => {
                const t = tracks[tid];
                const ks = getShape(t, fIdx);
                const isHidden = ks?.isNextHidden && !isKeyShape(t, this.imageIdx);
                if (ks && !isHidden) {
                    // hide box after last keyshape if not selected (?)
                    shapes.push({
                        id: tid.toString(), 
                        geometry: ks.geometry, 
                        color: trackColors[parseInt(tid) % trackColors.length]
                    } as ShapeData);
                } 
            }
        )
        return shapes;
    }
}

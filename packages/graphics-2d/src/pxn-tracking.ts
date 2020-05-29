/**
 * Implementation of tracking plugin.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { LitElement, html, customElement, property} from 'lit-element';
import './pxn-rectangle'
import { ShapeData, TrackData } from './types';

// TODO should not been used directly
import { observable } from '@pixano/core';
import { generateKey, getShape, setKeyShape, deleteShape, isKeyShape} from './video-utils';

const colors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan']

enum displayMode {
    SHOW_ALL = 'show_all',
    SHOW_SELECTED = 'show_selected'
}

export enum Mode {
    //CREATE_TRACK = 'create_track',
    ADD_REPLACE_BOX = 'add_replace_box',
    //EDIT_BOX = 'edit_box'
}

@customElement('pxn-tracking' as any)
export class Tracking extends LitElement{
    @property({type: String})
    public image: string | null = null;

    @property({type: Number})
    public imageIdx: number = 0;

    @property({type: Number})
    public selectedTrackId: number = -1;

    @property({type: Object})
    public tracks: {[key: number]: TrackData} = {};

    @property({type: String})
    public mode: Mode = Mode.ADD_REPLACE_BOX

    displayMode: displayMode = displayMode.SHOW_ALL

    constructor(){
        super();      
    }

    /**
     * Called on every property change
     * @param changedProperty 
     */
    protected updated(changedProperties: any) {
        if (changedProperties.has('mode') && this.mode) {
            // console.log('Pxn-tracking new mode :', this.mode);
            // this.setRectangleMode(this.mode);
            this.rectangle.mode = 'create'
        }
        if (changedProperties.has('imageIdx') && this.imageIdx >= 0) {
            // console.log('New image idx :', this.imageIdx, this.tracks);
            // TODO setter does not work do it manually
            // this.rectangle.shapes = this.getShapes(this.imageIdx);
            this.rectangle.shapes.set(this.convertShapes(this.imageIdx).map(observable));
        }
        if (changedProperties.has('tracks')) {
            // Called when we initialize the tracks for the first time
            console.log("tracks modified, updating shapes", this.tracks)
            this.rectangle.shapes.set(this.convertShapes(this.imageIdx).map(observable));
        }
    }

    /**
     * Switch between displaying all tracks or only the selected one
     */
    public changeDisplayMode() {
        if (this.displayMode === displayMode.SHOW_SELECTED) {
            this.displayMode = displayMode.SHOW_ALL;
        } 
        else {
            this.displayMode = displayMode.SHOW_SELECTED;
        }
        // TODO setter does not work do it manually
        // this.rectangle.shapes = this.getShapes(this.imageIdx);
        this.rectangle.shapes.set(this.convertShapes(this.imageIdx).map(observable));
    }
    
    /**
     * Delete a key frame (called from exterior)
     */
    public deleteBox(){
        this._onDelete();
        this.rectangle.shapes.set(this.convertShapes(this.imageIdx).map(observable));
    }

    /**
     * Get rectangle shapes from specific frame
     * @param fIdx 
     */
    public convertShapes(fIdx: number): ShapeData[]{
        const shapes = new Array();
        let tmap: {[key: number]: TrackData} = {};
        const selectedTrack = this.tracks[this.selectedTrackId];
        if (this.displayMode === displayMode.SHOW_ALL) {
            tmap = this.tracks
        } else if (this.displayMode === displayMode.SHOW_SELECTED && selectedTrack){
            tmap[this.selectedTrackId] = selectedTrack;
        }
        Object.keys(tmap).forEach((tid: any) => {
                const t = tmap[tid];
                const ks = getShape(t, fIdx);
                if (ks && (isKeyShape(t,fIdx) || ks.interpNext)){
                    shapes.push({
                        id: tid.toString(), 
                        geometry: {
                            vertices: ks.geometry.vertices,
                            type: 'rectangle'
                        }, 
                        color: colors[tid % colors.length]
                    });                    
                } 
            }
        )
        return shapes;
    }

    set imageElement(htmlImageElement: HTMLImageElement) {
        this.rectangle.imageElement = htmlImageElement;
    }

    get imageElement() {
        return this.rectangle.imageElement;
    }

    get rectangle() {
        return this.shadowRoot!.querySelector('pxn-rectangle')!;
    }

    _onSelection(evt: any) {
        // console.log('_onSelection', evt);
        const trackId = evt.detail;
        if (trackId.length > 0) {
            this.selectedTrackId = parseInt(trackId[0]);
            this.dispatchEvent(new CustomEvent("selected-box-changed", {detail: this.selectedTrackId}))
        }
    }

    /**
     * Called when a box is updated
     * @param evt 
     */
    _onUpdate(evt: any) {
        const selectedTrack = this.tracks[this.selectedTrackId];
        if (!selectedTrack) {
            return;
        }
        console.log("update event detail", evt.detail);
        const newVertices = [...this.rectangle.shapes].find((e) => e.id === this.selectedTrackId.toString())!.geometry.vertices;
        // This is already a key frame for the selected track
        const ks = getShape(selectedTrack, this.imageIdx);
        if (ks) {
            ks.geometry.vertices = newVertices;
            setKeyShape(selectedTrack, this.imageIdx, ks);
        }
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
        console.log("Updated track", this.selectedTrackId)
    }

    /**
     * Called after a box has been created
     * @param evt 
     */
    _onCreate(evt: any) {
        const selectedTrack = this.tracks[this.selectedTrackId];
        if (!selectedTrack) {
            console.log('You need to select or create tracks before adding boxes');
            this.rectangle.shapes.set([]);
            return;
        } 

        // console.log("create event detail", evt.detail);
        const newVertices = evt.detail.geometry.vertices;
        const ks = getShape(selectedTrack, this.imageIdx);
        if (ks) {
            ks.interpNext = true;
            ks.geometry.vertices = newVertices;
            setKeyShape(selectedTrack, this.imageIdx, ks);
            this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
            console.log("Replace box for track ", this.selectedTrackId);
        } else {
            // No previous frames for this track                       
            const newKS = {geometry: {vertices: newVertices, type: 'rectangle'}, interpNext: true, 
                    tempProps: {}, timestamp: this.imageIdx, id: generateKey()};
            setKeyShape(selectedTrack, this.imageIdx, newKS);
            this.dispatchEvent(new CustomEvent("fill-temp-props", {detail: this.imageIdx}));
            console.log("Created new box for track ", this.selectedTrackId);
        } 
        this.rectangle.shapes.set(this.convertShapes(this.imageIdx).map(observable));   // For refresh
    }

    _onDelete() {
        const selectedTrack = this.tracks[this.selectedTrackId];
        if (!selectedTrack) {
            return;
        }
        const ret = deleteShape(selectedTrack, this.imageIdx);
        if (ret) {
            this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
            console.log("Deleted box of track", this.selectedTrackId);
        }
    }

    render() {
        return html`
            <pxn-rectangle image="${this.image}"
                @create=${this._onCreate}
                @update=${this._onUpdate}
                @delete=${this._onDelete}
                @selection=${this._onSelection}>
            </pxn-rectangle>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
      'pxn-tracking': Tracking;
    }
}
/**
 * Implementation of tracking panel.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { LitElement, css, html, customElement, property} from 'lit-element';
import { TrackData, KeyShapeData, ShapeData } from './types'
import { setKeyShape, isKeyShape, getClosestFrames, getShape, deleteShape, trackColors, sortDictByKey } from './video-utils';
import { mergeTracks, cutTrack } from '@pixano/core/lib/svg';
import '@material/mwc-button';
import '@material/mwc-icon-button-toggle';
import '@material/mwc-icon-button';
import '@material/mwc-select';
import '@material/mwc-dialog';
import '@material/mwc-list/mwc-list-item';

interface Property {
    name: string // Property name
    type: string // Property type (checkbox, dropdown, ...)
    enum: any[] // If property type is dropdown, all possible values
    persistent: boolean // Whether the property is permanent or temporary (ie specific to a frame)
    default: any // Default value
}

/**
 * Category (class) interface
 */
interface Category {
    name: string // Category name
    color: string // Category color
    properties: Property[] // Category properties (permanent or temporary)

}

interface Schema {
    category: Category[]
    default: string // Default category name
}

const defaultSchema =
    {
        category: [
            {name: 'car', color: "green", properties: []},
            {name: 'person', color: "#eca0a0", properties: [
                {name: 'posture', type: 'dropdown', enum: ['standing', 'bending', 'sitting', 'lying'],
                persistent: false, default: 'standing'}
            ]},
        ],
        default: 'person'
    };


@customElement('pxn-track-panel' as any)
export class TrackPanel extends LitElement {

    @property({type: Number})
    public imageIdx: number = 0

    @property({ type: String })
    public mode: string = 'edit';

    @property({ type: Object })
    public selectedTracks: Set<TrackData> = new Set();

    @property({type: Object})
    public tracks: {[key: string]: TrackData} = {};

    @property({type: String})
    public activeTrackId: string = '';

    private schema: Schema = defaultSchema;

    selectedTracksChanged() {
        this.requestUpdate();
    }

    static get styles() {
        return css`
            :host {
                height: 100%;
                display: flex;
            }
            main {
                width: 100%;
            }
            .track-id {
                width: 22px;
                height: 22px;
                margin: 0;
                font-size: 13px;
                padding: 0;
                text-align: center;
                color: black;
                background: #ffffff;
                border-radius: 50%;
                right: -3px;
                top: -3px;
                line-height: 22px;
                position: absolute;
            }
            .track-tile {
                padding: 10px 10px;
                background: whitesmoke;
                border-radius: 2%;
                position: relative;
            }
            .new-button {
                width: 100%;
                flex-direction: column;
            }
            .fill {
                height: 100%;
            }
        `;
    }

    _colorFor(categoryName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);
        return category ? category.color || 'rgb(0,0,0)' : 'rgb(0,0,0)';
    }

    public reloadSchema(schema: Schema) {
        this.schema = schema;
    }

    getDefaultPermProps(categoryName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);
        if (category) {
            const permProps: {[key: string]: any} = {};
            category!.properties.forEach((p) => {
                if (p.persistent)
                    permProps[p.name] = p.default
            })
            return permProps;
        }
        return {};
    }

    getDefaultTempProps(categoryName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);

        const permProps: {[key: string]: any} = {};
        category!.properties.forEach((p) => {
            if (!p.persistent)
                permProps[p.name] = p.default
        })
        return permProps;
    }

    getDefaultPropValue(categoryName: string, propName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);
        const prop = category!.properties.find((p) => p.name === propName);
        return prop?.default;
    }

    newTrack(e: any) {
        const newTrackId = Object.keys(this.tracks).length !== 0 ?
            (Math.max(...Object.keys(this.tracks).map(Number)) + 1).toString() : '0';
        const newShape = e.detail as ShapeData;
        newShape.id = newTrackId;
        newShape.color = trackColors[parseInt(newTrackId) % trackColors.length];
        const keyShape = {
            geometry: newShape.geometry,
            timestamp: this.imageIdx,
            labels: {}
        };
        const cls = this.schema.default;
        const newTrack = {
            id: newTrackId,
            keyShapes: {[this.imageIdx] : keyShape},
            category: cls,
            labels: this.getDefaultPermProps(cls)
        };
        this.tracks[newTrackId] = newTrack;
        this.selectedTracks.clear();
        this.selectedTracks.add(newTrack);
        this.mode = 'edit';
        this.dispatchEvent(new CustomEvent('mode', { detail: this.mode }));
        this.dispatchEvent(new CustomEvent('update'));
    }

    createTrack() {
        this.mode = 'create';
        this.dispatchEvent(new CustomEvent('mode', { detail: this.mode }));
    }

    changeDisplayMode() {
        this.dispatchEvent(new Event("change-display-mode"));
    }

    /**
     * Set class (category) of the selected track
     * @param cls new class
     */
    setClass(t: TrackData, cls: string) {
        t.category = cls;
        t.labels = this.getDefaultPermProps(cls);
        const defaultProp = this.getDefaultTempProps(t.category);
        for (const [ , ks ] of Object.entries(t.keyShapes)) {
            ks.labels = {...defaultProp};
        }
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
        this.requestUpdate();
    }

    /**
     * Update a track
     * @param t track to update
     * @param ks new key shape
     * @param propName the name of the property to update
     * @param value the new property value
     */
    updateTrackProp(t: TrackData, ks: KeyShapeData, prop: Property,  newValue: any) {
        if (newValue === "undefined") {
            return;
        }
        if ((prop.persistent && t.labels[prop.name] === newValue) ||
            (!prop.persistent && ks.labels[prop.name] === newValue)) {
            return;
        }

        if (prop.persistent){
            t.labels[prop.name] = newValue;
        } else {
            ks.labels[prop.name] = newValue;
            setKeyShape(t, this.imageIdx, ks);
        }
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
    }

    /**
     * Change selected track
     * @param tid the new selected track id
     */
    changeSelectedId(tid: string) {
        this.selectedTracks.clear();
        this.selectedTracks.add(this.tracks[tid]);
        this.dispatchEvent(new Event("selected-track-changed"));
    }

    /**
     * Remove keyshape from track
     * @param t
     */
    removeOrAddKeyShape(t: TrackData) {
        if (isKeyShape(t, this.imageIdx)) {
            deleteShape(t, this.imageIdx);
        } else {
            const currShape = getShape(t, this.imageIdx);
            if (currShape) {
                t.keyShapes[this.imageIdx] = currShape;
            }
        }
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
    }

    /**
     * Go to previous keyframe for a given track
     * @param t
     */
    goToPreviousKeyFrame(t: TrackData) {
        const [prev,] = getClosestFrames(t, this.imageIdx);
        if (prev >= 0) {
            this.imageIdx = prev;
            this.dispatchEvent(new CustomEvent("imageIdx-changed", {detail: this.imageIdx}));
        }
    }

    /**
     * Go to next keyframe for a given track
     * @param t
     */
    goToNextKeyFrame(t: TrackData) {
        const [,next] = getClosestFrames(t, this.imageIdx);
        if (isFinite(next)) {
            this.imageIdx = next;
            this.dispatchEvent(new CustomEvent("imageIdx-changed", {detail: this.imageIdx}));
        }
    }

    /**
     * Enable or disable interpolation for the current frame
     */
    switchVisibility(t: TrackData, tIdx: number) {
        const prevShape = getShape(t, tIdx - 1);
        if (!prevShape) {
            return;
        }
        if (prevShape.isNextHidden) {
            // set visibility to true
            const currShape = getShape(t, tIdx);
            if (currShape) {
                currShape.isNextHidden = false;
                if (!isKeyShape(t, tIdx)) {
                    t.keyShapes[tIdx] = currShape;
                }
            }
            prevShape.isNextHidden = false;
        } else {
            // create one on previous frame if not exist
            // set previous keyshape isNextHidden to true
            // remove current keyshape
            if (!isKeyShape(t, tIdx - 1)) {
                t.keyShapes[tIdx - 1] = prevShape;
            }
            prevShape.isNextHidden = true;
            delete t.keyShapes[tIdx];
        }
        this.dispatchEvent(new Event('update'));
    }

    /**
     * Split track into two tracks
     * @param t
     */
    splitTrack(t: TrackData) {
        const newTrackId = Object.keys(this.tracks).length !== 0 ?
            (Math.max(...Object.keys(this.tracks).map(Number)) + 1).toString() : '';

        // create keyshape for current frame and previous frame
        // if not already exists
        [this.imageIdx, this.imageIdx - 1].forEach((idx) => {
            const s = getShape(t, idx);
            if (!s) {
                // split is asked outside track boundaries
                return;
            }
            t.keyShapes[idx] = s;
        });
        // create new track from future boxes
        const ks = [...Object.values(t.keyShapes)];
        const newTrack = {
            id: newTrackId,
            keyShapes: ks.filter((k) => k.timestamp >= this.imageIdx)
                         .map((k) => ({...k, id: newTrackId}))
                         .reduce((map, obj) => ({...map, [obj.timestamp]: obj}), {}),
            category: t.category,
            labels: t.labels
        };
        this.tracks[newTrackId] = newTrack;
        // remove future boxes from current track
        t.keyShapes = ks.filter((k) => k.timestamp < this.imageIdx)
                        .reduce((map, obj) => ({...map, [obj.timestamp]: obj}), {});
        t.keyShapes[this.imageIdx - 1].isNextHidden = true;
        this.selectedTracks.clear();
        this.selectedTracks.add(newTrack);
        this.dispatchEvent(new Event('update'));
    }

    /**
     * Switch two tracks at given timestamp.
     * @param tracks tracks to be switched
     */
    switchTrack(tracks: Set<TrackData>) {
        if (tracks.size === 2) {
            const [t1, t2] = [...tracks];
            const ks1 = [...Object.values(t1.keyShapes)];
            const ks2 = [...Object.values(t2.keyShapes)];
            t1.keyShapes = ks1.filter((k) => k.timestamp < this.imageIdx)
                              .concat(ks2.filter((k) => k.timestamp >= this.imageIdx))
                              .reduce((map, obj) => ({...map, [obj.timestamp]: obj}), {});
            t2.keyShapes = ks2.filter((k) => k.timestamp < this.imageIdx)
                              .concat(ks1.filter((k) => k.timestamp >= this.imageIdx))
                              .reduce((map, obj) => ({...map, [obj.timestamp]: obj}), {});
            this.dispatchEvent(new Event('update'));
        }
    }

    /**
     * Merge two tracks.
     * If they do not overlap, do concatenation of keyshapes.
     * If they overlap at current timestamp, cut both tracks at timestamp and join the older left-side sub-track
     *    with the newer right-side sub-track. Create tracks with remaining sub-tracks.
     * If they overlap but not at current time, do as above with the first timestamp of overlap.
     * @param tracks tracks to be merged
     */
    mergeTracks(tracks: Set<TrackData>) {
        if (tracks.size !== 2) {
            return;
        }
        let [t1, t2] = [...tracks];

        // check overlapping
        const keys = [
            [...Object.keys(sortDictByKey(t1.keyShapes))],
            [...Object.keys(sortDictByKey(t2.keyShapes))]
        ];
        const olderTrackIdx = keys[0][0] < keys[1][0] ? 0 : 1;
        const isDisjoint = keys[olderTrackIdx].slice(-1)[0] < keys[1 - olderTrackIdx][0];
        [t1, t2] = olderTrackIdx ? [t2, t1] : [t1, t2];
        // they do not overlap, concatenation of keyshapes.
        if (isDisjoint) {
            t1.keyShapes = {...t1.keyShapes, ...t2.keyShapes};
            delete this.tracks[t2.id];
        } else {
            const s1 = getShape(t1, this.imageIdx);
            const s2 = getShape(t2, this.imageIdx);
            // overlap timestamp
            const tps = s1?.isNextHidden && !isKeyShape(t1, this.imageIdx) ||
                      s2?.isNextHidden && !isKeyShape(t2, this.imageIdx) ?
                      parseInt(keys[1 - olderTrackIdx][0]) : this.imageIdx;
            const [ks1l,] = [...Object.values(t1.keyShapes)]
                    .reduce(([p, f], e) => (e.timestamp >= tps ? [[...p, e], f] : [p, [...f, e]]), [[], []] as [KeyShapeData[], KeyShapeData[]]);
            const [, ks2r] = [...Object.values(t2.keyShapes)]
                    .reduce(([p, f], e) => (e.timestamp >= tps ? [[...p, e], f] : [p, [...f, e]]), [[], []] as [KeyShapeData[], KeyShapeData[]]);

            t1.keyShapes = [...ks1l, ... ks2r]
                            .reduce((map, obj) => ({...map, [obj.timestamp]: obj}), {});
            delete this.tracks[t2.id];
        }
        this.dispatchEvent(new Event('update'));
    }

    /**
     * Delete track and its instances
     * @param tId
     */
    deleteTrack(tId: string) {
        this.selectedTracks.clear();
        delete this.tracks[tId];
        this.dispatchEvent(new Event('update'));
        this.requestUpdate();
    }

    /**
     * Open track delete confirmation pop-up
     * @param tId track id
     */
    askDeleteTrack(tId: string) {
        this.dialog.open = true;
        this.activeTrackId = tId;
    }

    /**
     * Display of track tile
     * @param t track item
     */
    renderTrackTile(t: TrackData) {
        let trackStatus = html``;
        const currentShape = getShape(t, this.imageIdx);
        const color = trackColors[parseInt(t.id) % trackColors.length];
        if (currentShape) {
            const isHidden = currentShape.isNextHidden && !isKeyShape(t, this.imageIdx);
            trackStatus = html`
                <div class="track-tile">
                    <p class="track-id">${t.id.toString()}</p>
                    <mwc-icon-button-toggle ?on=${isKeyShape(t, this.imageIdx)}
                                            @click=${() => this.removeOrAddKeyShape(t)}
                                            title="Keyframe"
                                            onIcon="star"
                                            offIcon="star_border"></mwc-icon-button-toggle>
                    <mwc-icon-button-toggle ?on=${!isHidden}
                                            @click=${() => {this.switchVisibility(t, this.imageIdx);}}
                                            title="Hidden"
                                            onIcon="visibility"
                                            offIcon="visibility_off"></mwc-icon-button-toggle>
                    <mwc-icon-button @click=${() => this.goToPreviousKeyFrame(t)}
                                     title="Go to previous keyframe"
                                     icon="keyboard_arrow_left"></mwc-icon-button>
                    <mwc-icon-button @click=${() => this.goToNextKeyFrame(t)}
                                     title="Go to next keyframe"
                                     icon="keyboard_arrow_right"></mwc-icon-button>
                    <mwc-icon-button @click=${() => this.splitTrack(t)}
                                     title="Split track">${cutTrack}</mwc-icon-button>
                    <mwc-select id="labels"
                                ?disabled=${!currentShape}
                                outlined
                                style="--mdc-select-outlined-idle-border-color: ${color}; --mdc-theme-primary: ${color};"
                                @action=${(evt: any) => {
                                    const idx = evt.detail.index;
                                    this.setClass(t, this.schema.category[idx].name);
                                    }}>
                        ${this.schema.category.map((c) => {
                            return html`<mwc-list-item value="${c.name}" ?selected="${c.name === t.category}">${c.name}</mwc-list-item>`;
                        })}
                    </mwc-select>
                    <mwc-icon-button @click=${() => this.askDeleteTrack(t.id)}
                                     title="Delete entire track"
                                     icon="delete_forever"></mwc-icon-button>
                </div>
            `;
        } else {
            trackStatus = html`
            <div class="track-tile">
                <p class="track-id">${t.id.toString()}</p>
                <mwc-icon-button-toggle title="Keyframe"
                                        disabled
                                        onIcon="star"
                                        offIcon="star_border"></mwc-icon-button-toggle>
                <mwc-icon-button-toggle onIcon="visibility" disabled
                                        offIcon="visibility_off"></mwc-icon-button-toggle>
                <mwc-icon-button @click=${() => this.goToNextKeyFrame(t)}
                                 title="Go to next keyframe"
                                 icon="keyboard_arrow_right"></mwc-icon-button>
                <mwc-select disabled
                            outlined
                            style="--mdc-select-outlined-idle-border-color: ${color}; --mdc-theme-primary: ${color};">
                    ${this.schema.category.map((c) => {
                        return html`<mwc-list-item value="${c.name}" ?selected="${c.name === t.category}">${c.name}</mwc-list-item>`;
                    })}
                </mwc-select>
                <mwc-icon-button icon="delete_forever" disabled></mwc-icon-button>
            </div>
        `
        }

        return trackStatus;
    }

    htmlProp(t: TrackData, ks: KeyShapeData | undefined, prop: Property) {
        let currentValue: any;
        if (prop.persistent) {
            currentValue = t.labels[prop.name];
        }
        else {
            currentValue = (ks && ks.labels) ? ks.labels[prop.name] : this.getDefaultPropValue(t.category, prop.name);
        }

        if (prop.type === 'dropdown') {
            return html`
                debug: ${currentValue}
                <select id="${prop.name}" ?disabled=${!ks}
                        @change=${(evt: any) => this.updateTrackProp(t, ks!, prop, evt.path[0].value)}>
                    ${prop.enum.map((v) => {return html`<option value="${v}" ?selected="${v === currentValue}">${v}</option>`})}
                </select>
                `

        } else if (prop.type === 'checkbox') {
            return html`
                <input id=${prop.name} type=checkbox ?checked=${currentValue} ?disabled=${!ks}
                        @click=${(evt: any) => this.updateTrackProp(t, ks!, prop, evt.path[0].checked)}>
                <label> ${prop.name}</label>
                `
        } else {
            return html``;
        }
    }

    /**
     * Return HTML dialog element
     */
    protected get dialog(): any {
        return this.shadowRoot!.getElementById("dialog") as any;
    }

    render() {
        return html`
            <main>
                <mwc-button @click=${() => this.createTrack()} icon="add"
                            class="new-button ${!this.selectedTracks.size ? 'fill': ''}"
                            style="width: 100%; flex-direction: column;">New</mwc-button>
                ${[...this.selectedTracks].map(this.renderTrackTile.bind(this))}
                ${
                    this.selectedTracks.size === 2 ? html`
                    <mwc-icon-button @click=${() => this.switchTrack(this.selectedTracks)}
                                     icon="shuffle"
                                     title="Switch track"></mwc-icon-button>
                    <mwc-icon-button @click=${() => this.mergeTracks(this.selectedTracks)}
                                     title="Merge track">${mergeTracks}</mwc-icon-button>` : ``
                }
            </main>
            <mwc-dialog id="dialog">
                Remove track ? <br>
                WARNING: All its bounding boxes will be lost.
                </div>
                <mwc-button
                    slot="primaryAction"
                    dialogAction="ok"
                    @click=${() => this.deleteTrack(this.activeTrackId)}>
                    Ok
                </mwc-button>
                <mwc-button
                    slot="secondaryAction"
                    dialogAction="cancel">
                    Cancel
                </mwc-button>
            </mwc-dialog>
        `
    }
}

/**
 * Implementation of tracking panel.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { LitElement, html, customElement, property} from 'lit-element';

import { TrackData, KeyShapeData } from './types'
import { setKeyShape, isKeyShape, getClosestFrames, getShape, deleteShape} from './video-utils';


interface Property {
    name: string // Property name
    type: string // Property type (checkbox, dropdown, ...)
    enum: Array<any> // If property type is dropdown, all possible values
    persistent: boolean // Whether the property is permanent or temporary (ie specific to a frame)
    default: any // Default value
}

/**
 * Category (class) interface
 */
interface Category {
    name: string // Category name
    color: string // Category color
    properties: Array<Property> // Category properties (permanent or temporary)

}

interface Schema {
    category: Array<Category>
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

    @property({type: Number})
    public selectedTrackId: number = -1

    @property({type: Object})
    public tracks: {[key: number]: TrackData} = {};

    private schema: Schema = defaultSchema;

    constructor(){
        super();
    }

    _colorFor(categoryName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);
        return category ? category.color || 'rgb(0,0,0)' : 'rgb(0,0,0)';
    }

  
    public reloadSchema(schema: Schema) {
        this.schema = schema;
    }

    protected updated(changedProperties: any) {
        // if (changedProperties.has('imageIdx') && this.imageIdx >= 0) {
        //     console.log('image changed', this.imageIdx, this.tracks)
        //     // this.requestUpdate();
        // }

        if (changedProperties.has('selectedTrackId') && this.selectedTrackId >= 0) {
            console.log('selected track changed', this.selectedTrackId)
        }
    }

    getDefaultPermProps(categoryName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);

        const permProps: {[key: string]: any} = {};
        category!.properties.forEach((p) => {
            if (p.persistent)
                permProps[p.name] = p.default
        })
        return permProps
    }

    getDefaultTempProps(categoryName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);

        const permProps: {[key: string]: any} = {};
        category!.properties.forEach((p) => {
            if (!p.persistent)
                permProps[p.name] = p.default
        })
        return permProps
    }

    getDefaultPropValue(categoryName: string, propName: string) {
        const category = this.schema.category.find((c) => c.name === categoryName);
        const prop = category!.properties.find((p) => p.name === propName);
        return prop?.default
    }

    // Pas terrible comme mecanisme
    fillTempProps(fid: number) {
        console.log('----- fillTempProps called', fid)
        const selectedTrack = this.tracks[this.selectedTrackId];
        if (!selectedTrack)
            return; 
 
        const ks = getShape(selectedTrack, fid);
        if (ks) {
            ks.tempProps = this.getDefaultTempProps(selectedTrack.category);
            setKeyShape(selectedTrack, this.imageIdx, ks);
            this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
            this.requestUpdate();
        }        
    }

    createTrack(){
        let newTrackId = 0;
        if (Object.keys(this.tracks).length != 0){
            newTrackId = Math.max(...Object.keys(this.tracks).map(Number)) + 1;
        }
        this.selectedTrackId = newTrackId;
        const cls = this.schema.default

        const newTrack = {id: newTrackId, keyShapes: {}, category: cls, 
                            permProps: this.getDefaultPermProps(cls)};
        this.tracks[newTrackId] = newTrack;       
        console.log("Created new track", newTrackId);
        this.dispatchEvent(new Event('create'));
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
    }

    changeDisplayMode() {
        console.log("Changing display mode");
        this.dispatchEvent(new Event("change-display-mode"));
    }

    /**
     * Change selected track
     * @param tid the new selected track id
     */
    changeSelectedId(tid: number) {
        this.selectedTrackId = tid;
        this.dispatchEvent(new Event("selected-track-changed"));
    }

    removeKeyShape(t: TrackData) {
        deleteShape(t, this.imageIdx);
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
    }

    goToPreviousKeyFrame(t: TrackData) {
        const [prev,] = getClosestFrames(t, this.imageIdx);
        if (prev >= 0) {
            this.imageIdx = prev;
            this.dispatchEvent(new CustomEvent("imageIdx-changed", {detail: this.imageIdx}));
        }          
    }

    goToNextKeyFrame(t: TrackData) {
        const [,next] = getClosestFrames(t, this.imageIdx);
        if (isFinite(next)) {
            this.imageIdx = next;
            this.dispatchEvent(new CustomEvent("imageIdx-changed", {detail: this.imageIdx}));
        }      
    }

    /**
     * Set class (category) of the selected track
     * @param cls new class
     */
    setClass(t: TrackData, cls: string) {
        t.category = cls;
        t.permProps = this.getDefaultPermProps(cls);
        const defaultProp = this.getDefaultTempProps(t.category);
        for (const [ , ks ] of Object.entries(t.keyShapes)) {
            ks.tempProps = {...defaultProp};
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
    updateTrackProp(t: TrackData, ks: KeyShapeData, prop: Property,  newValue: any)
    {
        if (newValue == "undefined") {
            return;
        }
        
        if ((prop.persistent && t.permProps[prop.name] == newValue) ||
            (!prop.persistent && ks.tempProps[prop.name] == newValue)) {
            return;
        }
        
        if (prop.persistent){
            t.permProps[prop.name] = newValue;
        } else {
            ks.tempProps[prop.name] = newValue;
            setKeyShape(t, this.imageIdx, ks);
        }
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
        // this.requestUpdate();
    }

    /**
     * Enable or disable interpolation for the current frame  
     */
    switchInterpolationMode(t: TrackData, ks: KeyShapeData){
        ks.interpNext = !ks.interpNext;
        setKeyShape(t, this.imageIdx, ks);
        this.dispatchEvent(new CustomEvent('update', {detail: this.tracks}));
        // this.requestUpdate();
    }

    htmlProp(t: TrackData, ks: KeyShapeData | undefined, prop: Property) {
        let currentValue: any;
        if (prop.persistent) {
            currentValue = t.permProps[prop.name];
        }
        else {
            currentValue = (ks && ks.tempProps) ? ks.tempProps[prop.name] : this.getDefaultPropValue(t.category, prop.name); 
        }
        // console.log("t", t)
        // console.log("ks", ks)
        // console.log("propname value", prop.name, currentValue)

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

    renderTrackTile(t: TrackData) {
        let trackStatus = html``;
        const currentShape = getShape(t, this.imageIdx);
        if (t.id === this.selectedTrackId) {
            const trackProps = this.schema.category.find(c => c.name === t.category);
            trackStatus = html`
                <button ?disabled=${!isKeyShape(t, this.imageIdx)} @click=${() => this.removeKeyShape(t)}>KF</button>
                <label>I:</label>
                <input type=checkbox ?checked=${currentShape && currentShape.interpNext} ?disabled=${!currentShape} 
                        @click=${() => {this.switchInterpolationMode(t, currentShape!);}}>
                <button @click=${() => this.goToPreviousKeyFrame(t)}>P</button>
                <button @click=${() => this.goToNextKeyFrame(t)}>N</button>
                
                <select id="labels" ?disabled=${!currentShape} 
                        @change=${(evt: any) => {this.setClass(t, evt.path[0].value);}}>
                    ${this.schema.category.map((c) => {           
                        return html`<option value="${c.name}" ?selected="${c.name === t.category}">${c.name}</option>`
                    })}
                </select>
                ${trackProps!.properties.map((prop: Property) => {              
                    return this.htmlProp(t, currentShape, prop)
                })}
            `
        }    

        return html`
            <div>
                <br><br>
                <button @click=${() => this.changeSelectedId(t.id)}>T ${t.id.toString()}</button>
                ${trackStatus}
            </div>
        `
    }

    render() {
        // console.log('#################### RENDERING !!!!')
        return html`
            <main>
            <button @click=${() => this.createTrack()}>Create track</button>
            <button @click=${() => this.changeDisplayMode()}>Change display mode</button>
            ${Object.keys(this.tracks).map(id => {
                return this.renderTrackTile(this.tracks[parseInt(id)]);
            })}
            </main>
        ` 
    }
}

declare global {
    interface HTMLElementTagNameMap {
      'pxn-track-panel': TrackPanel;
    }
}

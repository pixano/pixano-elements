/**
 * Implementation of generic class that displays an image
 * with 2D shapes overlayed.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { LitElement, html, css, customElement, property } from 'lit-element';
import { ObservableSet, observe } from '@pixano/core';
import { PxnRenderer } from './renderer-2d';
import { ShapeData } from './types';
import { ShapesManager } from './shapes-manager';
import { ViewControls } from './view-controls';
import { observable } from '@pixano/core';


/**
 * Possible modes to be used in this class.
 */
export enum Mode {
  Create = 'create',
  Update = 'update',
  None = 'none'
}

const fullscreen = html`<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.414 18.586l2.586-2.586v8h-8l2.586-2.586-5.172-5.172 2.828-2.828 5.172 5.172zm-13.656-8l2.828-2.828-5.172-5.172 2.586-2.586h-8v8l2.586-2.586 5.172 5.172zm10.828-8l-2.586-2.586h8v8l-2.586-2.586-5.172 5.172-2.828-2.828 5.172-5.172zm-8 13.656l-2.828-2.828-5.172 5.172-2.586-2.586v8h8l-2.586-2.586 5.172-5.172z"/></svg>`;

/**
 * Inherit ViewControls to add node scaling
 * depending on zoom level.
 */
export class ViewControlsObjects extends ViewControls {
  public onWheel(evt: WheelEvent) {
    super.onWheel(evt);
    this.updateNodeSize();
  }
  updateNodeSize() {
    this.viewer.objects.forEach((o) => {
      if (o.data.geometry.type != 'graph') {
        o.nodeContainer.children.forEach((o) => {
          o.scale.x = 1.5 / this.viewer.stage.scale.x;
          o.scale.y = 1.5 / this.viewer.stage.scale.y;
        });
      }
    });
  }
}

/**
 * Parent class that displays image with
 * 2d shapes. Can be easily inherited.
 * @fires CustomEvent#create upon creating an new object { detail: Shape }
 * @fires CustomEvent#update upon updating an object { detail: ids[] }
 * @fires CustomEvent#delete upon creating an new object { detail: ids[] }
 */
@customElement('pxn-canvas-2d' as any)
export class Canvas2d extends LitElement {

  // input image path
  @property({type: String})
  public image: string | null = null;

  // input mode type
  @property({type: String, reflect: true})
  public mode: string = Mode.Update;

  // whether to display or not the labels
  // on the image
  @property({type: Boolean})
  public hideLabels: boolean = false;

  @property({type: Boolean})
  public disablefullscreen: Boolean = false;

  // background color
  public color: string = "#f3f3f5";

  private _shapes: ObservableSet<ShapeData>;

  // renderer class
  // html view is added on firstUpdated
  protected renderer: PxnRenderer = new PxnRenderer({color: this.color});

  // map of 2d shapes with their unique id.
  // 2d shapes are observed to keep display synchronized.
  // and to dispatch events.
  // protected shapes: ObservableMap<string, ObservableShapeData> = new ObservableMap();

  // manager that handles interaction with the
  // stage and the shapes.
  protected shManager: ShapesManager;

  // controller of the view enabling
  // panning with right pointer and zoom.
  protected viewControls: ViewControlsObjects = new ViewControlsObjects(this.renderer);

  static get styles() {
    return [
      css`
      :host {
        width: 100%;
        height: 100%;
        min-width: 100px;
        position: relative;
        display: block;
      }
      .canvas-container {
        height: 100%;
        width: 100%;
        position: relative;
        background-repeat: no-repeat;
        margin: 0px;
        overflow: hidden;
      }
      .corner {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        position: absolute;
        right: 0px;
        z-index: 1;
        display: flex;
        color: black;
        background: #ffffff2e;
        padding: 10px;
        border-radius: 50%;
        margin: 5px;
        cursor: pointer;
        height: auto;
        width: 20px;
        font-size: 18px;
        -webkit-transition: all 0.5s ease;
          -moz-transition: all 0.5s ease;
            -o-transition: all 0.5s ease;
            -ms-transition: all 0.5s ease;
                transition: all 0.5s ease;
      }
      .corner:hover {
        background: white;
      }
      #snackbar {
        visibility: hidden;
        min-width: 250px;
        margin-left: -125px;
        background-color: #333;
        color: #fff;
        text-align: center;
        border-radius: 2px;
        padding: 16px;
        position: fixed;
        z-index: 1;
        left: 50%;
        bottom: 30px;
        font-size: 17px;
        -webkit-touch-callout: none; /* iOS Safari */
            -webkit-user-select: none; /* Safari */
             -khtml-user-select: none; /* Konqueror HTML */
               -moz-user-select: none; /* Old versions of Firefox */
                -ms-user-select: none; /* Internet Explorer/Edge */
                    user-select: none; /* Non-prefixed version, currently
                                          supported by Chrome, Opera and Firefox */
      }
      
      #snackbar.show {
        visibility: visible;
        -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
        animation: fadein 0.5s, fadeout 0.5s 2.5s;
      }
      
      @-webkit-keyframes fadein {
        from {bottom: 0; opacity: 0;} 
        to {bottom: 30px; opacity: 1;}
      }
      
      @keyframes fadein {
        from {bottom: 0; opacity: 0;}
        to {bottom: 30px; opacity: 1;}
      }
      
      @-webkit-keyframes fadeout {
        from {bottom: 30px; opacity: 1;} 
        to {bottom: 0; opacity: 0;}
      }
      
      @keyframes fadeout {
        from {bottom: 30px; opacity: 1;}
        to {bottom: 0; opacity: 0;}
      }
      `
    ];
  }

  constructor() {
    super();
    this._shapes = new ObservableSet<ShapeData>();
    this.shManager = this.createShapeManager();
    this.initShapeManagerListeners();
    this.initShapeEventsListener();
    this.addEventListener('keydown', this.keyBinding);
  }

  connectedCallback() {
    super.connectedCallback();
    // set global window event listeners on connection
    window.addEventListener('keydown', this.keyBinding);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // A classic event listener will not be automatically destroyed by lit-element, 
    // This will introduce memory leaks and weird bugs.
    window.removeEventListener('keydown', this.keyBinding);
  }

  // osbervable set of selected shape ids.
  get selectedShapeIds() {
    const lis = [...this.shManager.targetShapes.values()];
    return lis.map((s) => s.id);
  }

  set selectedShapeIds(ids: string[]) {
    this.shManager.targetShapes.clear();
    for (const v of ids) {
      // retrieve shape corresponding to id
      const shape = [...this.shapes].find((s) => s.id === v);
      if (shape) {
        this.shManager.targetShapes.add(shape);
      }
    }
  }

  get imageWidth() {
    return this.renderer.imageWidth;
  }

  get imageHeight() {
    return this.renderer.imageHeight;
  }

  set imageElement(htmlImageElement: HTMLImageElement) {
    this.renderer.image = htmlImageElement;
  }

  get imageElement() {
    return this.renderer.htmlImageElement;
  }

  protected createShapeManager() {
    const shManager = new ShapesManager(this.renderer,
      this._shapes);
    return shManager
  }

  protected initShapeManagerListeners() {
    this.shManager.on('update', (ids: string[]) => {
      this.notifyUpdate(ids);
    });
  }

  // Get set of 2d shapes with their unique id.
  // 2d shapes are observed to keep display synchronized.
  // and to dispatch events.
  get shapes() {
    return this._shapes;
  }

  /**
   * Reset canvas content with given shapes
   * @param shapes Set of [ShapeData]
   */
  set shapes(value) {
    // console.time('t1');
    // encapsulate object in Proxy
    // to observe its property changes.
    this._shapes.set((<any>value).map(observable));
  }

  public zoomIn() {
    this.viewControls.zoomIn();
  }

  public zoomOut() {
    this.viewControls.zoomOut();
  }

  public resize() {
    this.renderer.resize();
  }

  /**
   * General keyboard event handling
   * @param event [keyBoardEvent]
   */
  public keyBinding: EventListener =  (evt: Event) => {
    const event = <KeyboardEvent>evt;
    switch (event.key) {
      case 'Tab': {
        this.onTabulation.bind(this)(event);
        break;
      }
      case 'Delete': {
        this.selectedShapeIds.forEach((i) => {
          const sh = this.shManager.getShape(i);
          if (sh) {
            this.shapes.delete(sh);
          }
        });
        this.shManager.targetShapes.clear();
        break;
      }
      case 'Escape': {
        this.shManager.targetShapes.clear();
        break;
      }
    }
  }

  /**
   * Handle tabulation event
   * @param event [keyBoardEvent]
   */
  protected onTabulation(event: KeyboardEvent) {
    if (this.mode === Mode.Create) {
      return;
    }
    event.preventDefault();
    const shapes = [...this.shapes.values()];
    const currIdx = shapes.findIndex((s) => this.shManager.targetShapes.has(s)) || 0;
    const nextIdx = event.shiftKey ?  (currIdx + 1 + shapes.length) % shapes.length
                                    : (currIdx - 1 + shapes.length) % shapes.length;
    const nextShape = shapes[nextIdx];
    if (nextShape) {
      this.shManager.targetShapes.set([nextShape])
    }
  }

  protected initShapeEventsListener() {
    // Trigger notification on shape
    // selection(s) changed.
    observe(this.shManager.targetShapes, () => {
      this.notifySelection([...this.shManager.targetShapes].map((t) => t.id));
    });
    observe(this.shapes, (event: any, shape?: ShapeData) => {
      if (event === 'add' && shape) {
        this.notifyCreate(shape);
      }
      if (event === 'delete' && shape) {
        this.notifyDelete([shape.id]);
      }
    });
  }

  /**
   * Called after the element’s DOM has been updated the first time
   * @param changedProperty
   */
  protected firstUpdated() {
    this.renderer.setContainer(this.canvasElement);
  }

  /**
   * Snackbar temporary appearance
   * To display mode instructions.
   * @param text
   */
  protected showTooltip(text: string) {
    const x = this.shadowRoot!.getElementById("snackbar")!;
    x.className = "show";
    x.innerHTML = text;
    setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
  }

  /**
   * Called on every property change
   * @param changedProperty
   */
  protected updated(changedProperties: any) {
    if (changedProperties.has('image') && this.image != null) {
      const htmlImageElement = new Image();
      htmlImageElement.crossOrigin = "Anonymous";
      if (this.image) {
        htmlImageElement.onload = () => {
          if (htmlImageElement !== null) {
            // WARNING: automatic resizing needed
            // TODO: remove the necessity of it.
            // this.renderer.resize();
            this.renderer.image = htmlImageElement;          
          }
        }
        htmlImageElement.src = this.image;
      } else {
        this.renderer.image = htmlImageElement;
      }
    }
    if (changedProperties.has('hideLabels') && this.hideLabels != undefined) {
      this.renderer.showObjects = !this.hideLabels;
    }
    if (changedProperties.has('mode') && this.mode) {
      this.shManager.setMode(this.mode);
      this.dispatchEvent(new Event('mode'));
    }
  }

  protected notifyUpdate(ids: string[]) {
    /**
     * Fired when `pxn-canvas-2d` creates object.
     *
     * @event update
     * @param {string[]} ids Ids updated.
     */
    this.dispatchEvent(new CustomEvent('update', { detail: ids }));
  }

  protected notifyMode(mode: Mode) {
    /**
     * Fired when `pxn-canvas-2d` changes mode.
     *
     * @event mode
     * @param {string} mode New mode.
     */
    this.mode = mode;
    this.dispatchEvent(new CustomEvent('mode', {detail: this.mode}));
  }

  protected notifySelection(ids: string[]) {
    /**
     * Fired when `pxn-canvas-2d` changes selection.
     *
     * @event selection
     * @param {string[]} ids New selection.
     */
    this.dispatchEvent(new CustomEvent('selection', {detail: ids}));
  }

  protected notifyCreate(obj: ShapeData) {
    /**
     * Fired when `pxn-canvas-2d` creates object.
     *
     * @event create
     * @param {string} obj New shape.
     */
    this.dispatchEvent(new CustomEvent('create', {detail: obj}));
  }

  protected notifyDelete(ids: string[]) {
    /**
     * Fired when `pxn-canvas-2d` deletes object.
     *
     * @event delete
     * @param {string[]} ids Ids deleted.
     */
    this.dispatchEvent(new CustomEvent('delete', { detail: ids}));
  }

  /**
   * Return HTML canvas element where labels are drawn
   */
  protected get canvasElement(): HTMLDivElement {
    return this.shadowRoot!.getElementById("canvas") as HTMLDivElement;
  }

  /**
   * Render canvas fullscreen.
   */
  protected fullScreen() {
    if (document.fullscreenEnabled) {
      this.canvasElement.requestFullscreen();
    }
  }

  /**
   * Render the element template.
   */
  render(){
    /**
     * `render` must return a lit-html `TemplateResult`.
     *
     * To create a `TemplateResult`, tag a JavaScript template literal
     * with the `html` helper function:
     */
    return html`
      ${this.disablefullscreen ? html``: html`
        <p class="corner" @click=${this.fullScreen} title="Fullscreen">${fullscreen}</p>`}
      <div id="canvas" class="canvas-container" oncontextmenu="return false;"></div>
      <div id="snackbar">Some text some message..</div>
    `;
  }
}

declare global {
    interface HTMLElementTagNameMap {
      'pxn-canvas-2d': Canvas2d;
    }
}

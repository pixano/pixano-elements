/**
 * Implementations of segmentation mask editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { LitElement, css, html, customElement, property} from 'lit-element';
import { PxnRenderer } from './renderer-2d';
import { ViewControls } from './view-controls';
import { MaskHandler } from './mask-handler';
import { GMask } from './shapes-2d';
import { MaskVisuMode } from './mask';
import { Mode } from './mask-handler';

const fullscreen = html`<svg width="24" height="24" viewBox="0 0 24 24"><path d="M21.414 18.586l2.586-2.586v8h-8l2.586-2.586-5.172-5.172 2.828-2.828 5.172 5.172zm-13.656-8l2.828-2.828-5.172-5.172 2.586-2.586h-8v8l2.586-2.586 5.172 5.172zm10.828-8l-2.586-2.586h8v8l-2.586-2.586-5.172 5.172-2.828-2.828 5.172-5.172zm-8 13.656l-2.828-2.828-5.172 5.172-2.586-2.586v8h8l-2.586-2.586 5.172-5.172z"/></svg>`;


  /**
   * `<pxn-segmentation>` Basic segmentation editor.
   * Use `<pxn-segmentation>` in your document with its src image.
   * <body>
   *   <pxn-segmentation></pxn-segmentation>
   * @customElement
   *
   */
@customElement('pxn-segmentation' as any)
export class Segmentation extends LitElement {

// input image path
@property({type: String})
public image: string | null = null;

@property({type: String})
public mask: ImageData | null = null;

@property({type: Boolean})
public disablefullscreen: boolean = false;

@property({type: String})
public mode: Mode = Mode.SELECT_INSTANCE;

@property({type: String})
public maskVisuMode : MaskVisuMode = MaskVisuMode.SEMANTIC;

public opacity: number = 0.35;

// background color
public color: string = "#f3f3f5";

protected renderer: PxnRenderer = new PxnRenderer({color: this.color});

protected viewControls: ViewControls = new ViewControls(this.renderer);

protected selectedId: [number, number, number] = [0,0,0];

// container of mask
// never destroyed
private _graphicMask: GMask = new GMask();

private newMaskLoaded: boolean = false;

protected maskHandler = new MaskHandler(this.renderer,
                                        this._graphicMask,
                                        this.selectedId);


static get styles() {
  return [
    css`
    :host {
      width: 100%;
      height: 100%;
      min-width: 100px;
      position: relative;
      display: flex;
    }
    .canvas-container {
      height: 100%;
      width: 100%;
      position: relative;
      background-color: #e5e5e5;
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
    `
  ];
}

constructor() {
  super();
  this.renderer.labelLayer.addChild(this._graphicMask);
  this.renderer.labelLayer.alpha = this.opacity;
  this.maskHandler.brushFilter.alpha = this.opacity;
  this.renderer.stage.addChild(this.maskHandler);

  this.maskHandler.on('update', () => {
    this.dispatchEvent(new Event('update'));
  });
  this.maskHandler.on('selection', (id: string) => {
    this.dispatchEvent(new CustomEvent('selection', { detail: id }));
  });
}

get targetClass() {
  return this.maskHandler.targetClass;
}

set targetClass(clsIdx: number) {
  this.maskHandler.targetClass = clsIdx;
}

get clsMap() {
  return this._graphicMask.clsMap;
}

// Map of class indices and their color
// [r, g, b, isInstance]
// if class is instanciable, isInstance = 1 else 0
set clsMap(clsMap: Map<number, [number, number, number, number]>) {
  this._graphicMask.clsMap = clsMap;
}

public getMask() {
  return this._graphicMask.getBase64();
}

public setMask(buffer: string) {
  this.newMaskLoaded = true;
  this._graphicMask.setBase64(buffer);
}

public setEmpty() {
  if (this.renderer.imageWidth === 0 || this.renderer.imageHeight === 0) {
    return;
  }

  const maxId = this._graphicMask.empty(this.renderer.imageWidth, this.renderer.imageHeight);
  this.maskHandler.selectedId = [maxId[0], maxId[1], this.maskHandler.targetClass]
}


/**
 * Called after the element’s DOM has been updated the first time
 * @param changedProperty
 */
protected firstUpdated() {
  this.renderer.setContainer(this.canvasElement);
}

set imageElement(htmlImageElement: HTMLImageElement) {
  this.renderer.image = htmlImageElement;
  this.maskHandler.deselect();
}

get imageElement() {
  return this.renderer.htmlImageElement;
}


/**
 * Called on every property change
 * @param changedProperty
 */
protected updated(changedProperties: any) {

  if (changedProperties.has('image') && this.image) {
    this.maskHandler.deselect();
    const htmlImageElement = new Image();
    htmlImageElement.onload = () => {
      if (htmlImageElement !== null) {
        // WARNING: automatic resizing needed
        this.renderer.resize();
        this.renderer.image = htmlImageElement;
        if (!this.newMaskLoaded) {
          this.setEmpty();
        }
      }
    }
    htmlImageElement.src = this.image;
  }

  if (changedProperties.has('mask') && this.mask && this.mask instanceof ImageData) {
    this.newMaskLoaded = true;
    const maxId = this._graphicMask.initialize(this.mask);
    this.maskHandler.selectedId = [maxId[0], maxId[1], this.maskHandler.targetClass];
  }
  if (changedProperties.has('mode') && this.mode) {
    this.maskHandler.setMode(this.mode);
  }

  if (changedProperties.has('maskVisuMode') && this.maskVisuMode) {
    this._graphicMask.maskVisuMode = this.maskVisuMode;
    this.maskHandler.updateTempBrushGraphic();
    const curMask  = this._graphicMask.getValue();
    if (curMask instanceof ImageData) {
      this._graphicMask.setValue(curMask);
    }
  }
}


/**
 * Return HTML canvas element where labels are drawn
 */
protected get canvasElement(): HTMLDivElement {
  return this.shadowRoot!.getElementById("canvas") as HTMLDivElement;
}

public fillSelection() {
  this.maskHandler.fillSelection(this.maskHandler.selectedId);
}

public fillSelectionWithClass(newClass: number) {
  const currClass = this.maskHandler.selectedId[2];
  let newId: [number, number, number] = [ this.maskHandler.selectedId[0],  this.maskHandler.selectedId[1], newClass];
  if (this.clsMap.get(newClass)![3] && !this.clsMap.get(currClass)![3]) {
    // new class is instance and was semantic before: new instance idx
    const nextIdx = this._graphicMask.getNextId();
    newId = [nextIdx[0], nextIdx[1], newId[2]];
  } else if (!this.clsMap.get(newClass)![3]) {
    newId = [0, 0, newId[2]];
  }
  this.maskHandler.fillSelection(newId);
}

/**
 * Set opacity of the mask layer
 * @param opacity number [0-1]
 */
public setOpacity(opacity: number){
  this.renderer.labelLayer.alpha = opacity;
  // this.maskHandler.brushFilter.alpha = this.renderer.labelLayer.alpha;
  this.maskHandler.updateTempBrushGraphic();

}

/**
 * Toggle mask opacity from 0 to 1.
 */
public toggleMask() {
  if (this.renderer.labelLayer.alpha === this.opacity) {
    this.renderer.labelLayer.alpha = 1;
    this.renderer.backgroundSprite.visible = false;
  } else if (this.renderer.labelLayer.alpha === 1) {
    this.renderer.labelLayer.alpha = 0;
    this.renderer.backgroundSprite.visible = true;
  } else {
    this.renderer.backgroundSprite.visible = true;
    this.renderer.labelLayer.alpha = this.opacity;
  }
  this.maskHandler.updateTempBrushGraphic();

}

/**
 * Remove little blobs
 */
public filterLittle() {
  this.maskHandler.filterAll(10)
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
  return html`
  ${this.disablefullscreen ? html`` : html`
  <p class="corner" @click=${this.fullScreen} title="Fullscreen">${fullscreen}</p>`}
    <div id="canvas" class="canvas-container" oncontextmenu="return false;"></div>
  `;
}
}

declare global {
  interface HTMLElementTagNameMap {
    'pxn-segmentation': Segmentation;
  }
}

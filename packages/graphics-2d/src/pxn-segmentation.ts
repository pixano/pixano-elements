/**
 * Implementations of segmentation mask editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property} from 'lit-element';
import { MaskManager, CreatePolygonController } from './controller-mask';
import { GMask } from './graphics';
import { MaskVisuMode } from './graphic-mask';
import { Canvas } from './pxn-canvas';

/**
 * `<pxn-segmentation>` Basic segmentation editor.
 * Use `<pxn-segmentation>` in your document with its src image.
 * <body>
 *   <pxn-segmentation></pxn-segmentation>
 * @customElement
 *
 */
@customElement('pxn-segmentation' as any)
export class Segmentation extends Canvas {

  @property({type: String})
  public mask: ImageData | null = null;

  @property({type: String})
  public mode: 'select' | 'edit-add' | 'edit-remove' | 'create' = 'select';

  @property({type: String})
  public maskVisuMode : MaskVisuMode = MaskVisuMode.SEMANTIC;

  public opacity: number = 0.60;

  protected selectedId: [number, number, number] = [0,0,0];

  // container of mask
  // never destroyed
  protected _graphicMask: GMask = new GMask();

  private newMaskLoaded: boolean = false;

  protected maskManager = new MaskManager(this.renderer,
                                          this._graphicMask,
                                          this.selectedId);
  @property({type: Boolean})
  public showroi : boolean = (this.maskManager.modes.create as CreatePolygonController).showRoi;

  constructor() {
    super();
    this.renderer.labelLayer.addChild(this._graphicMask);
    this.renderer.labelLayer.alpha = this.opacity;

    this.maskManager.addEventListener('update', () => {
      this.dispatchEvent(new Event('update'));
    });
    this.maskManager.addEventListener('selection', (evt: any) => {
      this.dispatchEvent(new CustomEvent('selection', { detail: evt.detail }));
    });
    this.addEventListener('load', this.onImageChanged.bind(this));

    window.addEventListener('keydown', (evt) => {
      if (evt.key === "Alt") {
        this.switchMode();
      }
    });
  }

  get targetClass() {
    return this.maskManager.targetClass.value;
  }

  set targetClass(clsIdx: number) {
    this.maskManager.targetClass.value = clsIdx;
  }

  get clsMap() {
    return this._graphicMask.clsMap;
  }

  // Map of class indices and their color
  // [r, g, b, isInstance]
  // if class is instanciable, isInstance = 1 else 0
  set clsMap(clsMap: Map<number, [number, number, number, number]>) {
    if (clsMap instanceof Map) {
      this._graphicMask.clsMap = clsMap;
    } else if (typeof clsMap === "object") {
      this._graphicMask.clsMap = new Map(Object.entries(clsMap).map(([k,n]) => ([Number(k),n]))) as any;
    }
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
    this._graphicMask.empty(this.renderer.imageWidth, this.renderer.imageHeight);
    this.maskManager.selectedId.value = [-1, -1, -1];
  }

  protected onImageChanged() {
    if (!this.newMaskLoaded) {
      this.setEmpty();
    }
  }

  /**
   * Called on every property change
   * @param changedProperty
   */
  protected updated(changedProperties: any) {
    super.updated(changedProperties);

    if (changedProperties.has('mask') && this.mask && this.mask instanceof ImageData) {
      this.newMaskLoaded = true;
      this._graphicMask.initialize(this.mask);
      this.maskManager.selectedId.value = [-1, -1, -1];
    }
    if (changedProperties.has('mode') && this.mode) {
      this.maskManager.setMode(this.mode);
    }

    if (changedProperties.has('maskVisuMode') && this.maskVisuMode) {
      this._graphicMask.maskVisuMode = this.maskVisuMode;
      const curMask  = this._graphicMask.getValue();
      if (curMask instanceof ImageData) {
        this._graphicMask.recomputeColor();
      }
    }

    if (changedProperties.has('showroi')) {
      const controller = this.maskManager.modes.create as CreatePolygonController;
      controller.showRoi = this.showroi;
    }
  }

  public fillSelection() {
    if (this.maskManager.selectedId.value) {
      this.maskManager.fillSelection(this.maskManager.selectedId.value);
    }
  }

  public fillSelectionWithClass(newClass: number) {
    if (this.maskManager.selectedId.value) {
      const currClass = this.maskManager.selectedId.value[2];
      let newId: [number, number, number] = [ this.maskManager.selectedId.value[0],  this.maskManager.selectedId.value[1], newClass];
      if (this.clsMap.get(newClass)![3] && !this.clsMap.get(currClass)![3]) {
        // new class is instance and was semantic before: new instance idx
        const nextIdx = this._graphicMask.getNextId();
        newId = [nextIdx[0], nextIdx[1], newId[2]];
      } else if (!this.clsMap.get(newClass)![3]) {
        newId = [0, 0, newId[2]];
      }
      this.maskManager.fillSelection(newId);
    }
  }

  /**
   * Set opacity of the mask layer
   * @param opacity number [0-1]
   */
  public setOpacity(opacity: number){
    this.renderer.labelLayer.alpha = opacity;

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
  }

  /**
   * Remove little blobs
   */
  public filterLittle(numPixels: number = 10) {
    this.maskManager.filterAll(numPixels)
  }

  switchMode() {
    const modes = Object.keys(this.maskManager.modes);
    const currentIdx = modes.findIndex((m) => m === this.mode);
    this.mode = modes[(currentIdx + 1) % modes.length] as any;
    this.dispatchEvent(new Event("mode"));
  }
}

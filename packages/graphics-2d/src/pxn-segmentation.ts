/**
 * Implementations of segmentation mask editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property} from 'lit-element';
import { MaskHandler } from './mask-handler';
import { GMask } from './shapes-2d';
import { MaskVisuMode } from './mask';
import { Mode } from './mask-handler';
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
  public mode: Mode = Mode.SELECT_INSTANCE;

  @property({type: String})
  public maskVisuMode : MaskVisuMode = MaskVisuMode.SEMANTIC;

  public opacity: number = 0.35;

  protected selectedId: [number, number, number] = [0,0,0];

  // container of mask
  // never destroyed
  private _graphicMask: GMask = new GMask();

  private newMaskLoaded: boolean = false;

  protected maskHandler = new MaskHandler(this.renderer,
                                          this._graphicMask,
                                          this.selectedId);

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

  protected onImageChanged() {
    this.maskHandler.deselect();
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
}
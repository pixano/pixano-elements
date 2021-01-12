/**
 * Implementations of segmentation mask editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property } from 'lit-element';
import { Segmentation } from './pxn-segmentation';
import { MaskVisuMode } from './graphic-mask';
import { SmartCreateController } from './controller-mask-interactive';

/**
 * `<pxn-segmentation>` Basic segmentation editor.
 * Use `<pxn-segmentation>` in your document with its src image.
 * <body>
 *   <pxn-segmentation></pxn-segmentation>
 * @customElement
 *
 */
@customElement('pxn-segmentation-interactive' as any)
export class SegmentationInteractive extends Segmentation {

  @property({type: String})
  public model: string = 'https://raw.githubusercontent.com/pixano/pixano.github.io/master/models/box_model/model.json';

  constructor() {
    super();
    this.maskVisuMode = MaskVisuMode.INSTANCE;
    this.maskManager.setController('smart-create', new SmartCreateController({
        renderer: this.renderer,
        gmask: this._graphicMask,
        targetClass: this.maskManager.targetClass,
        dispatchEvent: this.dispatchEvent})
    );
  }

  updated(changedProperties: any) {
    super.updated(changedProperties);
    if (changedProperties.has('model')) {
      (this.maskManager.modes['smart-create'] as SmartCreateController).load(this.model);
    }
  }
}

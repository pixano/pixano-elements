/**
 * Implementations of segmentation mask editor.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { customElement, property } from 'lit-element';
import { Segmentation } from './pxn-segmentation';
import { MaskVisuMode } from './graphic-mask';
import { SmartCreateController } from './controller-smart-mask';

/**
 * `<pxn-smart-segmentation>` Advanced segmentation editor with smart segmentation capability.
 * Use `<pxn-smart-segmentation>` in your document with its src image.
 * <body>
 *   <pxn-smart-segmentation></pxn-smart-segmentation>
 * @customElement
 *
 */
@customElement('pxn-smart-segmentation' as any)
export class SmartSegmentation extends Segmentation {

  @property({type: String})
  public model: string = 'https://raw.githubusercontent.com/pixano/pixano.github.io/master/models/box_model/model.json';

  constructor() {
    super();
    this.maskVisuMode = MaskVisuMode.INSTANCE;
	//add smart segmentation creation controller
	this.modes['smart-create'] = new SmartCreateController({...this} as any);
  }

  updated(changedProperties: any) {
    super.updated(changedProperties);
    if (changedProperties.has('model')) {
      (this.modes['smart-create'] as SmartCreateController).load(this.model);
    }
  }
}

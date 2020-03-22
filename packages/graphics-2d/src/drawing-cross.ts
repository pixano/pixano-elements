/**
 * Implementations of 2 graphical shapes.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Graphics as PIXIGraphics } from 'pixi.js';

export class DrawingCross extends PIXIGraphics {

    public cx: number = 0;
    public cy: number = 0;
    public scaleX: number = 100;
    public scaleY: number = 100;

    constructor() {
      super();
    }

    draw() {
      if (this.parent) {
        this.clear();
        this.lineStyle(0.75, 0xF44336, 1, 0.5, true);
        this.moveTo(this.cx, 0);
        this.lineTo(this.cx, this.scaleY);
        this.moveTo(0, this.cy);
        this.lineTo(this.scaleX, this.cy);
      }
    }
}
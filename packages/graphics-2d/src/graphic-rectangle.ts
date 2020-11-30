/**
 * Implementations of 2 graphical shapes.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Graphic } from './graphic';

/**
 * Rectangle graphic.
 */
export class GraphicRectangle extends Graphic {

    draw() {
      const width = this.scaleX;
      const height = this.scaleY;
      this.area.clear();
      this.area.removeChildren();
      this.area.beginFill(this.hex, 0.15);
      this.area.lineStyle(1, this.hex, 1, 0.5, true);
      const left = Math.round(this.data.geometry.vertices[0] * width);
      const right = Math.round(this.data.geometry.vertices[2] * width);
      const top = Math.round(this.data.geometry.vertices[1] * height);
      const bottom = Math.round(this.data.geometry.vertices[3] * height);
      this.area.drawRect(
          0, 0,
          right - left,
          bottom - top);
      this.area.x = left;
      this.area.y = top;
      this.area.endFill();
      this.box.clear();
      this.controls.forEach((n) => n.clear());
      if (this.state === 'box' ||
          this.state === 'nodes' ||
          this.state === 'contour') {
        this.box.lineStyle(1, 0XFFFFFF, 1, 0.5, true);
        this.box.drawRect(
            left, top,
            right - left,
            bottom - top);
      }
      if (this.state === 'box' ||
        this.state === 'nodes') {
          this.drawBox();
      } else {
        this.nodeContainer.interactive = false;
        this.controls.forEach((c) => {
          c.buttonMode = false;
          c.interactive = false;
        })
      }
    }
}
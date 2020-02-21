/**
 * Implementations of data to graphics conversion.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { ShapeData } from './types';
import { Shape, RectangleShape, PolygonShape, GraphShape, MultiPolygonShape } from './shapes-2d';

export const rgbToHex = (r: number, g: number, b: number) => {
    return (r << 16) + (g << 8) + (b | 0);
  }
  
export const dataToShape = (s: ShapeData): Shape => {
    function switchGraphic(d: ShapeData) {
        switch(s.geometry.type) {
            case 'rectangle': return new RectangleShape(d);
            case 'graph': return new GraphShape(d);
            case 'polygon': return new PolygonShape(d);
            case 'multi_polygon': return new MultiPolygonShape(d);
            default: 
                return new RectangleShape(s);
        }
    }
    const obj: Shape = switchGraphic(s);
    return obj;
}
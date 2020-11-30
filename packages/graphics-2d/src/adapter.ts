/**
 * Implementations of data to graphics conversion.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { ShapeData } from './types';
import { Graphic, GraphicRectangle, GraphicPolygon, GraphicMultiPolygon, GraphicGraph } from './graphics';

export const rgbToHex = (r: number, g: number, b: number) => {
    return (r << 16) + (g << 8) + (b | 0);
}

export const dataToShape = (s: ShapeData): Graphic => {
    switch(s.geometry.type) {
        case 'rectangle': return new GraphicRectangle(s);
        case 'polygon': return new GraphicPolygon(s);
        case 'multi_polygon': return new GraphicMultiPolygon(s);
        case 'graph': return new GraphicGraph(s);
        default:
            return new GraphicRectangle(s);
    }
}
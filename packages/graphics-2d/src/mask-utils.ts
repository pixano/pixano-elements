import { Point } from 'pixi.js';

export interface DensePolygon {
    type: string; // external or internal
    data: any[]; // list of {x, y} dict
}

export function  unfuseId(fId: number): [number, number, number] {
    const cls = Math.floor(fId / (256 * 256));
    const id2 = Math.floor((fId % (256 * 256)) / 256);
    const id1 = fId - cls * (256 * 256) - id2 * 256;
    return [id1, id2, cls];
}

export function fuseId(id: [number, number, number]): number {
    return id[0] + 256 * id[1] + 256 * 256 * id[2];
}

export function isInside(pt: Point, vs: Point[]): boolean {
    const x = pt.x;
    const y = pt.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const intersect = ((vs[i].y > y) !== (vs[j].y > y))
            && (x < (vs[j].x - vs[i].x) * (y - vs[i].y) / (vs[j].y - vs[i].y) + vs[i].x);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function getPolygonExtrema(polygon: Point[]): number[] {
    let xMin = 100000;
    let xMax = 0;
    let yMin = 10000;
    let yMax = 0;

    polygon.forEach((pt) => {
      if (pt.x < xMin) xMin = pt.x
      if (pt.x > xMax) xMax = pt.x
      if (pt.y < yMin) yMin = pt.y
      if (pt.y > yMax) yMax = pt.y
    });
    return [xMin, yMin, xMax, yMax];
};

export function extremaUnion(extrema: number[], extrema2: number[]): number[]{
    let [xMin, yMin, xMax, yMax] = extrema;
    const [xMin2, yMin2, xMax2, yMax2] = extrema2;
    if (xMin2 < xMin) xMin = xMin2;
    if (yMin2 < yMin) yMin = yMin2;
    if (xMax2 > xMax) xMax = xMax2;
    if (yMax2 > yMax) yMax = yMax2;
    return [xMin, yMin, xMax, yMax];
}

/**
 * Convert an array of points stored using row order into an array of pixels (pixel format : {x:x_value, y:y_value})
 * @param indexes an array of points stored row order, indexes[0] => x=0,y=0, indexes[1] => x=1,y=0, ...
 * @param width the width of the image
 */
export function convertIndexToDict(indexes: number[], width: number): Point[] {
    return indexes.map((idx) => {
        const y = idx /  width | 0;
        const x = idx % width;
        return new Point(x, y);
    });
}
/**
 * Returns all pixels of the straight line between p1 and p2
 * @param p1 pixel format : {x:x_value, y:y_value}
 * @param p2 pixel format : {x:x_value, y:y_value}
 */
export function calcStraightLine (p1: Point, p2: Point): Point[] {
    const coordinatesArray: Point[] = [];
    // Translate coordinates
    let x1 = p1.x;
    let y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    // Define differences and error check
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    // Set first coordinates
    coordinatesArray.push(new Point(x1,y1));

    // Main loop
    while (!((x1 === x2) && (y1 === y2))) {
        const e2 = err << 1;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
        // Set coordinates
        coordinatesArray.push(new Point(x1,y1));
    }
    // Return the result
    return coordinatesArray;
}

/**
 * Returns all border pixels from a polygon defined from some vertices (3 vertices for a triangle for example)
 * @param polygon an array of vertices with vertex format {x:x_value, y:y_value}
 * @param ctType a string, whether 'external' or 'internal' to indicated the contour type
 */
export function densifyPolygon(polygon: Point[], ctType='external'): DensePolygon{
    const densePoly: Point[] = [];
    for(let i = 0; i < polygon.length; i++){
        const p1 = polygon[i];
        const p2 = i === polygon.length - 1 ? polygon[0] : polygon[i+1];
        const linePixels = calcStraightLine(p1, p2);
        densePoly.push(...linePixels.slice(0, -1));
    }
    return {type: ctType, data: densePoly};
}

/**
 * Check whether an array of vertices (defining a polygon) is ordered clockwise
 * @param polygon an array of vertices with vertex format {x:x_value, y:y_value}
 * @returns true if the array is ordered clockwise, false otherwise
 */
export function isClockwise(polygon: Point[]): boolean{
    let sum = 0;
    for(let i = 0; i < polygon.length; i++){
        const p1 = polygon[i];
        const p2 = i === polygon.length - 1 ? polygon[0] : polygon[i+1];
        sum += (p2.x - p1.x)*(p2.y + p1.y);
    }
    return sum < 0;
}


export function getPixelId(data: ImageData, idx: number) : [number, number, number] {
    const id1 = data.data[idx * 4];
    const id2 = data.data[idx * 4 + 1];
    const cls = data.data[idx * 4 + 2];
    return [id1, id2, cls];
}

export function getDensePolysExtrema(densePolygons: DensePolygon[]): number[]{
    let xMin = 1000000;
    let xMax = 0;
    let yMin = 1000000;
    let yMax = 0;

    densePolygons.forEach((poly) => {
        poly.data.forEach((pt) => {
            if (pt.x < xMin) xMin = pt.x
            if (pt.x > xMax) xMax = pt.x
            if (pt.y < yMin) yMin = pt.y
            if (pt.y > yMax) yMax = pt.y
        });
    });
    return [xMin, yMin, xMax, yMax];
}

export const distinctColors: [number, number, number][] = [
    [230, 25, 75], // 0 red-pink
    [60, 180, 75], // 1 green
    [255, 225, 25], // 2 yellow
    [0, 130, 200], // 3 blue
    [245, 130, 48], // 4 orange
    [145, 30, 180], // 5 purple
    [70, 240, 240], // 6 cyan
    [240, 50, 230], // 7 pink-purple
    [210, 245, 60], // 8 yellow-green
    [250, 190, 190], // 9 light pink
    [0, 128, 128], // 10 blue green
    [230, 190, 255], // 11 light purple
    [170, 110, 40], // 12 brown
    [255, 250, 200], // 13 light yellow green
    [128, 0, 0], // 14 dark red
    [170, 255, 195], // 15 green fluo
    [128, 128, 0], // 16 dark green-brown
    [255, 215, 180], // 17 beige
    [0, 0, 128], // 18 dark blue
    [128, 128, 128] // 19 grey
];
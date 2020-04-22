/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */


/**
 * Convert a hex color number into an [R, G, B] array
 * @param hex hexadecimal color number
 */
export const hexToRgb255 = (hex: number) => {
    const out = [0,0,0];
    out[0] = (hex >> 16 & 0xFF);
    out[1] = (hex >> 8 & 0xFF);
    out[2] = (hex & 0xFF);
    return out;
}

/**
 * Convert an [R, G, B] array to hex color number
 * @param rgb [R, G, B] array
 */
export function rgb2hex(rgb: number[]): number {
    return ((rgb[0]*255 << 16) + (rgb[1]*255 << 8) + rgb[2]*255);
}

export function colorToRGBA(color: string): Uint8ClampedArray {
    // Returns the color as an array of [r, g, b, a] -- all range from 0 - 255
    // color must be a valid canvas fillStyle. This will cover most anything
    // you'd want to use.
    // Examples:
    // colorToRGBA('red')  # [255, 0, 0, 255]
    // colorToRGBA('#f00') # [255, 0, 0, 255]
    const cvs = document.createElement('canvas');
    cvs.height = 1;
    cvs.width = 1;
    const ctx = cvs.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data;
}

export function byteToHex(num: number) {
    // Turns a number (0-255) into a 2-character hex number (00-ff)
    return ('0'+num.toString(16)).slice(-2);
}

export function colorToHex(color: string) {
    // Convert any CSS color to a hex representation
    // Examples:
    // colorToHex('red')            # '#ff0000'
    // colorToHex('rgb(255, 0, 0)') # '#ff0000'
    const rgba = colorToRGBA(color);
    const hex = [0,1,2].map((idx) => byteToHex(rgba[idx]))
                       .join('');
    return "#"+hex;
}

/**
 * Get normalized bounding box encompassing the shape.
 * Return [xmin,ymin,xmax,ymax]
 */
export function bounds(vertices: number[]) {
    let xMin = 1;
    let xMax = 0;
    let yMin = 1;
    let yMax = 0;
    vertices.forEach((c, idx) => {
        if (idx % 2 === 0) {
        if (c < xMin) xMin = c;
        if (c > xMax) xMax = c;
        } else {
        if (c < yMin) yMin = c;
        if (c > yMax) yMax = c;
        }
    });
    return [xMin, yMin, xMax, yMax];
}

/**
 * Insert a node into a flatten array of vertices
 * @param vertices flatten array of vertices
 * @param idx index of insertion
 */
export function insertMidNode(vertices: number[], idx: number): number[] {
    const midIdx = (idx + 1 + vertices.length) % vertices.length;
    return [
        ...vertices.slice(0, midIdx * 2),
        (0.5 * (vertices[2 * idx] + vertices[2 * midIdx])),
        (0.5 * (vertices[2 * idx + 1] + vertices[2 * midIdx + 1])),
        ...vertices.slice(midIdx * 2)
    ];
}

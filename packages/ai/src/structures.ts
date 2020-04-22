/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

export interface Point {
    x: number,
    y: number
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Detection {
    boundingBox: Rectangle;
    score: number;
    category: string;
}

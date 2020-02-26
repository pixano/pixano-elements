/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

export interface Geometry {
  // flatten coordinates of the object
  vertices: number[];
  // edges: [[0,1],[0,2]...]
  edges?: [number, number][];
  // edges: [true,false...]
  visibles?: boolean[];
  // geometry type: 'rectangle'
  type: string;
  // dimension
  dim?: number;
  // in case of multi polygon
  mvertices?: number[][];
}

export interface ShapeData {
  // unique id
  id: string;
  // geometry of the shape
  geometry: Geometry;
  // color
  color?: string;
  // category string
  category?: string;
}
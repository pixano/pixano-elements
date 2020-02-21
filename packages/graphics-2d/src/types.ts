/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

export interface Geometry {
  // flatten coordinates of the object
  vertices: number[];
  // edges: [[0,1],[0,2]...]
  edges?: Array<[number, number]>;
  // edges: [true,false...]
  visibles?: Array<boolean>;
  // geometry type: 'rectangle'
  type: string;
  // dimension
  dim?: number;
  // in case of multi polygon
  mvertices?: Array<number[]>;
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

// @observable
// export class ObservableShapeData implements ShapeData {
//     id = Math.random().toString(36);
//     vertices: number[] = [];
//     color = 0xffffff;
//     type = '';
//     edges: Array<[number, number]> = [];
//     visibles: boolean[] = [];
//     mvertices = [];
//     category = '';

//     constructor(obj: ShapeData) {
//       const scope = (<any>this);
//       // set properties of interest
//       Object.entries(obj).forEach(([key, value]) => {
//         scope[key] = JSON.parse(JSON.stringify(value));
//       });
//     }

//     public data() {
//       const data = JSON.parse(JSON.stringify(this));
//       return data;
//     }
//   }

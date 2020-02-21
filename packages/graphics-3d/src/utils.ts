/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

import { Cuboid } from './types';

/** True modulo function (not remainder, duh!). */
export function mod(n: number, m: number) {
    return ((n % m) + m) % m;
  }

/** Normalize angle between -pi and pi. */
export function normalizeAngle(a: number) {
    return mod(a + Math.PI, 2 * Math.PI) - Math.PI;
}

export const chunk = (arr: any, size: number) => arr.reduce((chunks: any, el: any, i: number) => (i % size
    ? chunks[chunks.length - 1].push(el)
    : chunks.push([el])) && chunks, [])

/**
 * Filter points in box
 * @param point_buffer array of array of numbers
 * @param annotation filtering cube
 */
export function filterPtsInBox(point_buffer: [number, number, number][] | Float32Array, annotation: Cuboid): [number, number, number][] {
    if (point_buffer instanceof Float32Array) {
        point_buffer = chunk(point_buffer, 3) as [number, number, number][];
    }
    const rz = annotation.heading;
    const size = annotation.size;
    const pos = annotation.position;
    const cond = (el: [number, number]) => {
      return el[0] < 0.5 * size[0] && el[0] > - 0.5 * size[0]
            && el[1] < 0.5 * size[1] && el[1] > - 0.5 * size[1];
    }
    const output = point_buffer.filter((pt) => {
      const x = Math.cos(rz) * (pt[0] - pos[0]) + Math.sin(rz) * (pt[1] - pos[1]);
      const y = - Math.sin(rz) * (pt[0] - pos[0]) + Math.cos(rz) * (pt[1] - pos[1]);
      return cond([x, y]);
    });
    return output;
}

/**
 * List points in box
 * @param point_buffer array of array of numbers
 * @param annotation filtering cube
 */
export function listPtsInBox(point_buffer: [number, number, number][] | Float32Array, annotation: Cuboid): boolean[] {
  if (point_buffer instanceof Float32Array) {
      point_buffer = chunk(point_buffer, 3) as [number, number, number][];
  }
  const rz = annotation.heading;
  const size = annotation.size;
  const pos = annotation.position;
  const cond = (el: [number, number]) => {
    return el[0] < 0.5 * size[0] && el[0] > - 0.5 * size[0]
          && el[1] < 0.5 * size[1] && el[1] > - 0.5 * size[1];
  }
  const output = point_buffer.map((pt) => {
    const x = Math.cos(rz) * (pt[0] - pos[0]) + Math.sin(rz) * (pt[1] - pos[1]);
    const y = - Math.sin(rz) * (pt[0] - pos[0]) + Math.cos(rz) * (pt[1] - pos[1]);
    return cond([x, y]);
  });
  return output;
}

// /**
//  * Find points in box
//  * @param point_buffer array of array of numbers
//  * @param annotation filtering cube
//  */
// export function findPtsInBox(point_buffer: [number, number, number][] | Float32Array, annotation: Cuboid): Uint32Array {
//   if (point_buffer instanceof Float32Array) {
//       point_buffer = chunk(point_buffer, 3) as [number, number, number][];
//   }
//   const rz = annotation.heading;
//   const [l, w, h] = annotation.size;
//   const [x, y, z] = annotation.position;
//   const cond = (el) => {
//     return el[0] < 0.5 * l && el[0] > - 0.5 * l
//           && el[1] < 0.5 * w && el[1] > - 0.5 * w
//           && el[2] < 0.5 * h && el[2] > - 0.5 * h;
//   }
//   const output = point_buffer.map((pt, i) => {
//     const x_ = Math.cos(rz) * (pt[0] - x) + Math.sin(rz) * (pt[1] - y);
//     const y_ = - Math.sin(rz) * (pt[0] - x) + Math.cos(rz) * (pt[1] - y);
//     const z_ = pt[2];
//     return cond([x_, y_, z_]);
//   });
//   return Uint32Array.from(output.filter(i => i >= 0));
// }


/**
 * Find points in box
 * @param point_buffer array of array of numbers
 * @param annotation filtering cube
 * @returns list of included points indices
 */
export function findPtsInBox(point_buffer: [number, number, number][] | Float32Array, annotation: Cuboid): Uint32Array {
  if (point_buffer instanceof Float32Array) {
      point_buffer = chunk(point_buffer, 3) as [number, number, number][];
  }
  const rz = annotation.heading;
  const [l, w, h] = annotation.size;
  const [x, y, z] = annotation.position;
  const output = point_buffer.map((pt, i) => {
    const x_ = Math.cos(rz) * (pt[0] - x) + Math.sin(rz) * (pt[1] - y);
    const y_ = - Math.sin(rz) * (pt[0] - x) + Math.cos(rz) * (pt[1] - y);
    const z_ = pt[2] - z;
    const cond = (
      x_ < l / 2 && x_ >= - l / 2
      && y_ < w / 2 && y_ > - w / 2
      && z_ < h / 2 && z_ > - h / 2);
    return cond ? i : -1;
  });
  return Uint32Array.from(output.filter(i => i >= 0));
}


/**
 * Transform set of points:
 * First subtract center, then apply inverse rotation.
 * @param point_buffer
 * @param center subtract value
 * @param rz trigonometric direction in rad.
 */
export function transformCloud(point_buffer: number[][], center: number[], rz: number) {
  const tr = point_buffer.map((pt) => {
    const x = Math.cos(rz) * (pt[0] - center[0]) + Math.sin(rz) * (pt[1] - center[1]);
    const y = - Math.sin(rz) * (pt[0] - center[0]) + Math.cos(rz) * (pt[1] - center[1]);
    return [x, y, pt[2]];
  });
  return tr;
}

/**
 * Transform set of points:
 * First subtract center, then apply inverse rotation.
 * @param point_buffer
 * @param center subtract value
 * @param rz trigonometric direction in rad.
 */
export function transformCloud2(point_buffer: number[][], center: number[], rz: number) {
  let minX = Infinity;
  let maxX = - Infinity;
  let minY = Infinity;
  let maxY = - Infinity;
  const tr = point_buffer.map((pt) => {
    const x = Math.cos(rz) * (pt[0] - center[0]) + Math.sin(rz) * (pt[1] - center[1]);
    const y = - Math.sin(rz) * (pt[0] - center[0]) + Math.cos(rz) * (pt[1] - center[1]);
    if (x < minX) minX = x; 
    if (x > maxX) maxX = x; 
    if (y < minY) minY = y; 
    if (y < maxY) maxY = y; 
    return [x, y, pt[2]];
  });
  return [tr, minX, minY, maxX, maxY];
}

/**
 * 
 * @param data 
 * @param size search size
 * @param tbx 
 * @param tby 
 */
export function boxSearch(data: number[][], size: [number, number], tbx: number[], tby: number[]) {
  const [gbx, gby] = createBins(data, size);
  const nx = gbx.length - tbx.length;
  const ny = gby.length - tby.length;
  const step = 0.15; // meters
  // g('[gbx, gby]', [gbx, gby], [tbx, tby], nx);
  let cost = Infinity;
  let pair = [-1, -1];
  for (let x = 0; x < nx; x++) {
      const bx = gbx.slice(x, x + tbx.length);
      //console.log('x:', x);
      const vx = tbx.map((item, index) => Math.abs(item - bx[index]));
      const mx = vx.reduce((prev, curr) => prev + curr) / vx.length;
      // console.log('bx', bx, x, mx);
      for (let y = 0; y < ny; y++) {
        //console.log('y:', y);
          const by = gby.slice(y, y + tby.length);
          const vy = tby.map((item, index) => Math.abs(item - by[index]));
          const my = vy.reduce((prev, curr) => prev + curr) / vy.length;
          if (x == 37) {
              // console.log('by', by, y, my);
          }
          const err = mx + my;
          if (err < cost) {
            // console.log('min', err, [x, y], bx, by)
            pair = [x, y];
            cost = err;
          }
      }
  }
  if (pair[0] == -1 || pair[1] == -1) {
      return null;
  }
  // console.log('dx?', (0.5 * nx - pair[0]), (0.5 * ny - pair[1]))
  const dx = Math.ceil(0.5 * nx - pair[0]) * step;
  const dy = Math.ceil(0.5 * ny - pair[1]) * step;
  const c = [dx, dy];
  return c;
}

export function boxSearch2(data: number[][], size: [number, number], tog: Array<Array<number>>) {
  const gog = createBins2(data, size);
  const nx = 0.5 * (gog.length - tog.length);
  const ny = 0.5 * (gog[0].length - tog[0].length);
  const step = 0.15; // meters

  let cost = Infinity;
  let pair: [number, number] | null = null;
  for (let dx = -nx; dx < nx; dx++) {
      const xn = dx + nx;
      const bx = gog.slice(xn, xn + tog.length);
      // const vx = tbx.map((item, index) => Math.abs(item - bx[index]));
      // const mx = vx.reduce((prev, curr) => prev + curr) / vx.length;
      for (let dy = -ny; dy < ny; dy++) {
        const yn = dy + ny;
        const by = bx.map((b) => b.slice(yn, yn + tog[0].length));
        //@ts-ignore
        const max = Math.max(...by.flat());
        if (!max) continue;

        let err = 0;
        //@ts-ignore
        by.forEach((b, idx) => {
          //@ts-ignore
          b.forEach((e, idx2) => {
            // err -= e;
            err -= Number((e > 0 && tog[idx][idx2] > 0) || (e <= 0 && tog[idx][idx2] <= 0)) - 1;
            // err += Math.pow(e - tog[idx][idx2], 2);
          });
        });
        // console.log('by', by, tog)
          // const by = gby.slice(y, y + tby.length);
          // const vy = tby.map((item, index) => Math.abs(item - by[index]));
          // const my = vy.reduce((prev, curr) => prev + curr) / vy.length;
          // if (x == 16 && y == 6) {
          //     console.log('spec', by, x, y, err);
          // }
          // const err = mx + my;
          // const err = 1;
          
          if (err < cost) {
            // console.log('min', [dx, dy], by, err)
            pair = [dx, dy];
            cost = err;
          }
      }
  }
  if (pair == null) {
      return null;
  } else {
    // console.log('dx?', pair)
    // const dx = Math.floor(0.5 * nx - pair[0]) * step;
    // const dy = Math.floor(0.5 * ny - pair[1]) * step;
    const c = pair.map((v) => v * step);
    return [c, cost];
  }
  
}

/**
 * 
 * @param cloud Sub cloud points of interest [xi, yi] > 0
 * @param size 
 */
export function createBins(cloud: number[][], size: [number, number]): [number[], number[]] {
  // let xMin = Infinity;
  // let xMax = 0;
  // let yMin = Infinity;
  // let yMax = 0;
  // for (let i=0; i < cloud.length; i++) {
  //   if (cloud[i][0] < xMin) xMin = cloud[i][0];
  //   if (cloud[i][0] > xMax) xMax = cloud[i][0];
  //   if (cloud[i][1] < yMin) yMin = cloud[i][0];
  //   if (cloud[i][1] > yMax) yMax = cloud[i][0];
  // }
  const step = 0.15; // meters
  const s0 = Math.ceil(size[0]/step);
  const s1 = Math.ceil(size[1]/step);
  const binsx = new Array(s0).fill(0);
  const binsy = new Array(s1).fill(0);
  cloud.forEach((c: number[]) => {
    // discretize into size / step bins
    const x = Math.floor((c[0]) / step);
    const y = Math.floor((c[1]) / step);
    binsx[x] += 1;
    binsy[y] += 1;
  });
  // console.log('bins', [binsx, binsy]);
  return [binsx, binsy];
}

/**
 * 
 * @param cloud Sub cloud points of interest [xi, yi] > 0
 * @param size 
 */
export function createBins2(cloud: number[][], size: [number, number]): Array<Array<number>> {
  let xMin = - 0.5 * size[0];
  let xMax = 0.5 * size[0];
  let yMin = - 0.5 * size[1];
  let yMax = 0.5 * size[1];
  for (let i=0; i < cloud.length; i++) {
    if (cloud[i][0] < xMin) xMin = cloud[i][0];
    if (cloud[i][0] > xMax) xMax = cloud[i][0];
    if (cloud[i][1] < yMin) yMin = cloud[i][1];
    if (cloud[i][1] > yMax) yMax = cloud[i][1];
  }
  const step = 0.15; // meters
  // const s0 = Math.ceil(size[0]/step);
  // const s1 = Math.ceil(size[1]/step);
  // mid length and mid width
  // const ml = Math.ceil(0.5 * size[0]/step);
  // const mw = Math.ceil(0.5 * size[1]/step);
  const ml = Math.ceil(Math.max(-xMin, xMax)/step);
  const mw = Math.ceil(Math.max(-yMin, yMax)/step);
  // console.log('size', size, Math.max(-xMin, xMax), Math.max(-yMin, yMax))
  const occGrid = Array.from(Array(2 * ml), () => new Array(2 * mw).fill(0));
  // const binsx = new Array(s0).fill(0);
  // const binsy = new Array(s1).fill(0);
  cloud.forEach((c: number[]) => {
    // discretize into size / step bins
    const x = Math.floor((c[0]) / step) + ml;
    const y = Math.floor((c[1]) / step) + mw;
    // console.log('x, y', x, y, c, ml, mw);
    occGrid[x][y] += 1;
    // const curr = heatMap.get(x)!.get(y);
    
    // binsx[x] += 1;
    // binsy[y] += 1;
  });
  // console.log('occGrid', occGrid);
  return occGrid;
}

export function fitToPts(positions: number[][]) {
    // Parameters
    const rstep = 0.1; // translation step in meters
    const nangles = 90; // nb of angles
    const amin = -Math.PI/4;
    const adelta = Math.PI / nangles;

    let min_pt = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    let max_pt = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
    positions.forEach((pos) => {
      if (pos[0] < min_pt[0]) min_pt[0] = pos[0];
      if (pos[1] < min_pt[1]) min_pt[1] = pos[1];
      if (pos[2] < min_pt[2]) min_pt[2] = pos[2];
      if (pos[0] > max_pt[0]) max_pt[0] = pos[0];
      if (pos[1] > max_pt[1]) max_pt[1] = pos[1];
      if (pos[2] > max_pt[2]) max_pt[2] = pos[2];
    });
    const center = [
      0.5 * (min_pt[0] + max_pt[0]),
      0.5 * (min_pt[1] + max_pt[1]),
      0.5 * (min_pt[2] + max_pt[2])
    ];
    const diag_xy = Math.sqrt((min_pt[0] - max_pt[0]) * (min_pt[0] - max_pt[0]) + (min_pt[1] - max_pt[1]) * (min_pt[1] - max_pt[1]));
    const invrstep = 1.0 / rstep;
    const rmin = -0.5 * diag_xy;
    const rminbystep = 0.5 + (rmin / rstep);
    let nradius = Math.floor(diag_xy / rstep);
    if (diag_xy < rstep) nradius=1;
    // console.log('nradius', nradius, center);
    
    const sinbyrstep: number[] = [];
    const cosbyrstep: number[] = [];
    for(let a = 0; a < nangles; a++){
      const a_rad = amin + a * adelta;
      sinbyrstep.push(Math.sin(a_rad) * invrstep);
      cosbyrstep.push(Math.cos(a_rad) * invrstep);
    }

    const nhough = nangles * nradius;
    const hough = new Array(nhough).fill(0);
    for (let i = 0; i < positions.length; i++) {
      const x = positions[i][0] - center[0];
      const y = positions[i][1] - center[1];
      let rstart = 0;
      for (let a = 0; a < nangles; a++, rstart += nradius) {
        const r = Math.floor(cosbyrstep[a] * x + sinbyrstep[a] * y - rminbystep);
        if (r >= 0 && r < nradius) {
          hough[rstart + r]++;
        }
      }
    }

    let maxHough = hough[0];
    let argMaxHough = 0;
    for (let h = 1; h < nhough; h++)
      if (hough[h] > maxHough){
        argMaxHough = h;
        maxHough = hough[h];
      }
    const argMaxAngle = argMaxHough / nradius;
    let angle = amin + argMaxAngle * adelta;
    if (angle >= Math.PI/4) angle = angle - Math.PI/2;

    let xmin = Number.MAX_VALUE;
    let xmax =-Number.MAX_VALUE;
    let ymin = Number.MAX_VALUE;
    let ymax =-Number.MAX_VALUE;
    let zmin = Number.MAX_VALUE;
    let zmax =-Number.MAX_VALUE;
    for (let i = 0; i < positions.length; i++) {
      let x = positions[i][0];
      let y = positions[i][1];
      const z = positions[i][2];
      x = Math.cos(angle) * x + Math.sin(angle) * y;
      y = -Math.sin(angle) * x + Math.cos(angle) * y;
      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);
      ymin = Math.min(ymin, y);
      ymax = Math.max(ymax, y);
      zmin = Math.min(zmin, z);
      zmax = Math.max(zmax, z);
    }
    return [
        0.5 * (xmin + xmax),
        0.5 * (ymin + ymax),
        0.5 * (zmin + zmax),
        xmax - xmin,
        ymax - ymin,
        zmax - zmin,
        angle
    ];
}

export const cubeToCoordinates = (cube: Cuboid) => {
  const x = cube.position[0];
  const y = cube.position[1];
  const z = cube.position[2];
  const length = cube.size[0];
  const width = cube.size[1];
  const height = cube.size[2];
  const rz = cube.heading;
  const xmin = - 0.5 * length;
  const xmax = + 0.5 * length;
  const ymin = - 0.5 * width;
  const ymax = + 0.5 * width;
  const zmin = - 0.5 * height;
  const zmax = + 0.5 * height;
  const edges = [
    [0,1], [1,2], [2,3], [3,0], // 1rst face
    [4,5], [5,6], [6,7], [7,4], // 2nd face
    [0,4], [1,5], [2,6], [3,7] // length edges
  ]
  let vertices: number[][] = [];
  vertices.push([xmin, ymin, zmin]);
  vertices.push([xmax, ymin, zmin]);
  vertices.push([xmax, ymax, zmin]);
  vertices.push([xmin, ymax, zmin]);

  vertices.push([xmin, ymin, zmax]);
  vertices.push([xmax, ymin, zmax]);
  vertices.push([xmax, ymax, zmax]);
  vertices.push([xmin, ymax, zmax]);
  vertices = vertices.map((v) => {
    const xa = Math.cos(rz) * v[0] - Math.sin(rz) * v[1]
    const ya = Math.sin(rz) * v[0] + Math.cos(rz) * v[1]
    const za = v[2];
    return [xa + x, ya + y, za + z];
  });

  // let vertices: number[][] = [];
  // vertices.push([xmin, ymin, zmin]);
  // vertices.push([xmax, ymin, zmin]);
  // vertices.push([xmin, ymax, zmin]);
  // vertices.push([xmax, ymax, zmin]);
  // vertices.push([xmin, ymin, zmax]);
  // vertices.push([xmax, ymin, zmax]);
  // vertices.push([xmin, ymax, zmax]);
  // vertices.push([xmax, ymax, zmax]);
  return {vertices: vertices, edges: edges};
}

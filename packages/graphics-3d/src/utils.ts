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
 * Compute encompassing axis-aligned box from oriented box
 * centered around `pos`
 * @param pos
 * @param size
 * @param heading
 */
export function axisAlignedBox(pos: number[], size: number[], heading: number):
                            { pos: number[], size: number[]; } {
  const [l, w, h] = size;
  const [x, y] = pos;
  const cosRz = Math.cos(heading);
  const sinRz = Math.sin(heading);
  // find axis-aligned bounding box (aabb) of annotation
  const vx: number[] = [(l/2)*cosRz + (w/2)*sinRz, (l/2)*cosRz - (w/2)*sinRz,
                        (-l/2)*cosRz + (-w/2)*sinRz, (-l/2)*cosRz + (w/2)*sinRz];
  const vy: number[] = [-(l/2)*sinRz + (w/2)*cosRz, -(l/2)*sinRz - (w/2)*cosRz,
                        (l/2)*sinRz + (-w/2)*cosRz, (l/2)*sinRz + (w/2)*cosRz];
  const xmin = Math.min(...vx) + x;
  const xmax = Math.max(...vx) + x;
  const ymin = Math.min(...vy) + y;
  const ymax = Math.max(...vy) + y;
  return { pos: [(xmin+xmax)/2, (ymin+ymax)/2, pos[2] || 0], size: [(xmax-xmin), (ymax-ymin), h] };
}

/**
 * Find max and min height of points included in a cuboid
 * @param pointBuffer array of point coordinates
 * @param annotation filtering cube
 * @returns list of included points indices
 */
export function getHeightOfPts(pointBuffer: Float32Array, position: [number, number], size: [number, number], heading: number): [number, number] {
  const [l, w] = size;
  const [x, y] = position;
  const cosRz = Math.cos(heading);
  const sinRz = Math.sin(heading);
  const AABB = axisAlignedBox(position, size, heading);
  // bounds of axis aligned box centered in [0,0,0]
  const xmin = -AABB.size[0]/2;
  const xmax = AABB.size[0]/2;
  const ymin = -AABB.size[1]/2;
  const ymax = AABB.size[1]/2;
  let zmin = 10000;
  let zmax = -10000;

  for(let i=0; i<pointBuffer.length / 3; i++) {
    // coordinates of 3D point centered wrt to box
    const xi = pointBuffer[3*i] - x;
    const yi = pointBuffer[3*i+1] - y;
    const zi = pointBuffer[3*i+2];
    // first-pass: filter with axis-oriented box
    const cond1 = (
      xi <= xmax && xi >= xmin
      && yi <= ymax && yi >= ymin);
    if (cond1) {
      // second-pass: filter with oriented box
      const x2 = cosRz * xi + sinRz * yi;
      const y2 = - sinRz * xi + cosRz * yi;
      const cond2 = (
        x2 <= l / 2 && x2 >= - l / 2
        && y2 <= w / 2 && y2 >= - w / 2);
      if (cond2) {
        if (zi < zmin) {
          zmin = zi;
        }
        if (zi > zmax) {
          zmax = zi;
        }
      }
    }
  }
  return [zmin, zmax];
}

/**
 * Find points in box
 * @param pointBuffer array of point coordinates
 * @param annotation filtering cube
 * @returns list of included points indices
 */
export function findPtsInBox(pointBuffer: Float32Array, annotation: Cuboid): Uint32Array {
  const [l, w, h] = annotation.size;
  const [x, y, z] = annotation.position;
  const cosRz = Math.cos(annotation.heading);
  const sinRz = Math.sin(annotation.heading);
  const AABB = axisAlignedBox(annotation.position, annotation.size, annotation.heading);
  // bounds of axis aligned box centered in [0,0,0]
  const xmin = -AABB.size[0]/2;
  const xmax = AABB.size[0]/2;
  const ymin = -AABB.size[1]/2;
  const ymax = AABB.size[1]/2;
  const zmin = -h/2;
  const zmax = h/2;

  const output: number[] = [];
  for(let i=0; i<pointBuffer.length / 3; i++) {
    // coordinates of 3D point centered wrt to box
    const xi = pointBuffer[3*i] - x;
    const yi = pointBuffer[3*i+1] - y;
    const zi = pointBuffer[3*i+2] - z;
    // first-pass: filter with axis-oriented box
    const cond1 = (
      xi <= xmax && xi >= xmin
      && yi <= ymax && yi >= ymin
      && zi <= zmax && zi >= zmin);
    if (cond1) {
      // second-pass: filter with oriented box
      const x2 = cosRz * xi + sinRz * yi;
      const y2 = - sinRz * xi + cosRz * yi;
      const z2 = zi;
      const cond2 = (
        x2 <= l / 2 && x2 >= - l / 2
        && y2 <= w / 2 && y2 >= - w / 2
        && z2 <= h / 2 && z2 >= - h / 2);
      if (cond2) {
        output.push(i);
      }
    }
  }
  return Uint32Array.from(output);
}

/**
 * Fit box w.r.t pointcloud.
 * Ignores low points (ground) for better box fitting.
 * @param pointBuffer point cloud
 * @param pos original center of the box (z not used)
 * @param size original length/width of the box (height not used)
 * @param rz original heading of the box
 */
export function fitBoxWithAutoZ(pointBuffer: Float32Array,
                                pos: [number, number, number],
                                searchSize: [number, number],
                                rz: number,
                                gz?: number | null) :
                                { position : [number, number, number];
                                  size : [number, number, number];
                                  heading : number; } {

  const maxHeight = 3;
  let minZ = Infinity;
  let maxZ = -Infinity;
  // filter points inside box with minimal z
  // and transform point cloud at the same time
  const cosRz = Math.cos(rz);
  const sinRz = Math.sin(rz);
  const AABB = axisAlignedBox(pos, [searchSize[0], searchSize[1], 1], rz);
  const xmin = -AABB.size[0]/2;
  const xmax = AABB.size[0]/2;
  const ymin = -AABB.size[1]/2;
  const ymax = AABB.size[1]/2;

  // pointcloud centered around clicked area
  // and filtered by clicked area
  let output: [number,number,number][] = [];
  for (let i=0; i<pointBuffer.length / 3; i++) {
    // coordinates of 3D point centered wrt to box
    const xi = pointBuffer[3*i] - pos[0];
    const yi = pointBuffer[3*i+1] - pos[1];
    // first-pass: filter with axis-oriented box
    const cond1 = (
      xi <= xmax && xi >= xmin
      && yi <= ymax && yi >= ymin);
    if (cond1) {
      // second-pass: filter with oriented box
      const x2 = cosRz * xi + sinRz * yi;
      const y2 = - sinRz * xi + cosRz * yi;
      const cond2 = (
        x2 <= searchSize[0] / 2 && x2 >= - searchSize[0] / 2
        && y2 <= searchSize[1] / 2 && y2 >= - searchSize[1] / 2);
      // if the point is inside the bounding box
      // with minimal z threshold for outliers
      if (cond2) {
        const zi = pointBuffer[3*i+2];
        if (zi < minZ) minZ = zi;
        if (zi > maxZ) maxZ = zi;
        output.push([pointBuffer[3*i], pointBuffer[3*i+1], zi]);
      }
    }
  }
  const size: [number,number,number] = [0,0,maxZ - minZ];
  const position: [number,number,number] = [0,0,0.5 * (minZ + maxZ)];

  // if zmin is close to ground z
  // remove low points
  const maxDev = 0.5;
  if (gz === null || (gz && minZ < (gz + maxDev))) {
    // ground height to remove
    const delta = 0.18;
    // remove points below zmin + delta and
    output = output.filter((pt) => pt[2] > (minZ + delta) && pt[2] < (minZ + maxHeight));
  }
  if (output.length) {
    // fit box to point cloud
    const {x, y, l, w, angle} = fitToPts(output);
    position[0] = x;
    position[1] = y;
    size[0] = l === 0 ? 0.1 : l;
    size[1] = w === 0 ? 0.1 : w;
    rz = angle;
  }

  return { position, size, heading: rz };
}

/**
 * Fit box to point cloud (2d)
 * @param positions point cloud
 */
export function fitToPts(positions: number[][]) {
    // Parameters
    const rstep = 0.1; // translation step in meters
    const nangles = 90; // nb of angles
    const amin = -Math.PI/4; // starting from amin
    const adelta = Math.PI / nangles;

    const minPt = [Number.MAX_VALUE, Number.MAX_VALUE];
    const maxPt = [-Number.MAX_VALUE, -Number.MAX_VALUE];
    positions.forEach((pos) => {
      if (pos[0] < minPt[0]) minPt[0] = pos[0];
      if (pos[1] < minPt[1]) minPt[1] = pos[1];
      if (pos[0] > maxPt[0]) maxPt[0] = pos[0];
      if (pos[1] > maxPt[1]) maxPt[1] = pos[1];
    });
    const center = [
      0.5 * (minPt[0] + maxPt[0]),
      0.5 * (minPt[1] + maxPt[1])
    ];
    // diagonal length of axis-aligned bounding box of points
    const diag = Math.sqrt((minPt[0] - maxPt[0]) * (minPt[0] - maxPt[0]) + (minPt[1] - maxPt[1]) * (minPt[1] - maxPt[1]));
    const invrstep = 1.0 / rstep;
    const rmin = -0.5 * diag;
    const rminbystep = 0.5 + (rmin / rstep);
    let nradius = Math.floor(diag / rstep);
    if (diag < rstep) nradius=1;

    // pre-compute rot cosinus
    const sinbyrstep: number[] = [];
    const cosbyrstep: number[] = [];
    for(let a = 0; a < nangles; a++){
      const aRad = amin + a * adelta;
      sinbyrstep.push(Math.sin(aRad) * invrstep);
      cosbyrstep.push(Math.cos(aRad) * invrstep);
    }

    const nhough = nangles * nradius;
    const hough = new Array(nhough).fill(0);
    for (const pos of positions) {
      // translate to center of pointcloud and
      // apply all possible rotations
      // increase counter for given radius+angle
      const xi = pos[0] - center[0];
      const yi = pos[1] - center[1];
      let rstart = 0;
      for (let a = 0; a < nangles; a++, rstart += nradius) {
        const r = Math.floor(cosbyrstep[a] * xi + sinbyrstep[a] * yi - rminbystep);
        if (r >= 0 && r < nradius) {
          hough[rstart + r]++;
        }
      }
    }

    // find angle with denser top
    let maxHough = hough[0];
    let argMaxHough = 0;
    for (let h = 1; h < nhough; h++)
      if (hough[h] > maxHough) {
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
    const cosa = Math.cos(angle);
    const sina = Math.sin(angle);
    for (const pos of positions) {
      const x1 = pos[0] - center[0];
      const y1 = pos[1] - center[1];
      const x2 = cosa * x1 + sina * y1;
      const y2 = -sina * x1 + cosa * y1;
      xmin = Math.min(xmin, x2);
      xmax = Math.max(xmax, x2);
      ymin = Math.min(ymin, y2);
      ymax = Math.max(ymax, y2);
    }
    const x = 0.5 * (xmin + xmax);
    const y = 0.5 * (ymin + ymax);
    const l = xmax - xmin + 0.000000000000001;
    const w = ymax - ymin + 0.000000000000001;
    return {
        x: center[0] + (cosa * x - sina * y),
        y: center[1] + (sina * x + cosa * y),
        l,
        w,
        angle
    };
}

/**
 * Find points in central region of interest ( rmin < r < rmax && z < 0) and
 * find minimal z (zmin) in that region and maximal distance (dmax) in the entire point cloud
 * @param pointBuffer
 * @param rmin minimal distance for pointcloud filtering
 * @param rmax maximal distance for pointcloud filtering
 * @returns filtered central points, zmin and rmax
 */
export function removeCentralArea(pointBuffer: Float32Array, r: number = 2): number[] {
  const centralPts: number[] = [];
  const offset = [1, 0, 0];
  const rsq = r*r;
  for (let i=0; i< pointBuffer.length/3; i++) {
    const xi = pointBuffer[3*i] - offset[0];
    const yi = pointBuffer[3*i+1] - offset[1];
    const r2 = xi*xi + yi*yi;
    if (r2 >= rsq) {
      centralPts.push(pointBuffer[3*i],pointBuffer[3*i+1],pointBuffer[3*i+2]);
    }
  }
  return centralPts
}

/**
 * Find points in central region of interest ( rmin < r < rmax && z < 0) and
 * find minimal z (zmin) in that region and maximal distance (dmax) in the entire point cloud
 * @param pointBuffer
 * @param rmin minimal distance for pointcloud filtering
 * @param rmax maximal distance for pointcloud filtering
 * @returns filtered central points, zmin and rmax
 */
export function filterCentralArea(pointBuffer: Float32Array, rmin: number = 3, rmax: number = 6): {
    points: [number,number,number][],
    rmax: number, zmin: number, zmax: number
  } {
  const centralPts: [number,number,number][] = [];
  let zmin = Infinity;
  let zmax = -Infinity;
  let dmax2 = 0;
  for (let i=0; i< pointBuffer.length/3; i++) {
    const xi = pointBuffer[3*i];
    const yi = pointBuffer[3*i+1];
    const zi = pointBuffer[3*i+2];
    const r2 = xi*xi + yi*yi;
    if (dmax2 < r2) {
      dmax2 = r2;
    }
    if (r2 >= rmin*rmin && r2 < rmax*rmax && zi < 0) {
      centralPts.push([xi,yi,zi]);
      if (zmin > zi) zmin = zi;
      if (zmax < zi) zmax = zi;
    }
  }
  return {points: centralPts, rmax: Math.sqrt(dmax2), zmin, zmax}
}

/**
 * Find sensor height by counting number of points in layers of height delta,
 * and choosing layer with max nb of points.
 * @param points input point cloud
 * @param zmin search grid is [zmin, 0] (zmin negative)
 * @param delta search grid step
 * @returns zl : bottom z value of higher density layer
 *          zh : top z value of higher density layer (zl + delta)
 *          mean : mean inside layer of higher density
 */
export function findHighDensityZ(points: [number,number,number][], zmin: number, delta = 0.25): {
    zl: number, zh: number, mean: number
  } {

  const layersLength = new Array(Math.ceil(- zmin / delta)).fill(0);
  const layersSum = new Array(Math.ceil(- zmin / delta)).fill(0);
  // iterate over layers in [zmin, 0] in z descending order
  for (const pt of points) {
    const layer = Math.floor(- pt[2] / delta);
    layersSum[layer] += pt[2];
    layersLength[layer] += 1;
  }
  const bestIndex = layersLength.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
  const mean = layersSum[bestIndex] / layersLength[bestIndex];
  const zl = - delta * (bestIndex + 1);
  const zh = - delta * bestIndex;
  return {
    zl, zh, mean
  }
}

/**
 * Simple search for ground z.
 * @param points pointcloud
 * @param zmin min z for search
 * @param zmax max z for search
 */
export function findLowestZ(points: [number, number, number][], zmin: number, zmax: number) {
  // handle case with no ground points
  const delta = 0.1;
  const groundPercentage = 0.05;
  let i =  zmin;
  let pts: [number, number, number][] = [];
  for (; i < zmax; i+=delta) {
    pts = points.filter((pt) => pt[2] >= i && pt[2] < (i+delta));
    if (pts.length > groundPercentage * points.length) {
      break;
    }
  }
  return i;
}

/**
 * Convert 3d box to 3d vertex coordinates
 * @param cube
 */
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
  let edges = [
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

  // add bottom cross
  // edges = [...edges,
  //   [0, 2], [1, 3]
  // ]
  // add front cross
  edges = [...edges,
    [1, 6], [2, 5]
  ]

  // let vertices: number[][] = [];
  // vertices.push([xmin, ymin, zmin]);
  // vertices.push([xmax, ymin, zmin]);
  // vertices.push([xmin, ymax, zmin]);
  // vertices.push([xmax, ymax, zmin]);
  // vertices.push([xmin, ymin, zmax]);
  // vertices.push([xmax, ymin, zmax]);
  // vertices.push([xmin, ymax, zmax]);
  // vertices.push([xmax, ymax, zmax]);
  return {vertices, edges};
}

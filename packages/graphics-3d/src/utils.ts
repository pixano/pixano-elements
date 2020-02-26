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
 * @param pointBuffer array of array of numbers
 * @param annotation filtering cube
 */
export function filterPtsInBox(pointBuffer: [number, number, number][] | Float32Array, annotation: Cuboid): [number, number, number][] {
  if (pointBuffer instanceof Float32Array) {
      pointBuffer = chunk(pointBuffer, 3) as [number, number, number][];
  }
  const rz = annotation.heading;
  const size = annotation.size;
  const pos = annotation.position;
  const cond = (el: [number, number, number]) => {
    return el[0] < 0.5 * size[0] && el[0] > - 0.5 * size[0]
          && el[1] < 0.5 * size[1] && el[1] > - 0.5 * size[1]
          && el[2] < 0.5 * size[2] && el[2] > - 0.5 * size[2];
  }
  const output = pointBuffer.filter((pt) => {
    const x = Math.cos(rz) * (pt[0] - pos[0]) + Math.sin(rz) * (pt[1] - pos[1]);
    const y = - Math.sin(rz) * (pt[0] - pos[0]) + Math.cos(rz) * (pt[1] - pos[1]);
    const z = pt[2] - pos[2];
    return cond([x, y, z]);
  });
  return output;
}

/**
 * List points in box
 * @param pointBuffer array of array of numbers
 * @param annotation filtering cube
 */
export function listPtsInBox(pointBuffer: [number, number, number][] | Float32Array, annotation: Cuboid): boolean[] {
  if (pointBuffer instanceof Float32Array) {
      pointBuffer = chunk(pointBuffer, 3) as [number, number, number][];
  }
  const rz = annotation.heading;
  const size = annotation.size;
  const pos = annotation.position;
  const cond = (el: [number, number]) => {
    return el[0] < 0.5 * size[0] && el[0] > - 0.5 * size[0]
          && el[1] < 0.5 * size[1] && el[1] > - 0.5 * size[1];
  }
  const output = pointBuffer.map((pt) => {
    const x = Math.cos(rz) * (pt[0] - pos[0]) + Math.sin(rz) * (pt[1] - pos[1]);
    const y = - Math.sin(rz) * (pt[0] - pos[0]) + Math.cos(rz) * (pt[1] - pos[1]);
    return cond([x, y]);
  });
  return output;
}

/**
 * Find points in box
 * @param pointBuffer array of array of numbers
 * @param annotation filtering cube
 * @returns list of included points indices
 */
export function findPtsInBox(pointBuffer: [number, number, number][] | Float32Array, annotation: Cuboid): Uint32Array {
  if (pointBuffer instanceof Float32Array) {
      pointBuffer = chunk(pointBuffer, 3) as [number, number, number][];
  }
  const rz = annotation.heading;
  const [l, w, h] = annotation.size;
  const [x, y, z] = annotation.position;
  const output = pointBuffer.map((pt, i) => {
    const x2 = Math.cos(rz) * (pt[0] - x) + Math.sin(rz) * (pt[1] - y);
    const y2 = - Math.sin(rz) * (pt[0] - x) + Math.cos(rz) * (pt[1] - y);
    const z2 = pt[2] - z;
    const cond = (
      x2 < l / 2 && x2 >= - l / 2
      && y2 < w / 2 && y2 > - w / 2
      && z2 < h / 2 && z2 > - h / 2);
    return cond ? i : -1;
  });
  return Uint32Array.from(output.filter(i => i >= 0));
}

/**
 * Fit box w.r.t pointcloud.
 * Ignores low points (ground) for better box fitting.
 * @param pointBuffer point cloud
 * @param pos original center of the box
 * @param size original length/width of the box
 * @param rz original heading of the box
 */
export function fitBoxWithAutoZ(pointBuffer: [number, number, number][] | Float32Array,
                                pos: [number, number, number],
                                size: [number, number],
                                rz: number):
                                { position : [number, number, number];
                                  size : [number, number, number];
                                  heading : number; } {
  if (pointBuffer instanceof Float32Array) {
    pointBuffer = chunk(pointBuffer, 3) as [number, number, number][];
  }
  const delta = 0.2;
  const maxHeight = 3;
  const cond = (el: [number, number]) => {
    return el[0] < 0.5 * size[0] && el[0] > - 0.5 * size[0]
    && el[1] < 0.5 * size[1] && el[1] > - 0.5 * size[1];
  }
  let minZ = Infinity;
  let maxZ = -Infinity;
  // filter points inside box with minimal z
  // and transform point cloud at the same time
  let output = pointBuffer.filter((pt) => {
    const x = Math.cos(rz) * (pt[0] - pos[0]) + Math.sin(rz) * (pt[1] - pos[1]);
    const y = - Math.sin(rz) * (pt[0] - pos[0]) + Math.cos(rz) * (pt[1] - pos[1]);
    const isIn = cond([x, y]);
    // if the point is inside the bounding box
    // with minimal z threshold for outliers
    if (isIn) {
      pt[0] = x;
      pt[1] = y;
      if (pt[2] < minZ && pt[2] > - 2) {
        minZ = pt[2];
      } else if (pt[2] > maxZ) {
        maxZ = pt[2];
      }
    }
    return isIn;
  });
  minZ = isFinite(minZ) ? minZ : -1;
  maxZ = isFinite(maxZ) ? Math.min(maxZ, minZ + maxHeight) : 1;
  output = output.filter((pt) => pt[2] > (minZ + delta) && pt[2] < (minZ + maxHeight));
  if (output.length) {
    // fit box to point cloud
    // ignoring height and z
    // @ts-ignore
    const [x, y, z, l, w, h, heading] = fitToPts(output);
    pos[0] += Math.cos(-rz) * x + Math.sin(-rz) * y;
    pos[1] += - Math.sin(-rz) * x + Math.cos(-rz) * y;
    pos[2] = 0.5 * (maxZ + minZ);
    rz += heading;
    size[0] = l;
    size[1] = w;
  }
  return {
    position: pos,
    size: [size[0], size[1], maxZ - minZ],
    heading: rz
  };
}

/**
 * Filter points in box ignoring lowest points
 * @param pointBuffer array of array of numbers
 * @param annotation filtering cube
 */
export function filterPtsInBoxIgnoreLow(pointBuffer: [number, number, number][] | Float32Array,
                                        annotation: Cuboid,
                                        ignoreDelta: number = 0.2): [number, number, number][] {
  if (pointBuffer instanceof Float32Array) {
    pointBuffer = chunk(pointBuffer, 3) as [number, number, number][];
  }
  const rz = annotation.heading;
  const size = annotation.size;
  const pos = annotation.position;
  const cond = (el: [number, number, number]) => {
    return el[0] < 0.5 * size[0] && el[0] > - 0.5 * size[0]
    && el[1] < 0.5 * size[1] && el[1] > - 0.5 * size[1]
    && el[2] < 0.5 * size[2] && el[2] > (- 0.5 * size[2] + ignoreDelta);
  }
  const output = pointBuffer.filter((pt) => {
    const x = Math.cos(rz) * (pt[0] - pos[0]) + Math.sin(rz) * (pt[1] - pos[1]);
    const y = - Math.sin(rz) * (pt[0] - pos[0]) + Math.cos(rz) * (pt[1] - pos[1]);
    const z = pt[2] - pos[2];
    return cond([x, y, z]);
  });
  return output;
}

/**
 * Transform set of points:
 * First subtract center, then apply inverse rotation.
 * @param pointBuffer
 * @param center subtract value
 * @param rz trigonometric direction in rad.
 */
export function transformCloud(pointBuffer: number[][], center: number[], rz: number) {
  const tr = pointBuffer.map((pt) => {
    const x = Math.cos(rz) * (pt[0] - center[0]) + Math.sin(rz) * (pt[1] - center[1]);
    const y = - Math.sin(rz) * (pt[0] - center[0]) + Math.cos(rz) * (pt[1] - center[1]);
    return pt.length === 2 ? [x, y] : [x, y, pt[2]];
  });
  return tr;
}

/**
 * L2 cost between two matrices of same size.
 * @param matGT heatmap matrice origin
 * @param matRes heatmap matric target
 */
export const l2loss = (matGT: number[][], matRes: number[][]) => {
  return matGT.reduce((total, vec, idx) => {
    return vec.reduce((subtot, v, i) =>  subtot + Math.pow(v-matRes[idx][i], 2), total);
  }, 0);
}

/**
 * Compute side density of bounding box
 * @param bin heatmap of bounding box
 */
export const getDenserSize = (bin: number[][]) => {
  const front = bin[0].reduce((a, b) => a + b, 0);
  const rear = bin[bin.length - 1].reduce((a, b) => a + b, 0);
  const left = bin.reduce((a, b) => a + b[0], 0);
  const right = bin.reduce((a, b) => a + b[b.length - 1], 0);
  const r1 = front/rear;
  const r2 = left/right;
  const isFront = rear && r1 > 4 ? true : r1 < 0.25 ? false : front > 20;
  const isLeft = right && r2 > 4 ? true : r2 < 0.25 ? false : null;
  return [isFront, isLeft];
}

/**
 * Fit histogram box into an area.
 * @param sbin box heatmap
 * @param bbin area
 */
export const boxSearch = (boxOrig: Cuboid, pointcloudOrig: Float32Array | [number, number, number][],
                          pointcloudTarget: Float32Array | [number, number, number][]) => {
  const searchRatio = 5;
  const boxNbBins = 6;
  const groundHeight = 0.2;
  const arange = Math.PI / 4;
  const astep = Math.PI / 24;
  let ptsOrig = filterPtsInBoxIgnoreLow(pointcloudOrig, boxOrig, groundHeight);
  ptsOrig = transformCloud(ptsOrig, boxOrig.position, boxOrig.heading) as [number, number, number][];
  const binOrig = createBins(ptsOrig, [boxOrig.size[0], boxOrig.size[1]], boxNbBins);
  const [isFront, isLeft] = getDenserSize(binOrig);
  const cubeArea = {
    id: '',
    position: JSON.parse(JSON.stringify(boxOrig.position)),
    size: [boxOrig.size[0] * searchRatio, boxOrig.size[1] * searchRatio, boxOrig.size[2]],
    heading: JSON.parse(JSON.stringify(boxOrig.heading))
  };
  const ptsArea = filterPtsInBoxIgnoreLow(pointcloudTarget, cubeArea, groundHeight);
  let minloss = Infinity;
  let dx = 0;
  let dy = 0;
  let dtmin = 0;
  for (let dt = - arange / 2; dt <= arange / 2; dt += astep) {
    const ptsOriented = transformCloud(ptsArea, cubeArea.position, cubeArea.heading + dt) as [number, number, number][];
    const binArea = createBins(ptsOriented, [cubeArea.size[0], cubeArea.size[1]], boxNbBins * searchRatio);
    for (let x=0; x < binArea.length - binOrig.length; x++) {
      const bx = binArea.slice(x, x + binOrig.length);
      if (isFront !== null) {
        const s = bx[isFront ? 0 : bx.length - 1].reduce((tot, val) => tot + val, 0);
        if (s <= 1) continue;
      }
      for (let y=0; y < binArea[0].length - binOrig[0].length; y++) {
        const by = bx.map((b) => b.slice(y, y + binOrig[0].length));
        if (isLeft !== null) {
          const s = by.reduce((tot, val) => tot + val[isLeft ? 0 : by[0].length - 1], 0);
          if (s <= 1) continue;
        }
        const loss = l2loss(binOrig, by);
        if (loss < minloss) {
          minloss = loss;
          dtmin = dt;
          dx = 0.5 * (binArea.length - binOrig.length) - x;
          dy = 0.5 * (binArea[0].length - binOrig[0].length) - y;
        }
      }
    }
  }
  const dxLoc = dx * boxOrig.size[0] / binOrig.length
  const dyLoc = dy * boxOrig.size[1] / binOrig[0].length
  const dxOrig = Math.cos(-boxOrig.heading-dtmin) * dxLoc + Math.sin(-boxOrig.heading-dtmin) * dyLoc;
  const dyOrig = - Math.sin(-boxOrig.heading-dtmin) * dxLoc + Math.cos(-boxOrig.heading-dtmin) * dyLoc;
  return [dxOrig, dyOrig, dtmin];
}


/**
 * Get density heatmap of a pointcloud
 * @param cloud point cloud
 * @param size [length, width]
 * @param nbBins number of bins for the smaller side
 */
export const createBins = (cloud: number[][], [length, width]: [number, number], nbBins: number = 6): number[][] => {
  const lwRatio = Math.floor(length/width);
  const occGrid = Array.from(Array(nbBins * lwRatio), () => new Array(nbBins).fill(0));
  cloud.forEach((c: number[]) => {
    if (c[0] < 0.5 * length && c[1] < 0.5 * width
        && c[0] > - 0.5 * length && c[1] > - 0.5 * width) {
      // discretize into size / step bins
      const x = Math.floor(c[0] * 0.5 * nbBins * lwRatio / (0.5 * length)) + 0.5 * nbBins * lwRatio;
      const y = Math.floor(c[1] * 0.5 * nbBins / (0.5 * width)) +  0.5 * nbBins;
      occGrid[x][y] += 1;
    }
  });
  return occGrid;
}

// @ts-ignore
export function fitToPtsMin(positions: number[][], [length, width, height]: [number, number, number], isLeft: boolean) {
  const delta = 0.2;
  if (isLeft === true) {
    let top = -Infinity;
    let topLeft = 0;
    let bottom = Infinity;
    let bottomLeft = 0;
    positions.forEach((pos) => {
      if (pos[1] < (-0.5 * width + delta)) {
        if (pos[0] > top) {
          top = pos[0];
          topLeft = pos[1];
        } else if (pos[0] < bottom) {
          bottom = pos[0];
          bottomLeft = pos[1];
        }
      }
    });
    // compute angle
    const ptX = top - bottom;
    const ptY = topLeft - bottomLeft
    const angle = Math.atan2(ptX, ptY);
    const meanPtX = 0.5 * (top + bottom);
    const meanPtY = 0.5 * (topLeft + bottomLeft);
    const x = Math.cos(angle) * meanPtX + Math.sin(angle) * meanPtY;
    const y = -Math.sin(angle) * meanPtX + Math.cos(angle) * meanPtY;
    const dY = 2 * y - width;
    return [
      x,
      dY,
      0.5,
      length,
      width,
      height,
      angle
    ];
  } else if (isLeft === false) {
    let top = -Infinity;
    let topRight = 0;
    let bottom = Infinity;
    let bottomRight = 0;
    positions.forEach((pos) => {
      if (pos[1] > (0.5 * width - delta)) {
        if (pos[0] > top) {
          top = pos[0];
          topRight = pos[1];
        } else if (pos[0] < bottom) {
          bottom = pos[0];
          bottomRight = pos[1];
        }
      };
    });
    // compute angle
    const ptX = top - bottom;
    const ptY = topRight - bottomRight;
    const angle = Math.atan2(ptY, ptX);
    const meanPtX = 0.5 * (top + bottom);
    const meanPtY = 0.5 * (topRight + bottomRight);
    const x = Math.cos(angle) * meanPtX + Math.sin(angle) * meanPtY;
    const y = -Math.sin(angle) * meanPtX + Math.cos(angle) * meanPtY;
    const dY = 2 * y - width;
    return [
      x,
      dY,
      0.5,
      length,
      width,
      height,
      angle
    ];
  }
  return null;
}

/**
 * Fit box to point cloud
 * @param positions point cloud
 */
export function fitToPts(positions: number[][]) {
    // Parameters
    const rstep = 0.1; // translation step in meters
    const nangles = 90; // nb of angles
    const amin = -Math.PI/4;
    const adelta = Math.PI / nangles;

    const minPt = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    const maxPt = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
    positions.forEach((pos) => {
      if (pos[0] < minPt[0]) minPt[0] = pos[0];
      if (pos[1] < minPt[1]) minPt[1] = pos[1];
      if (pos[2] < minPt[2]) minPt[2] = pos[2];
      if (pos[0] > maxPt[0]) maxPt[0] = pos[0];
      if (pos[1] > maxPt[1]) maxPt[1] = pos[1];
      if (pos[2] > maxPt[2]) maxPt[2] = pos[2];
    });
    const center = [
      0.5 * (minPt[0] + maxPt[0]),
      0.5 * (minPt[1] + maxPt[1]),
      0.5 * (minPt[2] + maxPt[2])
    ];
    const diag = Math.sqrt((minPt[0] - maxPt[0]) * (minPt[0] - maxPt[0]) + (minPt[1] - maxPt[1]) * (minPt[1] - maxPt[1]));
    const invrstep = 1.0 / rstep;
    const rmin = -0.5 * diag;
    const rminbystep = 0.5 + (rmin / rstep);
    let nradius = Math.floor(diag / rstep);
    if (diag < rstep) nradius=1;
    // console.log('nradius', nradius, center);
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
      const x = pos[0] - center[0];
      const y = pos[1] - center[1];
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
    for (const pos of positions) {
      let x = pos[0];
      let y = pos[1];
      const z = pos[2];
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
  return {vertices, edges};
}

/**
 * Polygon utils functions.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

/**
 * Check if polygon self intersects
 * TODO: implement Shamos-Hoey (faster)
 * @param inputVertices flatten array of 2d vertices
 */
export const isValid = (inputVertices: number[]) => {
    const vertices = chunk(inputVertices, 2);
    for (let [idx, value] of vertices.entries()) {
        const nextIdx = (idx + 1) % vertices.length;
        for (let [idx2, value2] of vertices.entries()) {
            if (idx2 == idx) continue;
            const nextIdx2 = (idx2 + 1) % vertices.length;
            if (idx2 === nextIdx || nextIdx2 === idx) {
              continue;
            }
            const inter = intersects(value[0],
                                    value[1],
                                    vertices[nextIdx][0],
                                    vertices[nextIdx][1],
                                    value2[0],
                                    value2[1],
                                    vertices[nextIdx2][0],
                                    vertices[nextIdx2][1]);
            if (inter) {
              //console.log('intersects!', vertices, inputVertices)
              return false;
            }
        }
    }
    return true;
}

export function chunk(arr: number[], chunkSize: number): number[][] {
    const chunked_arr: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const last = chunked_arr[chunked_arr.length - 1];
      if (!last || last.length === chunkSize) {
        chunked_arr.push([arr[i]]);
      } else {
        last.push(arr[i]);
      }
    }
    return chunked_arr;
}

// returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
function intersects(a: number, b: number, c: number, d: number, p: number, q: number, r: number, s: number) {
    var det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) {
      return false;
    } else {
      lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
      gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  };


// square distance between 2 points
function getSqDist(p1: number[], p2: number[]) {

  var dx = p1[0] - p2[0],
      dy = p1[1] - p2[1];

  return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p: number[], p1: number[], p2: number[]) {

  var x = p1[0],
      y = p1[1],
      dx = p2[0] - x,
      dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {

      var t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);

      if (t > 1) {
          x = p2[0];
          y = p2[1];

      } else if (t > 0) {
          x += dx * t;
          y += dy * t;
      }
  }

  dx = p[0] - x;
  dy = p[1] - y;

  return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points: number[][], sqTolerance: number) {

  var prevPoint = points[0],
      newPoints = [prevPoint];
  let point: number[] = [];

  for (var i = 1, len = points.length; i < len; i++) {
      point = points[i];

      if (getSqDist(point, prevPoint) > sqTolerance) {
          newPoints.push(point);
          prevPoint = point;
      }
  }

  if (prevPoint !== point) newPoints.push(point);

  return newPoints;
}

function simplifyDPStep(points: number[][], first: number, last: number, sqTolerance: number, simplified: number[][]) {
  var maxSqDist = sqTolerance;
  let index: number = -1;

  for (var i = first + 1; i < last; i++) {
      var sqDist = getSqSegDist(points[i], points[first], points[last]);

      if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
      }
  }

  if (maxSqDist > sqTolerance) {
      if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyDouglasPeucker(points: number[][], sqTolerance: number) {
  var last = points.length - 1;

  var simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);

  return simplified;
}

/**
 * Simplify polygon
 * @param points Array<[number, number]> input points
 * @param tolerance 
 * @param highestQuality 
 */
export function simplify(points: number[][], tolerance: number, highestQuality: boolean = false) {

  if (points.length <= 2) return points;

  var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;
  points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
  points = simplifyDouglasPeucker(points, sqTolerance);

  return points;
}

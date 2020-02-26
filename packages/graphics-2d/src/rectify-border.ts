/**
 * Implementations of border rectifying algorithm.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

const range = (start : number, stop : number, step : number) =>
                Int32Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));

function getPolylineApproxLength(polylineVerticesFisheye : [number, number][]){
    const n = polylineVerticesFisheye.length;
    const dx = polylineVerticesFisheye[0][0] - polylineVerticesFisheye[n-1][0];
    const dy = polylineVerticesFisheye[0][1] - polylineVerticesFisheye[n-1][1];
    return Math.sqrt(dx*dx + dy*dy)
}

/**
 * This function rectifies a border defined by a polyline. It finds a pair of dominate semantic labels in the mask,
 * one on each side. Then it corrects "wrong" labels within an adaptive band witdh. The assigned instance id is the one
 * belonging to the dominate instance of corresponding class.
 * @param {ImageData} mask - mask of semantic and instance segmentation. Supposed to be RGBA where
 * 2 first channels used for instance id, the 3d one is class id.
 * @param {Array<[number, number]>} polylineVerticesFisheye - Array of points representing the border polyline
 * @return {}
 * "correctedMask": ImageData;
 * "countModifPos": number;
 * "countModifNeg": number;
 * "countOtherClass": number;} Return value description
 */
export function rectifyFisheyeFromPolyline(mask : ImageData, polylineVerticesFisheye : [number, number][]){
    const dominateBoth = getOnlyDominantFisheye(mask, polylineVerticesFisheye, 10);
    const dominPos = dominateBoth[0];
    const dominNeg = dominateBoth[1];
    const dominateInstances = getDominantInstances(mask, polylineVerticesFisheye, dominateBoth, 10);

    /*
    if (dominPos is None) | (dominNeg is None):
        print("Could not detect 2 classes")
        return None, None, None, None, None, 0, 0, 0
    */

    const len = getPolylineApproxLength(polylineVerticesFisheye);
    let chosenWidth : number = -1;
    let iterC = 0;
    const widthCandidates = [3, 5, 8, 11, 14, 17, 20, 23, 26, 29];
    const nsModifPos = new Array<number>();
    const nsModifNeg = new Array<number>();
    const nsOtherClass = new Array<number>();
    for (const width of widthCandidates) {
        const r = switchLblsFisheye(mask, polylineVerticesFisheye, dominPos, dominNeg, width, new Array<number>());
        nsModifPos.push(r.countModifPos);
        nsModifNeg.push(r.countModifNeg);
        nsOtherClass.push(r.countOtherClass);
        iterC += 1;
        chosenWidth = width;
        if (iterC >= 2) {
            const densityModif = (nsModifNeg[iterC-1] + nsModifPos[iterC-1] - nsModifNeg[iterC-2] - nsModifPos[iterC-2]) /
                                len / (widthCandidates[iterC-1] - widthCandidates[iterC-2]);
            if (densityModif < 0.01){
                // Stop condition: flat zone
                break;
            }
            if (nsModifNeg[iterC-1] + nsModifPos[iterC-1] < nsOtherClass[iterC-1] * 1) {
                // Stop condition: too many other classes
                break;
            }
        }
    }
    return switchLblsFisheye(mask, polylineVerticesFisheye, dominPos, dominNeg, chosenWidth, dominateInstances);
}

/**
 * This function modifies 'wrong' labels on each side of the border and computes statistics
 * @param {ImageData} mask - mask of semantic and instance segmentation. Supposed to be RGBA where
 * 2 first channels used for instance id, the 3d one is class id.
 * @param {Array<[number, number]>} polylineVerticesFisheye - Array of points representing the border polyline
 * @param {number} dominPos - value of semantic label considered correct for the positive side
 * @param {number} dominNeg - value of semantic label considered correct for the negative side
 * @param {number} deltaLev2 - width of the band around the border the modifications to be applied to
 * @param {number[]} dominateInstances - tuple of instance labels considered correct for two sides.
 */
function switchLblsFisheye(mask : ImageData, polyline : [number, number][],
                            dominPos : number, dominNeg : number, deltaLev2 : number,
                            dominateInstances : number[]){
    const correctedMask = new ImageData(new Uint8ClampedArray(mask.data), mask.width, mask.height);
    let countModifPos = 0;
    let countModifNeg = 0;
    let countOtherClass = 0;
    for (let i=0; i< polyline.length-1; i++) {
        const pt1 = polyline[i];
        const pt2 = polyline[i+1];
        const segmBb = cartesianInt32(range(Math.min(pt1[0], pt2[0]) - deltaLev2, Math.max(pt1[0], pt2[0]) + deltaLev2, 1),
                                    range(Math.min(pt1[1], pt2[1]) - deltaLev2, Math.max(pt1[1], pt2[1]) + deltaLev2, 1));
        const segmBbWindow = [new Int32Array(segmBb[0].length), new Int32Array(segmBb[1].length)];
        let count = 0;
        for (let j = 0; j < segmBb[0].length; j++) {
            if ((segmBb[0][j] >= 0) && (segmBb[0][j] <= mask.height - 1) &&
                (segmBb[1][j] >= 0) && (segmBb[1][j] <= mask.width - 1)) {
                segmBbWindow[0][count] = segmBb[0][j];
                segmBbWindow[1][count] = segmBb[1][j];
                count += 1;
            }
        }
        segmBb[0] = segmBbWindow[0].slice(0, count);
        segmBb[1] = segmBbWindow[1].slice(0, count);

        const segmBbDistances = distancesPtsLineInt32(pt1, pt2, segmBb);
        const indProjectedInsideSegm = ptsAreProjectedInsideSegment(pt1, pt2, segmBb);
        const sides = crossProdZVect(pt1, pt2, segmBb);

        let segmBbAngles = anglesCosPtsSegm(pt1, pt2, segmBb);
        segmBbAngles = segmBbAngles.map(Math.abs);
        for (let j = 0; j < segmBb[0].length; j++) {
            if ((segmBbDistances[j] < deltaLev2) && ((indProjectedInsideSegm[j] === 1) ||
                ((segmBbAngles[j] < 0.2) && (j>0)))) {
                const posCur = 4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2;
                const valCur = mask.data[posCur];

                if ((sides[j] > 0) && (valCur === dominNeg)) {
                    if (dominateInstances.length > 0) {
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j])] = dominateInstances[0] / 256;
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 1] = dominateInstances[0] % 256;
                    }
                    correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2] = dominPos;
                    countModifPos += 1;
                }
                if ((sides[j] < 0) && (valCur === dominPos)) {
                    if (dominateInstances.length > 0) {
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j])] = dominateInstances[1] / 256;
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 1] = dominateInstances[1] % 256;
                    }
                    correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2] = dominNeg;
                    countModifNeg += 1;
                }
                if ((valCur !== dominPos) && (valCur !== dominNeg)){
                    countOtherClass += 1;
                }
            }
        }
    }
    return { correctedMask, countModifPos, countModifNeg, countOtherClass }
}

/**
 * Cartesian product of two Int32Array-s
 * @param {Int32Array} arr1 - first argument.
 * @param {Int32Array} arr2 - second argument.
 * @return {[Int32Array, Int32Array]} - result
 */
function cartesianInt32(arr1: Int32Array, arr2: Int32Array): [Int32Array, Int32Array] {
    /*
    Generate a cartesian product of input arrays.
    */
    const n1 = arr1.length;
    const n2 = arr2.length;

    const result1 = new Int32Array(n1 * n2);
    const result2 = new Int32Array(n1 * n2);

    let count = 0;
    for (let i = 0; i < n1; i++) {
        for (let j = 0; j < n2; j++) {
            result1[count] = arr1[i];
            result2[count] = arr2[j];
            count += 1;
        }
    }
    return [result1, result2];
}

/**
 * Compute cosines of angles between segments pt-pt1 and pt2-pt for pt in pts.
 * @param {[number, number]} pt1 - first vertex of fixed segment.
 * @param {[number, number]} pt2 - second vertex of fixed segment.
 * @param {[Int32Array, Int32Array]} pts - set of second vertices of variable segment.
 * @return {Float32Array} - array of angles
 */
function anglesCosPtsSegm(pt1: [number, number], pt2: [number, number], pts: [Int32Array, Int32Array]) : Float32Array {
    const t1 = pts[0].map(x => (x - pt1[0]) * (pt2[0] - pt1[0]));
    const t2 = pts[1].map(x => (x - pt1[1]) * (pt2[1] - pt1[1]));
    const products = new Float32Array(t1.map((x,i) => x + t2[i]));

    const t3 = pts[0].map(x => x - pt1[0]);
    const t4 = pts[1].map(x => x - pt1[1]);
    const t3Sqr = t3.map(x => x*x);
    const t4Sqr = t4.map(x => x*x);
    const tSum = new Float32Array(t3Sqr.map((x,i) => x + t4Sqr[i]));
    const norms = tSum.map(Math.sqrt)
    const norm =  Math.sqrt(Math.pow(pt2[0]-pt1[0], 2) + Math.pow(pt2[1]-pt1[1], 2));

    const res = products.map((x,i) => x / (norms[i] * norm));
    return res

}

/**
 * Distances between a line defined by two points and a set of points.
 * @param {[number, number]} pt1 - first point defining the line.
 * @param {[number, number]} pt2 - second point defining the line.
 * @param {[Int32Array, Int32Array]} pts - array of points ditance to be computed to.
 * @return {Float32Array} - array of distances
 */

function distancesPtsLineInt32(pt1: [number, number], pt2: [number, number], pts: [Int32Array, Int32Array]): Float32Array{
    const denom = Math.sqrt((pt1[0] - pt2[0]) * (pt1[0] - pt2[0]) + (pt1[1] - pt2[1]) * (pt1[1] - pt2[1]));
    const t1 = pts[0].map(x => x * (pt1[1] - pt2[1]));
    const t2 = pts[1].map(x => x * (pt1[0] - pt2[0]));
    const t3 = t1.map((a, i) => a - t2[i] +  pt1[0] * pt2[1] - pt1[1] * pt2[0]);
    const t4 = t3.map(Math.abs);
    const t45 = new Float32Array(t4);
    const t5 = t45.map(x => x  / denom);
    return t5;
}

/**
 * Distances between a fixed points and a set of points
 * @constructor
 * @param {[number, number]} pt - fixed point.
 * @param {[number, number]} pts - array of points ditance to be computed to.
 * @return {Float32Array} - array of distances.
 */
function distancesPtsPt(pt: [number, number], pts: [Int32Array, Int32Array]): Float32Array {
    const t1 = pts[0].map(x => x - pt[0]);
    const t2 = pts[1].map(x => x - pt[1]);
    const t4Sqr = t1.map(x => x*x);
    const t2Sqr = t2.map(x => x*x);
    const tSum = t4Sqr.map((a, i) => a + t2Sqr[i]);
    const tSumFloat = new Float32Array(tSum)
    const tSqrt = tSumFloat.map(Math.sqrt);
    return tSqrt
}

/**
 * Determines which points of an array are projected inside the segment, not to its continuation.
 * @param {[number, number]} pt1 - first vertex of the segment.
 * @param {[number, number]} pt2 - second vertex of the segment.
 * @param {[Int32Array, Int32Array]} pts - points to be projected.
 * @return {Uint8Array} - 1 for points projected inside, 0 for the ones projected outside.
 */
function ptsAreProjectedInsideSegment(pt1: [number, number], pt2: [number, number],
                                      pts: [Int32Array, Int32Array]) : Uint8Array {
    const ptOut1 = [pt1[0] + pt1[0] - pt2[0], pt1[1] + pt1[1] - pt2[1]] as [number, number];
    const ptOut2 = [pt2[0] + pt2[0] - pt1[0], pt2[1] + pt2[1] - pt1[1]] as [number, number];

    const distsToFirst = distancesPtsPt(pt1, pts);
    const distsToSecond = distancesPtsPt(pt2, pts);
    const distsToFirstOut = distancesPtsPt(ptOut1, pts);
    const distsToSecondOut = distancesPtsPt(ptOut2, pts);

    const outMask = new Uint8Array(pts[0].length);
    for (let i=0; i<pts[0].length; i++) {
        if ((distsToFirstOut[i] >= distsToSecond[i]) && (distsToSecondOut[i] >= distsToFirst[i])) {
            outMask[i] = 1;
        }
        else {
            outMask[i] = 0;
        }
    }
    return outMask
}

/**
 * Z component of cross-product between given segment pt2-pt1 and a set of segments pt-pt1.
 * Intuitively, determines if points are situated on left or on right side related to the directed segment.
 * @param {[number, number]} pt1 - first vertex of the segment.
 * @param {[number, number]} pt2 - second vertex of the segment.
 * @param {[Int32Array, Int32Array]} pts - second whose side must be defined.
 * @return {Int32Array} - Z component of cross-product. It means, positive for the points on one side and
 * negative for ones on another.
 */
function crossProdZVect(pt1: [number, number], pt2: [number, number], pts: [Int32Array, Int32Array]) : Int32Array {
    const us = [pt2[0] - pt1[0], pt2[1] - pt1[1]];
    const vs = [pts[0].map(x => x-pt1[0]), pts[1].map(x => x-pt1[1])];
    const t1 = vs[0].map(a => a * us[1]);
    const t2 = vs[1].map(a => a * us[0]);
    const tSum = t2.map((a, i) => a - t1[i]);
    return tSum
}

/**
 * Set of unique elements of an array.
 * @param {Array<number>} arr - input array.
 */
function unique(arr: number[]){
    return arr.filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
}

/**
 * Choose two dominant labels. Algorithm : simple majority in each set. Might be the same.
 * @constructor
 * @param {Array<number>} posSideCumul - The .
 * @param {Array<number>} negSideCumul - The .
 */
function chooseTwoDominants(posSideCumul : number[], negSideCumul : number[]){
    const uniquePos = unique(posSideCumul);
    const uniqueNeg = unique(negSideCumul);
    const countsPos : { [id: string] : number; } = {};
    const countsNeg : { [id: string] : number; } = {};
    for (const val1 of uniquePos) {
        countsPos[val1.toString()] = posSideCumul.filter((x) => x === val1).length;
    }
    for (const val2 of uniqueNeg) {
        countsNeg[val2.toString()] = negSideCumul.filter((x) => x === val2).length;
    }

    let argmaxPos : string = Object.keys(countsPos)[0];
    let argmaxNeg : string = Object.keys(countsNeg)[0];

    for (const val of uniquePos) {
        if (countsPos[val.toString()] > countsPos[argmaxPos]) {
            argmaxPos = val.toString();
        }
    }
    for (const val of uniqueNeg) {
        if (countsNeg[val.toString()] > countsNeg[argmaxNeg]) {
            argmaxNeg = val.toString();
        }
    }
    return [Number(argmaxPos), Number(argmaxNeg)]
}

/**
 * Choose two different dominating labels from 2 sets.
 * Algorithm: considering pairs and ranking by product of relative frequencies.
 * @constructor
 * @param {Array<number>} posSideCumul - The title of the book.
 * @param {Array<number>} negSideCumul - The author of the book.
 */
function chooseDominantPair(posSideCumul : number[], negSideCumul : number[]){
    const uniquePos = unique(posSideCumul);
    const uniqueNeg = unique(posSideCumul);
    const countsPos : { [id: string] : number; } = {};
    const countsNeg : { [id: string] : number; } = {};
    let countTotalPos = 0;
    let countTotalNeg = 0;
    for (const val1 of uniquePos) {
        countsPos[val1] = posSideCumul.filter((x) => x === val1).length;
        countTotalPos += countsPos[val1];
    }
    for (const val2 of uniqueNeg) {
        countsNeg[val2] = negSideCumul.filter((x) => x === val2).length;
        countTotalNeg += countsNeg[val2];
    }

    let candidate1 : number = -1;
    let candidate2 : number = -1;
    let maxVal = 0;
    for (const val1 of uniquePos){
        for (const val2 of uniqueNeg) {
            if (val1 !== val2) {
                if (countsPos[val1] / countTotalPos * countsNeg[val2] / countTotalNeg > maxVal) {
                    candidate1 = val1;
                    candidate2 = val2;
                    maxVal = countsPos[val1] / countTotalPos * countsNeg[val2] / countTotalNeg;
                }
            }
        }
    }
    return [candidate1, candidate2]
}

/**
 * Compute two dominate instances for given mask, border and dominate classes.
 * @param {ImageData} mask - The.
 * @param {Array<[number, number]>} polyline - The.
 * @param {number[]} dominateLabels - The.
 * @param {number} distDomin - The.
 */
function getDominantInstances(mask : ImageData, polyline : [number, number][],
                              dominateLabels: number[], distDomin : number = 3) {
    const posSideCumulInst = new Array<number>();
    const negSideCumulInst = new Array<number>();
    for (let i = 0; i < polyline.length - 1; i++) {
        const pt1 = polyline[i];
        const pt2 = polyline[i+1];
        const segmBb = cartesianInt32(range(Math.min(pt1[0], pt2[0]) - distDomin, Math.max(pt1[0], pt2[0]) + distDomin, 1),
                                     range(Math.min(pt1[1], pt2[1]) - distDomin, Math.max(pt1[1], pt2[1]) + distDomin, 1));
        const segmBbWindow = [new Int32Array(segmBb[0].length), new Int32Array(segmBb[1].length)];

        let count = 0;
        for (let j = 0; j < segmBb[0].length; j++) {
            if ((segmBb[0][j] >= 0) && (segmBb[0][j] <= mask.height - 1) &&
                (segmBb[1][j] >= 0) && (segmBb[1][j] <= mask.width - 1)) {
                segmBbWindow[0][count] = segmBb[0][j];
                segmBbWindow[1][count] = segmBb[1][j];
                count += 1;
            }
        }
        segmBb[0] = segmBbWindow[0].slice(0, count);
        segmBb[1] = segmBbWindow[1].slice(0, count);

        const segmBbDistances = distancesPtsLineInt32(pt1, pt2, segmBb);
        const indProjectedInsideSegm = ptsAreProjectedInsideSegment(pt1, pt2, segmBb);
        const sides = crossProdZVect(pt1, pt2, segmBb);

        for (let j = 0; j < segmBb[0].length; j++) {
            if ((segmBbDistances[j] < distDomin) && (indProjectedInsideSegm[j] === 1)) {
                const curId = 4 * (segmBb[0][j] * mask.width + segmBb[1][j]);
                if ((sides[j] > 0) && (mask.data[curId + 2] === dominateLabels[0])) {
                    posSideCumulInst.push(256 * mask.data[curId + 0] + mask.data[curId + 1]);
                }
                if ((sides[j] < 0) && (mask.data[curId + 2] === dominateLabels[1])) {
                    negSideCumulInst.push(256 * mask.data[curId + 0] + mask.data[curId + 1]);
                }
            }
        }
    }
    return chooseTwoDominants(posSideCumulInst, negSideCumulInst);
}

/**
 * Compute two dominate classes for given mask and border.
 * @param {ImageData} mask - The.
 * @param {Array<[number, number]>} polyline - The .
 * @param {number} distDomin - The .
 * @param {number} ignoreLbl - The .
 */
function getOnlyDominantFisheye(mask : ImageData, polyline : [number, number][],
                                distDomin : number = 3, ignoreLbl : number = 255) {
    let i :  number;
    const posSideCumulCls = new Array<number>();
    const negSideCumulCls = new Array<number>();
    for (i = 0; i < polyline.length - 1; i++) {
        const pt1 = polyline[i];
        const pt2 = polyline[i+1];
        const segmBb = cartesianInt32(range(Math.min(pt1[0], pt2[0]) - distDomin, Math.max(pt1[0], pt2[0]) + distDomin, 1),
                                     range(Math.min(pt1[1], pt2[1]) - distDomin, Math.max(pt1[1], pt2[1]) + distDomin, 1));
                                     const segmBbWindow = [new Int32Array(segmBb[0].length), new Int32Array(segmBb[1].length)];

        let count = 0;
        for (let j = 0; j < segmBb[0].length; j++) {
            if ((segmBb[0][j] >= 0) && (segmBb[0][j] <= mask.height - 1) &&
                (segmBb[1][j] >= 0) && (segmBb[1][j] <= mask.width - 1)) {
                segmBbWindow[0][count] = segmBb[0][j];
                segmBbWindow[1][count] = segmBb[1][j];
                count += 1;
            }
        }
        segmBb[0] = segmBbWindow[0].slice(0, count);
        segmBb[1] = segmBbWindow[1].slice(0, count);

        const segmBbDistances = distancesPtsLineInt32(pt1, pt2, segmBb);
        const indProjectedInsideSegm = ptsAreProjectedInsideSegment(pt1, pt2, segmBb);
        const sides = crossProdZVect(pt1, pt2, segmBb);

        for (let j = 0; j < segmBb[0].length; j++) {
            if ((segmBbDistances[j] < distDomin) && (indProjectedInsideSegm[j] === 1) &&
                (mask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2] !== ignoreLbl)) {
                const curId = 4 * (segmBb[0][j] * mask.width + segmBb[1][j]);
                if (sides[j] > 0) {
                    posSideCumulCls.push(mask.data[curId + 2]);
                }
                if (sides[j] < 0) {
                    negSideCumulCls.push(mask.data[curId + 2]);
                }
            }
        }
    }
    return chooseDominantPair(posSideCumulCls, negSideCumulCls);
}
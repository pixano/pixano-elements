/**
 * Implementations of border rectifying algorithm.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

const range = (start : number, stop : number, step : number) => 
                Int32Array.from({ length: (stop - start) / step + 1}, (_, i) => start + (i * step));

function getPolylineApproxLength(polylineVerticesFisheye : Array<[number, number]>){
    var n = polylineVerticesFisheye.length
    let dx = polylineVerticesFisheye[0][0] - polylineVerticesFisheye[n-1][0];
    let dy = polylineVerticesFisheye[0][1] - polylineVerticesFisheye[n-1][1];
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
    "correctedMask": ImageData;
    "countModifPos": number;
    "countModifNeg": number;
    "countOtherClass": number;} Return value description
 */
export function rectifyFisheyeFromPolyline(mask : ImageData, polylineVerticesFisheye : Array<[number, number]>){
    let dominateBoth = getOnlyDominantFisheye(mask, polylineVerticesFisheye, 10);
    let dominPos = dominateBoth[0];
    let dominNeg = dominateBoth[1];
    let dominateInstances = getDominantInstances(mask, polylineVerticesFisheye, dominateBoth, 10);

    /*
    if (dominPos is None) | (dominNeg is None):
        print("Could not detect 2 classes")
        return None, None, None, None, None, 0, 0, 0
    */

    let len = getPolylineApproxLength(polylineVerticesFisheye);
    let chosenWidth : number = -1;
    let iterC = 0;
    let widthCandidates = [3, 5, 8, 11, 14, 17, 20, 23, 26, 29];
    
    let nsModifPos = new Array<number>();
    let nsModifNeg = new Array<number>();
    let nsOtherClass = new Array<number>(); 

    for (let width of widthCandidates) {
        const res = switchLblsFisheye(mask, polylineVerticesFisheye, dominPos, dominNeg, width, new Array<number>());
        nsModifPos.push(res["countModifPos"]);
        nsModifNeg.push(res["countModifNeg"]);
        nsOtherClass.push(res["countOtherClass"]);
        iterC += 1;
        chosenWidth = width;
        if (iterC >= 2) {
            let densityModif = (nsModifNeg[iterC-1] + nsModifPos[iterC-1] - nsModifNeg[iterC-2] - nsModifPos[iterC-2]) / 
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
    var res = switchLblsFisheye(mask, polylineVerticesFisheye, dominPos, dominNeg, chosenWidth, dominateInstances);
    return res
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
function switchLblsFisheye(mask : ImageData, polyline : Array<[number, number]>, 
                            dominPos : number, dominNeg : number, deltaLev2 : number, 
                            dominateInstances : number[]){
    var correctedMask = new ImageData(new Uint8ClampedArray(mask.data), mask.width, mask.height);
    let countModifPos = 0;
    let countModifNeg = 0;
    let countOtherClass = 0;
    for (let i=0; i< polyline.length-1; i++) {
        let pt1 = polyline[i];
        let pt2 = polyline[i+1];
        var segmBb = cartesianInt32(range(Math.min(pt1[0], pt2[0]) - deltaLev2, Math.max(pt1[0], pt2[0]) + deltaLev2, 1),
                                    range(Math.min(pt1[1], pt2[1]) - deltaLev2, Math.max(pt1[1], pt2[1]) + deltaLev2, 1));
        var segmBbWindow = [new Int32Array(segmBb[0].length), new Int32Array(segmBb[1].length)];
        let count = 0;
        for (var j = 0; j < segmBb[0].length; j++) {
            if ((segmBb[0][j] >= 0) && (segmBb[0][j] <= mask.height - 1) && 
                (segmBb[1][j] >= 0) && (segmBb[1][j] <= mask.width - 1)) {
                segmBbWindow[0][count] = segmBb[0][j];
                segmBbWindow[1][count] = segmBb[1][j];
                count += 1;
            }
        }
        segmBb[0] = segmBbWindow[0].slice(0, count);
        segmBb[1] = segmBbWindow[1].slice(0, count);

        var segmBbDistances = distancesPtsLineInt32(pt1, pt2, segmBb);
        var indProjectedInsideSegm = ptsAreProjectedInsideSegment(pt1, pt2, segmBb);
        var sides = crossProdZVect(pt1, pt2, segmBb);

        var segmBbAngles = anglesCosPtsSegm(pt1, pt2, segmBb);
        segmBbAngles = segmBbAngles.map(Math.abs)
        for (var j = 0; j < segmBb[0].length; j++) {
            if ((segmBbDistances[j] < deltaLev2) && ((indProjectedInsideSegm[j] == 1) || 
                ((segmBbAngles[j] < 0.2) && (j>0)))) {
                let posCur = 4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2;
                let valCur = mask.data[posCur];

                if ((sides[j] > 0) && (valCur == dominNeg)) {
                    if (dominateInstances.length > 0) {
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j])] = dominateInstances[0] / 256;
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 1] = dominateInstances[0] % 256;
                    }
                    correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2] = dominPos;
                    countModifPos += 1;
                }
                if ((sides[j] < 0) && (valCur == dominPos)) {
                    if (dominateInstances.length > 0) {
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j])] = dominateInstances[1] / 256;
                        correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 1] = dominateInstances[1] % 256;
                    }
                    correctedMask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2] = dominNeg;
                    countModifNeg += 1;
                }
                if ((valCur != dominPos) && (valCur != dominNeg)){
                    countOtherClass += 1;
                }
            }
        }
    }
    return {"correctedMask" : correctedMask, "countModifPos" : countModifPos, 
            "countModifNeg" : countModifNeg, "countOtherClass" : countOtherClass}
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
    var n1 = arr1.length;
    var n2 = arr2.length;

    var result1 = new Int32Array(n1 * n2);
    var result2 = new Int32Array(n1 * n2);

    let count = 0;
    for (var i = 0; i < n1; i++) {
        for (var j = 0; j < n2; j++) {
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
    var t1 = pts[0].map(x => (x - pt1[0]) * (pt2[0] - pt1[0]));
    var t2 = pts[1].map(x => (x - pt1[1]) * (pt2[1] - pt1[1]));
    var products = new Float32Array(t1.map((x,i) => x + t2[i]));

    var t3 = pts[0].map(x => x - pt1[0]);
    var t4 = pts[1].map(x => x - pt1[1]);
    var t3Sqr = t3.map(x => x*x);
    var t4Sqr = t4.map(x => x*x);
    var tSum = new Float32Array(t3Sqr.map((x,i) => x + t4Sqr[i]));
    var norms = tSum.map(Math.sqrt)
    var norm =  Math.sqrt(Math.pow(pt2[0]-pt1[0], 2) + Math.pow(pt2[1]-pt1[1], 2));

    var res = products.map((x,i) => x / (norms[i] * norm));
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
    let denom = Math.sqrt((pt1[0] - pt2[0]) * (pt1[0] - pt2[0]) + (pt1[1] - pt2[1]) * (pt1[1] - pt2[1]));
    var t1 = pts[0].map(x => x * (pt1[1] - pt2[1]));
    var t2 = pts[1].map(x => x * (pt1[0] - pt2[0]));
    var t3 = t1.map((a, i) => a - t2[i] +  pt1[0] * pt2[1] - pt1[1] * pt2[0]);
    var t4 = t3.map(Math.abs);
    var t45 = new Float32Array(t4);
    var t5 = t45.map(x => x  / denom);
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
    var t1 = pts[0].map(x => x - pt[0]);
    var t2 = pts[1].map(x => x - pt[1]);
    var t4Sqr = t1.map(x => x*x);
    var t2Sqr = t2.map(x => x*x);
    var tSum = t4Sqr.map((a, i) => a + t2Sqr[i]);
    var tSumFloat = new Float32Array(tSum)
    var tSqrt = tSumFloat.map(Math.sqrt);
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
    let ptOut1 = [pt1[0] + pt1[0] - pt2[0], pt1[1] + pt1[1] - pt2[1]] as [number, number];
    let ptOut2 = [pt2[0] + pt2[0] - pt1[0], pt2[1] + pt2[1] - pt1[1]] as [number, number];

    var distsToFirst = distancesPtsPt(pt1, pts);
    var distsToSecond = distancesPtsPt(pt2, pts);
    var distsToFirstOut = distancesPtsPt(ptOut1, pts);
    var distsToSecondOut = distancesPtsPt(ptOut2, pts);

    var outMask = new Uint8Array(pts[0].length);
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
    var us = [pt2[0] - pt1[0], pt2[1] - pt1[1]];
    var vs = [pts[0].map(x => x-pt1[0]), pts[1].map(x => x-pt1[1])];
    var t1 = vs[0].map(a => a * us[1]);
    var t2 = vs[1].map(a => a * us[0]);
    var tSum = t2.map((a, i) => a - t1[i]);
    return tSum
}

/**
 * Set of unique elements of an array.
 * @param {Array<number>} arr - input array.
 */
function unique(arr: Array<number>){
    return arr.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    })
}

/**
 * Choose two dominant labels. Algorithm : simple majority in each set. Might be the same.
 * @constructor
 * @param {Array<number>} posSideCumul - The .
 * @param {Array<number>} negSideCumul - The .
 */
function chooseTwoDominants(posSideCumul : Array<number>, negSideCumul : Array<number>){
    let uniquePos = unique(posSideCumul);
    let uniqueNeg = unique(negSideCumul);
    var countsPos : { [id: string] : number; } = {};
    var countsNeg : { [id: string] : number; } = {};
    for (let val1 of uniquePos) {
        countsPos[val1.toString()] = posSideCumul.filter((x) => x==val1).length;
    }
    for (let val2 of uniqueNeg) {
        countsNeg[val2.toString()] = negSideCumul.filter((x) => x==val2).length;
    }

    var argmaxPos : string = Object.keys(countsPos)[0];
    var argmaxNeg : string = Object.keys(countsNeg)[0];

    for (let val of uniquePos) {
        if (countsPos[val.toString()] > countsPos[argmaxPos]){ 
            argmaxPos = val.toString();
        }
    }
    for (let val of uniqueNeg) {
        if (countsNeg[val.toString()] > countsNeg[argmaxNeg]){ 
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
function chooseDominantPair(posSideCumul : Array<number>, negSideCumul : Array<number>){
    let uniquePos = unique(posSideCumul);
    let uniqueNeg = unique(posSideCumul);
    let countTotalPos = 0;
    var countsPos : { [id: string] : number; } = {};
    var countsNeg : { [id: string] : number; } = {};
    let countTotalNeg = 0;
    for (let val1 of uniquePos) {
        countsPos[val1] = posSideCumul.filter((x) => x==val1).length;
        countTotalPos += countsPos[val1];
    }
    for (let val2 of uniqueNeg) {
        countsNeg[val2] = negSideCumul.filter((x) => x==val2).length;
        countTotalNeg += countsNeg[val2];
    }

    let candidate1 : number = -1;
    let candidate2 : number = -1;
    let maxVal = 0;

    for (let val1 of uniquePos){
        for (let val2 of uniqueNeg) {
            if (val1 != val2) {
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
function getDominantInstances(mask : ImageData, polyline : Array<[number, number]>, 
                              dominateLabels: number[], distDomin : number = 3) {
    let posSideCumulInst = new Array<number>();
    let negSideCumulInst = new Array<number>();
    var i : number;
    for (i = 0; i < polyline.length - 1; i++) {
        let pt1 = polyline[i];
        let pt2 = polyline[i+1];

        var segmBb = cartesianInt32(range(Math.min(pt1[0], pt2[0]) - distDomin, Math.max(pt1[0], pt2[0]) + distDomin, 1),
                                     range(Math.min(pt1[1], pt2[1]) - distDomin, Math.max(pt1[1], pt2[1]) + distDomin, 1));
        var segmBbWindow = [new Int32Array(segmBb[0].length), new Int32Array(segmBb[1].length)];

        let count = 0;
        for (var j = 0; j < segmBb[0].length; j++) {
            if ((segmBb[0][j] >= 0) && (segmBb[0][j] <= mask.height - 1) && 
                (segmBb[1][j] >= 0) && (segmBb[1][j] <= mask.width - 1)) {
                segmBbWindow[0][count] = segmBb[0][j];
                segmBbWindow[1][count] = segmBb[1][j];
                count += 1;
            }
        }
        segmBb[0] = segmBbWindow[0].slice(0, count);
        segmBb[1] = segmBbWindow[1].slice(0, count);

        var segmBbDistances = distancesPtsLineInt32(pt1, pt2, segmBb);
        var indProjectedInsideSegm = ptsAreProjectedInsideSegment(pt1, pt2, segmBb);
        var sides = crossProdZVect(pt1, pt2, segmBb);

        for (var j = 0; j < segmBb[0].length; j++) {
            if ((segmBbDistances[j] < distDomin) && (indProjectedInsideSegm[j] == 1)) {
                const curId = 4 * (segmBb[0][j] * mask.width + segmBb[1][j]);
                if ((sides[j] > 0) && (mask.data[curId + 2] == dominateLabels[0])) {
                    posSideCumulInst.push(256 * mask.data[curId + 0] + mask.data[curId + 1]);
                }
                if ((sides[j] < 0) && (mask.data[curId + 2] == dominateLabels[1])) {
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
function getOnlyDominantFisheye(mask : ImageData, polyline : Array<[number, number]>, 
                                distDomin : number = 3, ignoreLbl : number = 255) {
    var i :  number;
    let posSideCumulCls = new Array<number>();
    let negSideCumulCls = new Array<number>();
    for (i = 0; i < polyline.length - 1; i++) {
        let pt1 = polyline[i];
        let pt2 = polyline[i+1];
        var segmBb = cartesianInt32(range(Math.min(pt1[0], pt2[0]) - distDomin, Math.max(pt1[0], pt2[0]) + distDomin, 1),
                                     range(Math.min(pt1[1], pt2[1]) - distDomin, Math.max(pt1[1], pt2[1]) + distDomin, 1));
        var segmBbWindow = [new Int32Array(segmBb[0].length), new Int32Array(segmBb[1].length)];

        let count = 0;
        for (var j = 0; j < segmBb[0].length; j++) {
            if ((segmBb[0][j] >= 0) && (segmBb[0][j] <= mask.height - 1) && 
                (segmBb[1][j] >= 0) && (segmBb[1][j] <= mask.width - 1)) {
                segmBbWindow[0][count] = segmBb[0][j];
                segmBbWindow[1][count] = segmBb[1][j];
                count += 1;
            }
        }
        segmBb[0] = segmBbWindow[0].slice(0, count);
        segmBb[1] = segmBbWindow[1].slice(0, count);

        var segmBbDistances = distancesPtsLineInt32(pt1, pt2, segmBb);
        var indProjectedInsideSegm = ptsAreProjectedInsideSegment(pt1, pt2, segmBb);
        var sides = crossProdZVect(pt1, pt2, segmBb);

        for (var j = 0; j < segmBb[0].length; j++) {
            if ((segmBbDistances[j] < distDomin) && (indProjectedInsideSegm[j] == 1) && 
                (mask.data[4 * (segmBb[0][j] * mask.width + segmBb[1][j]) + 2] != ignoreLbl)) {
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


// function getVisualizibleMask(mask : ImageData) {
//     //console.log("getVisualizibleMask", mask.data.length)
//     var visualizable = new ImageData(new Uint8ClampedArray(mask.data),mask.width, mask.height);
//     for (let i=0; i < mask.data.length; i+=4) {
//         visualizable.data[i] = visualizable.data[i] * 50;
//         visualizable.data[i+1] = visualizable.data[i+1] * 50;
//         visualizable.data[i+2] = visualizable.data[i+2] * 50;
//     }
//     return visualizable;
// }

/**
 * Ground segmentation algorithm using plane fitting in multiple sections
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import { Ransac, PlaneFitting } from './plane';
import { filterCentralArea, findHighDensityZ } from './utils';

/**
 * Class for storing points and ground plane model in a section (theta, phi)
 */
export class SectionPlane {
  public pts: [number,number,number][] = [];
  public ptsIndex: number[] = [];
  public npts: number = 0;
  public model: [number,number,number,number] = [0,0,0,0];
  public estimated: boolean = false;
};

/**
 * Ground segmentation using plane approximation in multiple sections
 */
export class GroundSegmentation {

  public dataGround:SectionPlane[][] = [];
  public centralPlaneModel: [number,number,number,number] = [0,0,0,0];
  public centralPlaneModelEstimated = false;
  public ptsIndex:number[] = [];
  // mean z
  public groundZ: number | null = null;
  private height:number = 0;
  private dmin:number = 2;
  private dmax:number = 0;
  private nbSectionsTheta:number = 6;
  private nbSectionsPhi:number = 6;

  /**
   * Constructor of class GroundSegmentation
   * @param dmin minimal distance from sensor at (0,0,0)
   * @param nbSectionsTheta number of sections parameterized by tilt angle theta (thetaMin and thetaMax related to distances dmin and dmax)
   * @param nbSectionsPhi number of sections parameterized by revolution angle phi in [-pi,pi]
   */
  constructor(dmin: number = 2, nbSectionsTheta: number = 6, nbSectionsPhi: number = 6) {
    this.nbSectionsTheta = nbSectionsTheta;
    this.nbSectionsPhi = nbSectionsPhi;
    for (let stheta=0; stheta < this.nbSectionsTheta; stheta++) {
      const d: SectionPlane[] = [];
      for (let sphi=0; sphi < this.nbSectionsPhi; sphi++) {
        const p = new SectionPlane();
        d.push(p);
      }
      this.dataGround.push(d);
    }
    this.dmin = dmin;
  }

  /**
   * Find points on and under ground
   * @param points set of points
   * @param plane plane model [a,b,c,d] where plane equation is ax+by+cz+d=0
   * @param threshold points are considered under this threshold
   */
  ptsOnGround(points: [number,number,number][],
          plane: number[],
          threshold: number):
          number[] {
    const inliersIndex: number[] = [];
    const planeModel = new PlaneFitting();
    // determine which side of the plane is 'below'
    const farAbovePt: [number,number,number] = [0,0,1000];
    const dist0 = planeModel.distance(plane, farAbovePt);
    let changeSign = false;
    if (dist0 < 0) {
        changeSign = true;
    }
    for (let i=0; i< points.length; i++) {
        const dist = planeModel.distance(plane, points[i]);
        let cond = false;
        if (changeSign) {
            cond = dist > -threshold;
        } else {
            cond = dist < threshold;
        }
        if (cond) {
            inliersIndex.push(i);
        }
    }
    return inliersIndex;
  }

  /**
   * Ground segmentation main function
   * @param pointBuffer point cloud
   */
  segmentGround(pointBuffer: Float32Array): boolean {
    // use restricted area
    const {points, rmax, zmin} = filterCentralArea(pointBuffer);
    this.dmax = rmax;
    // find most dense layer
    const {zl, zh} = findHighDensityZ(points, zmin);
    this.groundZ = zl;
    // fit a plane in the most dense layer
    let h = 0;
    const pts = points.filter((pt) => pt[2] >= zl && pt[2] < zh);
    if (pts.length > 100) {
      const planeFitting = new PlaneFitting();
      planeFitting.data = pts;
      const ransac = new Ransac(planeFitting);
      const ransacOptions = { sampleSize: 3, threshold:0.1, maxIterations: 100, inliersRatio: 0.7 };
      const planeEstimation = ransac.estimate(ransacOptions);
      // compute distance from (0,0,0) to plane
      const model = planeEstimation.model as number[];
      h = -model[3] / model[2];
      // console.log('   | plane estimation', planeEstimation);
      this.centralPlaneModel = model as [number,number,number,number];
      this.centralPlaneModelEstimated = true;
    } else {
      // not enought points to estimate heigt, return function
      this.centralPlaneModelEstimated = false;
      return false;
    }
    this.height = Math.abs(h);

    // estimate plane in multiple sections (divide space with angles theta (rmin, dmax) and phi (-pi, pi) )
    this.dmin = 2;
    const thetaMin = Math.atan2(this.dmin, this.height);
    const thetaMax = Math.atan2(this.dmax, this.height);
    const deltaTheta = (thetaMax - thetaMin) / this.nbSectionsTheta;
    const deltaPhi = 2 * Math.PI / this.nbSectionsPhi;

    // loop over all points in point cloud and fill plane section data
    for (let i=0; i< pointBuffer.length/3; i++) {
      const xi = pointBuffer[3*i];
      const yi = pointBuffer[3*i+1];
      const zi = pointBuffer[3*i+2];
      const r2 = xi*xi + yi*yi;
      if (zi < 0 && r2 > this.dmin*this.dmin) {
        const phi = Math.atan2(yi, xi);
        // determine section
        const theta = Math.atan2(Math.sqrt(r2), this.height);
        const stheta = Math.floor((theta - thetaMin) / deltaTheta);
        const sphi = Math.floor((phi + Math.PI) / deltaPhi);
        const npts = this.dataGround[stheta][sphi].npts;
        // fill data in section
        this.dataGround[stheta][sphi].pts[npts] = [xi,yi,zi];
        this.dataGround[stheta][sphi].ptsIndex[npts] = i;
        this.dataGround[stheta][sphi].npts = npts + 1;
      }
    }

    // estimate local plane model for every section and use it to segment ground
    const output:number[] = [];
    output.length = 1000;
    let index = 0;
    for (let stheta=0; stheta < this.nbSectionsTheta; stheta++) {
      for (let sphi=0; sphi < this.nbSectionsPhi; sphi++) {
        this.dataGround[stheta][sphi].pts.length = this.dataGround[stheta][sphi].npts;
        if (this.dataGround[stheta][sphi].npts > 50) {
          // find 50% lowest points
          const orderedZpts = this.dataGround[stheta][sphi].pts.slice(0).sort((a, b) => (a[2] > b[2]) ? 1 : -1);
          const lowMiddle = Math.floor((orderedZpts.length - 1) / 2);
          const highMiddle = Math.ceil((orderedZpts.length - 1) / 2);
          const medianZ = (orderedZpts[lowMiddle][2] + orderedZpts[highMiddle][2]) / 2;
          const lowestPts = orderedZpts.filter((pt) => pt[2] < medianZ);
          // plane fitting with ransac
          const planeFitting = new PlaneFitting();
          planeFitting.data = lowestPts;
          const ransac = new Ransac(planeFitting);
          const threshold = 0.2 + (stheta*0.02);
          const ransacOptions = { sampleSize: 3, threshold, maxIterations: 100, inliersRatio: 0.7 };
          const planeModel = ransac.estimate(ransacOptions);
          if (planeModel.status === 'Success') {
            this.dataGround[stheta][sphi].model = planeModel.model;
            this.dataGround[stheta][sphi].estimated = true;
            // segment ground: find points under (ground plane + threshold)
            const ptsIndex = this.ptsOnGround(this.dataGround[stheta][sphi].pts, planeModel.model, threshold);
            for (const inlier of ptsIndex) {
              output[index] = this.dataGround[stheta][sphi].ptsIndex[inlier];
              index+= 1;
            }
          }
          else {
            console.warn('Warning: error estimating ground plane', stheta, sphi, planeModel);
          }
        }
      }
      output.length = index;
    }
    console.info('Ground segmentation done.');
    this.ptsIndex = output;
    return true;
  }

  /**
   * Project a 3D point on local ground plane and return z
   * @param pt 3D point
   */
  projectToGround(pt: [number,number,number]): [boolean, number] {
    const xi = pt[0];
    const yi = pt[1];
    const phi = Math.atan2(yi, xi);
    const r2 = xi*xi + yi*yi;
    // central plane
    if (r2 < this.dmin*this.dmin) {
      if (this.centralPlaneModelEstimated) {
        const [a,b,c,d] = this.centralPlaneModel;
        const z = (-d - a*xi - b*yi ) / c;
        return [true, z];
      }
      else {
        return [false, 0];
      }
    }
    // general case
    else {
      // determine section
      const thetaMin = Math.atan2(this.dmin, this.height);
      const thetaMax = Math.atan2(this.dmax, this.height);
      const deltaTheta = (thetaMax - thetaMin) / this.nbSectionsTheta;
      const deltaPhi = 2 * Math.PI / this.nbSectionsPhi;
      // determine section
      const theta = Math.atan2(Math.sqrt(r2), this.height);
      const stheta = Math.floor((theta - thetaMin) / deltaTheta);
      const sphi = Math.floor((phi + Math.PI) / deltaPhi);
      if (this.dataGround[stheta][sphi].estimated) {
        // plane equation
        const [a,b,c,d] = this.dataGround[stheta][sphi].model;
        const z = (-d - a*xi - b*yi ) / c;
        return [true, z];
      } else {
        return [false, 0];
      }
    }
  }

}

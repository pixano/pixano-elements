/**
 * Implementation of plane fitting from point clound
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2020)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

/**
 * Fitting plane from 3 points and distance from point to plane
 */
export class PlaneFitting {
	public data: [number, number, number][] = [];
	/**
	 * Compute a plane model from 3 points
	 * @param samples
	 */
	public model(samples): number[] {
		const [x1, y1, z1] = samples[0];
		const [x2, y2, z2] = samples[1];
		const [x3, y3, z3] = samples[2];

		// calculate
		// 2. Calculate the plane that these points form
		// ax + by + bz + d = 0
		const a = (y2 - y1) * (z3 - z1) - (z2 - z1) * (y3 - y1);
		const b = (z2 - z1) * (x3 - x1) - (x2 - x1) * (z3 - z1);
		const c = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
		const d = -(a * x1 + b * y1 + c * z1);
		return [a, b, c, d];
	}
	/**
	 * Compute signed distance from a point to a plane defined
	 * @param plane model [a,b,c,d] for ax + by + bz + d = 0
	 * @param point point coordinates
	 */
	public distance(model: number[], point: [number, number, number]): number {
		const [a, b, c, d] = model;
		const [x, y, z] = point;
		const dist = (a * x + b * y + c * z + d) / Math.sqrt(a * a + b * b + c * c);
		return dist;
	}
	/**
	 * Estimate how the model fit the point
	 * @param plane model [a,b,c,d] for ax + by + bz + d = 0
	 * @param point point coordinates
	 */
	public fit(model: number[], point: [number, number, number]): number {
		return Math.abs(this.distance(model, point));
	}

};

/**
 * RANSAC algorithm for plane-fitting
 */
export class Ransac {
	private problem: PlaneFitting;

	constructor(problem) {
		this.problem = problem;
	}

	// Get a randome sample from problem of sampleSize
	sample(sampleSize) {
		const sample = [] as any;
		let currentSample = 0;
		while (currentSample < sampleSize) {
			const randomIndex = Math.floor(Math.random() * this.problem.data.length);
			// Avoid adding duplicated entries
			if (sample.indexOf(this.problem.data[randomIndex]) === -1) {
				sample.push(this.problem.data[randomIndex]);
				++currentSample;
			}
		}
		return sample;
	}

	// Tell how good a model is, for all points. By default,
	// it uses sum of squared differences
	modelError(model) {
		const problem = this.problem;
		const ssd = problem.data.reduce((a, b) => {
			const error = problem.fit(model, b);
			return a + Math.pow(error, 2);
		}, 0);
		return ssd;
	}

	// Tell which elements in data are inliers
	classifyInliers(model, sample, options) {
		const inliers = [] as any;
		const inliersIndex = [] as any;
		const outliers = [] as any;
		const outliersIndex = [] as any;
		const problem = this.problem;
		problem.data.forEach((point, index) => {
			// Exclude inliers
			if (sample.indexOf(point) === -1) {
				if (problem.fit(model, point) <= options.threshold) {
					inliers.push(point);
					inliersIndex.push(index);
				} else {
					outliers.push(point);
					outliersIndex.push(index);
				}
			}
		});

		return {
			inliers,
			inliersIndex,
			outliers,
			outliersIndex
		};
	}

	// Actually perform RANSAC model fitting
	estimate(options) {

		// Default options
		options = options || {};
		options.sampleSize = options.sampleSize || 3;
		options.threshold = options.threshold || 0.1;
		options.maxIterations = options.maxIterations || 30;
		options.inliersRatio = options.inliersRatio || 0.7;

		let iteration = 0;

		// When iterating, we keep track of the best model so far
		let bestSolution = {
			error: Infinity,
			model: [] as any,
			inliers: [],
			inliersIndex: [],
			outliers: [],
			outliersIndex: [],
			status: 'Failed'
		};

		while (iteration < options.maxIterations) {
			// Get a Sample. Only indexes are returned
			const sample = this.sample(options.sampleSize);

			// Estimate a model from the sample
			const model: number[] = this.problem.model(sample);

			// Get the inlier set
			const pointGroups = this.classifyInliers(model, sample, options);
			const inliers = pointGroups.inliers;
			const inliersIndex = pointGroups.inliersIndex;
			const outliers = pointGroups.outliers;
			const outliersIndex = pointGroups.outliersIndex;

			const inliersRatio = inliers.length / this.problem.data.length;
			if (inliersRatio >= options.inliersRatio) {
				const candidateModel: number[] = model;
				const candidateError = this.modelError(candidateModel);
				if (candidateError < bestSolution.error) {
					bestSolution = {
						inliers,
						inliersIndex,
						outliers,
						outliersIndex,
						model: candidateModel,
						error: candidateError / this.problem.data.length,
						status: 'Success'
					};
				}
			}

			++iteration;
		}

		return bestSolution;
	}
}


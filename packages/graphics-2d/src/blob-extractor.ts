/**
 * Implementations of contour retrieval from mask.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

export class RegBlob {
	public contours: Contour[] = new Array();
	public readonly cls: number;
	public nbPixels: number = 0;

	constructor(cls: number) {
		this.cls = cls
	}
}

export interface Contour {
	points: number[];
	type: string;
}

export class BlobExtractor {

	private width: number;
	private height: number;
	private augW: number;
	private augH: number;
	private max: number;
	private pos: number[];

	private withExtrema = false;
	private extrema: number[]

	private imgData: ImageData;
	public blobs: Map<number, RegBlob> = new Map();
	public label: number[];
	private augLabel: number[];

	static BACKGROUND = null;
	// static UNSET = -1;//=>undefined will avoid unnecessary computating power
	static MARKED = -2;
	static CONNEXITY = 4;

	public targetId: [number, number, number] = [0, 0, 0];

	constructor(data: ImageData, vertexExtrema?: number[]) {
		this.width = data.width;
		this.height = data.height;
		this.augW = data.width + 2;
		this.augH = data.height + 2;
		let [xMin, yMin, xMax, yMax] = [0, 0, 0, 0]
		if (vertexExtrema) {
			[xMin, yMin, xMax, yMax] = vertexExtrema;
			xMax = xMax - 1;
			yMax = yMax - 1
			this.extrema = [xMin, yMin, xMax, yMax]
			this.withExtrema = true;
		} else {
			this.extrema = [0, 1, this.augW - 1, this.augH - 2];
		}

		this.max = this.augH * this.augW;
		this.pos = [1, this.augW + 1, this.augW, this.augW - 1, -1, -this.augW - 1, -this.augW, -this.augW + 1];

		this.label = new Array(this.width * this.height);

		// Pad image with zero on all borders
		const canvas = document.createElement('canvas') as HTMLCanvasElement;
		canvas.width = this.augW;
		canvas.height = this.augH;
		const ctx = canvas.getContext('2d')!;
		ctx.putImageData(data, 1, 1, 0, 0, data.width, data.height);
		this.imgData = ctx.getImageData(0, 0, this.augW, this.augH);

		if (vertexExtrema)
			this.extrema = [xMin, yMin + 1, xMax + 2, yMax + 1];

		this.augLabel = new Array(this.max);
	}

	/**
	 * @param pos Pixel position in augmented image (can be zero padded image or point image)
	 * @param augW Width of augmented image
	 * @returns Pixel position in original image
	 */
	protected origPos(pos: number, augW: number) {
		const y = pos / augW | 0;
		const x = pos % augW;
		// x - 1 : original x in original data
		// y - 1 : original y in original data
		return (y - 1) * (augW - 2) + x - 1;
	}

	/**
	 * Add borders with zeros around an image
	 * @param data The image, stored in a 1D list
	 * @returns The new image (1D list) with zeros borders
	 */
	protected addBorders(data: number[]) {
		const augData = new Array((this.augW) * (this.augH));
		const [xMin, yMin, xMax, yMax] = this.extrema;
		if (this.withExtrema) {
			for (let x = xMin; x <= xMax + 2; x++) {
				for (let y = yMin; y <= yMax + 2; y++) {
					const i = y * this.augW + x
					if (x === xMin || y === yMin || x === xMax + 2 || y === yMax + 2) {
						augData[i] = BlobExtractor.BACKGROUND;
					}
					else {
						augData[i] = data[i - (this.width + 2 * y + 1)];
					}
				}
			}
		}
		else {
			for (let x = 0; x < this.augW; x++) {
				for (let y = 0; y < this.augH; y++) {
					const i = y * this.augW + x
					if (x === 0 || y === 0 || x === this.width + 1 || y === this.height + 1) {
						augData[i] = BlobExtractor.BACKGROUND;
					}
					else {
						augData[i] = data[i - (this.width + 2 * y + 1)];
					}
				}
			}
		}
		return augData;
	}

	protected strPtToPos(pixPos: number, strPos: string) {
		const pixY = pixPos / this.augW | 0;
		const ptPos = (() => {
			switch (strPos) {
				case 'tl':
					return pixPos + pixY;
				case 'tr':
					return pixPos + pixY + 1;
				case 'bl':
					return pixPos + (this.augW + 1) + pixY;
				default:
				case 'br':
					return pixPos + (this.augW + 1) + pixY + 1;
			}
		})();
		return this.origPos(ptPos, this.augW + 1);
	}

	public addPoints(contour: Contour, oldPos: number, oldQ: number, newQ: number) {
		const newAdded = new Array();
		switch (oldQ) {
			case 0:
				switch (newQ) {
					case 0:
						newAdded.push(this.strPtToPos(oldPos, "tr"));
						break;
					case 2:
						newAdded.push(this.strPtToPos(oldPos, "tr"));
						newAdded.push(this.strPtToPos(oldPos, "br"));
						break;
					case 4:
						newAdded.push(this.strPtToPos(oldPos, "tr"));
						newAdded.push(this.strPtToPos(oldPos, "br"));
						newAdded.push(this.strPtToPos(oldPos, "bl"));
						break;
					case 6:
						break;
				}
				break;
			case 2:
				switch (newQ) {
					case 0:
						break;
					case 2:
						newAdded.push(this.strPtToPos(oldPos, "br"));
						break;
					case 4:
						newAdded.push(this.strPtToPos(oldPos, "br"));
						newAdded.push(this.strPtToPos(oldPos, "bl"));
						break;
					case 6:
						newAdded.push(this.strPtToPos(oldPos, "br"));
						newAdded.push(this.strPtToPos(oldPos, "bl"));
						newAdded.push(this.strPtToPos(oldPos, "tl"));
						break;
				}
				break;

			case 4:
				switch (newQ) {
					case 0:
						newAdded.push(this.strPtToPos(oldPos, "bl"));
						newAdded.push(this.strPtToPos(oldPos, "tl"));
						newAdded.push(this.strPtToPos(oldPos, "tr"));
						break;
					case 2:
						break;
					case 4:
						newAdded.push(this.strPtToPos(oldPos, "bl"));
						break;
					case 6:
						newAdded.push(this.strPtToPos(oldPos, "bl"));
						newAdded.push(this.strPtToPos(oldPos, "tl"));
						break;
				}
				break;

			case 6:
				switch (newQ) {
					case 0:
						newAdded.push(this.strPtToPos(oldPos, "tl"));
						newAdded.push(this.strPtToPos(oldPos, "tr"));
						break;
					case 2:
						newAdded.push(this.strPtToPos(oldPos, "tl"));
						newAdded.push(this.strPtToPos(oldPos, "tr"));
						newAdded.push(this.strPtToPos(oldPos, "br"));
						break;
					case 4:
						break;
					case 6:
						newAdded.push(this.strPtToPos(oldPos, "tl"));
						break;
				}
				break;
		}
		contour.points.push(...newAdded)
		return contour;
	}

	/**
	 * Returns next pixel of contour
	 * @param S Current contour pixel
	 * @param p Current index of connexity array
	 * @returns A dictionary with next pixel of contour and its associated connexity index
	 */
	protected tracer(S: number, p: number) {
		let d = 0;
		while (d < 8) {
			const q = (p + d) % 8;
			const T = S + this.pos[q];
			// Make sure we are inside image
			if (T < 0 || T >= this.max)
				continue;

			if (this.isEqual(T))
				return { T, q };

			this.augLabel[T] = BlobExtractor.MARKED;
			if (BlobExtractor.CONNEXITY === 8)
				d++
			else
				d = d + 2
		}
		// No move
		return { T: S, q: -1 };
	}

	/**
	 * Computes a contour
	 * @param S Offset of starting point
	 * @param C Label count
	 * @param external Boolean Is this internal or external tracing
	 * @returns The computed contour and the number of pixels of the contour
	 */
	protected contourTracing(S: number, C: number, external: boolean): [Contour, number] {
		let p: number;
		if (BlobExtractor.CONNEXITY === 8)
			p = external ? 7 : 3;
		else
			p = external ? 0 : 2;

		let contour = { type: external ? "external" : "internal", points: new Array() };
		const addedPixels = new Set<number>();

		// Find out our default next pos (from S)
		let tmp = this.tracer(S, p);
		const T2 = tmp.T;
		let q = tmp.q;

		this.augLabel[S] = C;
		addedPixels.add(S)

		// Single pixel check
		if (T2 === S) {
			if (BlobExtractor.CONNEXITY === 4) {
				contour.points.push(this.strPtToPos(S, "tl"));
				contour.points.push(this.strPtToPos(S, "tr"));
				contour.points.push(this.strPtToPos(S, "br"));
				contour.points.push(this.strPtToPos(S, "bl"));
			}
			return [contour, addedPixels.size];
		}

		let Tnext = T2;
		let T = T2;
		while (T !== S || Tnext !== T2) {
			this.augLabel[Tnext] = C;
			if (!addedPixels.has(Tnext))
				addedPixels.add(Tnext);

			T = Tnext;
			if (BlobExtractor.CONNEXITY === 8)
				p = (q + 5) % 8;
			else
				p = (q + 6) % 8;

			tmp = this.tracer(T, p);

			if (BlobExtractor.CONNEXITY === 4)
				contour = this.addPoints(contour, T, q, tmp.q);

			Tnext = tmp.T;
			q = tmp.q;
		}
		return [contour, addedPixels.size];
	};

	/**
	 * Performs the blob extraction
	 * @param targetId the target id of the blobs to find
	 * @param needLabel whether we need the computed mask
	 */
	public extract(targetId: [number, number, number], needLabel: boolean = false) {

		this.targetId = targetId;
		// initialising to BlobExtractor.UNSET

		// console.log("avec extrema=",this.withExtrema);
		// if (this.withExtrema) {
		// 	var posi = 0;
		// 	for (let j = this.extrema[1]; j <= this.extrema[3]; j++) {
		// 		posi = this.extrema[0] + j * this.augW;
		// 		for (let i = this.extrema[0]; i <= this.extrema[2]; i++) {
		// 			this.augLabel[posi++] = BlobExtractor.UNSET;
		// 		}
		// 	}
		// } else
		// for (let i = 0; i <= this.max; i++) this.augLabel[i] = BlobExtractor.UNSET;
		// this.augLabel = new Array(this.max);
		// console.log("max=",this.max);
		// console.log("auglabel=",this.augLabel[450000]);

		let c = 0;
		// let y = this.extrema[1];
		// console.log("f1=",(new Date().getTime()-start));
		// computing
		let posi = 0;
		for (let j = this.extrema[1]; j <= this.extrema[3]; j++) {
			posi = this.extrema[0] + j * this.augW;
			for (let i = this.extrema[0]; i <= this.extrema[2]; i++) {
				if (this.isEqual(posi)) {// We skip white pixels or previous labeled pixels

					// Step 1 - P not labelled, and above pixel is white
					if (!this.isEqual(posi - this.augW) && this.augLabel[posi] === undefined) {
						// P must be external contour
						this.blobs.set(c, new RegBlob(c));
						const [contour, nbPixels] = this.contourTracing(posi, c, true);
						this.blobs.get(c)!.contours.push(contour);
						this.blobs.get(c)!.nbPixels += nbPixels;
						c++;
					}

					// Step 2 - Below pixel is white, and unmarked
					if (!this.isEqual(posi + this.augW) && this.augLabel[posi + this.augW] === undefined) {
						// Use previous pixel label, unless this is already labelled
						let n = this.augLabel[posi - 1];
						if (this.augLabel[posi] !== undefined)
							n = this.augLabel[posi];

						// P must be a internal contour
						const [contour, nbPixels] = this.contourTracing(posi, n, false);
						const b = this.blobs.get(n);
						if (b) {
							b.contours.push(contour);
							b.nbPixels += nbPixels;
						}
					}

					// Step 3 - Not dealt within previous two steps
					if (this.augLabel[posi] === undefined) {
						const n = this.augLabel[posi - 1] || 0;
						// Assign P the value of N
						this.augLabel[posi] = n;
						const b = this.blobs.get(n);
						if (b) { b.nbPixels += 1; }
					}
				}
				posi++;
			}
		}

		if (needLabel) {
			for (let x2 = 0; x2 < this.width; x2++) {
				for (let y2 = 0; y2 < this.height; y2++) {
					const offset = x2 + y2 * this.width
					this.label[offset] = this.augLabel[offset + this.width + 2 * y2 + 3]
				}
			}
		}
	}

	isEqualXY(x: number, y: number) {
		const offset = y * this.augW + x;
		return this.imgData.data[4 * offset + 0] === this.targetId[0]
			&& this.imgData.data[4 * offset + 1] === this.targetId[1]
			&& this.imgData.data[4 * offset + 2] === this.targetId[2];
	}

	isEqual(offset: number) {
		return this.imgData.data[4 * offset + 0] === this.targetId[0]
			&& this.imgData.data[4 * offset + 1] === this.targetId[1]
			&& this.imgData.data[4 * offset + 2] === this.targetId[2];
	}
}
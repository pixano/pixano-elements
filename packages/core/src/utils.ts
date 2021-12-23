/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

// alphabetically ordered color list
export const colorNames: { [key: string]: string } = {
	aliceblue: "f0f8ff",
	antiquewhite: "faebd7",
	aqua: "0ff",
	aquamarine: "7fffd4",
	azure: "f0ffff",
	beige: "f5f5dc",
	bisque: "ffe4c4",
	black: "000",
	blanchedalmond: "ffebcd",
	blue: "00f",
	blueviolet: "8a2be2",
	brown: "a52a2a",
	burlywood: "deb887",
	burntsienna: "ea7e5d",
	cadetblue: "5f9ea0",
	chartreuse: "7fff00",
	chocolate: "d2691e",
	coral: "ff7f50",
	cornflowerblue: "6495ed",
	cornsilk: "fff8dc",
	crimson: "dc143c",
	cyan: "0ff",
	darkblue: "00008b",
	darkcyan: "008b8b",
	darkgoldenrod: "b8860b",
	darkgray: "a9a9a9",
	darkgreen: "006400",
	darkgrey: "a9a9a9",
	darkkhaki: "bdb76b",
	darkmagenta: "8b008b",
	darkolivegreen: "556b2f",
	darkorange: "ff8c00",
	darkorchid: "9932cc",
	darkred: "8b0000",
	darksalmon: "e9967a",
	darkseagreen: "8fbc8f",
	darkslateblue: "483d8b",
	darkslategray: "2f4f4f",
	darkslategrey: "2f4f4f",
	darkturquoise: "00ced1",
	darkviolet: "9400d3",
	deeppink: "ff1493",
	deepskyblue: "00bfff",
	dimgray: "696969",
	dimgrey: "696969",
	dodgerblue: "1e90ff",
	firebrick: "b22222",
	floralwhite: "fffaf0",
	forestgreen: "228b22",
	fuchsia: "f0f",
	gainsboro: "dcdcdc",
	ghostwhite: "f8f8ff",
	gold: "ffd700",
	goldenrod: "daa520",
	gray: "808080",
	green: "008000",
	greenyellow: "adff2f",
	grey: "808080",
	honeydew: "f0fff0",
	hotpink: "ff69b4",
	indianred: "cd5c5c",
	indigo: "4b0082",
	ivory: "fffff0",
	khaki: "f0e68c",
	lavender: "e6e6fa",
	lavenderblush: "fff0f5",
	lawngreen: "7cfc00",
	lemonchiffon: "fffacd",
	lightblue: "add8e6",
	lightcoral: "f08080",
	lightcyan: "e0ffff",
	lightgoldenrodyellow: "fafad2",
	lightgray: "d3d3d3",
	lightgreen: "90ee90",
	lightgrey: "d3d3d3",
	lightpink: "ffb6c1",
	lightsalmon: "ffa07a",
	lightseagreen: "20b2aa",
	lightskyblue: "87cefa",
	lightslategray: "789",
	lightslategrey: "789",
	lightsteelblue: "b0c4de",
	lightyellow: "ffffe0",
	lime: "0f0",
	limegreen: "32cd32",
	linen: "faf0e6",
	magenta: "f0f",
	maroon: "800000",
	mediumaquamarine: "66cdaa",
	mediumblue: "0000cd",
	mediumorchid: "ba55d3",
	mediumpurple: "9370db",
	mediumseagreen: "3cb371",
	mediumslateblue: "7b68ee",
	mediumspringgreen: "00fa9a",
	mediumturquoise: "48d1cc",
	mediumvioletred: "c71585",
	midnightblue: "191970",
	mintcream: "f5fffa",
	mistyrose: "ffe4e1",
	moccasin: "ffe4b5",
	navajowhite: "ffdead",
	navy: "000080",
	oldlace: "fdf5e6",
	olive: "808000",
	olivedrab: "6b8e23",
	orange: "ffa500",
	orangered: "ff4500",
	orchid: "da70d6",
	palegoldenrod: "eee8aa",
	palegreen: "98fb98",
	paleturquoise: "afeeee",
	palevioletred: "db7093",
	papayawhip: "ffefd5",
	peachpuff: "ffdab9",
	peru: "cd853f",
	pink: "ffc0cb",
	plum: "dda0dd",
	powderblue: "b0e0e6",
	purple: "800080",
	red: "f00",
	rebeccapurple: "663399",
	rosybrown: "bc8f8f",
	royalblue: "4169e1",
	saddlebrown: "8b4513",
	salmon: "fa8072",
	sandybrown: "f4a460",
	seagreen: "2e8b57",
	seashell: "fff5ee",
	sienna: "a0522d",
	silver: "c0c0c0",
	skyblue: "87ceeb",
	slateblue: "6a5acd",
	slategray: "708090",
	slategrey: "708090",
	snow: "fffafa",
	springgreen: "00ff7f",
	steelblue: "4682b4",
	tan: "d2b48c",
	teal: "008080",
	thistle: "d8bfd8",
	tomato: "ff6347",
	turquoise: "40e0d0",
	violet: "ee82ee",
	wheat: "f5deb3",
	white: "fff",
	whitesmoke: "f5f5f5",
	yellow: "ff0",
	yellowgreen: "9acd32"
};

// main colors
export const colors = ['red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'cyan'];

export function searchSorted<T>(arr: T[], value: T) {
	for (let i = 0; i < arr.length; i++) {
		if (value < arr[i]) {
			return i;
		}
	}
	return arr.length;
}

export function colorToRGBA(color: string) {
	// Returns the color as an array of [r, g, b, a] -- all range from 0 - 255
	// color must be a valid canvas fillStyle. This will cover most anything
	// you'd want to use.
	// Examples:
	// colorToRGBA('red')	# [255, 0, 0, 255]
	// colorToRGBA('#f00')	# [255, 0, 0, 255]
	const cvs = document.createElement('canvas');
	cvs.height = 1;
	cvs.width = 1;
	const ctx = cvs.getContext('2d')!;
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	return ctx.getImageData(0, 0, 1, 1).data;
}

function byteToHex(num: number) {
	// Turns a number (0-255) into a 2-character hex number (00-ff)
	return ('0' + num.toString(16)).slice(-2);
}

export function hexStringToNumber(color: string) {
	return parseInt(color, 16);
}

export function colorToHex(color: string) {
	// Convert any CSS color to a hex representation
	// Examples:
	// colorToHex('red')            # '#ff0000'
	// colorToHex('rgb(255, 0, 0)') # '#ff0000'
	const rgba = colorToRGBA(color);
	const hex = [0, 1, 2].map((idx) => byteToHex(rgba[idx])).join('');
	return "#" + hex;
}

export function colorAnyToHex(color: string): string {
	const hex = colorNames[color];
	if (hex) {
		return hex;
	} else if (color.startsWith('#')) {
		return color.slice(1);
	}
	return '';
}

function componentToHex(c: number) {
	const hex = c.toString(16);
	return hex.length === 1 ? "0" + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number) {
	return componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function colorAnyToHexNumber(color: string): number {
	let hex = colorNames[color];
	if (hex) {
		if (hex.length === 3) {
			hex = hex.split('')
				.map((h) => h + h)
				.join('');
		}
		return parseInt(hex, 16);
	} else if (color.startsWith('#')) {
		// if three-digit number,
		// double each number to get the hex.
		color = color.slice(1);
		if (color.length === 3) {
			color = color.split('')
				.map((h) => h + h)
				.join('');
		}
		return parseInt(color, 16);
	}
	return 0X000000;
}

export function copyClipboard(newClip: string) {
	navigator.clipboard.writeText(newClip).then(() => {
		/* clipboard successfully set */
	}, () => {
		/* clipboard write failed */
	});
}

export function pasteClipboard(): Promise<string> {
	return navigator.clipboard.readText();
}

/**
 * Compute IOU between two boxes sorted as [l, t, r, b]
 * @param box1 Coordinates of the first box
 * @param box2 Coordinates of the second boxe
 */
export function intersectionOverUnion(box1: number[], box2: number[]) {
	const xmin1 = Math.min(box1[0], box1[2]);
	const ymin1 = Math.min(box1[1], box1[3]);
	const xmax1 = Math.max(box1[0], box1[2]);
	const ymax1 = Math.max(box1[1], box1[3]);

	const xmin2 = Math.min(box2[0], box2[2]);
	const ymin2 = Math.min(box2[1], box2[3]);
	const xmax2 = Math.max(box2[0], box2[2]);
	const ymax2 = Math.max(box2[1], box2[3]);

	const area1 = (ymax1 - ymin1) * (xmax1 - xmin1);
	const area2 = (ymax2 - ymin2) * (xmax2 - xmin2);
	if (area1 <= 0 || area2 <= 0) {
		return 0.0;
	}
	const intersectionYmin = Math.max(ymin1, ymin2);
	const intersectionXmin = Math.max(xmin1, xmin2);
	const intersectionYmax = Math.min(ymax1, ymax2);
	const intersectionXmax = Math.min(xmax1, xmax2);

	const intersectionArea =
		Math.max(intersectionYmax - intersectionYmin, 0.0) *
		Math.max(intersectionXmax - intersectionXmin, 0.0);

	return intersectionArea / (area1 + area2 - intersectionArea);
}

export const isEqual = (value: any, other: any) => {

	// Get the value type
	const type = Object.prototype.toString.call(value);

	// If the two objects are not the same type, return false
	if (type !== Object.prototype.toString.call(other)) return false;

	// If items are not an object or array, return false
	if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

	// Compare the length of the length of the two items
	const valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
	const otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
	if (valueLen !== otherLen) return false;

	// Compare two items
	const compare = (item1: any, item2: any) => {

		// Get the object type
		const itemType = Object.prototype.toString.call(item1);

		// If an object or array, compare recursively
		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
			if (!isEqual(item1, item2)) return false;
		}
		// Otherwise, do a simple comparison
		else {
			// If the two items are not the same type, return false
			if (itemType !== Object.prototype.toString.call(item2)) return false;

			// Else if it's a function, convert to a string and compare
			// Otherwise, just compare
			if (itemType === '[object Function]') {
				if (item1.toString() !== item2.toString()) return false;
			} else {
				if (item1 !== item2) return false;
			}
		}
		// TODO: understand why original value is false
		return true;
	};
	// Compare properties
	if (type === '[object Array]') {
		for (let i = 0; i < valueLen; i++) {
			if (compare(value[i], other[i]) === false) return false;
		}
	} else {
		for (const key in value) {
			if (value.hasOwnProperty(key)) {
				if (compare(value[key], other[key]) === false) return false;
			}
		}
	}
	// If nothing failed, return true
	return true;
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
export function shuffle(a: any[]) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

//////////// segmentation mask to polygons
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

export class BlobExtractor2d {

	private width: number;
	private height: number;
	private augW: number;
	private augH: number;
	private max: number;
	private pos: number[];

	private withExtrema = false;
	private extrema: number[]

	private augData: number[];
	public blobs: Map<number, RegBlob> = new Map();
	public label: number[];
	private augLabel: number[];

	static BACKGROUND = null;
	static UNSET = -1;
	static MARKED = -2;
	static CONNEXITY = 4;

	public targetId: number;

	constructor(data: number[], width: number, height: number, augData?: number[], vertexExtrema?: number[]) {
		this.width = width;
		this.height = height;
		this.augW = width + 2;
		this.augH = height + 2
		data = data || [];
		let [xMin, yMin, xMax, yMax] = [0, 0, 0, 0]
		if (vertexExtrema) {
			[xMin, yMin, xMax, yMax] = vertexExtrema
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

		if (augData)
			this.augData = augData;
		else
			this.augData = this.addBorders(data);

		if (vertexExtrema)
			this.extrema = [xMin, yMin + 1, xMax + 2, yMax + 1];

		this.augLabel = new Array(this.max);
		this.targetId = 0;
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
						augData[i] = BlobExtractor2d.BACKGROUND;
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
						augData[i] = BlobExtractor2d.BACKGROUND;
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

			if (this.augData[T] === this.targetId)
				return { T, q };

			this.augLabel[T] = BlobExtractor2d.MARKED;
			if (BlobExtractor2d.CONNEXITY === 8)
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
		if (BlobExtractor2d.CONNEXITY === 8)
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
			if (BlobExtractor2d.CONNEXITY === 4) {
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
			if (BlobExtractor2d.CONNEXITY === 8)
				p = (q + 5) % 8;
			else
				p = (q + 6) % 8;

			tmp = this.tracer(T, p);

			if (BlobExtractor2d.CONNEXITY === 4)
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
	public extract(targetId: number, needLabel: boolean = false) {
		this.targetId = targetId;
		for (let i = this.extrema[0]; i <= this.extrema[2]; i++) {
			for (let j = this.extrema[1]; j <= this.extrema[3]; j++) {
				const posi = i + j * this.augW;
				this.augLabel[posi] = BlobExtractor2d.UNSET;
			}
		}
		let c = 0;
		let y = this.extrema[1];
		do {
			let x = this.extrema[0];
			do {
				const offset = y * this.augW + x;
				// We skip white pixels or previous labeled pixels
				if (this.augData[offset] !== this.targetId)
					continue;

				// Step 1 - P not labelled, and above pixel is white
				if (this.augData[offset - this.augW] !== this.targetId && this.augLabel[offset] === BlobExtractor2d.UNSET) {
					// P must be external contour
					this.blobs.set(c, new RegBlob(c));
					const [contour, nbPixels] = this.contourTracing(offset, c, true);
					this.blobs.get(c)!.contours.push(contour);
					this.blobs.get(c)!.nbPixels += nbPixels;
					c++;
				}

				// Step 2 - Below pixel is white, and unmarked
				if (this.augData[offset + this.augW] !== this.targetId && this.augLabel[offset + this.augW] === BlobExtractor2d.UNSET) {
					// Use previous pixel label, unless this is already labelled
					let n = this.augLabel[offset - 1];
					if (this.augLabel[offset] !== BlobExtractor2d.UNSET)
						n = this.augLabel[offset];

					// P must be a internal contour
					const [contour, nbPixels] = this.contourTracing(offset, n, false);
					const b = this.blobs.get(n);
					if (b) {
						b.contours.push(contour);
						b.nbPixels += nbPixels;
					}
				}
				// Step 3 - Not dealt within previous two steps
				if (this.augLabel[offset] === BlobExtractor2d.UNSET) {
					const n = this.augLabel[offset - 1] || 0;
					// Assign P the value of N
					this.augLabel[offset] = n;
					const b = this.blobs.get(n);
					if (b) { b.nbPixels += 1; }
				}

			} while (x++ <= this.extrema[2]);
		} while (y++ <= this.extrema[3]);

		if (needLabel) {
			for (let x2 = 0; x2 < this.width; x2++) {
				for (let y2 = 0; y2 < this.height; y2++) {
					const offset = x2 + y2 * this.width
					this.label[offset] = this.augLabel[offset + this.width + 2 * y2 + 3]
				}
			}
		}
	}
}

/**
 * Convert an array of points stored using row order into an array of pixels (pixel format : {x:x_value, y:y_value})
 * @param indexes an array of points stored row order, indexes[0] => x=0,y=0, indexes[1] => x=1,y=0, ...
 * @param width the width of the image
 */
export function convertIndexToDict(indexes: number[], width: number): [number, number][] {
	return indexes.map((idx) => {
		const y = ((idx / width | 0) / 1.01);
		const x = ((idx % width) / 1.01);
		return [x, y];
	});
}


//// polygon simplifier
/**
 * Square distance between 2 points
 * @param p1
 * @param p2
 */
function getSqDist(p1: [number, number], p2: [number, number]) {
	const dx = p1[0] - p2[0];
	const dy = p1[1] - p2[1];
	return dx * dx + dy * dy;
}

/**
 * Square distance from a point to a segment
 * @param p Point
 * @param p1 Point 1 of segment
 * @param p2 Point 2 of segment
 */
function getSqSegDist(p: [number, number], p1: [number, number], p2: [number, number]) {
	let [x, y] = p1;
	let dx = p2[0] - x;
	let dy = p2[1] - y;
	if (dx !== 0 || dy !== 0) {
		const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
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

/**
 * Basic distance-based simplification
 * @param points Array of points
 * @param sqTolerance
 */
function simplifyRadialDist(points: [number, number][], sqTolerance: number) {

	let prevPoint = points[0];
	const newPoints = [prevPoint];
	let point: [number, number] = [-1, -1];

	for (point of points) {
		if (getSqDist(point, prevPoint) > sqTolerance) {
			newPoints.push(point);
			prevPoint = point;
		}
	}
	if (prevPoint !== point) newPoints.push(point);

	return newPoints;
}

/**
 * Simplify polygon
 * @param points Array of points
 * @param first
 * @param last
 * @param sqTolerance
 * @param simplified
 */
function simplifyDPStep(points: [number, number][], first: number, last: number, sqTolerance: number, simplified: number[][]) {
	let maxSqDist = sqTolerance;
	let index: number = -1;

	for (let i = first + 1; i < last; i++) {
		const sqDist = getSqSegDist(points[i], points[first], points[last]);

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
function simplifyDouglasPeucker(points: [number, number][], sqTolerance: number) {
	const last = points.length - 1;
	const simplified = [points[0]];
	simplifyDPStep(points, 0, last, sqTolerance, simplified);
	simplified.push(points[last]);
	return simplified;
}

/**
 * Simplify polygon
 * @param points Array<[number, number]> input points
 * @param tolerance number
 * @param highestQuality
 */
export function simplify(points: [number, number][], tolerance: number = 1, highestQuality: boolean = false) {

	if (points.length <= 2) return points;

	const sqTolerance = tolerance * tolerance;
	points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
	points = simplifyDouglasPeucker(points, sqTolerance);

	return points;
}

export function checkPathExists(path: string) {
	const xhr = new XMLHttpRequest();
	xhr.open('HEAD', path, false);
	xhr.send();

	if (xhr.status === 404) {
		return false;
	} else {
		return true;
	}
}

/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

export interface Geometry {
	// flatten coordinates of the object
	vertices: number[];
	// edges: [[0,1],[0,2]...]
	edges?: [number, number][];
	// edges: [true,false...]
	visibles?: boolean[];
	// geometry type: 'rectangle'
	type: string;
	// dimension
	dim?: number;
	// in case of multi polygon
	mvertices?: number[][];
	// in case of polygon
	isOpened?: boolean;
}

export interface ShapeData {
	// unique id
	id: string;
	// geometry of the shape
	geometry: Geometry;
	// color
	color?: string;
	// category string
	category?: string;
}


export interface KeyShapeData {
	geometry: Geometry;
	// Is next instances of track visible
	// Undefined means not hidden
	isNextHidden?: boolean;
	// Temporary track (specific to a frame) properties (eg posture)
	labels: { [key: string]: any };
	// Image index
	timestamp: number;
}

export interface TrackData {
	id: string;
	// Mapping between timestamps and their corresponding
	// track instances.
	// JavaScript will convert the integer timestamp to a string
	// Values still accessible though an int key, but remember
	// to cast to number if you want to get the keys timestamps.
	// e.g: const a = {2300: "Some value"};
	// > test[2300] === test["2300"] # true
	// > Object.keys(test) # ["2300"]
	keyShapes: { [key: number]: KeyShapeData };
	category: string;
	// permanent properties
	labels: { [key: string]: any };
}
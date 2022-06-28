/**
 * Useful functions for video.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */


import { ShapeData, TrackData } from './types'

/**
 * Key generator
 * @return a random key
 */
export function generateKey() {
	return Math.random().toString(36)
}

/**
 * Get key shape at a given frame index
 * @param track the track
 * @param fIdx the frame index
 * @return the key shape if exist, undefined otherwise
 */
export function getKeyShape(track: TrackData, fIdx: number): ShapeData | undefined {
	const shape = getShape(track, fIdx);
	if (shape){
		return shape.createdBy==='manual' ? shape : undefined;
	}
	// if (track.shapes[fIdx] !== undefined){
	// 	if(track.shapes[fIdx].createdBy=="manual")
	// 		return track.shapes[fIdx]
	// }
	return undefined;
	// return track && track.shapes[fIdx].createdBy=="manual" ? track.shapes[fIdx] : undefined;
}

/**
 * Set key shape at a given frame index
 * @param track the track
 * @param fIdx the frame index
 * @param shape the shape to add
 * @param key if the shape is a key shape (by default true)
 */
 export function setShape(track: TrackData, fIdx: number, shape: ShapeData, key: boolean=true) {
	track.shapes[fIdx] = shape;
	if(key){
		track.shapes[fIdx].createdBy = "manual";
	}
	else{
		track.shapes[fIdx].createdBy = "auto";
	}
}

/**
 * Get length of a track
 * @param track the track
 * @return the number of shapes for this track
 */
export function getNumShapes(track: TrackData): number {
	return Object.keys(track.shapes).length;
}

/**
 * Check if track has a key shape at given frame index
 * @param track the track
 * @param fIdx the frame index
 * @return True if the track ahs a key shpe at this frame
 */
export function isKeyShape(track: TrackData, fIdx: number): boolean {
	if (track.shapes.hasOwnProperty(fIdx)){
		return track.shapes[fIdx].createdBy==="manual";
	}
	return false;
}

/**
 * Get closest key frames ids (max and min bounds) for a specific frame index
 * @param track the track where the search happens
 * @param timestamp the frame timestamp
 * @param key if the shape is a key shape (by default true)
 * @return Previous (-1 if does not exist) and next (infinity) frame index
 */
export function getClosestFrames(track: TrackData, timestamp: number, key: boolean = true): number[] {
	let less = -1;
	let greater = Infinity;
	var iskey = true;

	for (const k of Object.keys(track.shapes)) {
		const f = parseInt(k,10);
		if (key){
			var iskey = track.shapes[f].createdBy==='manual';
		}		
		if (f < timestamp && f > less && iskey) {
			less = f;
		}
		else if (f > timestamp && f < greater && iskey) {
			greater = f;
		}
	}
	return [less, greater]
}

/**
 * Get shape at a given frame index
 * @param track the track
 * @param timestamp the frame index
 * @return the shape if exist, undefined otherwise
 */
export function getShape(track: TrackData, timestamp: number): ShapeData | null {
	return track ? track.shapes[timestamp]: null;
}
// export function getShape(track: TrackData, timestamp: number): ShapeData | undefined {
// 	return track ? track.keyShapes[fIdx] : undefined;
// }

/**
 * Interpolate shape from closest key frames bounding boxes
 * @param track the track processed
 * @param fId the frame timestamp where interpolation takes place
 */
 export function interpolate(track: TrackData, timestamp: number): {shape : ShapeData | undefined, isLast?: boolean} {
	// Search for bounds
   const [id1, id2] = getClosestFrames(track, timestamp);

	const s1 = getShape(track, id1);
	const s2 = getShape(track, id2);

	// No previous frame, asking for shape before previous track trame
	if (!s1 && !s2) {
		return { shape: undefined };
	} else if(s1 && !s2){
		// Make a deep copy of previous shape
		const newKS = JSON.parse(JSON.stringify(s1)) as ShapeData;
		// newKS.timestamp = timestamp;
		return { shape: newKS, isLast: timestamp > id1 };
	} else if(!s1 && s2){
		// Make a deep copy of previous shape
		const newKS = JSON.parse(JSON.stringify(s2)) as ShapeData;
		// newKS.timestamp = timestamp;
		return { shape: newKS, isLast: timestamp > id2 };
	} else {
		// Make a deep copy of previous shape
		const newKS = JSON.parse(JSON.stringify(s1)) as ShapeData;
		// Interpolation case
		const w = (timestamp - id1) / (id2 - id1)
		const len_newKS = newKS.geometry.vertices.length;
		for (let i = 0; i < len_newKS; i++) {
			newKS.geometry.vertices[i] = (1 - w) * s1!.geometry.vertices[i] +
				w * s2!.geometry.vertices[i]
		}
		return { shape: newKS };
	}
}

/**
 * Cpoy shape from closest key frames bounding boxes
 * @param track the track processed
 * @param fId the frame timestamp where interpolation takes place
 */
 export function copyShape(track: TrackData, timestamp: number): ShapeData | null {
	if (timestamp < 0)
		return null;
	
	// Search for bounds
   const [id1, id2] = getClosestFrames(track, timestamp, false);
   const s1 = getShape(track, id1);
   const s2 = getShape(track, id2);
   // No previous frame, asking for shape before previous track trame
   if (s1) {
	   // Make a deep copy of previous shape
		const newKS = JSON.parse(JSON.stringify(s1)) as ShapeData;
		// newKS.timestamp = timestamp;
		return newKS;
   }
   else if (s2){
	   // Make a deep copy of next shape
		const newKS = JSON.parse(JSON.stringify(s2)) as ShapeData;
		// newKS.timestamp = timestamp;
		return newKS;
   }
   else return null;
}

export function deleteShape(track: TrackData, fIdx: number) {
	const ks = getShape(track, fIdx);
	if (ks) {
		// If shape to remove is a key one, remove it
		delete track.shapes[fIdx];
		return true;
	} else {
		// Otherwise get previous frame shape 
		const prevKS = getShape(track, fIdx - 1);
		if (prevKS) {
			setShape(track, fIdx - 1, prevKS);
			return true;
		}
	}
	return false;
}

/**
 * Remove keyshape from track
 * @param t
 */
export function removeOrAddKeyShape(t: TrackData, fIdx: number) {
	if (isKeyShape(t, fIdx)) {
		deleteShape(t, fIdx);
	} else {
		const shape = getShape(t, fIdx);
		if (shape) {
			setShape(t, fIdx, shape)			
		}
	}
}

/**
 * Switch two tracks at given timestamp.
 * @param tracks tracks to be switched
 */
export function switchTrack(tracks: { [key: string]: TrackData }, t1Id: string, t2Id: string, fIdx: number) {
	const [t1, t2] = [tracks[t1Id], tracks[t2Id]];
	const indexes1 = [...Object.keys(t1.shapes)].map(Number);
	const indexes2 = [...Object.keys(t2.shapes)].map(Number);
	// create keyshape for current frame and previous frame
	// if not already exists
	indexes1.forEach((idx) => {
		const s1 = getShape(t1, idx);
		if (!s1) {
			// split is asked outside track boundaries
			return;
		}
		s1.timestamp = idx;
		t1.shapes[idx] = s1;
	});
	indexes2.forEach((idx) => {
		const s2 = getShape(t2, idx);
		if (!s2) {
			// split is asked outside track boundaries
			return;
		}
		s2.timestamp = idx;
		t2.shapes[idx] = s2;
	});
	const ks1 = [...Object.values(t1.shapes)];
	const ks2 = [...Object.values(t2.shapes)];
	t1.shapes = ks1.filter((k) => k.timestamp! < fIdx)
		.concat(ks2.filter((k) => k.timestamp! >= fIdx))
		.reduce((map, obj) => ({ ...map, [obj.timestamp!]: obj }), {});
	t2.shapes = ks2.filter((k) => k.timestamp! < fIdx)
		.concat(ks1.filter((k) => k.timestamp! >= fIdx))
		.reduce((map, obj) => ({ ...map, [obj.timestamp!]: obj }), {});
}

/**
 * Merge two tracks.
 * Do the concatenation of keyshapes if the two tracks do not overlap.
 * @param tracks the set of tracks
 * @param t1Id the id of the first track
 * @param t2Id the id of the second track
 * @returns a object containing the id `trackId` of the merged track and the
 * list `keysIntersection` of the frames at which the tracks overlaps.
 * If the tracks do not overlap, `keysIntersection` is empty.
 * If the tracks overlap, an empty string is returned instead of the id
 * of the merged track.
 */
export function mergeTracks(tracks: { [key: string]: TrackData }, t1Id: string, t2Id: string) {
	let [t1, t2] = [tracks[t1Id], tracks[t2Id]];

	// check overlapping
	const keys = [
		[...Object.keys(sortDictByKey(t1.shapes))],
		[...Object.keys(sortDictByKey(t2.shapes))]
	];
	const olderTrackIdx = keys[0][0] < keys[1][0] ? 0 : 1;
	const keysIntersection = keys[0].filter(value => keys[1].includes(value));
	const isDisjoint = keysIntersection.length === 0;
	[t1, t2] = olderTrackIdx ? [t2, t1] : [t1, t2];
	// they do not overlap, concatenation of keyshapes.
	let trackId = ""
	if (isDisjoint) {
		trackId = t1.id;
		t1.shapes = { ...t1.shapes, ...t2.shapes };
		delete tracks[t2.id];
	}
	return { trackId, keysIntersection };
}

export function getNewTrackId(tracks: { [key: string]: TrackData }): string {
	return Object.keys(tracks).length !== 0 ?
		(Math.max(...Object.keys(tracks).map(Number)) + 1).toString() : '0';
}

export function convertShapes(tracks: { [key: string]: TrackData }, fIdx: number): ShapeData[] {
	const shapes: ShapeData[] = [];
	if (tracks !== undefined) {
		Object.keys(tracks).forEach((tid: string) => {
			const t = tracks[tid];
			const shape = getShape(t, fIdx);
			if (shape) {
				// hide box after last keyshape if not selected (?)
				shapes.push({
					id: tid.toString(),
					geometry: shape.geometry,
					color: trackColors[parseInt(tid,10) % trackColors.length]
				} as ShapeData);
			}
		});
	}
	return shapes;
}

/**
 * Split track into two tracks
 * @param t
 */
export function splitTrack(tId: string, fIdx: number, tracks: { [key: string]: TrackData }): TrackData {
	const t = tracks[tId];
	const newTrackId = getNewTrackId(tracks);

	const indexes = [...Object.keys(t.shapes)].map(Number);
	// create keyshape for current frame and previous frame
	// if not already exists
	indexes.forEach((idx) => {
		const s = getShape(t, idx);
		if (!s) {
			// split is asked outside track boundaries
			return;
		}
		s.timestamp = idx;
		t.shapes[idx] = s;
	});
	// create new track from future boxes
	const ks = [...Object.values(t.shapes)];
	const newTrack = {
		id: newTrackId,
		shapes: ks.filter((k) => k.timestamp! >= fIdx)
			.map((k) => ({ ...k, id: newTrackId }))
			.reduce((map, obj) => ({ ...map, [obj.timestamp!]: obj }), {}),
		category: t.category,
		labels: t.labels
	};
	tracks[newTrackId] = newTrack;
	// remove future boxes from current track
	t.shapes = ks.filter((k) => k.timestamp! < fIdx)
		.reduce((map, obj) => ({ ...map, [obj.timestamp!]: obj }), {});
	// t.shapes[fIdx - 1].isNextHidden = true;
	return newTrack;
}

/**
 * Renumber a track
 * @param tIdPrevious previous track id
 * @param tIdNew new track id
 * @param tracks the track set
 */
 export function renumberTrack(tIdPrevious: string, tIdNew: string, tracks: { [key: string]: TrackData }): TrackData {
	const t = tracks[tIdPrevious];
	const ks = [...Object.values(t.shapes)];
	const newTrack = {
		id: tIdNew,
		shapes: ks.map((k) => ({ ...k, id: tIdNew }))
			.reduce((map, obj) => ({ ...map, [obj.timestamp!]: obj }), {}),
		category: t.category,
		labels: t.labels
	};
	tracks[tIdNew] = newTrack;
	delete tracks[tIdPrevious];
	return newTrack;
}

// /**
//  * Switch visibility of current shape.
//  */
// export function switchVisibility(t: TrackData, tIdx: number) {
// 	const prevShape = getShape(t, tIdx - 1).keyshape;
// 	if (!prevShape) {
// 		return;
// 	}
// 	if (prevShape.isNextHidden) {
// 		// set visibility to true
// 		const currShape = getShape(t, tIdx).keyshape;
// 		if (currShape) {
// 			currShape.isNextHidden = false;
// 			if (!isKeyShape(t, tIdx)) {
// 				t.keyShapes[tIdx] = currShape;
// 			}
// 		}
// 		prevShape.isNextHidden = false;
// 	} else {
// 		// create one on previous frame if not exist
// 		// set previous keyshape isNextHidden to true
// 		// remove current keyshape
// 		if (!isKeyShape(t, tIdx - 1)) {
// 			t.keyShapes[tIdx - 1] = prevShape;
// 		}
// 		prevShape.isNextHidden = true;
// 		delete t.keyShapes[tIdx];
// 	}
// }

/**
 * Sort dictionary key-value by key.
 * Key is a string to cast in int.
 * @param dict object
 */
export function sortDictByKey(dict: { [key: string]: any }): { [key: string]: any } {
	const sortedArr: [string, any][] = [...Object.entries(dict)].sort(([a], [b]) => parseInt(a,10) - parseInt(b,10));
	return sortedArr.reduce((o, val) => { o[val[0]] = val[1]; return o; }, {} as { [key: string]: any });
}

// export const trackColors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan'];
export const trackColors = ['#ff1100', '#ff867d', '#ffe0de', '#a89594', '#ad514c', '#ad0900', '#610500', '#59302e', '#61504f',
	'#ff9500', '#ffc778', '#ffe0ad', '#b36f00', '#b38d50', '#5e3e0b', '#fffb00', '#8f8d00', '#f2f188',
	'#6fff00', '#ceffa8', '#3c8a00', '#173600', '#5f8544', '#00ffcc', '#00997a', '#004a3b', '#409483',
	'#00b7ff', '#0077a6', '#004b69', '#96e1ff', '#3c7f99', '#002aff', '#001891', '#2a387d', '#7a91ff',
	'#4400ff', '#230085', '#15014d', '#533b96', '#b296ff', '#895eff', '#ff00fb', '#850083', '#360035',
	'#fc95fb', '#8f278e', '#a86da8', '#873587', '#ff0062', '#bf2e66', '#73002c'];

function colorComponentToHex(c: number) {
	const hex = c.toString(16);
	return hex.length === 1 ? "0" + hex : hex;
}

export function invertColor(rgb: string) {
	rgb = rgb.substring(1);
	const r = 255 - parseInt(rgb.substring(0, 2), 16)
	const g = 255 - parseInt(rgb.substring(2, 4), 16)
	const b = 255 - parseInt(rgb.substring(4, 6), 16)
	return "#" + colorComponentToHex(r) + colorComponentToHex(g) + colorComponentToHex(b)
}

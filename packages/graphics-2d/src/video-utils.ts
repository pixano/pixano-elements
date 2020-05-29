/**
 * Useful functions for video.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */


import { KeyShapeData, TrackData } from './types'

/**
 * Key generator
 * @return a random key
 */
export function generateKey() {
    return Math.random().toString(36).substring(7)
}

/**
 * Get key shape at a given frame index
 * @param track the track 
 * @param fIdx the frame index
 * @return the key shape if exist, undefined otherwise
 */
export function getKeyShape(track: TrackData, fIdx: number): KeyShapeData | undefined {
    return track.keyShapes[fIdx];
}

/**
 * Get key shape at a given frame index
 * @param track the track 
 * @param fIdx the frame index
 * @param shape the shape  to add
 */
export function setKeyShape(track: TrackData, fIdx: number, shape: KeyShapeData) {
    track.keyShapes[fIdx] = shape;
}

/**
 * Get length of a track
 * @param track the track 
 * @return the number of key shapes for this track
 */
export function getNumKeyShapes(track: TrackData): number {
    return Object.keys(track.keyShapes).length;
}

/**
 * Check if track has a key shape at given frame index
 * @param track the track 
 * @param fIdx the frame index
 * @return True if the track ahs a key shpe at this frame
 */
export function isKeyShape(track: TrackData, fIdx: number): boolean {
    return track.keyShapes.hasOwnProperty(fIdx);
}

/**
 * Get closest key frames ids (max and min bounds) for a specific frame index
 * @param track the track where the search happens
 * @param fIdx the frame index
 * @return Previous (-1 if does not exist) and next (infinity) frame index
 */
export function getClosestFrames(track: TrackData, fIdx: number): number[] {
    let less = -1;
    let greater = Infinity;
  
    for (const k of Object.keys(track.keyShapes)) {
        const f = parseInt(k);
        if (f < fIdx && f > less){
            less = f;
        }
        else if (f > fIdx && f < greater){
            greater = f;
        }     
    }
    return [less, greater]
}

/**
 * Interpolate shape from closest key frames bounding boxes
 * @param track the track processed
 * @param fId the frame index where interpolation takes place
 */
export function getShape(track: TrackData, fId: number) : KeyShapeData | undefined{
    if (fId < 0)
        return undefined;

    // If requested shape is a key one return it
    const ks = getKeyShape(track, fId);
    if (ks)
        return ks;
    
    // Search for bounds
    const [id1, id2] = getClosestFrames(track, fId);
    const s1 = getKeyShape(track, id1);

    // No previous frame, asking for shape before previous track trame
    if (!s1)
    {
        // console.log('@@ no shape')
        return undefined;
    } 
    
    // Make a copy of previous shape      
    const newKS = JSON.parse(JSON.stringify(s1));
    newKS.id = generateKey();
    newKS.timestamp = fId;

    // No next frame, asking for shape after last track frame return last one
    const s2 = getKeyShape(track, id2);
    if (!s2) {
        // console.log('@@ prev frame', newKS)
        return newKS; 
    }

    // Interpolation case
    const w = (fId - id1) / (id2 - id1)
    for(let i = 0; i < 4; i++){
        newKS.geometry.vertices[i] = (1 - w) * s1.geometry.vertices[i] + 
                                          w  * s2.geometry.vertices[i]
    }
    // console.log('@@ interpolation between', id1, id2, newKS)
    return newKS;
}  

/**
 * Get shape at a given frame index
 * @param track the track 
 * @param fIdx the frame index
 * @return true if delete is successfull
 */
export function deleteShape(track: TrackData, fIdx: number) {
    const ks = getKeyShape(track, fIdx);
    if (ks)
    {
        // If shape to remove is a key one, remove it
        delete track.keyShapes[fIdx];
        return true;
    } else {
        // Otherwise get previous frame shape and set interpNext to false
        const prevKS = getShape(track, fIdx-1);
        if (prevKS) {
            prevKS.interpNext = false;
            setKeyShape(track, fIdx-1, prevKS);
            return true;
        }
    }
    return false;
}
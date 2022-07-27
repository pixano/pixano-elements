/**
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2022)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */


export interface annotation {
	id: string;// unique id inside this input
	category: string;// classname
	geometry: {},//geometry definition is element dependent
	labels: {};//optionnal lables associated to this annotation
	timestamp?: number;// is only present for sequences, it indicates the frame number for a sequence of images and the real timestamp (format/unit TO BE DETERMINED) for videos.
	tracknum?: number;// is only present for sequences, it indicates the track number when the annotation is part of a track. Each tracknum is unique inside a sequence.
	origin?: {
		taskname?: string;// name of the task used to create this annotation
		createdBy?: "manual" | "interpolation" | "inference";// who created this annotation
	},
};


/**
 * Class for managing annotations
 */
export class Annotations {

	public isSequence: boolean = false;
	public currentFrameIdx: number = 0;
	public sequence_annotations = new Array<Array<annotation>>();//overall annotations: each image of the sequence has its own annotations array. If this is not a sequence, only sequence_annotations[0] will be used.
	protected selectedIds = new Array<string>();

	init() {
		this.sequence_annotations = [];
		this.selectedIds = [];// don't asign directly : always use this.setSelectedIds(...)
	}

	get() {
		return this.sequence_annotations[this.currentFrameIdx];
	}

	/**
	 * Set annotations: previous annotations will be overwritten
	 * @param {Object} newAnnotations
	 * @param {Object} frameIdx: the frame index (only used for sequences). If frameIdx is not given, the current index will be used
	 */
	setAnnotations(newAnnotations: Array<annotation>, frameIdx?: number) {
		if (typeof frameIdx === 'undefined') this.sequence_annotations[this.currentFrameIdx] = newAnnotations;
		else this.sequence_annotations[frameIdx] = newAnnotations;
	}
	/**
	 * Set selected IDs and adapt attribute picker
	 * @param newIds: ids to select
	 */
	setSelectedIds(newIds: Array<string>) {
		if (!newIds) newIds=[];
		this.selectedIds = newIds;
	}
	/**
	 * Get selected IDs
	 */
	get getSelectedIds() {
		return this.selectedIds;
	}

	/**
	 * Get an annotation given its id
	 * @param id: id of the annotation to search for
	 * @return the corresponding annotation or undefined if not found
	 */
	getAnnotationByID(id: string) {
		const annotations = this.sequence_annotations.find( (annotations) => annotations.find( (a: annotation) => (a.id === id) ) );//we assume ids are unique in the whole sequence
		if (annotations) return annotations.find( (a: annotation) => (a.id === id) );
		else return undefined;
	}

	/**
	 * Get an annotation given its tracknum
	 * @param tracknum: tracknum of the annotation to search for
	 * @return the corresponding annotation or undefined if not found
	 */
	getAnnotationsByTracknum(tracknum: number) {
		let annots: Array<annotation> = [];
		this.sequence_annotations.forEach((annotations) => {
			const annotation = annotations.find( (a: annotation) => (a.tracknum === tracknum) );//only one track y timestamp
			if (annotation) annots.push(annotation);
		});
		return annots;
	}

	/**
	 * Delete an annotation given its id
	 * @param id: id of the annotation to delete
	 */
	deleteAnnotation(id: string) {
		const annot = this.getAnnotationByID(id);
		if (!annot) {
			console.error("getAnnotationByID failed !!");
			return;
		}
		const annotations = this.sequence_annotations.find( (annotations) => annotations.find( (a: annotation) => (a.id === id) ) );//we assume ids are unique in the whole sequence
		if (annotations) annotations.splice(annotations.indexOf(annot), 1);
	}


}

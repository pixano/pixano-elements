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
	public annotations = new Array<annotation>();//current annotations, i.e. annotations of the current frame
	public sequence_annotations = new Array();//overall annotations: each image of the sequence has its own annotations array
	protected selectedIds = new Array<string>();

	init() {
		this.annotations = [];
		this.sequence_annotations = [];
		this.selectedIds = [];// don't asign directly : always use this.setSelectedIds(...)
	}

	/**
	 * Set annotations: previous annotations will be overwritten
	 * @param {Object} newAnnotations
	 * @param {Object} frameIdx: the frame index (only used for sequences)
	 */
	setAnnotations(newAnnotations: Array<annotation>, frameIdx?: number) {
		console.log("prev nnotation=",this.annotations);
		console.log("newAnnotation=",newAnnotations);
		this.annotations = newAnnotations;
		if (this.isSequence) {
			if (typeof frameIdx === 'undefined') {
				console.error("should never happen");
				return;
			}
			this.sequence_annotations[frameIdx] = newAnnotations;
		}
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
	 * Get annotations given its id
	 * @param id: id of the annotation to search for
	 * @return the corresponding annotation or undefined if not found
	 */
	getAnnotationByID(id: string) {
		if (this.isSequence) {
			const annots = this.sequence_annotations.find( (annots) => annots.find( (a: annotation) => (a.id === id) ) );//we assume ids are unique in the whole sequence
			if (annots) return annots.find( (a: annotation) => (a.id === id) );
			else return undefined;
		} else {
			return this.annotations.find( (a) => (a.id === id) );
		}
	}

}

# `Serverless Demo`

This demo serves all plugins available in Pixano in a serverless application. Choose the plugin you want to use, click on _START ANNOTATING_.

... image url

Run the following commands to build and run this demo as a standalone application:

```
npm install
npm run build
npx serve
```

In case of errors when loading elements, rebuild the dependencies :// TODO : see if something easier is possible...
```
rm -rf node_modules/ package-lock.json
npm i
npm i
npm run build
cd ..
npm run bootstrap ; npm i ; npm run bootstrap
npm run build
cd -
npm run build
npx serve
```

# technical documentation
## documentation on annotation/export formats
/* les éléments créent et gèrent les objets, attributePicker gère leurs propriétés/attributs */
/* chaque objet = annotation a un id, une catégorie, une définition/géométrie/etc, des attributs/options/labels */

### TODO : harmonization of export formats => annotation V1.0
	Annotations are represented as a table of objects, each object containing an id and some data corresponding to the annotation:
	"annotations" = [ annotation1, annotation2, etc ];
	"annotation" = {
		"id": "unique id inside this input",
		"category": "classname",
		"geometry": { geometry definition is tool dependent },
		"labels": {
			"optionalParameter1": value,
			"optionalParameter2": value,
			"etc": "..."
		},
		"timestamp": value,
		"tracknum": value,
		"origin": {
			"taskname": "name of the task used to create this annotation",
			"createdBy": "manual" | "interpolation" | "inference"
		}
	};

	"geometry" definition for: (interfaces are defined in Geometry in graphics-2d/src/types.ts and in Cuboid in graphics-3d/src/types.ts)
		- classification: {}
		- keypoints: { type: "graph", vertices: [ pts ], edges: [], visibles: [ booleans ] }
		- rectangle/smart-rectangle: { type: "rectangle", vertices: [ pts ] }
		- polygon: { type: "polygon", vertices: [ pts ], isOpened: true/false }
		- segmentation/smart-segmentation: {}
			Exception for segmentation/smart-segmentation: the first annotation is: { "id": 0, "mask": "..." }
		- cuboid-editor: { "position": [ values ], size": [ values ], "heading": value }
		- tracking/smart-tracking: TO BE DETERMINED -> linked to sequences, does class tracking disapear ? or become a subclass of sequence ?
			=> représentations choisie : frame based : fait pour pouvoir servir à n'importe quoi; avantage : complètement générique => demandera une conversion, pas de labels au niveau de la piste, ou alors il faut créer un champs spécifique, mais est-ce utile ?
	"timestamp" is only present for sequences, it indicates the frame number for a sequence of images and the real timestamp (format/unit TO BE DETERMINED) for videos.
	"tracknum" is only present for sequences, it indicates the track number when the annotation is part of a track. Each tracknum is unique inside a sequence.
	"origin" and its content is optional

### Current annotation/export formats in pixano-app:
	For all plugins except tracking : "annotations" = [ annotation1, annotation2, etc ];
	For each plugin, the format of annotation is different:

	- For classification (exception: never more then one annotation for this plugin):
	"annotation": {
		"category": "classification",
		"options": { options }
	}

	- For keypoints:
	"annotation": {
		"id": "unique id inside this input",
		"geometry": {
			"vertices": [ pts ],
			"edges": [ [couples] ],
			"visibles": [ booleans ],
			"type": "graph"
		},
		"category": "name of the class",
		"options": { options }
	}

	- For rectangle/smart-rectangle:
	"annotation": {
		"id": "unique id inside this input",
		"geometry": {
			"vertices": [ pts ],
			"type": "rectangle"
		},
		"category": "name of the class",
		"options": { options }
	},
		
	- For polygon:
	"annotation": {
		"id": "unique id inside this input",
		"geometry": {
			"vertices": [ pts ],
			"type": "polygon",
			"isOpened": true/false
		},
		"category": "name of the class",
		"options": { options }
	},

	- For cuboids:
	"annotation": {
		"position": [ values ],
		"size": [ values ],
		"heading": value,
		"id": "unique id inside this input",
		"category": "name of the class",
		"options": { options }
	}
	
	- For segmentation:
		Exception for segmentation/smart-segmentation: the first annotation is: { "id": 0, "mask": "..." }
	"annotation": {
		"category": "class1",
		"options": { options },
		"id": "[1,0,1]"
	}

	In all cases, { options } are in the form of:
	"options": {
		"optionalParameter1": value,
		"optionalParameter2": value,
		"etc": "..."
	}

	- For sequences: same annotation them base class + for each "annotation":
		"timestamp": value
	Where timestamp is the frame number (and could be the real timestamp for videos).
	
	For tracking:
 	"annotations": { "0": { annotation1 }, "1": { annotation2 }, "2": { annotation3 }, etc };
	"annotation": {
		"id": "track id = unique id inside this input = video",
		"keyShapes": {
			"image num": {
				"geometry": {
					"vertices": [ pts ],
					"type": "rectangle"
				},
				"timestamp": timestamp(=image num if no timestamp),
				"labels": { optional labels }
			},
			"image num": {
				"geometry": {
					"vertices": [ pts ],
					"type": "rectangle"
				},
				"timestamp": timestamp(=image num if no timestamp),
				"labels": { optional labels }
				"id": "track id",
				"color": "a color"
			},
			etc
		},
		"category": "name of the class",
		"labels": { optional labels }
	},

	{ optional labels } are of the form as { options }.

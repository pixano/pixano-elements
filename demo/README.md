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
		}
	};

	Geometry definition for:
	- classification: {}
	- keypoints: { type: "graph", vertices: [ pts ], edges: [], visibles: [ booleans ] }
	- rectangle/smart-rectangle: { type: "rectangle", vertices: [ pts ] }
	- polygon: { type: "polygon", vertices: [ pts ], isOpened: true/false }
	- segmentation/smart-segmentation: {}
		Exception for segmentation/smart-segmentation: the first annotation is: { "id": 0, "mask": "..." }
	- cuboid-editor: { "position": [ values ], size": [ values ], "heading": value }
	- tracking/smart-tracking: TO BE DETERMINED

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

	- For cuboids :
	"annotation": {
		"position": [ values ],
		"size": [ values ],
		"heading": value,
		"id": "unique id inside this input",
		"category": "name of the class",
		"options": { options }
	}

	In all cases, { options } are in the form of:
	"options": {
		"optionalParameter1": value,
		"optionalParameter2": value,
		"etc": "..."
	}
	
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
				"labels": { optionnal labels }
			},
			"image num": {
				"geometry": {
					"vertices": [ pts ],
					"type": "rectangle"
				},
				"timestamp": timestamp(=image num if no timestamp),
				"labels": { optionnal labels }
				"id": "track id",
				"color": "a color"
			},
			etc
		},
		"category": "name of the class",
		"labels": { optionnal labels }
	},

	{ optionnal labels } are of the form as { options }.
/**
 * Tensorflow.js utils
 */
import * as tf from '@tensorflow/tfjs';
import { checkPathExists } from '@pixano/core/lib/utils';

// const MODEL_STORE_NAME = 'models_store';
// const WEIGHTS_STORE_NAME = 'model_weights';
const INFO_STORE_NAME = 'model_info_store';
const DATABASE_NAME = 'tensorflowjs';
const DATABASE_VERSION = 1;
const loadedModels: Map<string, tf.GraphModel> = new Map();

export const isModelCached = (url: string) => {

	const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
	return new Promise((resolve) => {
		openRequest.onsuccess = () => {
			try {
				const keys = openRequest.result.transaction(INFO_STORE_NAME, 'readwrite')
					.objectStore(INFO_STORE_NAME)
					.getAllKeys();
				keys.onsuccess = () => {
					resolve(keys.result.includes(url));
				}
			} catch (err) {
				// non-existent tfjs database, clean it
				indexedDB.deleteDatabase(DATABASE_NAME);
				resolve(false)
			}
		};
	});
}

export const logModelLoad = (p: number) => {
	p = Math.round(p * 100);
	if (p % 10 == 0) {
		console.info(`Model loading...${p}%`)
	}
}

export const loadGraphModel = async (url: string): Promise<tf.GraphModel | null> => {

	// check if model already loaded in memory
	const isInMemory = loadedModels.has(url);
	if (isInMemory) {
		console.info("Model already loaded.");
		return Promise.resolve(loadedModels.get(url)!);
	}
	// check if model in cache
	const isCached = await isModelCached(url);
	if (isCached) {
		console.info("Loading model from cache.");
		const model = await tf.loadGraphModel(`indexeddb://${url}`, { onProgress: logModelLoad });
		loadedModels.set(url, model);
		console.info("Model loaded.");
		return model;
	}
	// else retrieve and model
	const isUrlCorrect = checkPathExists(url);
	if (isUrlCorrect) {
		console.info("Loading model.");
		const model = await tf.loadGraphModel(url, { onProgress: logModelLoad });
		model.save(`indexeddb://${url}`);
		loadedModels.set(url, model);
		console.info("Model loaded.");
		return model;
	}
	console.warn('Unknow url', url);
	return Promise.resolve(null);
}

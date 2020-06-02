const TARGET = Symbol('target');
const UNSUBSCRIBE = Symbol('unsubscribe');
const PATH_SEPARATOR = '.';

const isArray = Array.isArray;
const isSymbol = (value: any) => typeof value === 'symbol';


interface Options {
    /**
    Deep changes will not trigger the callback. Only changes to the immediate properties of the original object.

    @default false

    @example
    ```
    import onChange = require('on-change');

    const object = {
        a: {
            b: false
        }
    };

    let i = 0;
    const watchedObject = onChange(object, () => {
        console.log('Object changed:', ++i);
    }, {isShallow: true});

    watchedObject.a.b = true;
    // Nothing happens

    watchedObject.a = true;
    //=> 'Object changed: 1'
    ```
    */
    isShallow?: boolean;

    /**
    The function receives two arguments to be compared for equality. Should return `true` if the two values are determined to be equal.

    @default Object.is

    @example
     ```
    import onChange = require('on-change');

    const object = {
        a: {
            b: false
        }
    };

    let i = 0;
    const watchedObject = onChange(object, () => {
        console.log('Object changed:', ++i);
    }, {equals: (a, b) => a === b});

    watchedObject.a.b = 0;
    // Nothing happens

    watchedObject.a = true;
    //=> 'Object changed: 1'
    ```
    */
    equals?: (a: unknown, b: unknown) => boolean;

    /**
    Setting properties as `Symbol` won't trigger the callback.

    @default false
    */
    ignoreSymbols?: boolean;

    /**
    Setting properties in this array won't trigger the callback.

    @default undefined
    */
    ignoreKeys?: Array<string|symbol>;

    /**
    Setting properties with an underscore as the first character won't trigger the callback.

    @default false
    */
    ignoreUnderscores?: boolean;

    /**
    The path will be provided as an array of keys instead of a delimited string.

    @default false
    */
    pathAsArray?: boolean;
}


const path = {
	after: (path: any, subPath: any) => {
		if (isArray(path)) {
			return path.slice(subPath.length);
		}

		if (subPath === '') {
			return path;
		}

		return path.slice(subPath.length + 1);
	},
	concat: (path: any, key: any) => {
		if (isArray(path)) {
			path = path.slice();

			if (key) {
				path.push(key);
			}

			return path;
		}

		if (key && key.toString !== undefined) {
			if (path !== '') {
				path += PATH_SEPARATOR;
			}

			if (isSymbol(key)) {
				return path + 'Symbol(' + key.description + ')';
			}

			return path + key;
		}

		return path;
	},
	initial: (path: any) => {
		if (isArray(path)) {
			return path.slice(0, -1);
		}

		if (path === '') {
			return path;
		}

		const index = path.lastIndexOf(PATH_SEPARATOR);

		if (index === -1) {
			return '';
		}

		return path.slice(0, index);
	},
	walk: (path: any, callback: any) => {
		if (isArray(path)) {
			path.forEach(callback);
		} else if (path !== '') {
			let position = 0;
			let index = path.indexOf(PATH_SEPARATOR);

			if (index === -1) {
				callback(path);
			} else {
				while (position < path.length) {
					if (index === -1) {
						index = path.length;
					}

					callback(path.slice(position, index));

					position = index + 1;
					index = path.indexOf(PATH_SEPARATOR, position);
				}
			}
		}
	}
};

const isPrimitive = (value: any) => value === null || (typeof value !== 'object' && typeof value !== 'function');

const isBuiltinWithoutMutableMethods = (value: any) => value instanceof RegExp || value instanceof Number;

const isBuiltinWithMutableMethods = (value: any) => value instanceof Date;

const isSameDescriptor = (a?: any, b?: any) => {
	return a !== undefined && b !== undefined &&
		Object.is(a.value, b.value) &&
		(a.writable || false) === (b.writable || false) &&
		(a.enumerable || false) === (b.enumerable || false) &&
		(a.configurable || false) === (b.configurable || false);
};

const shallowClone = (value: any) => {
	if (isArray(value)) {
		return value.slice();
	}

	return {...value};
};

// global variables
let proxyCache = new WeakMap();
let callbackCache = new WeakMap();

const onChange = <ObjectType extends {[key: string]: any}>(object: object, callback: (
                    this: ObjectType,
                    path: string,
                    value: unknown,
                    previousValue: unknown) => void, options: Options = {}) => {
	const proxyTarget = Symbol('ProxyTarget');
	let inApply = false;
	let changed = false;
    let applyPath: any;
    object = onChange.target(object);
	let applyPrevious: any;
	let isUnsubscribed = false;
	const equals = options.equals || Object.is;
	let propCache = new WeakMap();
	let pathCache = new WeakMap();

	const handleChange = (changePath: any, property: any, previous: any, value?: any) => {
		if (isUnsubscribed) {
			return;
		}

		if (!inApply) {
			for (const cb of [...callbackCache.get(proxy)]) {
				cb(path.concat(changePath, property), value, previous);
			}
			return;
		}

		if (inApply && applyPrevious && previous !== undefined && value !== undefined && property !== 'length') {
			let item = applyPrevious;

			if (changePath !== applyPath) {
				changePath = path.after(changePath, applyPath);

				path.walk(changePath, (key: any) => {
					item[key] = shallowClone(item[key]);
					item = item[key];
				});
			}

			item[property] = previous;
		}

		changed = true;
	};

	const getOwnPropertyDescriptor = (target: any, property: any) => {
		let props = propCache !== null && propCache.get(target);

		if (props) {
			props = props.get(property);
		}

		if (props) {
			return props;
		}

		props = new Map();
		propCache.set(target, props);

		let prop = props.get(property);

		if (!prop) {
			prop = Reflect.getOwnPropertyDescriptor(target, property);
			props.set(property, prop);
		}

		return prop;
	};

	const invalidateCachedDescriptor = (target: any, property: any) => {
		const props = propCache ? propCache.get(target) : undefined;

		if (props) {
			props.delete(property);
		}
	};

	const buildProxy = (value: any, path: any) => {
		if (isUnsubscribed) {
			return value;
		}

		pathCache.set(value, path);

		// check proxy already exists
		let proxy = proxyCache.get(value);
		if (proxy === undefined) {
            proxy = new Proxy(value, handler);
            proxyCache.set(value, proxy);
        }
		return proxy;
	};

	const unsubscribe = <ObjectType extends {[key: string]: any}>(target: ObjectType): ObjectType => {
		isUnsubscribed = true;
		propCache = null as any;
		pathCache = null as any;
		proxyCache = null as any;

		return target;
	};

	const ignoreProperty = (property: any) => {
		return isUnsubscribed ||
			(options.ignoreSymbols === true && isSymbol(property)) ||
			(options.ignoreUnderscores === true && property.charAt(0) === '_') ||
			(options.ignoreKeys !== undefined && options.ignoreKeys.includes(property));
	};

	const handler = {
		get(target: any, property: any, receiver: any) {
			if (property === proxyTarget || property === TARGET) {
				return target;
			}

			if (property === UNSUBSCRIBE &&
				pathCache !== null &&
				pathCache.get(target) === '') {
				return unsubscribe(target);
			}

			const value = Reflect.get(target, property, receiver);
			if (
				isPrimitive(value) ||
				isBuiltinWithoutMutableMethods(value) ||
				property === 'constructor' ||
				options.isShallow === true ||
				ignoreProperty(property)
			) {
				return value;
			}

			// Preserve invariants
			const descriptor = getOwnPropertyDescriptor(target, property);
			if (descriptor && !descriptor.configurable) {
				if (descriptor.set && !descriptor.get) {
					return undefined;
				}

				if (descriptor.writable === false) {
					return value;
				}
			}

			return buildProxy(value, path.concat(pathCache.get(target), property));
		},

		set(target: any, property: any, value: any, receiver: any) {
			if (value && value[proxyTarget] !== undefined) {
				value = value[proxyTarget];
			}

			const ignore = ignoreProperty(property);
			const previous = ignore ? null : Reflect.get(target, property, receiver);
			const isChanged = !(property in target) || !equals(previous, value);
			let result = true;

			if (isChanged) {
				result = Reflect.set(target[proxyTarget] || target, property, value);

				if (!ignore && result) {
					handleChange(pathCache.get(target), property, previous, value);
				}
			}

			return result;
		},

		defineProperty(target: any, property: any, descriptor: any) {
			let result = true;

			if (!isSameDescriptor(descriptor, getOwnPropertyDescriptor(target, property))) {
				result = Reflect.defineProperty(target, property, descriptor);

				if (result && !ignoreProperty(property) && !isSameDescriptor()) {
					invalidateCachedDescriptor(target, property);

					handleChange(pathCache.get(target), property, undefined, descriptor.value);
				}
			}

			return result;
		},

		deleteProperty(target: any, property: any) {
			if (!Reflect.has(target, property)) {
				return true;
			}

			const ignore = ignoreProperty(property);
			const previous = ignore ? null : Reflect.get(target, property);
			const result = Reflect.deleteProperty(target, property);

			if (!ignore && result) {
				invalidateCachedDescriptor(target, property);

				handleChange(pathCache.get(target), property, previous);
			}

			return result;
		},

		apply(target: any, thisArg: any, argumentsList: any) {
			const compare = isBuiltinWithMutableMethods(thisArg);

			if (compare) {
				thisArg = thisArg[proxyTarget];
			}

			if (!inApply) {
				inApply = true;

				if (compare) {
					applyPrevious = thisArg.valueOf();
				}

				if (isArray(thisArg) || toString.call(thisArg) === '[object Object]') {
					applyPrevious = shallowClone(thisArg[proxyTarget]);
				}

				applyPath = path.initial(pathCache.get(target));

				const result = Reflect.apply(target, thisArg, argumentsList);

				inApply = false;

				if (changed || (compare && !equals(applyPrevious, thisArg.valueOf()))) {
					handleChange(applyPath, '', applyPrevious, thisArg[proxyTarget] || thisArg);
					applyPrevious = null;
					changed = false;
				}

				return result;
			}

			return Reflect.apply(target, thisArg, argumentsList);
		}
	};

	const proxy = buildProxy(object, options.pathAsArray === true ? [] : '');
	callback = callback.bind(proxy);
	let callList = callbackCache.get(proxy);
	if (callList === undefined) {
		callbackCache.set(proxy, []);
	}
	callbackCache.get(proxy).push(callback);
	return proxy;
};

onChange.target = <ObjectType extends {[key: string]: any}>(proxy: ObjectType): ObjectType => proxy[TARGET as any] || proxy;
onChange.unsubscribe = <ObjectType extends {[key: string]: any}>(proxy: ObjectType): ObjectType => proxy[UNSUBSCRIBE as any] || proxy;

export default onChange;
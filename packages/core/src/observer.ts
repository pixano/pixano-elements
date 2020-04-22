/**
 * Various implementation of the observer programming pattern.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import onChange from 'on-change';
import { searchSorted } from './utils';

export type Observer = (op: string, ...args:any[]) => any;

// Class properties -----------------------------------------------------------

const observers = new WeakMap<object, Observer[]>();
const observersOrder = new WeakMap<object, number[]>();

/**
 * Wrap an object to make its properties observable. - Observers will be notified of
 * property changes with the property name and updated value as arguments.
 */
export function observable<T extends object>(obj: T): T {
    if (observers.has(obj)) {
        return obj;
    }
    const wrapped = onChange(obj, function (path: string, value: any) {
        // @ts-ignore
        for (const cb of [...observers.get(this)!]) {
            cb(path, value);
        }
    });
    observers.set(wrapped, []);
    observersOrder.set(wrapped, []);
    return wrapped;
}

// Set ------------------------------------------------------------------------

/**
 * Observable subclass of Set. - observers will be called:
 *  - when an element is added with arguments 'add' and the element
 *  - when an element is deleted with arguments 'delete' and the element
 *  - when the set is cleared with argument 'clear'
 */
export class ObservableSet<T> extends Set<T> {
    constructor(...args:any[]) {  // TODO: call add to initialize items
        super(...args);

        observers.set(this, []);
        observersOrder.set(this, []);
    }

    add(value: T) {
        super.add(value);
        for (const cb of [...observers.get(this)!]) {
            cb('add', value);
        }
        return this;
    }

    delete(value: T) {
        const success = super.delete(value);
        for (const cb of [...observers.get(this)!]) {
            cb('delete', value);
        }
        return success;
    }

    clear() {
        const success = super.clear();
        for (const cb of [...observers.get(this)!]) {
            cb('clear');
        }
        return success;
    }

    /**
     * Utility method to bypass multiple
     * add call on object initialize
     * @param values
     */
    set(values: T[]) {
        super.clear();
        values.forEach((v) => {
            super.add(v);
        });
        for (const cb of [...observers.get(this)!]) {
            cb('set');
        }
    }
}


// Map ------------------------------------------------------------------------

/**
 * Observable subclass of Map. - observers will be called:
 *  - when an element is set with arguments 'set' and the element
 *  - when an element is deleted with arguments 'delete' and the element
 *  - when the set is cleared with argument 'clear'
 */
export class ObservableMap<K,T> extends Map<K,T> {
    constructor(...args:any[]) {  // TODO: call add to initialize items
        super(...args);
        observers.set(this, []);
        observersOrder.set(this, []);
    }

    set(key: K, value: T) {
        super.set(key, value);
        for (const cb of [...observers.get(this)!]) {
            cb('set', value);
        }
        return this;
    }

    delete(key: K) {
        const success = super.delete(key);
        for (const cb of [...observers.get(this)!]) {
            cb('delete', key);
        }
        return success;
    }

    clear() {
        const success = super.clear();
        for (const cb of [...observers.get(this)!]) {
          cb('clear');
        }
        return success;
    }

    init(items: [K,T][]) {
        super.clear();
        for (const item of items) {
            super.set(item[0], item[1]);
        }
        for (const cb of [...observers.get(this)!]) {
            cb('init');
        }
    }
}


// Subscription ---------------------------------------------------------------

/**
 * Subscribe an observer to an observable. - Returns the observer for convenience.
 *
 * Note: If the observer must live as long as the observed object, it is
 * unecessary to unsubscribe them. Observing an object will not increase its
 * refcount or prevent garbage collection. Observers will be automatically deleted
 * along the observed.
 */
export function observe(target: object, observer: Observer, order=10): Observer {
  const _observers = observers.get(target);
  const _observersOrder = observersOrder.get(target);
  if (!_observers || !_observersOrder) {
      throw new Error("object is not observable. "
        + "If you meant to observe its properties, use `observable` first.");
  }

  const i = searchSorted(_observersOrder, order);
  _observers.splice(i, 0, observer);
  _observersOrder.splice(i, 0, order);

  return observer;
}

/**
 * - Note: unsubscribing inexistant observers is silently ignored.
 * @param obj
 * @param observer
 */
export function unobserve(target: object, observer: Observer) {
  const _observers = observers.get(target);
  const _observersOrder = observersOrder.get(target);

  if (_observers && _observersOrder) {
    const i = _observers.indexOf(observer);
    if (i >= 0) {
        _observers.splice(i, 1);
        _observersOrder.splice(i, 1);
    }
  }
}

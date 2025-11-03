//supports global <script> and paste ("StoreLib"), AMD (define), and CJS (require)
(function (root, factory) {
  const api = factory();

  // 1) Support global "StoreLib" for paste or use via <script>
  const ns = root.StoreLib || (root.StoreLib = {});
  for (const k in api) ns[k] = api[k];

  // 2) Support AMD and CJS when this is used as a module file
  if (typeof define === 'function' && define.amd) { define([], function () { return api; }); }
  else if (typeof module === 'object' && module.exports) { module.exports = api; }

})(typeof globalThis !== 'undefined' ? globalThis
  : typeof window !== 'undefined' ? window
    : typeof global !== 'undefined' ? global
      : this, function () {

        /* Reactive store
        * - get() snapshot
        * - set(value) replace
        * - patch(value) shallow merge
        * - subscribe(callback, selector) -> unsubscribe
        *
        * Mutations batch notifications on next paint via requestAnimationFrame.
        * (queueMicrotask or setTimeout are used as fallbacks for non-visual environments.)
        *
        * Subscribers receive updates only when their selected value actually changes,
        * using shallow comparison for plain objects and arrays, and Object.is for primitives.
        *
        * For safety, any failure in a callback or selector automatically unsubscribes that subscriber.
        */
        /**
         * Create a reactive store around the provided initial state.
         * @template T
         * @param {T} initialState Initial value for the store. Mutations replace or
         * merge against this value; consumers should treat it as immutable.
         * @returns {{get: () => T, set: (newState: T) => void, patch: (partial: Partial<T>) => void, subscribe: (callback: (value: any, isInit: boolean) => void, selector?: (state: T) => any) => () => void}}
         * An object exposing snapshot access, mutation helpers, and reactive subscription.
         */
        function createStore(initialState) {
          var state = initialState;
          var subscribers = new Set(); // { callback, selector, prev, active }
          var scheduled = false;
          var scheduleFn = pickScheduler();

          // get current state snapshot.
          // only stable during notifications; otherwise it is the working state.
          /**
           * Obtain the current snapshot of the store.
           * @returns {T} The latest state value. Callers must not mutate the
           * returned object directly; use the provided mutation helpers
           * instead.
           */
          function get() { return state; }

          // replace entire state and notify subscribers on next frame
          /**
           * Replace the entire state and queue notifications to subscribers.
           * @param {T} newState The new value to use for the store.
           * @returns {void}
           */
          function set(newState) {
            state = newState;
            scheduleNotify();
          }

          // shallow-merge partial state and notify on next frame
          /**
           * Perform a shallow merge with the current state and queue
           * notifications to subscribers.
           * @param {Partial<T>} partial Object containing properties to merge
           * into a shallow clone of the current state.
           * @returns {void}
           */
          function patch(partial) {
            set(Object.assign({}, state, partial));
          }

          // subscribe to changes with an optional selector
          // callback(value, isInit): isInit = true when called with the initial value (during subscribe)
          // returns an unsubscribe function (optional: use to unsubscribe early)
          /**
           * Subscribe to state changes with an optional selector function.
           * @param {(value: any, isInit: boolean) => void} callback Invoked with
           * the selected value. Receives `isInit = true` for the synchronous
           * initial call, then `false` for subsequent updates.
           * @param {(state: T) => any} [selector] A selector that derives the
           * relevant portion of the state. Defaults to the identity function.
           * The callback only fires when the selected value changes (shallow
           * comparison for arrays/objects, `Object.is` otherwise).
           * @returns {() => void} An unsubscribe function. Once invoked the
           * subscription is removed; callbacks throwing an error also cause
           * automatic unsubscription.
           */
          function subscribe(callback, selector) {
            if (!selector) selector = (x) => x;

            let prev;
            try {
              prev = selector(state);
            } catch (err) {
              console.error(err);
              throw err;
            }

            const sub = { callback: callback, selector: selector, prev: prev, active: true };
            subscribers.add(sub);

            try {
              callback(prev, true); // firstTime = true
            } catch (err) {
              console.error(err);
              unsubscribe(sub);
            }

            return () => { if (sub.active) unsubscribe(sub); };
          }

          // ---- internal helpers ----

          // explicitly remove subscriber
          function unsubscribe(sub) {
            sub.active = false;
            subscribers.delete(sub);
          }

          // schedule notification on next animation frame / microtask / timeout
          function scheduleNotify() {
            if (scheduled) return;
            scheduled = true;
            scheduleFn(runNotifications);
          }

          // choose scheduler depending on environment
          // - requestAnimationFrame: best for browser UI (frame batching)
          // - queueMicrotask: for headless or server tests (microtask batching)
          // - setTimeout: generic fallback
          function pickScheduler() {
            if (typeof requestAnimationFrame === 'function') return requestAnimationFrame;
            if (typeof queueMicrotask === 'function') return queueMicrotask;
            return (cb) => { setTimeout(cb, 0); };
          }

          // run notifications to all subscribers whose selected value changed
          function runNotifications() {
            scheduled = false;
            const snapshot = state;
            const arr = Array.from(subscribers); // snapshot iteration avoids reentrancy surprises

            for (let i = 0; i < arr.length; i++) {
              const sub = arr[i];
              if (!sub.active) continue;

              let next;
              try {
                next = sub.selector(snapshot);
              } catch (err) {
                console.error(err);
                unsubscribe(sub);
                continue;
              }

              // notify only when value actually changed
              if (valuesEqual(next, sub.prev)) continue;
              sub.prev = next;

              try {
                sub.callback(next, false); // not first time
              } catch (err) {
                console.error(err);
                unsubscribe(sub);
              }
            }
          }

          // compare snapshots to avoid unnecessary notifications
          // Object.is for primitives, shallow equality for arrays and plain objects
          function valuesEqual(a, b) {
            if (Object.is(a, b)) return true;

            // Arrays: compare length and each element with Object.is
            if (Array.isArray(a) && Array.isArray(b)) {
              if (a.length !== b.length) return false;
              for (let i = 0; i < a.length; i++) {
                if (!Object.is(a[i], b[i])) return false;
              }
              return true;
            }

            // Plain objects: compare keys and shallow values
            if (isPlainObject(a) && isPlainObject(b)) {
              const keysA = Object.keys(a);
              const keysB = Object.keys(b);
              if (keysA.length !== keysB.length) return false;
              for (let i = 0; i < keysA.length; i++) {
                const k = keysA[i];
                if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
                if (!Object.is(a[k], b[k])) return false;
              }
              return true;
            }

            // everything else (functions, dates, maps, etc.) compares by reference
            return false;

            function isPlainObject(x) {
              if (x === null || typeof x !== 'object') return false;
              const proto = Object.getPrototypeOf(x);
              return proto === Object.prototype || proto === null;
            }
          }

          // public API
          return { get: get, set: set, patch: patch, subscribe: subscribe };
        }

        // expose factory
        return { createStore: createStore };
      });

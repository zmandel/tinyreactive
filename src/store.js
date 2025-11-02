//supports global <script> and paste ("StoreLib"), AMD (define), and CJS (require)
(function (root, factory) {
  var api = factory();

  // 1) Support global "StoreLib" for paste or use via <script>
  var ns = root.StoreLib || (root.StoreLib = {});
  for (var k in api) ns[k] = api[k];

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
  function createStore(initialState) {
    var state = initialState;
    var subscribers = new Set(); // { callback, selector, prev, active }
    var scheduled = false;

    // get current state snapshot.
    // only stable during notifications; otherwise it is the working state.
    function get() { return state; }

    // replace entire state and notify subscribers on next frame
    function set(newState) {
      state = newState;
      scheduleNotify();
    }

    // shallow-merge partial state and notify on next frame
    function patch(partial) {
      set(Object.assign({}, state, partial));
    }

    // subscribe to changes with an optional selector
    // callback(value, isInit): isInit = true when called with the initial value (during subscribe)
    // returns an unsubscribe function (optional: use to unsubscribe early)
    function subscribe(callback, selector) {
      if (!selector) selector = function (x) { return x; };

      var prev;
      try {
        prev = selector(state);
      } catch (err) {
        console.error(err);
        return function () {}; // noop on failed selector
      }

      var sub = { callback: callback, selector: selector, prev: prev, active: true };
      subscribers.add(sub);

      try {
        callback(prev, true); // firstTime = true
      } catch (err) {
        console.error(err);
        unsubscribe(sub);
      }

      return function () { if (sub.active) unsubscribe(sub); };
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
      pickScheduler()(runNotifications);
    }

    // choose scheduler depending on environment
    // - requestAnimationFrame: best for browser UI (frame batching)
    // - queueMicrotask: for headless or server tests (microtask batching)
    // - setTimeout: generic fallback
    function pickScheduler() {
      if (typeof requestAnimationFrame === 'function') return requestAnimationFrame;
      if (typeof queueMicrotask === 'function') return queueMicrotask;
      return function (cb) { setTimeout(cb, 0); };
    }

    // run notifications to all subscribers whose selected value changed
    function runNotifications() {
      scheduled = false;
      var snapshot = state;
      var arr = Array.from(subscribers); // snapshot iteration avoids reentrancy surprises

      for (var i = 0; i < arr.length; i++) {
        var sub = arr[i];
        if (!sub.active) continue;

        var next;
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
        for (var i = 0; i < a.length; i++) {
          if (!Object.is(a[i], b[i])) return false;
        }
        return true;
      }

      // Plain objects: compare keys and shallow values
      if (isPlainObject(a) && isPlainObject(b)) {
        var keysA = Object.keys(a);
        var keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (var i = 0; i < keysA.length; i++) {
          var k = keysA[i];
          if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
          if (!Object.is(a[k], b[k])) return false;
        }
        return true;
      }

      // everything else (functions, dates, maps, etc.) compares by reference
      return false;

      function isPlainObject(x) {
        if (x === null || typeof x !== 'object') return false;
        var proto = Object.getPrototypeOf(x);
        return proto === Object.prototype || proto === null;
      }
    }

    // public API
    return { get: get, set: set, patch: patch, subscribe: subscribe };
  }

  // expose factory
  return { createStore: createStore };
});

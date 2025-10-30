//supports global <script> and paste ("StoreLib"), AMD ("import"), CJS ("Require")
(function (root, factory) {
  // Build API once
  var api = factory();

  // 1) support  global "StoreLib" for paste or use-via-<script>
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
  * mutations batch notifications on next paint via requestAnimationFrame
  * values can be primitive or complex deep objects
  * For safety, failure in any callback or selector unsubscribes that subscriber
  * */
  function createStore(initialState) {
    var state = initialState;
    var subscribers = new Set(); // { callback, selector, prev, active }
    var scheduled = false;

    // get current state snapshot.
    // only stable during notifications, otherwise its the working state.
    function get() { return state; }

    // replace entire state and notify
    function set(newState) {
      state = newState;
      scheduleNotify();
    }

    // replace part of state and notify
    function patch(partial) {
      set(Object.assign({}, state, partial));
    }

    // subscribe to changes, with optional selector.
    // callback(value,isInit): isInit is true when called with the initial value (during subscribe).
    // returns unsubscribe.
    function subscribe(callback, selector) {
      if (!selector) selector = function (x) { return x; };

      var prev;
      try {
        prev = selector(state);
      } catch (err) {
        console.error('Selector error on subscribe; not registered', err);
        return function () {};
      }

      var sub = { callback: callback, selector: selector, prev: prev, active: true };
      subscribers.add(sub);

      try {
        callback(prev, true); // firstTime = true
      } catch (err) {
        console.error('Subscriber error on first call; unsubscribed', err);
        unsubscribe(sub);
      }

      return function () { if (sub.active) unsubscribe(sub); };
    }

    //internal helpers

    //returned by subscribe(). Use to explicitly unsubscribe (optional)
    function unsubscribe(sub) {
      sub.active = false;
      subscribers.delete(sub);
    }
    
    //schedule notification on next animation drawing frame / microtask / setTimeout
    function scheduleNotify() {
      if (scheduled) return;
      scheduled = true;
      //microtask and setTimeout are for server or test environments
      (typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (typeof queueMicrotask === 'function'
        ? queueMicrotask
        : function (cb) { setTimeout(cb, 0); }))(runNotifications);
    }

    //run notifications to all subscribers whose selected value has changed
    function runNotifications() {
      scheduled = false;
      var snapshot = state;

      // snapshot iteration to avoid reentrancy surprises
      var arr = Array.from(subscribers);
      for (var i = 0; i < arr.length; i++) {
        var sub = arr[i];
        if (!sub.active) continue;

        var next;
        try {
          next = sub.selector(snapshot);
        } catch (err) {
          console.error('Selector error; unsubscribed', err);
          unsubscribe(sub);
          continue;
        }

        if (next === sub.prev) continue;
        sub.prev = next;

        try {
          sub.callback(next, false); // not first time
        } catch (err) {
          console.error('Subscriber error; unsubscribed', err);
          unsubscribe(sub);
        }
      }
    }

    return { get: get, set: set, patch: patch, subscribe: subscribe };
  }

  return { createStore: createStore };
});

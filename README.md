# TinyReactive

TinyReactive is a deliberately small reactive data store that exists first and foremost as a learning resource. The codebase is easy to read, the demos are meant to be stepped through with your browser devtools, and every design choice is visible in a handful of source files. If you want to explore how state management works without a heavyweight framework, this repository invites you to inspect the implementation and debug it live through the published sample pages.

## Why reactivity matters on the front end

Classic DOM scripting couples event handlers, data, and rendering logic so tightly that a single change to the state of your app often ripples through the view layer by hand. A reactive store breaks that dependency chain. Components describe **what** slice of data they care about, the store notifies them **when** that slice changes, and your UI becomes a projection of the current state instead of a bag of manual DOM mutations. The result is a cleaner mental model: rules and data live in one place, rendering logic in another, and the glue code is handled by subscription callbacks.

TinyReactive focuses on this separation of concerns:

- **Data first.** You work with plain objects that represent your application state.
- **Declarative subscriptions.** Each subscriber provides a selector that extracts the relevant data.
- **Scheduled updates.** Notifications are batched on `requestAnimationFrame`, ensuring the DOM updates only after state settles.

## How the library works

The store implementation lives in [`src/store.js`](src/store.js) (and an ES module friendly wrapper in [`src/store.module.js`](src/store.module.js)). The API surface is intentionally minimal:

- `createStore(initialState)` returns an object with `get`, `set`, `patch`, and `subscribe` methods.
- `get()` exposes the latest snapshot of the state.
- `set(newState)` replaces the entire state and queues notifications.
- `patch(partialState)` shallow-merges new values before emitting, letting you update only the fields that changed.
- `subscribe(callback, selector?)` registers listeners that react to the store. The callback is invoked immediately with the initial selected value. For subsequent updates, selectors run against the newest snapshot; if their output has not changed, the callback is skipped.

Under the hood TinyReactive keeps a `Set` of subscribers. Each subscriber caches the last value its selector produced, so updates only run when needed. Notifications are deferred with `requestAnimationFrame` (or `queueMicrotask`/`setTimeout` in non-browser contexts), giving you a consistent frame where all mutations have settled before the DOM work occurs. Runtime safety is also part of the lesson: selector or subscriber failures are caught, logged, and automatically unsubscribed so that a single bug does not lock the store.

The samples show how these pieces connect:

- [`samples/minimal`](samples/minimal/) wires a counter to the store in fewer than 40 lines. The subscription renders the count, and the click handler merely patches `{ count: count + 1 }`, demonstrating how UI code can ignore DOM bookkeeping.
- [`samples/tasks-app`](samples/tasks-app/) expands the same primitives into a full to-do experience. Independent subscriptions render the list, the summary, filter buttons, and even a notification panel. Each handler patches just the slice of state it owns, while selectors (`state => state.todos`, `state => ({ todos: state.todos, filter: state.filter })`, etc.) ensure that only the relevant DOM is re-rendered. The sample also shows how `store.get()` enables persistence with `localStorage` without breaking the reactive flow.

## Explore the demos

Learning by inspecting code is powerful, but stepping through a working example makes the patterns click faster. Open the hosted demos, set breakpoints in your browser, and watch how state changes travel through selectors into the UI:

👉 [Try the TinyReactive samples on GitHub Pages](https://zmandel.github.io/tinyreactive/)

Clone the repository, tweak the samples, and experiment with new subscriptions or state shapes—the store is tiny on purpose so you can understand every line.

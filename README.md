# TinyReactive

A simple, efficient, and robust reactive data store for writing decoupled code. It doubles as a learning resource through the provided samples you can run from the GitHub demos or your local clone.
TinyReactive is a simple, efficient and robust reactive data store to help you write decoupled code. It also serves as a learning resource with provided samples you can run and debug directly from the Github demos below or your local machine install.

## Highlights
- Updates only the parts of the UI that change.
- No virtual DOM or browser dependency.
- Keeps existing DOM nodes intact.
- Batches consecutive updates on the next frame draw (or microtasks outside the browser).
- Subscribers always receive a settled state.
- Works with `import`, `require`, or a `<script>` tag.
- No runtime dependencies.
- Core store logic is about 100 lines of code (≈700 B minified and gzipped).

This library is used in production by [tutorforme.org](https://tutorforme.org).
It's meant to stay small for simple and medium-complexity scenarios. For larger-scale frameworks with similar store concepts see [Solid](https://www.solidjs.com/tutorial/introduction_signals), [Preact signals](https://preactjs.com/blog/signal-boosting/), or [Vue](https://vuejs.org/guide/introduction.html).

Fun fact: this pattern was first designed and implemented in 1997 for Microsoft Money, a project that needed deterministic reactive updates without constant UI rewrites whenever the database changed.

## Table of contents
- [Highlights](#highlights)
- [Why TinyReactive](#why-tinyreactive)
- [Key ideas](#key-ideas)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Samples](#samples)
- [Demos](#demos)
- [Contributing](#contributing)
- [License](#license)

## Why TinyReactive
Traditional DOM scripting couples event handlers, data, and rendering logic tightly, making code brittle and hard to maintain. A reactive store breaks dependencies by decoupling code. A typical case is in frontend development between UI and data dependencies. 
With a reactive store, components describe **what** slice of data they care about, the store notifies them **when** that slice changes, and the UI automatically updates just what it needs to reflect the new state of data.

## Key ideas
The store implementation lives in [`src/store.js`](src/store.js) with an ES module wrapper in [`src/store.module.js`](src/store.module.js). The public API is:

```js
const store = createStore(initialState); //returns an object with `get`, `set`, `patch`, and `subscribe`.

store.get(); //returns the latest snapshot of state.
store.set(newState); //replaces the state and queues notifications.
store.patch(partialState); //shallow merges state and queues notifications.
store.subscribe(callback, selector?); //registers a listener. The callback runs immediately with the initial selected value and only runs again when that value changes.
```
Internally, TinyReactive keeps a `Set` of subscribers. Each subscriber caches the last value from its selector, so updates fire only when needed. Notifications are deferred with `requestAnimationFrame` (or `queueMicrotask`/`setTimeout` outside the browser) to ensure all mutations settle before DOM work. Selector or subscriber failures are caught, logged, and unsubscribed so a single bug cannot stall the store or provide an inconsistent state.

## Getting started
You can inspect and debug samples directly from the [demos](#demos) in GitHub Pages, or clone the repo:

```sh
git clone https://github.com/zmandel/tinyreactive.git
cd tinyreactive
```

The project is framework-free; open the minimal demo from your file explorer at `samples/minimal/index.html` directly in your browser.
For richer examples such as [`samples/tasks-app`](samples/tasks-app/), run a local dev server so `import` works:

```sh
cd samples/tasks-app
npm install
npm run dev
```

Then open the provided local URL in your browser.

## Usage
Import the store factory and wire it to your UI code:

```html
<div id="count"></div>
<button>Increment</button>

<script type="module">
  import { createStore } from './src/store.module.js';

  // Create a store with a primitive initial value.
  // For complex state, store objects such as { count: 0, label: 'My counter' }.
  const store = createStore(0);

  // Subscribe to the entire store value.
  // Use selectors to subscribe to slices: state => state.count
  store.subscribe(value => {
    document.querySelector('#count').textContent = value;
  });

  document.querySelector('button').addEventListener('click', () => {
    store.set(store.get() + 1);
  });
</script>
```

## Samples
These `samples` can be run and debugged directly from the [demos](#demos) below.

- [`samples/minimal`](samples/minimal/) wires a counter to the store in fewer than 40 lines. The subscription renders the count, and the click handler only patches the changing field.
- [`samples/tasks-app`](samples/tasks-app/) scales the same primitives into a to-do app. Start by watching the notification panel to observe each subscriber's messages so you can trace how data travels through the store. Independent subscriptions render the list, summary, filter buttons, and notification panel. Selectors such as `state => state.todos` keep updates targeted. 

<img src="media/tasks-demo.png" alt="Tasks demo preview" width="400">

<a id="demos"></a>
## Demos
Inspect the running examples directly:

[TinyReactive on GitHub Pages](https://zmandel.github.io/tinyreactive/)

Open the devtools, set breakpoints, and watch how state changes travel through selectors into the UI.

## Contributing
Issues and pull requests are welcome.

## License
This project is licensed under the [MIT License](LICENSE).

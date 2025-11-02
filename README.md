# TinyReactive

TinyReactive is a simple, efficient and robust reactive data store to write decoupled code. It also serves as a learning resource with provided samples you can run and debug directly from the Github demos below or your local machine install.

Features:
  - Updates just the parts that change.
  - No virtual DOM or browser dependency.
  - HTML elements are not recreated.
  - Multiple store updates are batched and run on the next frame draw (or microtasks for non-browser scenarios)
  - Subscribers always receive a settled state.
  - Use with <code>import</code>, <code>require</code>, or a <code>&lt;script&gt;</code> tag.
  - Has no dependencies.
  - Store core code is about 100 lines of code, 700B minimized/gzipped.

This library is used in production by [tutorforme.org](https://tutorforme.org).  
Its meant to be kept simple, for small and medium complexity cases. For a much more complete framework with similar store concepts see [Solid](https://www.solidjs.com/tutorial/introduction_signals), [Preact signals](https://preactjs.com/blog/signal-boosting/), [Vue](https://vuejs.org/guide/introduction.html)

Fun fact: I first designed and implemented this exact pattern in 1997, using C++ for Microsoft Money, the first reactive UI ever built at Microsoft, because I was frustrated with all the code patching needed in the UI whenever the database engine modified data.

## Table of contents
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
The store implementation lives in [`src/store.js`](src/store.js) with an ES module wrapper in [`src/store.module.js`](src/store.module.js) with this public API:

```js
const store = createStore(initialState); //returns an object with `get`, `set`, `patch`, and `subscribe`.

store.get(); //returns the latest snapshot of state.
store.set(newState); //replaces the state and queues notifications.
store.patch(partialState); //shallow merges state and queues notifications.
store.subscribe(callback, selector?); //registers a listener. The callback runs immediately with the initial selected value and only runs again when that value changes.
```
Internally, TinyReactive keeps a `Set` of subscribers. Each subscriber caches the last value from its selector, so updates fire only when needed. Notifications are deferred with `requestAnimationFrame` (or `queueMicrotask`/`setTimeout` outside the browser) to ensure all mutations settle before DOM work. Selector or subscriber failures are caught, logged, and unsubscribed so a single bug cannot stall the store or provide an inconsistent state.

## Getting started
You can inspect and debug samples directly from the [demos](#demos) in GitHub pages, or clone the repo:

```sh
git clone https://github.com/zmandel/tinyreactive.git
cd tinyreactive
```

The project is framework-free; open the minimal demo from your file explorer at samples/minimal/index.html directly in your browser. 
For richer examples such as [`samples/tasks-app`](samples/tasks-app/), run a local dev server so "import" works:

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

  //create a store with an initial state value of zero.
  //note: for more complex state, the store can hold state objects like {count: 0, name: 'my counter'}
  const store = createStore(0);

  //a simple subscription to the whole store.
  //note: for a more complex state, the subscription could be just to part of the state
  store.subscribe(value => {
    document.querySelector('#count').textContent = value;
  });

  document.querySelector('button').addEventListener('click', () => store.set(store.get().count + 1));
</script>
```

## Samples
These `samples` can be run and debug directly from the [demos](#demos) below. 

- [`samples/minimal`](samples/minimal/) wires a counter to the store in fewer than 40 lines. The subscription renders the count, and the click handler only patches the changing field.
- [`samples/tasks-app`](samples/tasks-app/) scales the same primitives into a to-do app. Start by watching the notification panel to observe each subscriber's messages so you can trace how data travels through the store. Independent subscriptions render the list, summary, filter buttons, and notification panel. Selectors such as `state => state.todos` keep updates targeted.

## Demos
Inspect the running examples directly:

[TinyReactive on GitHub Pages](https://zmandel.github.io/tinyreactive/)

Open the devtools, set breakpoints, and watch how state changes travel through selectors into the UI.

## Contributing
Issues and pull requests are welcome.

## License
This project is licensed under the [MIT License](LICENSE).

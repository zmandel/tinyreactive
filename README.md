# TinyReactive

TinyReactive is a very efficient and robust reactive data store that is deliberately small, to help you build reactive websites without needing a complex library, and as a learning resource for anyone wanting an easy way to try reactive UIs.

The library is very efficient because by default only UI that needs changing is modified. HTML elements are not recreated, there is no virtual DOM and all updates are batched on the next frame draw. It supports importing by "import", "require" or a <script> tag, and has no dependencies.

The samples provided are published un-minimized and un-bundled so you can run and debug with browser devtools without needing a local install.

The store code is only 100 lines of vanilla js.

This library is a contribution from my production website [tutorforme.org](https://tutorforme.org).

## Table of contents
- [Why TinyReactive](#why-tinyreactive)
- [Key ideas](#key-ideas)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Samples](#samples)
- [Demo](#demo)
- [Contributing](#contributing)
- [License](#license)

## Why TinyReactive
Traditional DOM scripting couples event handlers, data, and rendering logic so tightly that a single state change ripples through the view layer manually. A reactive store breaks that dependency chain. Components describe **what** slice of data they care about, the store notifies them **when** that slice changes, and the UI becomes a projection of current state instead of a bag of DOM mutations.

TinyReactive keeps the focus on separation of concerns:

- **Data first.** Work with plain objects that represent application state.
- **Declarative subscriptions.** Selectors extract only the data a subscriber needs.
- **Scheduled updates.** Notifications are batched on `requestAnimationFrame`, so the DOM updates after state settles.

## Key ideas
The store implementation lives in [`src/store.js`](src/store.js) with an ES module wrapper in [`src/store.module.js`](src/store.module.js). The public API is intentionally small:

```js
const store = createStore(initialState);

store.get();
store.set(newState);
store.patch(partialState);
store.subscribe(callback, selector?);
```

- `createStore(initialState)` returns an object with `get`, `set`, `patch`, and `subscribe`.
- `get()` returns the latest snapshot of state.
- `set(newState)` replaces the state and queues notifications.
- `patch(partialState)` shallow merges updates before emitting changes.
- `subscribe(callback, selector?)` registers a listener. The callback runs immediately with the initial selected value and only runs again when that value changes.

Internally, TinyReactive keeps a `Set` of subscribers. Each subscriber caches the last value from its selector, so updates fire only when needed. Notifications are deferred with `requestAnimationFrame` (or `queueMicrotask`/`setTimeout` outside the browser) to ensure all mutations settle before DOM work. Selector or subscriber failures are caught, logged, and unsubscribed so a single bug cannot stall the store.

## Getting started
Clone the repo and open the samples locally:

```sh
git clone https://github.com/zmandel/tinyreactive.git
cd tinyreactive
```

The project is framework-free; open the minimal demo from your file explorer at samples/minimal/index.html directly in your browser. For richer examples such as [`samples/tasks-app`](samples/tasks-app/), run a local dev server instead:

```sh
cd samples/tasks-app
npm install
npm run dev
```

Then open the provided local URL in your browser.

## Usage
Import the store factory and wire it to your UI code:

```html
<div id="count">0</div>
<button>Increment</button>

<script type="module">
  import { createStore } from './src/store.module.js';

  const store = createStore({ count: 0 });

  store.subscribe(value => {
    document.querySelector('#count').textContent = value;
  }, state => state.count);

  document
    .querySelector('button')
    .addEventListener('click', () => store.patch({ count: store.get().count + 1 }));
</script>
```

Subscribers receive the initial value immediately and only update when the selector output changes.

Each UI component subscribes to the data it needs, decoupling it from code that modifies its state.

## Samples
The `samples` directory shows the building blocks in action:

- [`samples/minimal`](samples/minimal/) wires a counter to the store in fewer than 40 lines. The subscription renders the count, and the click handler only patches the changing field.
- [`samples/tasks-app`](samples/tasks-app/) scales the same primitives into a to-do app. Start by watching the notification panel to observe each subscriber's messages so you can trace how data travels through the store. Independent subscriptions render the list, summary, filter buttons, and notification panel. Selectors such as `state => state.todos` keep updates targeted.

## Demo
Prefer a hosted version? Inspect the running examples directly:

👉 [TinyReactive on GitHub Pages](https://zmandel.github.io/tinyreactive/)

Open the devtools, set breakpoints, and watch how state changes travel through selectors into the UI.

## Contributing
Issues and pull requests are welcome. If you find a bug or have a teaching-oriented enhancement, open a discussion so others can learn from the change.

## License
This project is licensed under the [MIT License](LICENSE).

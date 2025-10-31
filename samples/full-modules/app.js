import { createStore } from '../../src/store.module.js';

const store = createStore({
  todos: [
    { id: 1, text: 'Skim the TinyReactive store API', done: true },
    { id: 2, text: 'Build something delightful', done: false },
    { id: 3, text: 'Share it with a teammate', done: false }
  ],
  filter: 'all',
  draft: ''
});

const elements = {
  form: document.querySelector('[data-todo-form]'),
  draftInput: document.getElementById('todo-input'),
  list: document.querySelector('[data-todo-list]'),
  emptyState: document.querySelector('[data-empty-state]'),
  summary: document.querySelector('[data-summary]'),
  filters: Array.from(document.querySelectorAll('[data-filter]'))
};

if (Object.values(elements).some((value) => value == null)) {
  throw new Error('App markup missing required data attributes.');
}

// --- Rendering helpers ----------------------------------------------------

function renderTodoList({ todos, filter }) {
  const visibleTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.done;
    if (filter === 'completed') return todo.done;
    return true;
  });

  elements.list.innerHTML = '';

  if (visibleTodos.length === 0) {
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;

  const fragment = document.createDocumentFragment();

  for (const todo of visibleTodos) {
    const item = document.createElement('li');
    item.className = 'todo-item';
    item.dataset.id = String(todo.id);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.setAttribute('aria-label', `Toggle ${todo.text}`);

    const text = document.createElement('p');
    text.className = 'todo-item__text' + (todo.done ? ' todo-item__text--done' : '');
    text.textContent = todo.text;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'todo-item__remove';
    removeButton.dataset.action = 'remove';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', `Remove ${todo.text}`);

    item.append(checkbox, text, removeButton);
    fragment.appendChild(item);
  }

  elements.list.appendChild(fragment);
}

function renderSummary(todos) {
  const completed = todos.filter((todo) => todo.done).length;
  const total = todos.length;
  const pending = total - completed;

  elements.summary.textContent =
    total === 0
      ? 'Add your first task to get started.'
      : `${completed} completed, ${pending} remaining (${total} total)`;
}

function renderDraftInput(draft) {
  if (elements.draftInput.value !== draft) {
    elements.draftInput.value = draft;
  }
}

function renderFilters(activeFilter) {
  for (const button of elements.filters) {
    const isActive = button.dataset.filter === activeFilter;
    button.setAttribute('aria-pressed', String(isActive));
  }
}

// --- Subscriptions --------------------------------------------------------

store.subscribe(renderTodoList, (state) => ({ todos: state.todos, filter: state.filter }));
store.subscribe(renderSummary, (state) => state.todos);
store.subscribe(renderDraftInput, (state) => state.draft);
store.subscribe(renderFilters, (state) => state.filter);

document.body.removeAttribute('data-app-loading');

// --- Event wiring ----------------------------------------------------------

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = store.get().draft.trim();
  if (!text) return;

  const { todos } = store.get();
  const nextTodo = {
    id: Date.now(),
    text,
    done: false
  };

  store.patch({
    todos: [...todos, nextTodo],
    draft: ''
  });

  elements.draftInput.focus();
});

elements.draftInput.addEventListener('input', (event) => {
  store.patch({ draft: event.target.value });
});

elements.list.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
    const item = event.target.closest('.todo-item');
    if (!item) return;
    const id = Number(item.dataset.id);

    store.patch({
      todos: store.get().todos.map((todo) =>
        todo.id === id ? { ...todo, done: event.target.checked } : todo
      )
    });
  }
});

elements.list.addEventListener('click', (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.action === 'remove') {
    const item = target.closest('.todo-item');
    if (!item) return;
    const id = Number(item.dataset.id);

    store.patch({
      todos: store.get().todos.filter((todo) => todo.id !== id)
    });
  }
});

elements.filters.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    if (!filter || filter === store.get().filter) return;
    store.patch({ filter });
  });
});

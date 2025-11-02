import { createStore } from '../../src/store.module.js';

const STORAGE_KEY = 'tinyreactive:app-state';

const defaultState = {
  todos: [
    { id: 1, text: 'Skim the TinyReactive store API', done: true },
    { id: 2, text: 'Build something delightful', done: false },
    { id: 3, text: 'Share it with a teammate', done: false }
  ],
  filter: 'all',
  draft: '',
  notificationPanel: false
};

const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function loadPersistedState() {
  if (!hasStorage)
    return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    console.warn('Failed to load persisted TinyReactive state.', error);
    return null;
  }
}

const store = createStore(loadPersistedState() ?? defaultState);

function persistStateSnapshot(state) {
  if (!hasStorage)
    return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist TinyReactive state.', error);
  }
}

function persistCurrentState() {
  persistStateSnapshot(store.get());
}

const elements = {
  form: document.querySelector('[data-todo-form]'),
  draftInput: document.getElementById('todo-input'),
  list: document.querySelector('[data-todo-list]'),
  emptyState: document.querySelector('[data-empty-state]'),
  summary: document.querySelector('[data-summary]'),
  filters: Array.from(document.querySelectorAll('[data-filter]')),
  logList: document.querySelector('[data-log-list]'),
  clearLogsButton: document.querySelector('[data-clear-logs]'),
  notificationsPanel: document.querySelector('[data-notifications]'),
  showNotificationsButton: document.querySelector('[data-show-notifications]')
};

if (Object.values(elements).some((value) => value == null)) {
  throw new Error('App markup missing required data attributes.');
}

function logNotification(message, isSeparator = false) {
  const maxLogItems = 15;
  const timestamp = new Date();
  let item = null;

  if (isSeparator) {
    item = document.createElement('hr');
  } else {
    item = document.createElement('div');
    const timeText = timestamp.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    item.textContent = `${timeText}  ${message}`;
  }
  item.className = 'notifications__item';
  elements.logList.append(item);
  const scroller = elements.logList.parentElement ?? elements.logList;
  scroller.scrollTop = scroller.scrollHeight;

  const children = Array.from(elements.logList.children);
  const cutoffIndex = Math.max(0, children.length - maxLogItems);
  children.forEach((child, index) => {
    if (index < cutoffIndex)
      elements.logList.removeChild(child);
  });
}

// --- Rendering helpers ----------------------------------------------------

function renderTodoList({ todos, filter }) {
  logNotification('todo list');
  const visibleTodos = todos.filter((todo) => {
    switch (filter) {
      case 'active':
        return !todo.done;
      case 'completed':
        return todo.done;
      default:
        return true;
    }
  });

  elements.list.replaceChildren();

  if (visibleTodos.length === 0) {
    // Show the empty message only when the "active" filter is selected.
    elements.emptyState.hidden = filter !== 'active';
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
    const checkboxId = `todo-${todo.id}`;
    checkbox.id = checkboxId;

    const textLabel = document.createElement('label');
    textLabel.className = 'todo-item__text' + (todo.done ? ' todo-item__text--done' : '');
    textLabel.htmlFor = checkboxId;
    textLabel.textContent = todo.text;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'todo-item__remove';
    removeButton.dataset.action = 'remove';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', `Remove ${todo.text}`);

    item.append(checkbox, textLabel, removeButton);
    fragment.appendChild(item);
  }

  elements.list.appendChild(fragment);
}

function renderSummary(todos) {
  logNotification('summary');
  const completed = todos.reduce((count, todo) => (todo.done ? count + 1 : count), 0);
  const total = todos.length;
  const pending = total - completed;

  elements.summary.textContent =
    total === 0
      ? 'Add your first task to get started.'
      : `${completed} completed, ${pending} remaining (${total} total)`;
}

function renderDraftInput(draft) {
  logNotification('draft input');
  if (elements.draftInput.value !== draft) {
    elements.draftInput.value = draft;
  }
}

function renderFilters(activeFilter) {
  logNotification('filters');
  for (const button of elements.filters) {
    const isActive = button.dataset.filter === activeFilter;
    button.setAttribute('aria-pressed', String(isActive));
  }
}

function logNewSection() {
  logNotification(null, true);
  triggerBlink();
}

function renderNotificationPanel(isVisible) {
  logNotification('notif. panel');
  elements.notificationsPanel.hidden = !isVisible;
  // keep the eye always visible — do not hide the show button
  // elements.showNotificationsButton.hidden = isVisible; // removed
}

// --- Subscriptions --------------------------------------------------------

store.subscribe(renderTodoList, (state) => ({ todos: state.todos, filter: state.filter }));
store.subscribe(renderSummary, (state) => state.todos);
store.subscribe(renderDraftInput, (state) => state.draft);
store.subscribe(renderFilters, (state) => state.filter);
store.subscribe(renderNotificationPanel, (state) => state.notificationPanel);
store.subscribe(logNewSection); // subscribe at the end, to log a separator in the notifications

//since stores notify synchronously on initialization (above), the app has finished rendering here,
//so show the app by removing the loading attribute
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

elements.clearLogsButton.addEventListener('click', () => {
  elements.logList.replaceChildren();
});

elements.showNotificationsButton.addEventListener('click', () => {
  const current = store.get().notificationPanel;
  store.patch({ notificationPanel: !current });
});

// persist app state when the page is closed or backgrounded
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistCurrentState);
  window.addEventListener('beforeunload', persistCurrentState);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      persistCurrentState();
    }
  });
}

function triggerBlink() {
  const eye = document.querySelector('.eye-btn');
  if (!eye)
    return;

  const handleAnimationEnd = () => {
    eye.classList.remove('blink');
    eye.removeEventListener('animationend', handleAnimationEnd);
  };

  eye.addEventListener('animationend', handleAnimationEnd);
  void eye.offsetWidth; // force reflow before starting the animation
  eye.classList.add('blink');
}

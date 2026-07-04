/**
 * Simple state management for the frontend.
 *
 * Usage:
 *   const state = new StateManager({
 *     tasks: [],
 *     filter: 'all',
 *     theme: 'light'
 *   });
 *
 *   state.subscribe('tasks', (newTasks) => { render(newTasks); });
 *   state.set('tasks', fetchedTasks);
 *
 * Future: replace with a more robust solution (e.g., Zustand, Pinia)
 * when the app grows to support teams and real-time updates.
 */
class StateManager {
  constructor(initialState) {
    this.state = { ...initialState };
    this.listeners = {};
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    if (this.listeners[key]) {
      this.listeners[key].forEach(function(fn) { fn(value); });
    }
  }

  subscribe(key, fn) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(fn);
    return function() {
      this.listeners[key] = this.listeners[key].filter(function(f) { return f !== fn; });
    }.bind(this);
  }

  getAll() {
    return { ...this.state };
  }
}

// Singleton app state
const appState = new StateManager({
  user: null,
  tasks: [],
  teams: [],
  notifications: [],
  currentView: 'list'
});

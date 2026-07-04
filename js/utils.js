var API_BASE = '';

function getAuthToken() {
  return window.localStorage.getItem('taskflow_token');
}

async function apiPost(endpoint, data) {
  return apiFetch(endpoint, 'POST', data);
}

async function apiGet(endpoint) {
  return apiFetch(endpoint, 'GET');
}

async function apiPut(endpoint, data) {
  return apiFetch(endpoint, 'PUT', data);
}

async function apiDelete(endpoint) {
  return apiFetch(endpoint, 'DELETE');
}

async function apiFetch(endpoint, method, body) {
  var token = getAuthToken();
  var headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  var options = { method: method, headers: headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  var response;
  try {
    response = await fetch(API_BASE + endpoint, options);
  } catch (networkError) {
    if (networkError instanceof TypeError) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }

  var data;
  try {
    data = await response.json();
  } catch (parseError) {
    var text = '';
    try { text = await response.text(); } catch (e) {}
    throw new Error(
      'Server returned ' + response.status + ' ' + response.statusText + '. ' +
      (text ? 'Response: ' + text.slice(0, 200) : 'Empty response body.')
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed (' + response.status + ')');
  }

  return data;
}

window.api = { get: apiGet, post: apiPost, put: apiPut, del: apiDelete };

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  var duration = type === 'error' ? 6000 : 3000;

  setTimeout(function() {
    toast.classList.add('toast-removing');
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDateTime(dateString) {
  var date = new Date(dateString);
  var now = new Date();
  var sameDay = date.getFullYear() === now.getFullYear() &&
                date.getMonth() === now.getMonth() &&
                date.getDate() === now.getDate();

  var time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (sameDay) return time;

  var monthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  if (date.getFullYear() === now.getFullYear()) return monthDay + ', ' + time;

  return monthDay + ', ' + date.getFullYear() + ', ' + time;
}

function formatFullDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPriorityLabel(priority) {
  const labels = { high: 'High', medium: 'Medium', low: 'Low' };
  return labels[priority] || 'Medium';
}

function getPriorityBadgeClass(priority) {
  const classes = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
  return classes[priority] || 'badge-medium';
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(getToday());
}

/* ======== Theme Management ======== */

function getSavedTheme() {
  return localStorage.getItem('taskflow_theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('taskflow_theme', next);
  return next;
}

function initThemeToggle(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  const saved = getSavedTheme();
  if (typeof icon === 'function') {
    btn.innerHTML = icon(saved === 'dark' ? 'sun' : 'moon', 'icon-sm');
  }
  btn.addEventListener('click', () => {
    const next = toggleTheme();
    if (typeof icon === 'function') {
      btn.innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 'icon-sm');
    }
  });
}

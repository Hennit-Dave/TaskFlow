const userData = JSON.parse(localStorage.getItem('taskflow_user'));
const token = localStorage.getItem('taskflow_token');

if (!token || !userData) {
  window.location.href = '/html/index.html';
}

let currentFilter = 'all';
let currentSort = 'newest';
let currentSearch = '';
let currentCategory = '';
let currentPriority = '';
let currentDue = '';
let editingTaskId = null;
let deletingTaskId = null;
let deletingCallback = null;

const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const welcomeMessage = document.getElementById('welcome-message');
const currentDate = document.getElementById('current-date');

userName.textContent = userData.name;
userAvatar.textContent = getInitials(userData.name);
welcomeMessage.textContent = `Welcome back, ${userData.name.split(' ')[0]}!`;
currentDate.textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await api.post('/api/auth/logout');
  } catch (e) {}
  localStorage.removeItem('taskflow_token');
  localStorage.removeItem('taskflow_user');
  window.location.href = '/html/index.html';
});

applyTheme(getSavedTheme());
initThemeToggle('theme-toggle');

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('error', 'shake');
}

function showFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error', 'shake');
  setTimeout(function() { el.classList.remove('shake'); }, 500);
  el.focus();
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const titleInput = document.getElementById('task-title');
  const title = titleInput.value.trim();

  clearFieldError('task-title');
  if (!title) {
    showFieldError('task-title');
    showToast('Please enter a task title.', 'error');
    return;
  }

  const task = {
    title,
    description: document.getElementById('task-description').value.trim(),
    priority: document.getElementById('task-priority').value,
    category: document.getElementById('task-category').value,
    tags: document.getElementById('task-tags').value.trim(),
    due_date: document.getElementById('task-due-date').value || null,
  };

  try {
    await api.post('/api/tasks', task);
    document.getElementById('task-form').reset();
    showToast('Task created successfully!', 'success');
    loadTasks();
    loadStats();
    loadRecentActivity();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadTasks();
  });
});

document.getElementById('search-input').addEventListener('input', (e) => {
  currentSearch = e.target.value.trim();
  loadTasks();
});

document.getElementById('sort-select').addEventListener('change', (e) => {
  currentSort = e.target.value;
  loadTasks();
});

document.getElementById('filter-category').addEventListener('change', (e) => {
  currentCategory = e.target.value;
  loadTasks();
});

document.getElementById('filter-priority').addEventListener('change', (e) => {
  currentPriority = e.target.value;
  loadTasks();
});

document.getElementById('filter-due').addEventListener('change', (e) => {
  currentDue = e.target.value;
  loadTasks();
});

document.getElementById('modal-close').addEventListener('click', closeEditModal);
document.getElementById('modal-cancel').addEventListener('click', closeEditModal);

document.getElementById('edit-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEditModal();
});

document.getElementById('modal-save').addEventListener('click', async () => {
  const id = document.getElementById('edit-task-id').value;
  const titleInput = document.getElementById('edit-title');
  const title = titleInput.value.trim();

  clearFieldError('edit-title');
  if (!title) {
    showFieldError('edit-title');
    showToast('Title is required.', 'error');
    return;
  }

  try {
      await api.put(`/api/tasks/${id}`, {
      title,
      description: document.getElementById('edit-description').value.trim(),
      priority: document.getElementById('edit-priority').value,
      category: document.getElementById('edit-category').value,
      tags: document.getElementById('edit-tags').value.trim(),
      due_date: document.getElementById('edit-due-date').value || null,
    });
    closeEditModal();
    showToast('Task updated successfully!', 'success');
    loadTasks();
    loadStats();
    loadRecentActivity();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeConfirmModal();
});

document.getElementById('confirm-delete').addEventListener('click', async () => {
  if (!deletingTaskId) return;

  try {
    await api.del(`/api/tasks/${deletingTaskId}`);
    closeConfirmModal();
    showToast('Task deleted.', 'success');
    if (deletingCallback) {
      deletingCallback();
      deletingCallback = null;
    } else {
      loadTasks();
      loadStats();
      loadRecentActivity();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  editingTaskId = null;
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('active');
  deletingTaskId = null;
  deletingCallback = null;
}

function openEditModal(task) {
  document.getElementById('edit-task-id').value = task.id;
  document.getElementById('edit-title').value = task.title;
  document.getElementById('edit-description').value = task.description || '';
  document.getElementById('edit-priority').value = task.priority;
  document.getElementById('edit-category').value = task.category || 'other';
  document.getElementById('edit-tags').value = task.tags || '';
  document.getElementById('edit-due-date').value = task.due_date || '';
  document.getElementById('edit-modal').classList.add('active');
  document.getElementById('edit-title').focus();
}

function openConfirmModal(taskId) {
  deletingTaskId = taskId;
  document.getElementById('confirm-modal').classList.add('active');
}

async function toggleTaskCompletion(taskId, currentStatus) {
  try {
    await api.put(`/api/tasks/${taskId}`, { completed: !currentStatus });
    showToast(currentStatus ? 'Task marked as pending' : 'Task completed!', 'success');
    loadTasks();
    loadStats();
    loadRecentActivity();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function archiveTask(taskId) {
  try {
    await api.put(`/api/tasks/${taskId}`, { archived: true });
    showToast('Task archived!', 'success');
    loadTasks();
    loadStats();
    loadRecentActivity();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function unarchiveTask(taskId) {
  try {
    await api.put(`/api/tasks/${taskId}`, { archived: false });
    showToast('Task restored from archive.', 'success');
    loadTasks();
    loadStats();
    loadRecentActivity();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getCategoryLabel(cat) {
  const labels = { work: 'Work', personal: 'Personal', school: 'School', health: 'Health', finance: 'Finance', other: 'Other' };
  return labels[cat] || 'Other';
}

async function loadAnalytics() {
  try {
    const data = await api.get('/api/tasks/analytics');
    document.getElementById('analytics-week').textContent = data.weekCompleted;
    document.getElementById('analytics-month').textContent = data.monthCompleted;
    document.getElementById('analytics-rate').textContent = `${data.completionRate}%`;
    document.getElementById('analytics-category').textContent = data.topCategory ? getCategoryLabel(data.topCategory) : '—';
    document.getElementById('analytics-streak').textContent = `${data.streak} day${data.streak !== 1 ? 's' : ''}`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadStats() {
  try {
    const data = await api.get('/api/tasks/stats');
    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-completed').textContent = data.completed;
    document.getElementById('stat-pending').textContent = data.pending;
    document.getElementById('stat-archived').textContent = data.archived;
    const percentage = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);
    document.getElementById('progress-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

const activityLabels = {
  login: { icon: 'lock', text: 'Logged in' },
  task_created: { icon: 'plus', text: 'Created task' },
  task_completed: { icon: 'check-circle', text: 'Completed task' },
  task_uncompleted: { icon: 'arrow-uturn-left', text: 'Uncompleted task' },
  task_edited: { icon: 'pencil', text: 'Edited task' },
  task_deleted: { icon: 'trash', text: 'Deleted task' },
  task_archived: { icon: 'archive-box', text: 'Archived task' },
  task_restored: { icon: 'arrow-uturn-left', text: 'Restored task' },
  subtask_created: { icon: 'plus', text: 'Added subtask' },
  subtask_completed: { icon: 'check-circle', text: 'Completed subtask' },
  subtask_uncompleted: { icon: 'arrow-uturn-left', text: 'Uncompleted subtask' },
  subtask_deleted: { icon: 'trash', text: 'Deleted subtask' },
};

// ======== Activity Dropdown ========

const activityTrigger = document.getElementById('activity-trigger');
const activityDropdown = document.getElementById('activity-dropdown');
const activityBackdrop = document.getElementById('activity-backdrop');
const activityDropdownClose = document.getElementById('activity-dropdown-close');

function openActivityDropdown() {
  activityDropdown.classList.add('open');
  activityBackdrop.classList.add('visible');
  loadRecentActivity();
}

function closeActivityDropdown() {
  activityDropdown.classList.remove('open');
  activityBackdrop.classList.remove('visible');
}

activityTrigger.addEventListener('click', function(e) {
  e.stopPropagation();
  if (activityDropdown.classList.contains('open')) {
    closeActivityDropdown();
  } else {
    openActivityDropdown();
  }
});

activityBackdrop.addEventListener('click', closeActivityDropdown);
activityDropdownClose.addEventListener('click', closeActivityDropdown);

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && activityDropdown.classList.contains('open')) {
    closeActivityDropdown();
  }
});

async function loadRecentActivity() {
  try {
    const data = await api.get('/api/activity?limit=10');
    const list = document.getElementById('activity-list');
    if (!data.entries || data.entries.length === 0) {
      list.innerHTML = '<div class="activity-empty">No recent activity</div>';
      return;
    }
    list.innerHTML = data.entries.map(entry => {
      const label = activityLabels[entry.action] || { icon: 'map-pin', text: entry.action };
      return `
        <div class="activity-item">
          <span class="activity-icon">${icon(label.icon, 'icon-sm')}</span>
          <span class="activity-text">${label.text} <strong>${escapeHtml(entry.details)}</strong></span>
          <span class="activity-time">${formatDateTime(entry.created_at)}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadTasks() {
  const params = new URLSearchParams();
  if (currentFilter !== 'all') params.set('filter', currentFilter);
  if (currentSort) params.set('sort', currentSort);
  if (currentSearch) params.set('search', currentSearch);
  if (currentCategory) params.set('category', currentCategory);
  if (currentPriority) params.set('priority', currentPriority);
  if (currentDue) params.set('dueDate', currentDue);

  try {
    const data = await api.get(`/api/tasks?${params.toString()}`);
    renderTasks(data.tasks);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderTasks(tasks) {
  const grid = document.getElementById('task-grid');
  const viewingArchived = currentFilter === 'archived';

  if (tasks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon(viewingArchived ? 'archive-box' : 'document-text', 'icon-56')}</div>
        <div class="empty-state-title">${viewingArchived ? 'Archive is empty' : 'No tasks found'}</div>
        <div class="empty-state-text">
          ${currentSearch ? 'Try a different search term.' : viewingArchived ? 'Completed tasks you archive will appear here.' : 'Create your first task above to get started!'}
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = tasks.map(task => {
    const priorityLabel = getPriorityLabel(task.priority);
    const priorityClass = getPriorityBadgeClass(task.priority);
    const completedClass = task.completed ? 'completed' : '';
    const archivedClass = task.archived ? 'archived' : '';
    const tags = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean);

    const taskPriorityClass = `priority-${task.priority || 'medium'}`;
    return `
      <div class="task-card ${completedClass} ${archivedClass} ${taskPriorityClass}" id="task-card-${task.id}">
        <div class="task-card-header">
          <div class="task-title-area">
            ${!viewingArchived ? `
            <button class="task-checkbox ${task.completed ? 'checked' : ''}"
              onclick="toggleTaskCompletion(${task.id}, ${task.completed})"
              title="${task.completed ? 'Mark as pending' : 'Mark as completed'}">
            </button>` : ''}
            <div>
              <div class="task-title">${escapeHtml(task.title)}</div>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn-icon subtask-toggle" onclick="toggleSubtasks(${task.id})" title="Subtasks" aria-label="Toggle subtasks">${icon('clipboard-list', 'icon-sm')}</button>
            ${!viewingArchived && task.completed ? `<button class="btn-icon" onclick="archiveTask(${task.id})" title="Archive" aria-label="Archive task">${icon('archive-box', 'icon-sm')}</button>` : ''}
            ${viewingArchived ? `<button class="btn-icon" onclick="unarchiveTask(${task.id})" title="Restore" aria-label="Restore task">${icon('arrow-uturn-left', 'icon-sm')}</button>` : ''}
            <button class="btn-icon" onclick="openEditModal(${JSON.stringify(task).replace(/"/g, '&quot;')})" title="Edit" aria-label="Edit task">${icon('pencil', 'icon-sm')}</button>
            <button class="btn-icon" onclick="openConfirmModal(${task.id})" title="Delete" aria-label="Delete task">${icon('trash', 'icon-sm')}</button>
          </div>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="task-badge ${priorityClass}">${priorityLabel}</span>
          <span class="task-badge badge-category badge-${task.category || 'other'}">${getCategoryLabel(task.category)}</span>
          ${task.archived ? '<span class="task-badge badge-low">' + icon('archive-box', 'icon-inline') + ' Archived</span>' : ''}
          ${task.due_date ? `<span class="task-date">${icon('calendar', 'icon-inline')} ${formatDate(task.due_date)}${isOverdue(task.due_date) && !task.completed ? ' (Overdue)' : ''}</span>` : ''}
        </div>
        ${tags.length ? `<div class="task-tags">${tags.map(t => `<span class="task-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div class="task-subtasks" id="subtasks-${task.id}" style="display:none;">
          <div class="subtask-progress" id="subtask-progress-${task.id}">
            <div class="subtask-progress-bar"><div class="subtask-progress-fill" id="subtask-fill-${task.id}"></div></div>
            <span class="subtask-progress-text" id="subtask-text-${task.id}">0/0</span>
          </div>
          <div class="subtask-list" id="subtask-list-${task.id}"></div>
          <div class="subtask-add">
            <input class="form-input subtask-input" type="text" id="subtask-input-${task.id}" placeholder="Add a subtask..." onkeydown="if(event.key==='Enter')addSubtask(${task.id})">
            <button class="btn btn-sm btn-primary" onclick="addSubtask(${task.id})">Add</button>
          </div>
        </div>
        <div class="task-date">${icon('clock', 'icon-inline')} Created ${formatFullDate(task.created_at)}</div>
      </div>
    `;
  }).join('');
}

const subtasksExpanded = {};

async function toggleSubtasks(taskId) {
  const container = document.getElementById(`subtasks-${taskId}`);
  if (!container) return;
  if (container.style.display !== 'none') {
    container.style.display = 'none';
    subtasksExpanded[taskId] = false;
    return;
  }
  container.style.display = 'block';
  subtasksExpanded[taskId] = true;
  await loadSubtasks(taskId);
}

async function loadSubtasks(taskId) {
  try {
    const data = await api.get(`/api/tasks/${taskId}/subtasks`);
    renderSubtasks(taskId, data.subtasks);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSubtasks(taskId, subtasks) {
  const list = document.getElementById(`subtask-list-${taskId}`);
  const total = subtasks.length;
  const done = subtasks.filter(s => s.completed).length;
  document.getElementById(`subtask-text-${taskId}`).textContent = `${done}/${total}`;
  const fill = document.getElementById(`subtask-fill-${taskId}`);
  fill.style.width = total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`;
  if (total === 0) {
    list.innerHTML = '<div class="subtask-empty">No subtasks yet</div>';
    return;
  }
  list.innerHTML = subtasks.map(s => `
    <div class="subtask-item ${s.completed ? 'completed' : ''}">
      <label class="subtask-checkbox-label">
        <input type="checkbox" class="subtask-checkbox" ${s.completed ? 'checked' : ''}
          onchange="toggleSubtask(${s.id}, ${taskId}, this.checked)">
        <span class="subtask-title">${escapeHtml(s.title)}</span>
      </label>
      <button class="subtask-delete" onclick="deleteSubtask(${s.id}, ${taskId})" title="Delete">${icon('xmark', 'icon-sm')}</button>
    </div>
  `).join('');
}

async function addSubtask(taskId) {
  const input = document.getElementById(`subtask-input-${taskId}`);
  const title = input.value.trim();
  if (!title) {
    input.classList.add('error', 'shake');
    setTimeout(function() { input.classList.remove('shake'); }, 500);
    return;
  }
  input.value = '';
  try {
    await api.post(`/api/tasks/${taskId}/subtasks`, { title });
    showToast('Subtask added!', 'success');
    await loadSubtasks(taskId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleSubtask(subtaskId, taskId, completed) {
  try {
    await api.put(`/api/subtasks/${subtaskId}`, { completed });
    showToast(completed ? 'Subtask completed!' : 'Subtask uncompleted', 'success');
    await loadSubtasks(taskId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteSubtask(subtaskId, taskId) {
  try {
    await api.del(`/api/subtasks/${subtaskId}`);
    showToast('Subtask deleted.', 'success');
    await loadSubtasks(taskId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEditModal();
    closeConfirmModal();
  }
});

// ======== Calendar View ========

const calState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  selectedDate: null,
  tasks: [],
  overdue: []
};

document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const view = btn.dataset.view;
    if (view === 'calendar') {
      document.getElementById('list-view').style.display = 'none';
      document.getElementById('calendar-view').style.display = 'block';
      loadCalendarData();
    } else {
      document.getElementById('list-view').style.display = 'block';
      document.getElementById('calendar-view').style.display = 'none';
    }
  });
});

document.getElementById('cal-prev').addEventListener('click', () => {
  calState.month--;
  if (calState.month < 1) { calState.month = 12; calState.year--; }
  loadCalendarData();
});

document.getElementById('cal-next').addEventListener('click', () => {
  calState.month++;
  if (calState.month > 12) { calState.month = 1; calState.year++; }
  loadCalendarData();
});

document.getElementById('cal-today').addEventListener('click', () => {
  const now = new Date();
  calState.year = now.getFullYear();
  calState.month = now.getMonth() + 1;
  calState.selectedDate = now.toISOString().split('T')[0];
  loadCalendarData();
});

document.getElementById('cal-add-btn').addEventListener('click', addCalendarTask);
document.getElementById('cal-add-cancel').addEventListener('click', hideCalendarAddForm);

document.getElementById('cal-task-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const title = e.target.value.trim();
    if (title) {
      addCalendarTask();
    } else {
      document.getElementById('cal-add-options').style.display = 'block';
      document.getElementById('cal-task-desc').focus();
    }
  }
});

async function loadCalendarData() {
  try {
    const res = await api.get(`/api/tasks/calendar?year=${calState.year}&month=${calState.month}`);
    calState.tasks = res.tasks || [];
    calState.overdue = res.overdue || [];
    renderCalendar();
    if (calState.selectedDate) {
      const monthStr = `${calState.year}-${String(calState.month).padStart(2, '0')}`;
      if (calState.selectedDate.startsWith(monthStr)) {
        showDateTasks(calState.selectedDate);
      } else {
        calState.selectedDate = null;
        clearCalendarTasks();
      }
    }
  } catch (err) {
    showToast('Failed to load calendar data.', 'error');
  }
}

function renderCalendar() {
  const label = document.getElementById('cal-label');
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  label.textContent = `${monthNames[calState.month - 1]} ${calState.year}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  daysOfWeek.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'cal-day-header';
    cell.textContent = d;
    grid.appendChild(cell);
  });

  const firstDay = new Date(calState.year, calState.month - 1, 1).getDay();
  const daysInMonth = new Date(calState.year, calState.month, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const tasksByDate = {};
  const allRelevant = [...calState.tasks, ...calState.overdue];
  allRelevant.forEach(t => {
    if (t.due_date) {
      if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = [];
      tasksByDate[t.due_date].push(t);
    }
  });

  const overdueSet = new Set();
  calState.overdue.forEach(t => {
    if (t.due_date) overdueSet.add(t.due_date);
  });

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day cal-day-empty';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calState.year}-${String(calState.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.dataset.date = dateStr;

    if (dateStr === today) cell.classList.add('cal-day-today');
    if (dateStr === calState.selectedDate) cell.classList.add('cal-day-selected');
    if (overdueSet.has(dateStr)) cell.classList.add('cal-day-overdue');

    const dayNum = document.createElement('span');
    dayNum.className = 'cal-day-num';
    dayNum.textContent = d;
    cell.appendChild(dayNum);

    if (tasksByDate[dateStr]) {
      const dotCount = Math.min(tasksByDate[dateStr].length, 4);
      const dots = document.createElement('div');
      dots.className = 'cal-day-dots';
      for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('span');
        dot.className = 'cal-day-dot';
        if (tasksByDate[dateStr][i].completed) dot.classList.add('cal-day-dot-completed');
        dots.appendChild(dot);
      }
      if (tasksByDate[dateStr].length > 4) {
        const more = document.createElement('span');
        more.className = 'cal-day-more';
        more.textContent = `+${tasksByDate[dateStr].length - 4}`;
        dots.appendChild(more);
      }
      cell.appendChild(dots);
    }

    cell.addEventListener('click', () => {
      document.querySelectorAll('.cal-day-selected').forEach(el => el.classList.remove('cal-day-selected'));
      cell.classList.add('cal-day-selected');
      calState.selectedDate = dateStr;
      showDateTasks(dateStr);
    });

    grid.appendChild(cell);
  }
}

function showDateTasks(dateStr) {
  const header = document.getElementById('cal-selected-date');
  const countEl = document.getElementById('cal-task-count');
  const list = document.getElementById('cal-task-list');

  const d = new Date(dateStr + 'T12:00:00');
  header.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const allRelevant = [...calState.tasks, ...calState.overdue];
  const dayTasks = allRelevant.filter(t => t.due_date === dateStr);

  if (dayTasks.length === 0) {
    countEl.textContent = '';
    list.innerHTML = '<div class="calendar-task-empty">No tasks for this date</div>';
  } else {
    countEl.textContent = `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}`;
    list.innerHTML = dayTasks.map(t => {
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = !t.completed && dateStr < today;
      return `
        <div class="calendar-task-item ${t.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
          <div class="calendar-task-item-left">
            <input type="checkbox" ${t.completed ? 'checked' : ''} data-task-id="${t.id}" class="cal-task-check">
            <span class="calendar-task-item-title">${escapeHtml(t.title)}</span>
          </div>
          <div class="calendar-task-item-meta">
            <span class="priority-badge priority-${t.priority || 'medium'}">${(t.priority || 'medium').charAt(0).toUpperCase() + (t.priority || 'medium').slice(1)}</span>
            <button class="cal-task-delete" data-task-id="${t.id}" title="Delete task">${icon('xmark', 'icon-sm')}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('cal-task-input').placeholder = `New task for ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}...`;
}

function clearCalendarTasks() {
  document.getElementById('cal-selected-date').textContent = 'Select a date';
  document.getElementById('cal-task-count').textContent = '';
  document.getElementById('cal-task-list').innerHTML = '<div class="calendar-task-empty">Click a date to view its tasks</div>';
}

function hideCalendarAddForm() {
  document.getElementById('cal-add-options').style.display = 'none';
  document.getElementById('cal-task-input').value = '';
  document.getElementById('cal-task-desc').value = '';
}

async function addCalendarTask() {
  const titleInput = document.getElementById('cal-task-input');
  const title = titleInput.value.trim();

  clearFieldError('cal-task-input');
  if (!title) {
    showFieldError('cal-task-input');
    showToast('Please enter a task title.', 'error');
    return;
  }

  if (!calState.selectedDate) {
    showToast('Please select a date first.', 'error');
    return;
  }

  const task = {
    title,
    description: document.getElementById('cal-task-desc').value.trim(),
    priority: document.getElementById('cal-task-priority').value,
    category: document.getElementById('cal-task-category').value,
    tags: '',
    due_date: calState.selectedDate
  };

  try {
    await api.post('/api/tasks', task);
    hideCalendarAddForm();
    showToast('Task added!', 'success');
    loadCalendarData();
    loadStats();
    loadRecentActivity();
    loadAnalytics();
  } catch (err) {
    showToast('Failed to add task.', 'error');
  }
}

document.getElementById('cal-task-list').addEventListener('change', async (e) => {
  if (e.target.classList.contains('cal-task-check')) {
    const taskId = e.target.dataset.taskId;
    const checked = e.target.checked;
    try {
      await api.put(`/api/tasks/${taskId}`, { completed: checked });
      showToast(checked ? 'Task completed!' : 'Task marked as pending', 'success');
      loadCalendarData();
      loadStats();
      loadRecentActivity();
      loadAnalytics();
    } catch (err) {
      showToast('Failed to update task.', 'error');
    }
  }
});

document.getElementById('cal-task-list').addEventListener('click', async (e) => {
  if (e.target.classList.contains('cal-task-delete')) {
    const taskId = e.target.dataset.taskId;
    deletingTaskId = taskId;
    deletingCallback = () => {
      loadCalendarData();
      loadStats();
      loadRecentActivity();
      loadAnalytics();
    };
    document.getElementById('confirm-modal').classList.add('active');
  }
});

loadAnalytics();
loadStats();
loadRecentActivity();
loadTasks();

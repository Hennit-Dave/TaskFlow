applyTheme(getSavedTheme());
initThemeToggle('theme-toggle');

const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

function showMessage(message, type) {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  authMessage.textContent = '';
  authMessage.className = 'auth-message';
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    clearMessage();
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showMessage('Please fill in all fields.', 'error');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('taskflow_token', data.token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    window.location.href = '/html/dashboard.html';
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (!name || !email || !password || !confirm) {
    showMessage('Please fill in all fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('Password must be at least 6 characters.', 'error');
    return;
  }

  if (password !== confirm) {
    showMessage('Passwords do not match.', 'error');
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating account...';

  try {
    const data = await api.post('/api/auth/register', { name, email, password });
    localStorage.setItem('taskflow_token', data.token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    window.location.href = '/html/dashboard.html';
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = 'Create Account';
  }
});

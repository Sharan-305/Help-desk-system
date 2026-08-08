/**
 * Authentication & Session Management Module
 * Role-Based Access Control (RBAC) & Dynamic Theme Switcher Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme immediately on load
  applySavedTheme();

  const user = API.getUser();
  const token = API.getToken();

  // Page protection logic
  const publicPages = ['login.html', 'register.html', 'index.html', '/'];
  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  if (!token && !publicPages.includes(currentPage)) {
    window.location.href = 'login.html';
    return;
  }

  // Admin-only page restriction
  if (user && currentPage === 'admin.html' && user.role !== 'Admin') {
    API.showToast('Access Denied: Admin privileges required', 'error');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    return;
  }

  // Apply Role-Based Section Adjustments across UI
  if (user) {
    applyRoleBasedUI(user, currentPage);
  }

  // Settings form submission listener
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSaveSettings);
  }

  // Theme selector instant preview listener
  const themeSelect = document.getElementById('settingsTheme');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  }

  // Logout listener
  const logoutBtns = document.querySelectorAll('.btn-logout, #logoutBtn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      API.clearSession();
      API.showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    });
  });
});

/**
 * Apply saved theme on page initialization
 */
function applySavedTheme() {
  const user = API.getUser();
  const savedTheme = (user?.settings?.themePreference) || localStorage.getItem('theme') || 'earth';
  setTheme(savedTheme);
}

/**
 * Instantly switch data-theme attribute on <html> element
 */
function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('theme', themeName);
}

/**
 * Dynamically adjust sections, sidebar queues, headers & badges per user role
 */
function applyRoleBasedUI(user, currentPage) {
  const userNames = document.querySelectorAll('.user-name');
  const userRoles = document.querySelectorAll('.user-role');
  const userAvatars = document.querySelectorAll('.avatar');

  userNames.forEach(el => el.innerText = user.name || 'User');
  userRoles.forEach(el => el.innerText = user.role || 'Customer');
  userAvatars.forEach(el => {
    if (user.name) el.innerText = user.name.charAt(0).toUpperCase();
  });

  if (user.role !== 'Admin') {
    const adminNavs = document.querySelectorAll('.admin-only');
    adminNavs.forEach(el => el.style.display = 'none');
  } else {
    const adminNavs = document.querySelectorAll('.admin-only');
    adminNavs.forEach(el => el.style.display = 'flex');
  }

  const queueHeader = document.querySelector('.sidebar-nav .nav-label');
  if (queueHeader) {
    if (user.role === 'Customer') {
      queueHeader.innerText = 'My Service Queues';
    } else if (user.role === 'Support Agent') {
      queueHeader.innerText = 'Agent Service Queues';
    } else if (user.role === 'Admin') {
      queueHeader.innerText = 'Master System Queues';
    }
  }
}

/**
 * Open & Populate Settings Modal Properties
 */
function openSettingsModal() {
  const user = API.getUser();
  if (!user) return;

  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  const nameInput = document.getElementById('settingsName');
  const emailInput = document.getElementById('settingsEmail');
  const deptInput = document.getElementById('settingsDepartment');
  const notifInput = document.getElementById('settingsNotifications');
  const refreshInput = document.getElementById('settingsAutoRefresh');
  const priorityInput = document.getElementById('settingsDefaultPriority');
  const themeInput = document.getElementById('settingsTheme');

  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (deptInput) deptInput.value = user.department || '';

  const settings = user.settings || {};
  if (notifInput) notifInput.checked = settings.emailNotifications !== false;
  if (refreshInput) refreshInput.value = settings.autoRefreshInterval !== undefined ? settings.autoRefreshInterval : 60;
  if (priorityInput) priorityInput.value = settings.defaultPriority || 'Medium';
  if (themeInput) themeInput.value = settings.themePreference || localStorage.getItem('theme') || 'earth';

  modal.classList.add('show');
}

/**
 * Save Settings Form Handler
 */
async function handleSaveSettings(e) {
  e.preventDefault();
  const name = document.getElementById('settingsName')?.value;
  const department = document.getElementById('settingsDepartment')?.value;
  const emailNotifications = document.getElementById('settingsNotifications')?.checked;
  const autoRefreshInterval = document.getElementById('settingsAutoRefresh')?.value;
  const defaultPriority = document.getElementById('settingsDefaultPriority')?.value;
  const themePreference = document.getElementById('settingsTheme')?.value || 'earth';

  const currentPassword = document.getElementById('settingsCurrentPassword')?.value;
  const newPassword = document.getElementById('settingsNewPassword')?.value;

  try {
    setTheme(themePreference);

    const data = await API.put('/users/profile', {
      name,
      department,
      settings: {
        emailNotifications,
        autoRefreshInterval,
        defaultPriority,
        themePreference
      },
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined
    });

    API.setUser(data.user);
    API.showToast('Settings & theme updated successfully!', 'success');
    closeModal('settingsModal');

    if (document.getElementById('settingsCurrentPassword')) {
      document.getElementById('settingsCurrentPassword').value = '';
    }
    if (document.getElementById('settingsNewPassword')) {
      document.getElementById('settingsNewPassword').value = '';
    }

    applyRoleBasedUI(data.user, window.location.pathname);
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

/**
 * Handle Login Form Submit
 */
async function handleLogin(email, password) {
  try {
    const data = await API.post('/auth/login', { email, password });
    API.setToken(data.token);
    API.setUser(data.user);

    applySavedTheme();

    API.showToast(`Welcome back, ${data.user.name}!`, 'success');

    setTimeout(() => {
      if (data.user.role === 'Admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'tickets.html';
      }
    }, 600);
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

/**
 * Handle Register Form Submit
 */
async function handleRegister(name, email, password, department) {
  try {
    const data = await API.post('/auth/register', { name, email, password, department });
    API.setToken(data.token);
    API.setUser(data.user);

    API.showToast('Registration successful!', 'success');
    setTimeout(() => {
      window.location.href = 'tickets.html';
    }, 800);
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

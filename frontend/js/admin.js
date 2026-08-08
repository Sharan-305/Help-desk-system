/**
 * Admin Panel & Control Center Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  if (!user || user.role !== 'Admin') {
    window.location.href = 'dashboard.html';
    return;
  }

  await loadUsersTable();
  await loadCategoriesTable();

  document.getElementById('createCategoryForm')?.addEventListener('submit', handleCreateCategory);
});

async function loadUsersTable() {
  try {
    const data = await API.get('/admin/users');
    const users = data.users || [];
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div style="font-weight: 600;">${escapeHtml(u.name)}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(u.email)}</div>
        </td>
        <td>
          <select class="form-select" onchange="updateUserRole('${u._id}', this.value)" style="padding: 4px 8px; font-size: 12px; width: 140px;">
            <option value="Customer" ${u.role === 'Customer' ? 'selected' : ''}>Customer</option>
            <option value="Support Agent" ${u.role === 'Support Agent' ? 'selected' : ''}>Support Agent</option>
            <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td>${escapeHtml(u.department || 'General')}</td>
        <td style="font-size: 12px; color: var(--text-secondary);">${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="promptEditDepartment('${u._id}', '${escapeHtml(u.department || '')}')">Edit Dept</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    API.showToast('Failed to load users: ' + error.message, 'error');
  }
}

async function updateUserRole(userId, newRole) {
  try {
    const data = await API.put(`/admin/users/${userId}/role`, { role: newRole });
    API.showToast(`User role updated to ${newRole}`, 'success');
  } catch (error) {
    API.showToast(error.message, 'error');
    await loadUsersTable();
  }
}

async function promptEditDepartment(userId, currentDept) {
  const newDept = prompt('Enter new department:', currentDept);
  if (newDept === null) return;

  try {
    await API.put(`/admin/users/${userId}/role`, { department: newDept.trim() });
    API.showToast('Department updated', 'success');
    await loadUsersTable();
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

async function loadCategoriesTable() {
  try {
    const data = await API.get('/admin/categories');
    const categories = data.categories || [];
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    if (categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No categories configured.</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map(c => `
      <tr>
        <td style="font-weight: 600;">${escapeHtml(c.name)}</td>
        <td style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(c.description || 'N/A')}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c._id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const name = document.getElementById('categoryName').value;
  const description = document.getElementById('categoryDescription').value;

  if (!name) return;

  try {
    await API.post('/admin/categories', { name, description });
    API.showToast('Category created successfully', 'success');
    document.getElementById('createCategoryForm').reset();
    closeModal('createCategoryModal');
    await loadCategoriesTable();
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

async function deleteCategory(catId) {
  if (!confirm('Are you sure you want to delete this category?')) return;

  try {
    await API.delete(`/admin/categories/${catId}`);
    API.showToast('Category deleted', 'success');
    await loadCategoriesTable();
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

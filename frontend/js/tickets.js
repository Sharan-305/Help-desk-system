/**
 * Ticket List & Management Module
 */

let allTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  if (!user) return;

  await loadTickets();
  await loadCategoriesDropdown();

  // Attach search & filter event listeners
  document.getElementById('searchInput')?.addEventListener('input', filterTickets);
  document.getElementById('statusFilter')?.addEventListener('change', filterTickets);
  document.getElementById('priorityFilter')?.addEventListener('change', filterTickets);
  document.getElementById('categoryFilter')?.addEventListener('change', filterTickets);

  // Handle Create Ticket Form Submit
  const createForm = document.getElementById('createTicketForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateTicket);
  }
});

async function loadTickets() {
  try {
    const data = await API.get('/tickets');
    allTickets = data.tickets || [];
    renderTicketsTable(allTickets);
  } catch (error) {
    API.showToast('Error loading tickets: ' + error.message, 'error');
  }
}

function renderTicketsTable(tickets) {
  const tbody = document.getElementById('ticketsTableBody');
  if (!tbody) return;

  if (tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
          No incidents found matching your search query.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const reporterName = t.createdBy?.name ? escapeHtml(t.createdBy.name) : 'User';
    const reporterInitial = reporterName.charAt(0).toUpperCase();
    
    const assigneeName = t.assignedTo?.name ? escapeHtml(t.assignedTo.name) : 'Unassigned';
    const assigneeInitial = t.assignedTo ? assigneeName.charAt(0).toUpperCase() : '?';

    // Format SLA elapsed time mock
    const createdMs = new Date(t.createdAt).getTime();
    const nowMs = Date.now();
    const diffMins = Math.max(1, Math.floor((nowMs - createdMs) / 60000));
    const timeDisplay = diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins/60)}h ${diffMins%60}m`;
    const isResolved = t.status === 'RESOLVED' || t.status === 'CLOSED';
    const responseHtml = isResolved 
      ? `<span style="font-weight:600; color:#006644;">${timeDisplay} ✔</span>`
      : `<span style="font-weight:600; color:#42526E;">${timeDisplay} 🕒</span>`;

    // Type indicator icon box
    const priorityTypeIcon = t.priority === 'Critical' || t.priority === 'High'
      ? `<span title="High Priority Incident" style="display:inline-flex; width:16px; height:16px; background:#DE350B; color:white; font-size:10px; align-items:center; justify-content:center; border-radius:2px; font-weight:bold;">▲</span>`
      : `<span title="Standard Support Ticket" style="display:inline-flex; width:16px; height:16px; background:#0052CC; color:white; font-size:10px; align-items:center; justify-content:center; border-radius:2px; font-weight:bold;">■</span>`;

    return `
      <tr onclick="window.location.href='ticket-details.html?id=${t.ticketId}'">
        <td style="width: 40px;" onclick="event.stopPropagation()"><input type="checkbox"></td>
        <td><span class="ticket-id-link">${t.ticketId}</span></td>
        <td class="ticket-title-cell">${escapeHtml(t.title)}</td>
        <td>${priorityTypeIcon}</td>
        <td>
          <div class="user-avatar-cell">
            <div class="small-avatar">${reporterInitial}</div>
            <span>${reporterName}</span>
          </div>
        </td>
        <td>
          <div class="user-avatar-cell">
            <div class="small-avatar" style="background:${t.assignedTo ? '#0052CC' : '#97A0AF'};">${assigneeInitial}</div>
            <span>${t.assignedTo ? assigneeName : '<span style="color:var(--text-muted);">Unassigned</span>'}</span>
          </div>
        </td>
        <td><span class="badge badge-${t.status.toLowerCase()}">${t.status.replace('_', ' ')}</span></td>
        <td>${responseHtml}</td>
      </tr>
    `;
  }).join('');
}

function filterTickets() {
  const searchVal = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const statusVal = document.getElementById('statusFilter')?.value || 'ALL';
  const priorityVal = document.getElementById('priorityFilter')?.value || 'ALL';
  const categoryVal = document.getElementById('categoryFilter')?.value || 'ALL';

  const filtered = allTickets.filter(t => {
    const matchesSearch = !searchVal || 
      t.ticketId.toLowerCase().includes(searchVal) ||
      t.title.toLowerCase().includes(searchVal) ||
      t.description.toLowerCase().includes(searchVal) ||
      (t.createdBy?.name || '').toLowerCase().includes(searchVal);

    const matchesStatus = statusVal === 'ALL' || t.status === statusVal;
    const matchesPriority = priorityVal === 'ALL' || t.priority === priorityVal;
    const matchesCategory = categoryVal === 'ALL' || t.category === categoryVal;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  renderTicketsTable(filtered);
}

async function loadCategoriesDropdown() {
  try {
    const data = await API.get('/admin/categories').catch(() => null);
    const categories = data?.categories || [
      { name: 'Technical Issue' },
      { name: 'Account Issue' },
      { name: 'Network Issue' },
      { name: 'Software Issue' },
      { name: 'Hardware Issue' },
      { name: 'Other' }
    ];

    const categorySelects = document.querySelectorAll('#ticketCategory, #categoryFilter');
    categorySelects.forEach(select => {
      if (!select) return;
      const isFilter = select.id === 'categoryFilter';
      let optionsHtml = isFilter ? '<option value="ALL">All Categories</option>' : '<option value="" disabled selected>Select Category</option>';

      categories.forEach(c => {
        optionsHtml += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`;
      });
      select.innerHTML = optionsHtml;
    });
  } catch (error) {
    console.error('Failed to load categories dropdown:', error);
  }
}

async function handleCreateTicket(e) {
  e.preventDefault();
  const title = document.getElementById('ticketTitle').value;
  const category = document.getElementById('ticketCategory').value;
  const priority = document.getElementById('ticketPriority').value;
  const description = document.getElementById('ticketDescription').value;

  if (!title || !category || !description) {
    API.showToast('Please fill in all required fields', 'warning');
    return;
  }

  try {
    const data = await API.post('/tickets', { title, category, priority, description });
    API.showToast(`Ticket ${data.ticket.ticketId} created successfully!`, 'success');
    closeModal('createTicketModal');
    document.getElementById('createTicketForm').reset();
    await loadTickets();
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

/**
 * Single Ticket Detail & Workflow Handler
 */

let currentTicketId = null;
let currentTicket = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  currentTicketId = urlParams.get('id');

  if (!currentTicketId) {
    API.showToast('No ticket ID provided', 'error');
    setTimeout(() => window.location.href = 'tickets.html', 1000);
    return;
  }

  await loadTicketDetails();
  await loadAgentsDropdown();

  document.getElementById('commentForm')?.addEventListener('submit', handleAddComment);
});

async function loadTicketDetails() {
  try {
    const data = await API.get(`/tickets/${currentTicketId}`);
    currentTicket = data.ticket;
    const comments = data.comments || [];

    renderTicketMeta(currentTicket);
    renderComments(comments);
    renderWorkflowActions(currentTicket);
  } catch (error) {
    API.showToast('Failed to load ticket details: ' + error.message, 'error');
  }
}

function renderTicketMeta(t) {
  document.getElementById('ticketIdDisplay').innerText = t.ticketId;
  const breadcrumbEl = document.getElementById('ticketBreadcrumbId');
  if (breadcrumbEl) breadcrumbEl.innerText = t.ticketId;
  document.getElementById('ticketTitle').innerText = t.title;
  document.getElementById('ticketDescription').innerText = t.description;
  document.getElementById('ticketCategory').innerText = t.category;

  const statusBadge = document.getElementById('ticketStatusBadge');
  if (statusBadge) {
    statusBadge.className = `badge badge-${t.status.toLowerCase()}`;
    statusBadge.innerText = t.status.replace('_', ' ');
  }

  const priorityTag = document.getElementById('ticketPriorityTag');
  if (priorityTag) {
    priorityTag.className = `priority-tag priority-${t.priority.toLowerCase()}`;
    priorityTag.innerHTML = `<span class="priority-icon">■</span> ${t.priority}`;
  }

  document.getElementById('createdByName').innerText = t.createdBy?.name || 'Unknown';
  document.getElementById('createdByEmail').innerText = t.createdBy?.email || '';

  const agentNameEl = document.getElementById('assignedAgentName');
  if (agentNameEl) {
    agentNameEl.innerText = t.assignedTo ? `${t.assignedTo.name} (${t.assignedTo.department || 'Support'})` : 'Unassigned';
  }

  document.getElementById('createdDate').innerText = new Date(t.createdAt).toLocaleString();
  document.getElementById('updatedDate').innerText = new Date(t.updatedAt).toLocaleString();

  const resolvedBox = document.getElementById('resolvedDateBox');
  if (resolvedBox) {
    if (t.resolvedAt) {
      resolvedBox.style.display = 'flex';
      document.getElementById('resolvedDate').innerText = new Date(t.resolvedAt).toLocaleString();
    } else {
      resolvedBox.style.display = 'none';
    }
  }
}

function renderComments(comments) {
  const commentList = document.getElementById('commentList');
  if (!commentList) return;

  if (comments.length === 0) {
    commentList.innerHTML = '<div style="color: var(--text-muted); padding: 12px 0;">No comments on this ticket yet.</div>';
    return;
  }

  commentList.innerHTML = comments.map(c => {
    const isSys = c.isSystem;
    const dateStr = new Date(c.createdAt).toLocaleString();
    const roleBadgeClass = c.userRole === 'Admin' ? 'accent-rose' : (c.userRole === 'Support Agent' ? 'accent-purple' : 'accent-cyan');

    return `
      <div class="comment-card ${isSys ? 'system-comment' : ''}">
        <div class="comment-meta">
          <div class="comment-author">
            <span>${escapeHtml(c.userName)}</span>
            <span style="font-size: 10px; font-weight: 700; color: var(--${roleBadgeClass}); background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px;">
              ${escapeHtml(c.userRole)}
            </span>
          </div>
          <span class="comment-time">${dateStr}</span>
        </div>
        <div class="comment-text">${escapeHtml(c.message)}</div>
      </div>
    `;
  }).join('');
}

function renderWorkflowActions(t) {
  const user = API.getUser();
  const container = document.getElementById('workflowActionsContainer');
  const assignContainer = document.getElementById('assignAgentBox');

  if (!container) return;

  let buttonsHtml = '';

  // Customer options: Close if open/assigned/in_progress/resolved; Reopen if closed/resolved
  if (user.role === 'Customer') {
    if (['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(t.status)) {
      buttonsHtml += `<button class="btn btn-danger btn-sm" onclick="changeStatus('CLOSED')">Close Ticket</button>`;
    }
    if (['RESOLVED', 'CLOSED'].includes(t.status)) {
      buttonsHtml += `<button class="btn btn-primary btn-sm" onclick="changeStatus('REOPENED')">Reopen Ticket</button>`;
    }
  } else {
    // Admin / Support Agent controls
    if (t.status === 'OPEN' || t.status === 'ASSIGNED') {
      buttonsHtml += `<button class="btn btn-primary btn-sm" onclick="changeStatus('IN_PROGRESS')">Mark In Progress</button>`;
    }
    if (t.status !== 'RESOLVED' && t.status !== 'CLOSED') {
      buttonsHtml += `<button class="btn btn-success btn-sm" onclick="changeStatus('RESOLVED')">Resolve Ticket</button>`;
    }
    if (t.status !== 'CLOSED') {
      buttonsHtml += `<button class="btn btn-danger btn-sm" onclick="changeStatus('CLOSED')">Close Ticket</button>`;
    }
    if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
      buttonsHtml += `<button class="btn btn-secondary btn-sm" onclick="changeStatus('REOPENED')">Reopen Ticket</button>`;
    }
  }

  container.innerHTML = buttonsHtml;

  // Show Agent Assignment select for Admin / Support Agent
  if (assignContainer && (user.role === 'Admin' || user.role === 'Support Agent')) {
    assignContainer.style.display = 'block';
  }
}

async function loadAgentsDropdown() {
  const user = API.getUser();
  if (!user || user.role === 'Customer') return;

  try {
    const data = await API.get('/users/agents');
    const agents = data.agents || [];
    const select = document.getElementById('assignAgentSelect');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select Support Agent</option>' +
      agents.map(a => `<option value="${a._id}">${escapeHtml(a.name)} (${a.department || 'Support'})</option>`).join('');

    if (currentTicket?.assignedTo?._id) {
      select.value = currentTicket.assignedTo._id;
    }
  } catch (error) {
    console.error('Failed to load support agents:', error);
  }
}

async function changeStatus(newStatus) {
  try {
    const data = await API.put(`/tickets/${currentTicket.ticketId}/status`, { status: newStatus });
    API.showToast(data.message, 'success');
    await loadTicketDetails();
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

async function assignSelectedAgent() {
  const select = document.getElementById('assignAgentSelect');
  const agentId = select?.value;

  if (!agentId) {
    API.showToast('Please select a support agent first', 'warning');
    return;
  }

  try {
    const data = await API.put(`/tickets/${currentTicket.ticketId}/assign`, { agentId });
    API.showToast(data.message, 'success');
    await loadTicketDetails();
  } catch (error) {
    API.showToast(error.message, 'error');
  }
}

async function handleAddComment(e) {
  e.preventDefault();
  const input = document.getElementById('commentMessage');
  const message = input?.value.trim();

  if (!message) return;

  try {
    await API.post(`/tickets/${currentTicket.ticketId}/comments`, { message });
    input.value = '';
    API.showToast('Comment posted', 'success');
    await loadTicketDetails();
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

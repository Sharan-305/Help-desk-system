/**
 * Dashboard Logic & Chart Rendering
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = API.getUser();
  if (!user) return;

  await loadDashboardStats();
  await loadRecentTickets();
});

async function loadDashboardStats() {
  try {
    const user = API.getUser();
    let statsData;

    if (user.role === 'Admin') {
      const data = await API.get('/admin/dashboard');
      statsData = data.stats;
      renderCharts(data.stats, data.categoryStats, data.priorityStats);
    } else {
      // For Customer / Agent fetch tickets and calculate stats
      const ticketsData = await API.get('/tickets');
      const tickets = ticketsData.tickets || [];

      statsData = {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'OPEN').length,
        assignedTickets: tickets.filter(t => t.status === 'ASSIGNED').length,
        inProgressTickets: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolvedTickets: tickets.filter(t => t.status === 'RESOLVED').length,
        closedTickets: tickets.filter(t => t.status === 'CLOSED').length,
        criticalPriorityTickets: tickets.filter(t => t.priority === 'Critical' || t.priority === 'High').length
      };

      renderChartsFromTickets(tickets);
    }

    // Populate DOM cards
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val !== undefined ? val : 0;
    };

    setVal('statTotal', statsData.totalTickets);
    setVal('statOpen', statsData.openTickets);
    setVal('statAssigned', statsData.assignedTickets);
    setVal('statInProgress', statsData.inProgressTickets);
    setVal('statResolved', statsData.resolvedTickets);
    setVal('statClosed', statsData.closedTickets);
    setVal('statCritical', statsData.criticalPriorityTickets || statsData.highOrCriticalTickets);

    if (statsData.totalUsers !== undefined) {
      setVal('statUsers', statsData.totalUsers);
      setVal('statAgents', statsData.totalAgents);
    }
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
  }
}

async function loadRecentTickets() {
  try {
    const data = await API.get('/tickets');
    const tickets = (data.tickets || []).slice(0, 5); // top 5 recent

    const listEl = document.getElementById('recentTicketsList');
    if (!listEl) return;

    if (tickets.length === 0) {
      listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No tickets found. Create your first ticket!</div>';
      return;
    }

    listEl.innerHTML = tickets.map(t => `
      <div class="activity-item" onclick="window.location.href='ticket-details.html?id=${t.ticketId}'" style="cursor: pointer;">
        <div class="activity-main">
          <span class="activity-id">${t.ticketId}</span>
          <div>
            <div class="activity-title">${escapeHtml(t.title)}</div>
            <div class="activity-meta">Category: ${escapeHtml(t.category)} • Created by ${escapeHtml(t.createdBy?.name || 'User')}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
          <span class="priority-tag priority-${t.priority.toLowerCase()}">
            <span class="priority-dot"></span>${t.priority}
          </span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load recent tickets:', error);
  }
}

function renderCharts(stats, categoryStats = [], priorityStats = []) {
  if (typeof Chart === 'undefined') return;

  // Status Donut Chart
  const statusCtx = document.getElementById('statusChart')?.getContext('2d');
  if (statusCtx) {
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened'],
        datasets: [{
          data: [
            stats.openTickets,
            stats.assignedTickets,
            stats.inProgressTickets,
            stats.resolvedTickets,
            stats.closedTickets,
            stats.reopenedTickets || 0
          ],
          backgroundColor: ['#0052CC', '#6554C0', '#FF8B00', '#008DA6', '#42526E', '#DE350B'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#5E6C84', font: { family: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' } } }
        }
      }
    });
  }

  // Priority Distribution Bar Chart
  const priorityCtx = document.getElementById('priorityChart')?.getContext('2d');
  if (priorityCtx) {
    const low = priorityStats.find(p => p._id === 'Low')?.count || 0;
    const med = priorityStats.find(p => p._id === 'Medium')?.count || 0;
    const high = priorityStats.find(p => p._id === 'High')?.count || 0;
    const crit = priorityStats.find(p => p._id === 'Critical')?.count || 0;

    new Chart(priorityCtx, {
      type: 'bar',
      data: {
        labels: ['Low', 'Medium', 'High', 'Critical'],
        datasets: [{
          label: 'Number of Tickets',
          data: [low, med, high, crit],
          backgroundColor: ['#008DA6', '#0052CC', '#FF8B00', '#DE350B'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: '#5E6C84', stepSize: 1 }, grid: { color: '#EBECF0' } },
          x: { ticks: { color: '#5E6C84' }, grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function renderChartsFromTickets(tickets) {
  if (typeof Chart === 'undefined') return;

  const open = tickets.filter(t => t.status === 'OPEN').length;
  const assigned = tickets.filter(t => t.status === 'ASSIGNED').length;
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved = tickets.filter(t => t.status === 'RESOLVED').length;
  const closed = tickets.filter(t => t.status === 'CLOSED').length;
  const reopened = tickets.filter(t => t.status === 'REOPENED').length;

  const low = tickets.filter(t => t.priority === 'Low').length;
  const med = tickets.filter(t => t.priority === 'Medium').length;
  const high = tickets.filter(t => t.priority === 'High').length;
  const crit = tickets.filter(t => t.priority === 'Critical').length;

  renderCharts(
    { openTickets: open, assignedTickets: assigned, inProgressTickets: inProgress, resolvedTickets: resolved, closedTickets: closed, reopenedTickets: reopened },
    [],
    [{ _id: 'Low', count: low }, { _id: 'Medium', count: med }, { _id: 'High', count: high }, { _id: 'Critical', count: crit }]
  );
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

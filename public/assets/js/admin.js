// admin.js - WanTok Admin Dashboard

let adminData = {
  analytics: null,
  reports: [],
  suspensions: [],
  users: [],
  onlineUsers: 0
};

let adminSession = null;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check admin authentication
  checkAdminAuth();

  // Load initial data
  loadAllData();

  // Setup tab switching
  setupTabs();

  // Auto-refresh every 30 seconds
  setInterval(loadAllData, 30000);
});

// Check admin authentication
function checkAdminAuth() {
  const session = sessionStorage.getItem('adminSession');

  if (!session) {
    // Not logged in, redirect to login page
    window.location.href = '/admin-login';
    return;
  }

  try {
    adminSession = JSON.parse(session);

    // Check if session expired
    if (adminSession.expiresAt < Date.now()) {
      sessionStorage.removeItem('adminSession');
      window.location.href = '/admin-login';
      return;
    }
  } catch (error) {
    console.error('Invalid admin session:', error);
    sessionStorage.removeItem('adminSession');
    window.location.href = '/admin-login';
  }
}

// Setup tab switching
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');

      // Hide all sections
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

      // Show selected section
      const sectionId = tab.getAttribute('data-tab') + '-section';
      document.getElementById(sectionId).classList.add('active');
    });
  });
}

// Load all data from server
async function loadAllData() {
  try {
    // Fetch analytics
    const analyticsResponse = await fetch('/api/admin/analytics');
    const analyticsData = await analyticsResponse.json();
    if (analyticsData.success) {
      adminData.analytics = analyticsData.analytics;
    } else {
      console.error('Analytics fetch failed:', analyticsData);
    }

    // Fetch all reports
    const reportsResponse = await fetch('/api/admin/all-reports');
    const reportsData = await reportsResponse.json();
    if (reportsData.success) {
      adminData.reports = reportsData.reports || [];
    }

    // Fetch all suspensions
    const suspensionsResponse = await fetch('/api/admin/suspensions');
    const suspensionsData = await suspensionsResponse.json();
    if (suspensionsData.success) {
      adminData.suspensions = suspensionsData.suspensions || [];
    }

    // Fetch all users
    const usersResponse = await fetch('/api/admin/all-users');
    const usersData = await usersResponse.json();
    if (usersData.success) {
      adminData.users = usersData.users || [];
    }

    // Fetch online users count
    try {
      const onlineResponse = await fetch('/api/online-count');
      if (onlineResponse.ok) {
        const onlineData = await onlineResponse.json();
        adminData.onlineUsers = onlineData.count || 0;
      } else {
        console.error('Online count fetch failed with status:', onlineResponse.status);
        adminData.onlineUsers = 0;
      }
    } catch (onlineError) {
      console.error('Error fetching online count:', onlineError);
      adminData.onlineUsers = 0;
    }

    // Update all sections
    updateStats();
    updateReportsTable();
    updateSuspendedTable();
    updateUsersTable();

  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

// Update statistics cards
function updateStats() {
  if (adminData.analytics) {
    document.getElementById('totalUsers').textContent = adminData.analytics.totalUsers;
    document.getElementById('totalReports').textContent = adminData.analytics.totalReports;
    document.getElementById('totalViolations').textContent = adminData.analytics.totalSuspensions;
    document.getElementById('suspendedCount').textContent = adminData.analytics.totalSuspensions;
    document.getElementById('permanentBans').textContent = adminData.analytics.permanentBans;
  }
  document.getElementById('onlineUsers').textContent = adminData.onlineUsers;
}

// Update reports table
function updateReportsTable() {
  const container = document.getElementById('reports-content');

  if (adminData.reports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No reports yet</p>
      </div>
    `;
    return;
  }

  const sortedReports = adminData.reports.sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  const html = `
    <table>
      <thead>
        <tr>
          <th>Reporter ID</th>
          <th>Reported ID</th>
          <th>Reason</th>
          <th>Status</th>
          <th>AI Checked</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sortedReports.map(report => `
          <tr>
            <td><strong>${report.reporter_user_id.substring(0, 8)}...</strong></td>
            <td><strong>${report.reported_user_id.substring(0, 8)}...</strong></td>
            <td><span class="badge badge-warning">${report.reason}</span></td>
            <td><span class="badge badge-${getStatusBadgeClass(report.status)}">${report.status}</span></td>
            <td>${report.ai_checked ?
              '<span class="badge badge-success">Yes</span>' :
              '<span class="badge badge-info">No</span>'
            }</td>
            <td>${formatDate(report.created_at)}</td>
            <td>
              <button class="action-btn action-btn-view" onclick='viewDetails(${JSON.stringify(report)})'>
                <i class="fas fa-eye"></i> View
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Update suspended users table
function updateSuspendedTable() {
  const container = document.getElementById('suspended-content');

  if (adminData.suspensions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-check"></i>
        <p>No suspended users</p>
      </div>
    `;
    return;
  }

  const sortedSuspended = adminData.suspensions.sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  const html = `
    <table>
      <thead>
        <tr>
          <th>User ID</th>
          <th>Username</th>
          <th>Type</th>
          <th>Reason</th>
          <th>Suspended</th>
          <th>Expires</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sortedSuspended.map(suspension => `
          <tr>
            <td><strong>${suspension.user_id.substring(0, 8)}...</strong></td>
            <td><strong>${suspension.username || 'N/A'}</strong></td>
            <td>
              ${suspension.suspension_type === 'permanent' ?
                '<span class="badge badge-danger">Permanent</span>' :
                '<span class="badge badge-warning">Temporary</span>'
              }
            </td>
            <td>${suspension.reason}</td>
            <td>${formatDate(suspension.created_at)}</td>
            <td>${suspension.expires_at ? formatDate(suspension.expires_at) : 'Never'}</td>
            <td>
              <button class="action-btn action-btn-view" onclick='viewDetails(${JSON.stringify(suspension)})'>
                <i class="fas fa-eye"></i> View
              </button>
              <button class="action-btn action-btn-unban" onclick="unbanUser('${suspension.user_id}')">
                <i class="fas fa-user-check"></i> Unban
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Update users table
function updateUsersTable() {
  const container = document.getElementById('users-content');

  if (adminData.users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <p>No users found</p>
      </div>
    `;
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Full Name</th>
          <th>Email</th>
          <th>Gender</th>
          <th>Country</th>
          <th>Tokens</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${adminData.users.map(user => {
          const isSuspended = adminData.suspensions.some(s => s.user_id === user.id);
          return `
            <tr>
              <td><strong>${user.username || 'N/A'}</strong></td>
              <td>${user.full_name}</td>
              <td>${user.email}</td>
              <td>${user.gender || 'N/A'}</td>
              <td>${user.country || 'N/A'}</td>
              <td>${user.tokens || 0}</td>
              <td>${formatDate(user.created_at)}</td>
              <td>
                <button class="action-btn action-btn-view" onclick='viewDetails(${JSON.stringify(user)})'>
                  <i class="fas fa-eye"></i> View
                </button>
                ${!isSuspended ?
                  `<button class="action-btn action-btn-ban" onclick="banUser('${user.id}', '${user.username || user.email}')">
                    <i class="fas fa-ban"></i> Ban
                  </button>` :
                  ''
                }
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Helper function to get badge class for status
function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'reviewed': return 'info';
    case 'dismissed': return 'secondary';
    case 'actioned': return 'success';
    default: return 'info';
  }
}

// View details in modal
function viewDetails(data) {
  const modal = document.getElementById('detailsModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  title.textContent = 'Details';
  body.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;

  modal.classList.add('active');
}

// Close modal
function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
}

// Ban user manually
async function banUser(userId, username) {
  const reason = prompt('Enter ban reason:');
  if (!reason) return;

  const permanent = confirm('Permanent ban? (OK = Permanent, Cancel = 7 days)');

  try {
    const response = await fetch('/api/moderation-violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        reason: permanent ? `Manual ban: ${reason}` : `Temporary ban: ${reason}`,
        source: 'manual-admin-action',
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`User ${username} has been ${permanent ? 'permanently' : 'temporarily'} banned.`);
      loadAllData(); // Reload data
    } else {
      alert('Failed to ban user');
    }
  } catch (error) {
    console.error('Error banning user:', error);
    alert('Error banning user');
  }
}

// Unban user
async function unbanUser(userId) {
  if (!confirm('Are you sure you want to unban this user?')) return;

  try {
    const response = await fetch('/api/admin/unban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const result = await response.json();

    if (result.success) {
      alert('User has been unbanned');
      loadAllData(); // Reload data
    } else {
      alert('Failed to unban user');
    }
  } catch (error) {
    console.error('Error unbanning user:', error);
    alert('Error unbanning user');
  }
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Logout
function logout() {
  sessionStorage.removeItem('adminSession');
  window.location.href = '/admin-login';
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('detailsModal');
  if (e.target === modal) {
    closeModal();
  }
});

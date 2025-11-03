// admin-login.js - Admin Login Page

document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in as admin
  const adminSession = sessionStorage.getItem('adminSession');
  if (adminSession) {
    try {
      const session = JSON.parse(adminSession);
      if (session.expiresAt > Date.now()) {
        // Still valid, redirect to dashboard
        window.location.href = '/admin';
        return;
      } else {
        // Expired, clear session
        sessionStorage.removeItem('adminSession');
      }
    } catch (error) {
      sessionStorage.removeItem('adminSession');
    }
  }

  // Setup form submission
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = document.getElementById('submitBtn');

  // Validate inputs
  if (!email || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="loading-spinner"></div>
    <span>Authenticating...</span>
  `;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Store admin session
      const session = {
        adminId: data.admin.id,
        email: data.admin.email,
        fullName: data.admin.full_name,
        role: data.admin.role,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      sessionStorage.setItem('adminSession', JSON.stringify(session));

      showNotification('Login successful! Redirecting...', 'success');

      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification(error.message || 'Invalid credentials. Please try again.', 'error');

    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <i class="fas fa-sign-in-alt"></i>
      <span>Login to Dashboard</span>
    `;
  }
}

function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;

  // Show notification
  setTimeout(() => notification.classList.add('show'), 10);

  // Hide after 4 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 4000);
}

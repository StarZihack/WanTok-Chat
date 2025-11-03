// verify-age.js - Age verification page script

// Check if user is logged in and needs verification
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
  window.location.href = '/';
} else {
  // Handle both profileComplete and profile_complete
  const profileComplete = currentUser.profileComplete ?? currentUser.profile_complete ?? false;
  if (profileComplete && currentUser.age && currentUser.gender) {
    // Only redirect to main if profile is complete AND has age and gender
    window.location.href = '/main';
  }
}

// UI elements
const verifyBtn = document.getElementById('verifyBtn');
const usernameInput = document.getElementById('verifyUsername');
const genderSelect = document.getElementById('verifyGender');
const dobInput = document.getElementById('verifyDOB');
const agreeCheckbox = document.getElementById('agreeCheckbox');

// Pre-fill username if user already has one
if (currentUser.username) {
  usernameInput.value = currentUser.username;
  usernameInput.disabled = true; // Don't allow changing username
  usernameInput.style.opacity = '0.7';
  usernameInput.style.cursor = 'not-allowed';
}

// Pre-fill gender if user already has one
if (currentUser.gender) {
  genderSelect.value = currentUser.gender;
}

// Notification Function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  let icon = 'info-circle';
  let background = 'linear-gradient(135deg, #bb86fc, #9f67e0)';

  if (type === 'success') {
    icon = 'check-circle';
    background = 'linear-gradient(135deg, #03dac6, #00a896)';
  } else if (type === 'error') {
    icon = 'exclamation-circle';
    background = 'linear-gradient(135deg, #ff1744, #d50000)';
  }

  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${background};
    color: white;
    padding: 15px 25px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Verify Button Handler
verifyBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const gender = genderSelect.value;
  const dob = dobInput.value;
  const agreed = agreeCheckbox.checked;

  // Validation - username is optional if user already has one
  if (!gender || !dob) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  // If username is required (user doesn't have one) and not provided
  if (!currentUser.username && !username) {
    showNotification('Please enter a username', 'error');
    return;
  }

  if (!agreed) {
    showNotification('You must agree to the terms to continue', 'error');
    return;
  }

  // Validate username only if provided (for new users or if being changed)
  if (username && !currentUser.username) {
    // Check for spaces first
    if (username.includes(' ')) {
      showNotification('Username cannot contain spaces', 'error');
      return;
    }

    // Check format (letters, numbers, underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      showNotification('Username must be 3-20 characters (letters, numbers, underscore only - no spaces)', 'error');
      return;
    }
  }

  // Calculate age
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Validate age (must be 18+)
  if (age < 18) {
    showNotification('You must be at least 18 years old to use this service', 'error');
    return;
  }

  // Disable button during request
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

  try {
    const response = await fetch('/api/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        username,
        gender,
        dob
      })
    });

    const data = await response.json();

    if (data.success) {
      // Update local storage with completed profile
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      showNotification('Profile completed successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/main';
      }, 500);
    } else {
      showNotification(data.message || 'Verification failed', 'error');
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify and Continue';
    }
  } catch (error) {
    showNotification('Connection error', 'error');
    console.error('Verification error:', error);
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify and Continue';
  }
});

// Enter key support
dobInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && agreeCheckbox.checked) verifyBtn.click();
});

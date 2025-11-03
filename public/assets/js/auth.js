// auth.js - Authentication page script

// Check if user is already logged in
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (currentUser) {
  // Check if profile needs completion
  if (currentUser.profileComplete === false || !currentUser.age || !currentUser.gender) {
    window.location.href = '/verify-age';
  } else {
    window.location.href = '/main';
  }
}

// UI elements
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');

// Auth Tab Switching
loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.style.display = 'flex';
  registerForm.style.display = 'none';
});

registerTab.addEventListener('click', () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerForm.style.display = 'flex';
  loginForm.style.display = 'none';
});

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

// Login Handler
loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  // Disable button during request
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      // Check if user is suspended before allowing login
      const suspensionCheck = await fetch('/api/check-suspension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          username: data.user.username
        })
      });

      const suspensionData = await suspensionCheck.json();

      if (suspensionData.suspended) {
        // User is suspended, show message
        const message = suspensionData.suspensionType === 'permanent'
          ? `Your account has been permanently suspended.\n\nReason: ${suspensionData.reason}\n\nIf you believe this is a mistake, contact support.`
          : `Your account has been temporarily suspended until ${new Date(suspensionData.expiresAt).toLocaleString()}.\n\nReason: ${suspensionData.reason}`;

        showNotification('Account Suspended', 'error');
        alert(`⚠️ ACCOUNT SUSPENDED\n\n${message}`);

        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        return;
      }

      // User is not suspended, proceed with login
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      showNotification('Login successful!', 'success');
      setTimeout(() => {
        // Check if profile is complete AND has age and gender
        if (data.user.profileComplete === false || !data.user.age || !data.user.gender) {
          window.location.href = '/verify-age';
        } else {
          window.location.href = '/main';
        }
      }, 500);
    } else {
      showNotification(data.message || 'Login failed', 'error');
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  } catch (error) {
    showNotification('Connection error', 'error');
    console.error('Login error:', error);
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
});

// Register Handler
registerBtn.addEventListener('click', async () => {
  const fullName = document.getElementById('registerFullName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const country = document.getElementById('registerCountry').value;

  if (!fullName || !email || !password || !country) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showNotification('Please enter a valid email', 'error');
    return;
  }

  // Basic password validation
  if (password.length < 6) {
    showNotification('Password must be at least 6 characters', 'error');
    return;
  }

  // Disable button during request
  registerBtn.disabled = true;
  registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, country })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      showNotification('Registration successful!', 'success');
      setTimeout(() => {
        // Redirect to age verification page
        window.location.href = '/verify-age';
      }, 500);
    } else {
      showNotification(data.message || 'Registration failed', 'error');
      registerBtn.disabled = false;
      registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  } catch (error) {
    showNotification('Connection error', 'error');
    console.error('Register error:', error);
    registerBtn.disabled = false;
    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
  }
});

// Enter key support
document.getElementById('loginPassword').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

document.getElementById('registerPassword').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') registerBtn.click();
});

// Custom Country Dropdown with Search
function initCustomCountryDropdown() {
  const selectElement = document.getElementById('registerCountry');
  const container = selectElement.closest('.input-with-icon');

  // Get all countries from the select options
  const countries = Array.from(selectElement.options).slice(1).map(opt => ({
    value: opt.value,
    text: opt.text
  }));

  // Hide the original select
  selectElement.style.display = 'none';

  // Hide the globe icon (input-icon) from the parent container
  const globeIcon = container.querySelector('.input-icon');
  if (globeIcon) {
    globeIcon.style.display = 'none';
    globeIcon.style.visibility = 'hidden';
    globeIcon.style.opacity = '0';
  }

  // Add class to container for additional CSS targeting
  container.classList.add('has-custom-dropdown');

  // Create custom dropdown HTML
  const customDropdown = document.createElement('div');
  customDropdown.className = 'custom-dropdown';
  customDropdown.innerHTML = `
    <div class="custom-dropdown-selected">
      <i class="fas fa-globe custom-dropdown-icon"></i>
      <span class="selected-text">Select Country</span>
      <i class="fas fa-chevron-down dropdown-arrow"></i>
    </div>
    <div class="custom-dropdown-menu">
      <div class="dropdown-search-wrapper">
        <i class="fas fa-search"></i>
        <input type="text" class="dropdown-search" placeholder="Search countries...">
      </div>
      <div class="dropdown-options">
        ${countries.map(country => `
          <div class="dropdown-option" data-value="${country.value}">
            ${country.text}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Split dropdown - button stays in container, menu goes to body
  const menu = customDropdown.querySelector('.custom-dropdown-menu');
  container.appendChild(customDropdown);
  document.body.appendChild(menu); // Append menu to body to avoid overflow issues

  const selected = customDropdown.querySelector('.custom-dropdown-selected');
  const selectedText = customDropdown.querySelector('.selected-text');
  const searchInput = menu.querySelector('.dropdown-search');
  const options = menu.querySelectorAll('.dropdown-option');
  const arrow = customDropdown.querySelector('.dropdown-arrow');

  // Function to update menu position
  function updateMenuPosition() {
    const rect = selected.getBoundingClientRect();
    const menuMaxHeight = 380; // Increased max-height
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth <= 768;

    // Calculate if dropdown should open upward or downward
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Adjust positioning for mobile
    const gap = isMobile ? 4 : 8;
    const margin = isMobile ? 5 : 10;

    let top;
    let actualMenuHeight = menuMaxHeight;

    // Adjust height if needed to fit viewport
    if (spaceBelow < menuMaxHeight && spaceAbove < menuMaxHeight) {
      actualMenuHeight = Math.max(spaceBelow, spaceAbove) - gap - margin;
    }

    if (spaceBelow >= actualMenuHeight || spaceBelow >= spaceAbove) {
      // Open downward - start right below the button (no gap)
      top = rect.bottom;
      // Make sure it doesn't go off bottom
      if (top + actualMenuHeight > viewportHeight - margin) {
        actualMenuHeight = viewportHeight - top - margin;
      }
    } else {
      // Open upward
      top = rect.top - actualMenuHeight;
      // Make sure it doesn't go off top
      if (top < margin) {
        top = margin;
        actualMenuHeight = rect.top - margin;
      }
    }

    // Ensure dropdown doesn't go off left/right edges
    let left = rect.left;
    let width = rect.width;

    if (isMobile) {
      // On mobile, use more of the screen width if needed
      if (width < 280) {
        left = Math.max(margin, rect.left);
        width = Math.min(rect.width, viewportWidth - (2 * margin));
      }
    }

    if (left + width > viewportWidth - margin) {
      left = viewportWidth - width - margin;
    }
    if (left < margin) {
      left = margin;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.width = `${width}px`;
    menu.style.maxHeight = `${actualMenuHeight}px`;
  }

  // Toggle dropdown
  selected.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('show');

    if (isOpen) {
      menu.classList.remove('show');
      selected.classList.remove('active');
      arrow.style.transform = 'rotate(0deg)';
    } else {
      // Calculate and set position
      updateMenuPosition();

      menu.classList.add('show');
      selected.classList.add('active');
      arrow.style.transform = 'rotate(180deg)';

      // Small delay to ensure menu is visible before focusing
      setTimeout(() => searchInput.focus(), 50);
    }
  });

  // Update position on window resize/scroll
  window.addEventListener('resize', () => {
    if (menu.classList.contains('show')) {
      updateMenuPosition();
    }
  });

  window.addEventListener('scroll', () => {
    if (menu.classList.contains('show')) {
      updateMenuPosition();
    }
  }, true);

  // Select option
  options.forEach(option => {
    option.addEventListener('click', () => {
      const value = option.dataset.value;
      const text = option.textContent.trim();

      selectedText.textContent = text;
      selectElement.value = value;

      // Remove previous selection
      options.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');

      menu.classList.remove('show');
      selected.classList.remove('active');
      arrow.style.transform = 'rotate(0deg)';
      searchInput.value = '';

      // Show all options again
      options.forEach(opt => opt.style.display = 'block');
    });
  });

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();

    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.style.display = 'block';
      } else {
        option.style.display = 'none';
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!customDropdown.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('show');
      selected.classList.remove('active');
      arrow.style.transform = 'rotate(0deg)';
    }
  });

  // Prevent menu from closing when clicking inside
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Initialize custom dropdown when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCountryDropdown);
} else {
  initCustomCountryDropdown();
}

// profile.js - Profile page script

// currentUser is already declared in socket-shared.js
// Check if user is logged in
if (!currentUser) {
  window.location.href = '/';
}

// Check if user has completed profile/age verification
// Also check if existing users have age and gender specified
// Handle both profileComplete and profile_complete
const profileComplete = currentUser?.profileComplete ?? currentUser?.profile_complete ?? false;
if (currentUser && (profileComplete === false || !currentUser.age || !currentUser.gender)) {
  window.location.href = '/verify-age';
}

// Back to home button
document.getElementById('backToHome').addEventListener('click', () => {
  window.location.href = '/main';
});

// Logout button
document.querySelector('.logout-btn').addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  window.location.href = '/';
});

// Load user profile
function loadUserProfile() {
  // Handle both camelCase (from client) and snake_case (from database)
  const fullName = currentUser.fullName || currentUser.full_name || 'Guest';
  const username = currentUser.username || 'user' + Math.floor(Math.random() * 1000);
  const gender = currentUser.gender || 'Not specified';
  const age = currentUser.age || 'Not specified';
  const country = currentUser.country || 'Not specified';
  const email = currentUser.email || 'No email';

  document.getElementById('profileFullName').textContent = fullName;
  document.getElementById('profileUsername').textContent = '@' + username;
  document.getElementById('profileGender').textContent = gender;
  document.getElementById('profileAge').textContent = age;
  document.getElementById('profileCountry').textContent = country;
  document.getElementById('profileEmail').textContent = email;
}

// Initialize
loadUserProfile();

// Notification function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  let icon = 'info-circle';
  let background = 'linear-gradient(135deg, #bb86fc, #9f67e0)';

  if (type === 'success') {
    icon = 'check-circle';
    background = 'linear-gradient(135deg, #03dac6, #00a896)';
  } else if (type === 'error') {
    icon = 'exclamation-circle';
    background = 'linear-gradient(135deg, #ff1744, #d50000)';
  }

  notification.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
  notification.style.cssText = `
    position: fixed; top: 100px; right: 20px; background: ${background};
    color: white; padding: 15px 25px; border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000;
    display: flex; align-items: center; gap: 10px; font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Modal elements
const modal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const modalLabel = document.getElementById('modalLabel');
const modalInput = document.getElementById('modalInput');
const modalSelect = document.getElementById('modalSelect');
const searchInput = document.getElementById('searchInput');
const dateInput = document.getElementById('dateInput');
const customCalendar = document.getElementById('customCalendar');
const modalClose = document.querySelector('.modal-close');
const cancelBtn = document.querySelector('.cancel-btn');
const saveBtn = document.querySelector('.save-btn');

let currentField = '';
let selectedDate = null;

// Countries list
const countries = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Spain", "Italy",
  "Japan", "China", "South Korea", "India", "Brazil", "Mexico", "Argentina", "Chile",
  "Russia", "Poland", "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", "Norway",
  "Denmark", "Finland", "Ireland", "Portugal", "Greece", "Turkey", "Egypt", "South Africa",
  "Nigeria", "Kenya", "Thailand", "Vietnam", "Philippines", "Indonesia", "Malaysia", "Singapore",
  "New Zealand", "Israel", "Saudi Arabia", "UAE", "Pakistan", "Bangladesh", "Colombia", "Peru"
].sort();

// Edit button handlers
document.querySelectorAll('.edit-name-btn, .edit-username-btn, .setting-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const field = btn.getAttribute('data-field');
    openEditModal(field);
  });
});

function openEditModal(field) {
  currentField = field;
  modal.style.display = 'flex';

  // Reset all inputs
  modalInput.style.display = 'none';
  modalSelect.style.display = 'none';
  searchInput.style.display = 'none';
  dateInput.style.display = 'none';
  customCalendar.style.display = 'none';

  switch(field) {
    case 'fullName':
      modalTitle.textContent = 'Edit Full Name';
      modalLabel.textContent = 'Full Name';
      modalInput.style.display = 'block';
      modalInput.value = currentUser.fullName || currentUser.full_name || '';
      modalInput.type = 'text';
      modalInput.placeholder = 'Enter your full name';
      break;

    case 'username':
      modalTitle.textContent = 'Edit Username';
      modalLabel.textContent = 'Username';
      modalInput.style.display = 'block';
      modalInput.value = currentUser.username || '';
      modalInput.type = 'text';
      modalInput.placeholder = 'Enter username';
      break;

    case 'age':
      modalTitle.textContent = 'Edit Date of Birth';
      modalLabel.textContent = 'Date of Birth';
      dateInput.style.display = 'block';
      customCalendar.style.display = 'block';

      // Extract DOB from age string if it exists
      const ageString = currentUser.age || '';
      const dobMatch = ageString.match(/DOB: (\d{2})\/(\d{2})\/(\d{4})/);
      if (dobMatch) {
        selectedDate = new Date(dobMatch[3], dobMatch[1] - 1, dobMatch[2]);
        dateInput.value = `${dobMatch[1]}/${dobMatch[2]}/${dobMatch[3]}`;
      }
      initCalendar();
      break;

    case 'country':
      modalTitle.textContent = 'Select Country';
      modalLabel.textContent = 'Country';
      searchInput.style.display = 'block';
      modalSelect.style.display = 'block';
      populateCountries();

      const userCountry = currentUser.country || '';
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = countries.filter(c => c.toLowerCase().includes(searchTerm));
        modalSelect.innerHTML = filtered.map(c =>
          `<option value="${c}" ${userCountry === c ? 'selected' : ''}>${c}</option>`
        ).join('');
      });
      break;

    case 'password':
      modalTitle.textContent = 'Change Password';
      modalLabel.textContent = 'New Password';
      modalInput.style.display = 'block';
      modalInput.value = '';
      modalInput.type = 'password';
      modalInput.placeholder = 'Enter new password';
      break;
  }

  modalInput.focus();
}

function populateCountries(filter = '') {
  const filtered = filter ? countries.filter(c => c.toLowerCase().includes(filter.toLowerCase())) : countries;
  const userCountry = currentUser.country || '';
  modalSelect.innerHTML = filtered.map(c =>
    `<option value="${c}" ${userCountry === c ? 'selected' : ''}>${c}</option>`
  ).join('');
}

function closeModal() {
  modal.style.display = 'none';
  currentField = '';
  selectedDate = null;
  searchInput.value = '';
}

modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

saveBtn.addEventListener('click', async () => {
  let newValue = '';

  switch(currentField) {
    case 'fullName':
      newValue = modalInput.value.trim();
      if (!newValue) {
        showNotification('Please enter a valid value', 'error');
        return;
      }
      break;

    case 'username':
      newValue = modalInput.value.trim();
      if (!newValue) {
        showNotification('Please enter a valid username', 'error');
        return;
      }

      // Check for spaces
      if (newValue.includes(' ')) {
        showNotification('Username cannot contain spaces', 'error');
        return;
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(newValue)) {
        showNotification('Username must be 3-20 characters (letters, numbers, underscore only - no spaces)', 'error');
        return;
      }
      break;

    case 'age':
      if (!selectedDate) {
        showNotification('Please select a valid date', 'error');
        return;
      }
      const age = calculateAge(selectedDate);
      const formattedDOB = formatDate(selectedDate);
      newValue = `${age} years old (DOB: ${formattedDOB})`;
      break;

    case 'country':
      newValue = modalSelect.value;
      break;

    case 'password':
      newValue = modalInput.value;
      if (newValue.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
      }
      break;
  }

  // Update user data
  try {
    // Map field names to database column names
    const fieldMap = {
      'fullName': 'full_name',
      'username': 'username',
      'age': 'age',
      'country': 'country',
      'password': 'password'
    };

    const dbFieldName = fieldMap[currentField] || currentField;
    const updateData = { [dbFieldName]: newValue };

    const response = await fetch(`/api/user/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (data.success) {
      // Update currentUser with new data, handling both formats
      currentUser = {
        ...currentUser,
        ...data.user,
        fullName: data.user.full_name || data.user.fullName,
        full_name: data.user.full_name || data.user.fullName
      };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      loadUserProfile();
      closeModal();

      if (currentField === 'password') {
        showNotification('Password updated successfully', 'success');
      } else {
        showNotification('Profile updated successfully', 'success');
      }
    } else {
      showNotification(data.message || 'Failed to update profile', 'error');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Failed to update profile', 'error');
  }
});

// Calendar functionality
function initCalendar() {
  const today = selectedDate || new Date();
  const monthSelect = document.getElementById('calendarMonthSelect');
  const yearSelect = document.getElementById('calendarYearSelect');

  // Populate month select
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  monthSelect.innerHTML = months.map((m, i) =>
    `<option value="${i}" ${i === today.getMonth() ? 'selected' : ''}>${m}</option>`
  ).join('');

  // Populate year select (current year - 100 to current year)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 100; i--) {
    years.push(i);
  }
  yearSelect.innerHTML = years.map(y =>
    `<option value="${y}" ${y === today.getFullYear() ? 'selected' : ''}>${y}</option>`
  ).join('');

  renderCalendar(today.getMonth(), today.getFullYear());

  monthSelect.addEventListener('change', () => {
    renderCalendar(parseInt(monthSelect.value), parseInt(yearSelect.value));
  });

  yearSelect.addEventListener('change', () => {
    renderCalendar(parseInt(monthSelect.value), parseInt(yearSelect.value));
  });

  document.getElementById('prevMonth').addEventListener('click', () => {
    let month = parseInt(monthSelect.value);
    let year = parseInt(yearSelect.value);
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    monthSelect.value = month;
    yearSelect.value = year;
    renderCalendar(month, year);
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    let month = parseInt(monthSelect.value);
    let year = parseInt(yearSelect.value);
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    monthSelect.value = month;
    yearSelect.value = year;
    renderCalendar(month, year);
  });

  // Manual date input
  dateInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + '/' + value.slice(5, 9);
    }
    e.target.value = value;

    if (value.length === 10) {
      const [month, day, year] = value.split('/');
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        selectedDate = date;
        renderCalendar(date.getMonth(), date.getFullYear());
      }
    }
  });
}

function renderCalendar(month, year) {
  const calendarDays = document.getElementById('calendarDays');
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isSelected = selectedDate &&
                       date.getDate() === selectedDate.getDate() &&
                       date.getMonth() === selectedDate.getMonth() &&
                       date.getFullYear() === selectedDate.getFullYear();

    html += `<div class="calendar-day ${isSelected ? 'selected' : ''}" data-date="${date.toISOString()}">${day}</div>`;
  }

  calendarDays.innerHTML = html;

  // Add click handlers
  document.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      selectedDate = new Date(dayEl.getAttribute('data-date'));
      dateInput.value = formatDate(selectedDate);
      renderCalendar(month, year);
    });
  });
}

function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

console.log('Profile page loaded for:', currentUser.fullName);

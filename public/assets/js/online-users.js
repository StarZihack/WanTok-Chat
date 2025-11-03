// Online Users Statistics Page JavaScript

// Check if user is logged in
if (!currentUser) {
  window.location.href = '/';
}

// Check if user has completed profile/age verification
// Also check if existing users have age and gender specified
if (currentUser && (currentUser.profileComplete === false || !currentUser.age || !currentUser.gender)) {
  window.location.href = '/verify-age';
}

// Back button
const backBtn = document.getElementById('backFromOnline');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = '/main';
  });
}

// Country flag mapping
function getCountryFlag(countryName) {
  const countryFlags = {
    'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Andorra': '🇦🇩', 'Angola': '🇦🇴',
    'Antigua and Barbuda': '🇦🇬', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲', 'Australia': '🇦🇺',
    'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿', 'Bahamas': '🇧🇸', 'Bahrain': '🇧🇭', 'Bangladesh': '🇧🇩',
    'Barbados': '🇧🇧', 'Belarus': '🇧🇾', 'Belgium': '🇧🇪', 'Belize': '🇧🇿', 'Benin': '🇧🇯',
    'Bhutan': '🇧🇹', 'Bolivia': '🇧🇴', 'Bosnia and Herzegovina': '🇧🇦', 'Botswana': '🇧🇼',
    'Brazil': '🇧🇷', 'Brunei': '🇧🇳', 'Bulgaria': '🇧🇬', 'Burkina Faso': '🇧🇫', 'Burundi': '🇧🇮',
    'Cambodia': '🇰🇭', 'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Cape Verde': '🇨🇻',
    'Central African Republic': '🇨🇫', 'Chad': '🇹🇩', 'Chile': '🇨🇱', 'China': '🇨🇳',
    'Colombia': '🇨🇴', 'Comoros': '🇰🇲', 'Congo': '🇨🇬', 'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷',
    'Cuba': '🇨🇺', 'Cyprus': '🇨🇾', 'Czech Republic': '🇨🇿', 'Denmark': '🇩🇰', 'Djibouti': '🇩🇯',
    'Dominica': '🇩🇲', 'Dominican Republic': '🇩🇴', 'DR Congo': '🇨🇩', 'Ecuador': '🇪🇨',
    'Egypt': '🇪🇬', 'El Salvador': '🇸🇻', 'Equatorial Guinea': '🇬🇶', 'Eritrea': '🇪🇷',
    'Estonia': '🇪🇪', 'Eswatini': '🇸🇿', 'Ethiopia': '🇪🇹', 'Fiji': '🇫🇯', 'Finland': '🇫🇮',
    'France': '🇫🇷', 'Gabon': '🇬🇦', 'Gambia': '🇬🇲', 'Georgia': '🇬🇪', 'Germany': '🇩🇪',
    'Ghana': '🇬🇭', 'Greece': '🇬🇷', 'Grenada': '🇬🇩', 'Guatemala': '🇬🇹', 'Guinea': '🇬🇳',
    'Guinea-Bissau': '🇬🇼', 'Guyana': '🇬🇾', 'Haiti': '🇭🇹', 'Honduras': '🇭🇳', 'Hungary': '🇭🇺',
    'Iceland': '🇮🇸', 'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
    'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'Italy': '🇮🇹', 'Ivory Coast': '🇨🇮', 'Jamaica': '🇯🇲',
    'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Kazakhstan': '🇰🇿', 'Kenya': '🇰🇪', 'Kiribati': '🇰🇮',
    'Kosovo': '🇽🇰', 'Kuwait': '🇰🇼', 'Kyrgyzstan': '🇰🇬', 'Laos': '🇱🇦', 'Latvia': '🇱🇻',
    'Lebanon': '🇱🇧', 'Lesotho': '🇱🇸', 'Liberia': '🇱🇷', 'Libya': '🇱🇾', 'Liechtenstein': '🇱🇮',
    'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Madagascar': '🇲🇬', 'Malawi': '🇲🇼', 'Malaysia': '🇲🇾',
    'Maldives': '🇲🇻', 'Mali': '🇲🇱', 'Malta': '🇲🇹', 'Marshall Islands': '🇲🇭', 'Mauritania': '🇲🇷',
    'Mauritius': '🇲🇺', 'Mexico': '🇲🇽', 'Micronesia': '🇫🇲', 'Moldova': '🇲🇩', 'Monaco': '🇲🇨',
    'Mongolia': '🇲🇳', 'Montenegro': '🇲🇪', 'Morocco': '🇲🇦', 'Mozambique': '🇲🇿', 'Myanmar': '🇲🇲',
    'Namibia': '🇳🇦', 'Nauru': '🇳🇷', 'Nepal': '🇳🇵', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿',
    'Nicaragua': '🇳🇮', 'Niger': '🇳🇪', 'Nigeria': '🇳🇬', 'North Korea': '🇰🇵',
    'North Macedonia': '🇲🇰', 'Norway': '🇳🇴', 'Oman': '🇴🇲', 'Pakistan': '🇵🇰', 'Palau': '🇵🇼',
    'Palestine': '🇵🇸', 'Panama': '🇵🇦', 'Papua New Guinea': '🇵🇬', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪',
    'Philippines': '🇵🇭', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦', 'Romania': '🇷🇴',
    'Russia': '🇷🇺', 'Rwanda': '🇷🇼', 'Saint Kitts and Nevis': '🇰🇳', 'Saint Lucia': '🇱🇨',
    'Saint Vincent and the Grenadines': '🇻🇨', 'Samoa': '🇼🇸', 'San Marino': '🇸🇲',
    'Sao Tome and Principe': '🇸🇹', 'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳', 'Serbia': '🇷🇸',
    'Seychelles': '🇸🇨', 'Sierra Leone': '🇸🇱', 'Singapore': '🇸🇬', 'Slovakia': '🇸🇰',
    'Slovenia': '🇸🇮', 'Solomon Islands': '🇸🇧', 'Somalia': '🇸🇴', 'South Africa': '🇿🇦',
    'South Korea': '🇰🇷', 'South Sudan': '🇸🇸', 'Spain': '🇪🇸', 'Sri Lanka': '🇱🇰', 'Sudan': '🇸🇩',
    'Suriname': '🇸🇷', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Syria': '🇸🇾', 'Taiwan': '🇹🇼',
    'Tajikistan': '🇹🇯', 'Tanzania': '🇹🇿', 'Thailand': '🇹🇭', 'Timor-Leste': '🇹🇱', 'Togo': '🇹🇬',
    'Tonga': '🇹🇴', 'Trinidad and Tobago': '🇹🇹', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
    'Turkmenistan': '🇹🇲', 'Tuvalu': '🇹🇻', 'Uganda': '🇺🇬', 'Ukraine': '🇺🇦',
    'United Arab Emirates': '🇦🇪', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸', 'Uruguay': '🇺🇾',
    'Uzbekistan': '🇺🇿', 'Vanuatu': '🇻🇺', 'Vatican City': '🇻🇦', 'Venezuela': '🇻🇪',
    'Vietnam': '🇻🇳', 'Yemen': '🇾🇪', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼'
  };
  return countryFlags[countryName] || '🌍';
}

// Listen for online users updates
socket.on('onlineUsersUpdate', (users) => {
  updateStatistics(users);
});

// Update statistics
function updateStatistics(users) {
  // Filter out current user
  const otherUsers = users.filter(u => u.id !== currentUser.id);

  // Calculate statistics
  const totalUsers = otherUsers.length;
  const maleUsers = otherUsers.filter(u => u.gender === 'Male').length;
  const femaleUsers = otherUsers.filter(u => u.gender === 'Female').length;

  // Update totals
  document.getElementById('totalOnline').textContent = totalUsers;
  document.getElementById('totalUsers').textContent = totalUsers;
  document.getElementById('maleUsers').textContent = maleUsers;
  document.getElementById('femaleUsers').textContent = femaleUsers;

  // Calculate percentages
  const malePercentage = totalUsers > 0 ? Math.round((maleUsers / totalUsers) * 100) : 0;
  const femalePercentage = totalUsers > 0 ? Math.round((femaleUsers / totalUsers) * 100) : 0;

  // Update gender chart
  const maleBar = document.getElementById('maleBar');
  const femaleBar = document.getElementById('femaleBar');
  const malePercentageEl = document.getElementById('malePercentage');
  const femalePercentageEl = document.getElementById('femalePercentage');

  if (maleBar && femaleBar) {
    maleBar.style.width = malePercentage + '%';
    femaleBar.style.width = femalePercentage + '%';
    malePercentageEl.textContent = malePercentage + '%';
    femalePercentageEl.textContent = femalePercentage + '%';
  }

  // Update country statistics
  updateCountryStats(otherUsers);
}

// Update country statistics
function updateCountryStats(users) {
  const countryList = document.getElementById('countryList');
  if (!countryList) return;

  // Group users by country
  const countryCounts = {};
  users.forEach(user => {
    const country = user.country || 'Unknown';
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  });

  // Sort countries by count
  const sortedCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([country]) => country !== 'Unknown'); // Filter out unknown

  // Clear loading indicator
  countryList.innerHTML = '';

  // Display countries
  if (sortedCountries.length === 0) {
    countryList.innerHTML = `
      <div class="loading-indicator">
        <i class="fas fa-globe"></i>
        No users online from different countries yet
      </div>
    `;
  } else {
    sortedCountries.forEach(([country, count]) => {
      const countryItem = document.createElement('div');
      countryItem.className = 'country-item';
      countryItem.innerHTML = `
        <div class="country-info">
          <div class="country-flag">${getCountryFlag(country)}</div>
          <div class="country-name">${country}</div>
        </div>
        <div class="country-count">
          <i class="fas fa-users"></i>
          <span>${count}</span>
        </div>
      `;
      countryList.appendChild(countryItem);
    });
  }
}

// Request initial statistics
socket.emit('requestOnlineUsers');

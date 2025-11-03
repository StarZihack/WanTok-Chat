// public/script.js (Full file - replace entire existing script.js with this)

// currentUser is already declared in socket-shared.js
// Check if user is logged in, redirect to auth if not
if (!currentUser) {
  window.location.href = '/';
}

// Check if user has completed profile/age verification
// Also check if existing users have age and gender specified
// Handle both profileComplete and profile_complete
const profileComplete = currentUser.profileComplete ?? currentUser.profile_complete ?? false;
if (currentUser && (profileComplete === false || !currentUser.age || !currentUser.gender)) {
  window.location.href = '/verify-age';
}

// Socket is now initialized in socket-shared.js
let peerConnection;
let localStream;
let isVideoEnabled = true;
let isAudioEnabled = true;
let partnerInfo = null; // Store partner information

// Country flag emoji mapping
function getCountryFlag(countryName) {
  const countryFlags = {
    'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Andorra': '🇦🇩', 'Angola': '🇦🇴',
    'Antigua and Barbuda': '🇦🇬', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
    'Azerbaijan': '🇦🇿', 'Bahamas': '🇧🇸', 'Bahrain': '🇧🇭', 'Bangladesh': '🇧🇩', 'Barbados': '🇧🇧',
    'Belarus': '🇧🇾', 'Belgium': '🇧🇪', 'Belize': '🇧🇿', 'Benin': '🇧🇯', 'Bhutan': '🇧🇹',
    'Bolivia': '🇧🇴', 'Bosnia and Herzegovina': '🇧🇦', 'Botswana': '🇧🇼', 'Brazil': '🇧🇷', 'Brunei': '🇧🇳',
    'Bulgaria': '🇧🇬', 'Burkina Faso': '🇧🇫', 'Burundi': '🇧🇮', 'Cabo Verde': '🇨🇻', 'Cambodia': '🇰🇭',
    'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Cape Verde': '🇨🇻', 'Central African Republic': '🇨🇫', 'Chad': '🇹🇩',
    'Chile': '🇨🇱', 'China': '🇨🇳', 'Colombia': '🇨🇴', 'Comoros': '🇰🇲', 'Congo': '🇨🇬',
    'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷', 'Cuba': '🇨🇺', 'Cyprus': '🇨🇾', 'Czech Republic': '🇨🇿',
    'Denmark': '🇩🇰', 'Djibouti': '🇩🇯', 'Dominica': '🇩🇲', 'Dominican Republic': '🇩🇴', 'DR Congo': '🇨🇩',
    'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'El Salvador': '🇸🇻', 'Equatorial Guinea': '🇬🇶', 'Eritrea': '🇪🇷',
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
    'Nicaragua': '🇳🇮', 'Niger': '🇳🇪', 'Nigeria': '🇳🇬', 'North Korea': '🇰🇵', 'North Macedonia': '🇲🇰',
    'Norway': '🇳🇴', 'Oman': '🇴🇲', 'Pakistan': '🇵🇰', 'Palau': '🇵🇼', 'Palestine': '🇵🇸',
    'Panama': '🇵🇦', 'Papua New Guinea': '🇵🇬', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪', 'Philippines': '🇵🇭',
    'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦', 'Romania': '🇷🇴', 'Russia': '🇷🇺',
    'Rwanda': '🇷🇼', 'Saint Kitts and Nevis': '🇰🇳', 'Saint Lucia': '🇱🇨', 'Saint Vincent and the Grenadines': '🇻🇨', 'Samoa': '🇼🇸',
    'San Marino': '🇸🇲', 'Sao Tome and Principe': '🇸🇹', 'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳', 'Serbia': '🇷🇸',
    'Seychelles': '🇸🇨', 'Sierra Leone': '🇸🇱', 'Singapore': '🇸🇬', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮',
    'Solomon Islands': '🇸🇧', 'Somalia': '🇸🇴', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'South Sudan': '🇸🇸',
    'Spain': '🇪🇸', 'Sri Lanka': '🇱🇰', 'Sudan': '🇸🇩', 'Suriname': '🇸🇷', 'Sweden': '🇸🇪',
    'Switzerland': '🇨🇭', 'Syria': '🇸🇾', 'Taiwan': '🇹🇼', 'Tajikistan': '🇹🇯', 'Tanzania': '🇹🇿',
    'Thailand': '🇹🇭', 'Timor-Leste': '🇹🇱', 'Togo': '🇹🇬', 'Tonga': '🇹🇴', 'Trinidad and Tobago': '🇹🇹',
    'Tunisia': '🇹🇳', 'Turkey': '🇹🇷', 'Turkmenistan': '🇹🇲', 'Tuvalu': '🇹🇻', 'Uganda': '🇺🇬',
    'Ukraine': '🇺🇦', 'United Arab Emirates': '🇦🇪', 'UAE': '🇦🇪', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸',
    'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿', 'Vanuatu': '🇻🇺', 'Vatican City': '🇻🇦', 'Venezuela': '🇻🇪',
    'Vietnam': '🇻🇳', 'Yemen': '🇾🇪', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼'
  };
  return countryFlags[countryName] || '🌍';
}

// Gender icon mapping
function getGenderIcon(gender) {
  const icons = {
    'Male': '<i class="fas fa-mars"></i>',
    'Female': '<i class="fas fa-venus"></i>'
  };
  return icons[gender] || '<i class="fas fa-user"></i>';
}

// Socket authentication is now handled in socket-shared.js
// Update "You" label when socket connects
socket.on('connect', () => {
  const localLabel = document.querySelector('.local-card .video-label');
  if (localLabel && currentUser) {
    localLabel.textContent = currentUser.fullName;
  }
});

// Token system
let userTokens = currentUser ? currentUser.tokens : 0;
let lastDailyBonus = localStorage.getItem('lastDailyBonus') || null;

// UI elements
const home = document.getElementById('home');
const profile = document.getElementById('profile');
const profileBtn = document.getElementById('profileBtn');
const backToHomeBtn = document.getElementById('backToHome');
const startBtn = document.getElementById('start');
const status = document.getElementById('status');
const chat = document.getElementById('chat');
const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const skipBtns = document.querySelectorAll('.skip-chat-btn');
const endChatBtns = document.querySelectorAll('.end-chat-btn');
const toggleVideoBtns = document.querySelectorAll('.toggle-video-btn');
const toggleAudioBtns = document.querySelectorAll('.toggle-audio-btn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Load User Profile Data
function loadUserProfile() {
  if (!currentUser) return;

  document.getElementById('profileFullName').textContent = currentUser.fullName;
  document.getElementById('profileUsername').textContent = '@' + currentUser.username;

  // Update profile settings
  const genderSetting = document.querySelector('.setting-item.view-only .setting-desc');
  if (genderSetting) genderSetting.textContent = currentUser.gender;

  const ageSetting = document.querySelectorAll('.setting-item')[1]?.querySelector('.setting-desc');
  if (ageSetting) ageSetting.textContent = currentUser.age;

  const countrySetting = document.querySelectorAll('.setting-item')[2]?.querySelector('.setting-desc');
  if (countrySetting) countrySetting.textContent = currentUser.country;

  const emailSetting = document.querySelectorAll('.setting-item.view-only')[1]?.querySelector('.setting-desc');
  if (emailSetting) emailSetting.textContent = currentUser.email;

  updateTokenDisplay();
}

// Logout Handler
document.querySelector('.logout-btn').addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('currentUser');
  userTokens = 0;
  window.location.href = '/';
});

// Initialize user profile on page load
loadUserProfile();

// WebRTC config
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Animate function with improved fluidity
function animateElement(element, animationClass) {
  element.classList.remove(animationClass);
  void element.offsetWidth;
  element.classList.add(animationClass);
  setTimeout(() => element.classList.remove(animationClass), 600);
}

// Profile navigation - redirect to separate profile page
profileBtn.addEventListener('click', () => {
  window.location.href = '/profile';
});

// Always start on home page
window.addEventListener('DOMContentLoaded', () => {
  home.style.display = 'flex';
  profile.style.display = 'none';
});

// Start chat from home page
startBtn.addEventListener('click', () => {
  // Get filter preferences
  const genderFilter = document.getElementById('genderFilter')?.value || 'any';
  const countryFilter = document.getElementById('countryFilter')?.value || 'any';

  // Check if user has tokens if using filters
  if ((genderFilter !== 'any' || countryFilter !== 'any') && currentUser.tokens <= 0) {
    showNotification('You need tokens to use filters! Earn tokens by watching ads.', 'error');
    return;
  }

  // Initialize token display in both locations
  const tokenCountEl = document.getElementById('tokenCount');
  if (tokenCountEl) {
    tokenCountEl.textContent = currentUser.tokens || 0;
  }

  const chatTokenCountEl = document.getElementById('chatTokenCount');
  if (chatTokenCountEl) {
    chatTokenCountEl.textContent = currentUser.tokens || 0;
  }

  home.style.display = 'none';
  status.style.display = 'flex';
  socket.emit('findPartner', { genderFilter, countryFilter });
  animateElement(status, 'fade-in');
});

socket.on('waiting', () => {
  status.textContent = 'Waiting for a partner...';
  animateElement(status, 'pulse');
});

socket.on('paired', async ({ initiator, partnerInfo: partner }) => {
  partnerInfo = partner; // Store partner info
  status.style.display = 'none';
  chat.style.display = 'flex';
  animateElement(chat, 'fade-in');

  // Get partner name (handle both fullName and full_name)
  const partnerName = partner?.fullName || partner?.full_name || 'Stranger';

  // Update partner name in video header
  const partnerNameEl = document.getElementById('partnerName');
  if (partnerNameEl && partner) {
    partnerNameEl.textContent = partnerName;
  }

  // Update partner age (extract number from age string like "25 years old")
  const partnerAgeEl = document.getElementById('partnerAge');
  if (partnerAgeEl && partner && partner.age) {
    const ageNumber = partner.age.split(' ')[0]; // Extract just the number
    partnerAgeEl.textContent = `${ageNumber} •`;
  }

  // Update partner gender icon
  const partnerGenderEl = document.getElementById('partnerGender');
  if (partnerGenderEl && partner) {
    partnerGenderEl.innerHTML = getGenderIcon(partner.gender);
  }

  // Update partner country flag and name
  const partnerCountryEl = document.getElementById('partnerCountry');
  if (partnerCountryEl && partner) {
    const flag = getCountryFlag(partner.country);
    partnerCountryEl.textContent = `${flag} ${partner.country || 'Unknown'}`;
  }

  appendMessage(`<em>Connected with ${partnerName}</em>`, 'system');

  // Start token deduction now that users are successfully matched and chatting
  startFilterTokenDeduction();

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    toggleVideoBtns.forEach(btn => btn.innerHTML = '<i class="fas fa-video"></i>');
    isVideoEnabled = true;
    toggleAudioBtns.forEach(btn => btn.innerHTML = '<i class="fas fa-microphone"></i>');
    isAudioEnabled = true;
    animateElement(localVideo.parentElement, 'slide-in');
  } catch (err) {
    console.error('Media access denied:', err);
    appendMessage('System: Camera/mic denied. Text only.', 'system');
  }

  peerConnection = new RTCPeerConnection(rtcConfig);

  if (localStream) {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  }

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    animateElement(remoteVideo.parentElement, 'fade-in');

    // Run AI moderation check on partner's video after it loads
    if (typeof ModerationModule !== 'undefined' && partnerInfo) {
      remoteVideo.addEventListener('loadeddata', () => {
        console.log('[AI Moderation] Starting automated check on partner video...');
        ModerationModule.moderateOnConnect(remoteVideo, partnerInfo.id)
          .then(result => {
            if (!result.isSafe) {
              console.warn('[AI Moderation] Unsafe content detected:', result.reason);
            } else {
              console.log('[AI Moderation] Content check passed');
            }
          })
          .catch(err => {
            console.error('[AI Moderation] Check failed:', err);
          });
      }, { once: true });
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate);
    }
  };

  if (initiator) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  }
});

socket.on('offer', async (offer) => {
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (err) {
    console.error('ICE error:', err);
  }
});

socket.on('message', (msg) => {
  const senderName = partnerInfo ? partnerInfo.fullName : 'Stranger';
  appendMessage(msg, 'stranger', senderName);
  // Show messages on mobile when receiving a message
  if (typeof showMessagesOnNewMessage === 'function') {
    showMessagesOnNewMessage();
  }
});

// Send button handler moved to mobile message toggle section below

// Toggle Video - handle all video buttons
toggleVideoBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!localStream || !localStream.getVideoTracks().length) return;
    isVideoEnabled = !isVideoEnabled;
    localStream.getVideoTracks()[0].enabled = isVideoEnabled;
    const icon = isVideoEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    toggleVideoBtns.forEach(b => b.innerHTML = icon);
    animateElement(btn, 'bounce');
  });
});

// Toggle Audio - handle all audio buttons
toggleAudioBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!localStream || !localStream.getAudioTracks().length) return;
    isAudioEnabled = !isAudioEnabled;
    localStream.getAudioTracks()[0].enabled = isAudioEnabled;
    const icon = isAudioEnabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    toggleAudioBtns.forEach(b => b.innerHTML = icon);
    animateElement(btn, 'bounce');
  });
});

// Skip to next partner function
function skipToNext() {
  // Get current filter preferences
  const genderFilter = document.getElementById('genderFilter')?.value || 'any';
  const countryFilter = document.getElementById('countryFilter')?.value || 'any';

  // Check if filters are active and user has tokens
  if ((genderFilter !== 'any' || countryFilter !== 'any') && currentUser.tokens <= 0) {
    // Show out of tokens modal
    showOutOfTokensModal();
    return;
  }

  socket.emit('endChat');
  appendMessage('<em>Searching for next partner...</em>', 'system');
  cleanup();
  status.style.display = 'flex';
  status.textContent = 'Finding new partner...';
  chat.style.display = 'none';
  socket.emit('findPartner', { genderFilter, countryFilter });
}

// Skip button - find next partner (handle all skip buttons)
skipBtns.forEach(btn => {
  btn.addEventListener('click', skipToNext);
});

// End button - go back to home (handle all end buttons)
endChatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    socket.emit('endChat');
    resetUI();
    showHomePage();
  });
});

socket.on('partnerDisconnected', () => {
  const partnerName = partnerInfo ? partnerInfo.fullName : 'Stranger';
  appendMessage(`<em>${partnerName} disconnected.</em>`, 'system');
  partnerInfo = null; // Clear partner info
  stopFilterTokenDeduction(); // Stop token deduction when partner disconnects
  setTimeout(() => {
    resetUI();
    showHomePage();
  }, 1500);
});

function showHomePage() {
  home.style.display = 'flex';
  chat.style.display = 'none';
  status.style.display = 'none';
  updateTokenDisplay();
  animateElement(home, 'fade-in');
}

function resetUI() {
  chat.style.display = 'none';
  status.style.display = 'none';
  cleanup();
  stopFilterTokenDeduction();
}

function cleanup() {
  if (peerConnection) peerConnection.close();
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  messages.innerHTML = '';
  partnerInfo = null; // Clear partner info

  // Reset video label back to "Stranger"
  const partnerNameEl = document.getElementById('partnerName');
  if (partnerNameEl) {
    partnerNameEl.textContent = 'Stranger';
  }

  // Clear partner age
  const partnerAgeEl = document.getElementById('partnerAge');
  if (partnerAgeEl) {
    partnerAgeEl.textContent = '';
  }

  // Clear partner gender and country
  const partnerGenderEl = document.getElementById('partnerGender');
  if (partnerGenderEl) {
    partnerGenderEl.innerHTML = '';
  }

  const partnerCountryEl = document.getElementById('partnerCountry');
  if (partnerCountryEl) {
    partnerCountryEl.textContent = '';
  }

  // Reset moderation check count for next chat
  if (typeof ModerationModule !== 'undefined') {
    ModerationModule.resetCheckCount();
  }

  // Reset message visibility on mobile
  if (typeof resetMessageVisibility === 'function') {
    resetMessageVisibility();
  }
}

function appendMessage(msg, className, senderName = null) {
  // Create message wrapper
  const messageWrapper = document.createElement('div');
  messageWrapper.classList.add('message-wrapper', className);

  // Add sender name if provided (for user messages)
  if (senderName && className !== 'system') {
    const nameLabel = document.createElement('div');
    nameLabel.classList.add('message-name');
    nameLabel.textContent = senderName;
    messageWrapper.appendChild(nameLabel);
  }

  // Create message bubble
  const p = document.createElement('p');
  p.innerHTML = msg;
  p.classList.add('message-bubble', className);
  messageWrapper.appendChild(p);

  messages.appendChild(messageWrapper);
  messages.scrollTop = messages.scrollHeight;
  animateElement(messageWrapper, 'slide-in');
}

// Token System Functions
function updateTokenDisplay() {
  const tokenCountElement = document.getElementById('tokenCount');
  if (tokenCountElement && currentUser) {
    tokenCountElement.textContent = currentUser.tokens;
    userTokens = currentUser.tokens;
  }

  // Also update chat token count display
  const chatTokenCountElement = document.getElementById('chatTokenCount');
  if (chatTokenCountElement && currentUser) {
    chatTokenCountElement.textContent = currentUser.tokens;
  }
}

function updateProfileTokenDisplay() {
  const profileTokenCountElement = document.getElementById('profileTokenCount');
  if (profileTokenCountElement) {
    profileTokenCountElement.textContent = userTokens;
  }
}

async function addTokens(amount) {
  try {
    // Call server to add tokens
    const response = await fetch(`/api/user/${currentUser.id}/tokens/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount })
    });

    const data = await response.json();

    if (data.success) {
      // Update local user data
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      userTokens = currentUser.tokens;

      // Update display
      updateTokenDisplay();

      // Show success notification
      showNotification(`+${amount} tokens earned!`, 'success');
    } else {
      console.error('Failed to add tokens:', data.message);
      showNotification('Failed to add tokens', 'error');
    }
  } catch (error) {
    console.error('Add tokens error:', error);
    showNotification('Failed to add tokens', 'error');
  }
}

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

// Reward Ad Functions
function watchAd(type) {
  let tokens = 0;

  switch(type) {
    case 'video':
      tokens = 5;
      showVideoAd(tokens);
      break;
    case 'banner':
      tokens = 2;
      showBannerAd(tokens);
      break;
  }
}

// Show Google Test Video Rewarded Ad
function showVideoAd(rewardTokens) {
  showNotification('Loading video ad...', 'info');

  // Create ad overlay
  const adOverlay = document.createElement('div');
  adOverlay.id = 'adOverlay';
  adOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `;

  // Google Test Ad Unit
  adOverlay.innerHTML = `
    <div style="text-align: center; color: white; padding: 20px;">
      <h2 style="margin-bottom: 20px;">Rewarded Video Ad</h2>
      <div id="adContainer" style="width: 640px; max-width: 90vw; height: 360px; background: #1a1a1a; border: 2px solid #bb86fc; border-radius: 8px; margin: 0 auto 20px; overflow: hidden;">
        <!-- Google AdSense Test Ad -->
        <ins class="adsbygoogle"
             style="display:block;width:100%;height:100%;"
             data-ad-client="ca-google-adsense-test"
             data-ad-slot="1234567890"
             data-ad-format="fluid"
             data-full-width-responsive="true"></ins>
      </div>
      <p id="adTimer" style="font-size: 1.2rem; margin-bottom: 15px;">Please wait <span id="countdown">5</span> seconds...</p>
      <button id="closeAd" style="padding: 12px 30px; background: #555; color: white; border: none; border-radius: 8px; cursor: not-allowed; font-size: 1rem;" disabled>
        Close Ad
      </button>
    </div>
  `;

  document.body.appendChild(adOverlay);

  // Initialize the ad
  setTimeout(() => {
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log('AdSense error:', e);
      // Show placeholder if ad fails
      document.getElementById('adContainer').innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888; flex-direction: column; gap: 10px;">
          <i class="fas fa-ad" style="font-size: 3rem;"></i>
          <p>Test Ad Placeholder</p>
          <small>(Actual ads will show in production)</small>
        </div>
      `;
    }
  }, 100);

  // Countdown timer (reduced for testing)
  let countdown = 5;
  const countdownElement = document.getElementById('countdown');
  const closeBtn = document.getElementById('closeAd');

  const timer = setInterval(() => {
    countdown--;
    countdownElement.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(timer);
      document.getElementById('adTimer').textContent = 'Ad complete!';
      closeBtn.disabled = false;
      closeBtn.style.background = 'linear-gradient(135deg, #bb86fc, #9f67e0)';
      closeBtn.style.cursor = 'pointer';
    }
  }, 1000);

  // Close button
  closeBtn.addEventListener('click', () => {
    if (countdown <= 0) {
      document.body.removeChild(adOverlay);
      addTokens(rewardTokens);
    }
  });
}

// Show Google Test Banner Ad
function showBannerAd(rewardTokens) {
  showNotification('Loading banner ad...', 'info');

  const adOverlay = document.createElement('div');
  adOverlay.id = 'adOverlay';
  adOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `;

  adOverlay.innerHTML = `
    <div style="text-align: center; color: white; padding: 20px;">
      <h2 style="margin-bottom: 20px;">Banner Ad</h2>
      <div id="adContainer" style="width: 728px; max-width: 90vw; height: 90px; background: #1a1a1a; border: 2px solid #bb86fc; border-radius: 8px; margin: 0 auto 20px; overflow: hidden;">
        <!-- Google AdSense Test Banner -->
        <ins class="adsbygoogle"
             style="display:inline-block;width:728px;height:90px"
             data-ad-client="ca-google-adsense-test"
             data-ad-slot="1234567890"></ins>
      </div>
      <p id="adTimer" style="font-size: 1.2rem; margin-bottom: 15px;">Please wait <span id="countdown">3</span> seconds...</p>
      <button id="closeAd" style="padding: 12px 30px; background: #555; color: white; border: none; border-radius: 8px; cursor: not-allowed; font-size: 1rem;" disabled>
        Close Ad
      </button>
    </div>
  `;

  document.body.appendChild(adOverlay);

  setTimeout(() => {
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log('AdSense error:', e);
      document.getElementById('adContainer').innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888; gap: 10px;">
          <i class="fas fa-ad" style="font-size: 2rem;"></i>
          <p>Test Banner Placeholder</p>
        </div>
      `;
    }
  }, 100);

  let countdown = 3;
  const countdownElement = document.getElementById('countdown');
  const closeBtn = document.getElementById('closeAd');

  const timer = setInterval(() => {
    countdown--;
    countdownElement.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(timer);
      document.getElementById('adTimer').textContent = 'Ad complete!';
      closeBtn.disabled = false;
      closeBtn.style.background = 'linear-gradient(135deg, #bb86fc, #9f67e0)';
      closeBtn.style.cursor = 'pointer';
    }
  }, 1000);

  closeBtn.addEventListener('click', () => {
    if (countdown <= 0) {
      document.body.removeChild(adOverlay);
      addTokens(rewardTokens);
    }
  });
}

function claimDaily() {
  const today = new Date().toDateString();

  if (lastDailyBonus === today) {
    showNotification('Daily bonus already claimed today!', 'info');
    return;
  }

  lastDailyBonus = today;
  localStorage.setItem('lastDailyBonus', lastDailyBonus);
  addTokens(10);
}

// Initialize token display on load
updateTokenDisplay();

// Add CSS animations for notifications
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

// Draggable local video in mobile view
function makeDraggable() {
  const localCard = document.querySelector('.video-card.local-card');
  const videoSection = document.querySelector('.video-section');

  if (!localCard || !videoSection) return;

  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  function dragStart(e) {
    if (window.innerWidth > 900) return; // Only on mobile

    if (e.type === 'touchstart') {
      initialX = e.touches[0].clientX - currentX;
      initialY = e.touches[0].clientY - currentY;
    } else {
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
    }

    if (e.target === localCard || localCard.contains(e.target)) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();

    if (e.type === 'touchmove') {
      currentX = e.touches[0].clientX - initialX;
      currentY = e.touches[0].clientY - initialY;
    } else {
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
    }

    // Get boundaries
    const rect = videoSection.getBoundingClientRect();
    const cardWidth = localCard.offsetWidth;
    const cardHeight = localCard.offsetHeight;

    // Get header height to prevent dragging above it
    const videoHeader = videoSection.querySelector('.video-header');
    const headerHeight = videoHeader ? videoHeader.offsetHeight : 50;

    // Constrain within video section (below header)
    const minY = headerHeight + 5; // 5px margin below header
    const maxX = rect.width - cardWidth;
    const maxY = rect.height - cardHeight;

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(minY, Math.min(currentY, maxY));

    localCard.style.left = currentX + 'px';
    localCard.style.top = currentY + 'px';
    localCard.style.right = 'auto';
  }

  function dragEnd() {
    isDragging = false;
  }

  localCard.addEventListener('touchstart', dragStart);
  localCard.addEventListener('touchmove', drag);
  localCard.addEventListener('touchend', dragEnd);

  localCard.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // Initialize position below header
  const videoHeader = videoSection.querySelector('.video-header');
  const headerHeight = videoHeader ? videoHeader.offsetHeight : 50;
  currentX = videoSection.offsetWidth - localCard.offsetWidth - 15;
  currentY = headerHeight + 10; // Start 10px below header

  // Function to reset to default position
  window.resetLocalVideoPosition = function() {
    if (!localCard || !videoSection) return;
    if (window.innerWidth > 900) return; // Only on mobile

    // Only reset if we're in overlay mode (not split-view)
    const isOverlayMode = !videoSection.classList.contains('split-view');

    if (isOverlayMode) {
      const videoHeader = videoSection.querySelector('.video-header');
      const headerHeight = videoHeader ? videoHeader.offsetHeight : 50;
      currentX = videoSection.offsetWidth - localCard.offsetWidth - 15;
      currentY = headerHeight + 10;

      localCard.style.left = currentX + 'px';
      localCard.style.top = currentY + 'px';
      localCard.style.right = 'auto';
    }
  };
}

// Initialize draggable when chat starts
socket.on('paired', async ({ initiator }) => {
  // ... existing paired code runs first ...
  setTimeout(() => makeDraggable(), 500);
});

// Profile Edit Functionality
const editModal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const modalLabel = document.getElementById('modalLabel');
const modalInput = document.getElementById('modalInput');
const searchInput = document.getElementById('searchInput');
const dateInput = document.getElementById('dateInput');
const modalSelect = document.getElementById('modalSelect');
const modalClose = document.querySelector('.modal-close');
const cancelBtn = document.querySelector('.cancel-btn');
const saveBtn = document.querySelector('.save-btn');

let allOptions = []; // Store all options for filtering

let currentField = null;
let currentElement = null;

// Custom Calendar Variables
const customCalendar = document.getElementById('customCalendar');
const calendarDays = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calendarMonthSelect = document.getElementById('calendarMonthSelect');
const calendarYearSelect = document.getElementById('calendarYearSelect');

let currentDate = new Date();
let selectedDate = null;

// Populate month and year selectors
function populateSelectors() {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Populate months
  calendarMonthSelect.innerHTML = '';
  monthNames.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month;
    calendarMonthSelect.appendChild(option);
  });

  // Populate years (from 1900 to current year)
  calendarYearSelect.innerHTML = '';
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1900; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    calendarYearSelect.appendChild(option);
  }
}

// Update selectors to match current date
function updateSelectors() {
  calendarMonthSelect.value = currentDate.getMonth();
  calendarYearSelect.value = currentDate.getFullYear();
}

// Handle selector changes
calendarMonthSelect.addEventListener('change', () => {
  currentDate.setMonth(parseInt(calendarMonthSelect.value));
  renderCalendar();
});

calendarYearSelect.addEventListener('change', () => {
  currentDate.setFullYear(parseInt(calendarYearSelect.value));
  renderCalendar();
});

// Field configurations
const fieldConfig = {
  fullName: {
    title: 'Edit Full Name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your full name'
  },
  username: {
    title: 'Edit Username',
    label: 'Username',
    type: 'text',
    placeholder: 'Enter your username (without @)'
  },
  gender: {
    title: 'Edit Gender',
    label: 'Gender',
    type: 'select',
    options: [
      { value: 'Male', icon: 'fas fa-mars' },
      { value: 'Female', icon: 'fas fa-venus' }
    ]
  },
  age: {
    title: 'Edit Date of Birth',
    label: 'Date of Birth',
    type: 'calendar',
    placeholder: 'Select your date of birth'
  },
  country: {
    title: 'Edit Country',
    label: 'Country',
    type: 'select',
    searchable: true,
    options: [
      'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
      'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
      'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
      'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
      'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
      'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
      'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
      'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
      'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
      'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
      'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
      'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
      'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
      'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
      'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
      'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
      'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
      'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
      'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
      'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
    ]
  },
  email: {
    title: 'Edit Email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'Enter your email address'
  },
  password: {
    title: 'Change Password',
    label: 'New Password',
    type: 'password',
    placeholder: 'Enter new password'
  }
};

// Render Calendar
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  updateSelectors();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  calendarDays.innerHTML = '';

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('calendar-day', 'disabled');
    calendarDays.appendChild(emptyDay);
  }

  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('calendar-day');
    dayCell.textContent = day;

    const cellDate = new Date(year, month, day);

    // Highlight today
    if (cellDate.toDateString() === today.toDateString()) {
      dayCell.classList.add('today');
    }

    // Highlight selected date
    if (selectedDate && cellDate.toDateString() === selectedDate.toDateString()) {
      dayCell.classList.add('selected');
    }

    dayCell.addEventListener('click', () => {
      selectedDate = cellDate;
      renderCalendar();
    });

    calendarDays.appendChild(dayCell);
  }
}

// Navigate months
prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// Open edit modal
function openEditModal(field, currentValue, element) {
  currentField = field;
  currentElement = element;

  const config = fieldConfig[field];
  if (!config) return;

  modalTitle.textContent = config.title;
  modalLabel.textContent = config.label;

  // Hide all input types first
  modalInput.style.display = 'none';
  searchInput.style.display = 'none';
  dateInput.style.display = 'none';
  modalSelect.style.display = 'none';
  customCalendar.style.display = 'none';

  if (config.type === 'select') {
    modalSelect.style.display = 'block';
    modalSelect.innerHTML = '';

    // Store all options for filtering
    allOptions = config.options;

    // Show search input if searchable
    if (config.searchable) {
      searchInput.style.display = 'block';
      searchInput.value = '';
    }

    // Populate options
    config.options.forEach(option => {
      const opt = document.createElement('option');
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionIcon = typeof option === 'object' ? option.icon : '';

      opt.value = optionValue;
      opt.textContent = optionIcon ? `${optionValue}` : optionValue;
      opt.setAttribute('data-icon', optionIcon);

      if (optionValue === currentValue) opt.selected = true;
      modalSelect.appendChild(opt);
    });
  } else if (config.type === 'calendar') {
    dateInput.style.display = 'block';
    dateInput.value = '';
    customCalendar.style.display = 'block';
    currentDate = new Date();
    selectedDate = null;
    populateSelectors();
    renderCalendar();
  } else {
    modalInput.style.display = 'block';
    modalInput.type = config.type;
    modalInput.placeholder = config.placeholder;
    modalInput.value = currentValue;
  }

  editModal.style.display = 'flex';
  animateElement(editModal, 'fade-in');
}

// Close edit modal
function closeEditModal() {
  editModal.style.display = 'none';
  currentField = null;
  currentElement = null;
}

// Parse manual date input (MM/DD/YYYY)
function parseDateInput(dateString) {
  // Support multiple formats: MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY, etc.
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,    // MM-DD-YYYY or M-D-YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/   // MM.DD.YYYY or M.D.YYYY
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);

      // Validate ranges
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      if (year < 1900 || year > new Date().getFullYear()) return null;

      // Create date and validate it's real (e.g., not Feb 30)
      const date = new Date(year, month - 1, day);
      if (date.getMonth() !== month - 1) return null; // Invalid date like Feb 30

      return date;
    }
  }

  return null;
}

// Save changes
function saveChanges() {
  let newValue;

  if (customCalendar.style.display !== 'none') {
    let birthDate = selectedDate;

    // Check if user typed a date manually
    if (dateInput.value.trim()) {
      const manualDate = parseDateInput(dateInput.value.trim());
      if (!manualDate) {
        showNotification('Invalid date format. Use MM/DD/YYYY', 'error');
        return;
      }
      birthDate = manualDate;
    }

    // Calendar date selection - check both manual and calendar
    if (!birthDate) {
      showNotification('Please enter or select a date', 'error');
      return;
    }

    // Calculate age from date
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const formattedDate = `${String(birthDate.getMonth() + 1).padStart(2, '0')}/${String(birthDate.getDate()).padStart(2, '0')}/${birthDate.getFullYear()}`;
    newValue = `${age} years old (DOB: ${formattedDate})`;
  } else {
    newValue = modalInput.style.display === 'none' ? modalSelect.value : modalInput.value;

    if (!newValue.trim() && currentField !== 'password') {
      showNotification('Value cannot be empty', 'error');
      return;
    }
  }

  // Update the UI
  if (currentField === 'fullName') {
    document.getElementById('profileFullName').textContent = newValue;
  } else if (currentField === 'username') {
    const username = newValue.startsWith('@') ? newValue : '@' + newValue;
    document.getElementById('profileUsername').textContent = username;
  } else if (currentElement) {
    currentElement.textContent = newValue;
  }

  // Update currentUser object
  if (currentField === 'fullName') {
    currentUser.fullName = newValue;
  } else if (currentField === 'username') {
    currentUser.username = newValue.replace('@', '');
  } else if (currentField === 'age') {
    currentUser.age = newValue;
  } else if (currentField === 'country') {
    currentUser.country = newValue;
  }

  // Save to server
  if (currentUser && currentUser.id) {
    fetch(`/api/user/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentUser)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Profile updated successfully!', 'success');
      } else {
        showNotification('Failed to save profile', 'error');
      }
    })
    .catch(error => {
      console.error('Update error:', error);
      showNotification('Connection error', 'error');
    });
  }

  closeEditModal();
}

// Event listeners for edit buttons
document.querySelectorAll('.edit-name-btn, .edit-username-btn, .setting-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const field = btn.getAttribute('data-field') || btn.closest('.setting-item')?.querySelector('.setting-title')?.textContent.toLowerCase().replace(' ', '');
    const valueElement = btn.closest('.setting-item')?.querySelector('.setting-desc') ||
                         (field === 'fullName' ? document.getElementById('profileFullName') :
                          field === 'username' ? document.getElementById('profileUsername') : null);

    if (valueElement) {
      let currentValue = valueElement.textContent;
      if (field === 'username') {
        currentValue = currentValue.replace('@', '');
      }
      openEditModal(field, currentValue, valueElement);
    }
  });
});

modalClose.addEventListener('click', closeEditModal);
cancelBtn.addEventListener('click', closeEditModal);
saveBtn.addEventListener('click', saveChanges);

// Search functionality for dropdown
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  modalSelect.innerHTML = '';

  // Filter options based on search term
  const filteredOptions = allOptions.filter(option => {
    const optionValue = typeof option === 'object' ? option.value : option;
    return optionValue.toLowerCase().includes(searchTerm);
  });

  // Populate filtered options
  filteredOptions.forEach(option => {
    const opt = document.createElement('option');
    const optionValue = typeof option === 'object' ? option.value : option;
    const optionIcon = typeof option === 'object' ? option.icon : '';

    opt.value = optionValue;
    opt.textContent = optionIcon ? `${optionValue}` : optionValue;
    opt.setAttribute('data-icon', optionIcon);
    modalSelect.appendChild(opt);
  });

  // Show message if no results
  if (filteredOptions.length === 0) {
    const noResultOpt = document.createElement('option');
    noResultOpt.textContent = 'No results found';
    noResultOpt.disabled = true;
    modalSelect.appendChild(noResultOpt);
  }
});

// Auto-format date input with slashes (MM/DD/YYYY)
dateInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
  let formattedValue = '';

  if (value.length > 0) {
    // Add first part (month) - max 2 digits, validate range
    let month = value.substring(0, 2);
    if (parseInt(month) > 12) {
      month = '12';
    }
    if (value.length === 1 && parseInt(value) > 1) {
      month = '0' + value;
      value = '0' + value + value.substring(1);
    }
    formattedValue = month;
  }
  if (value.length >= 3) {
    // Add slash and day - max 2 digits, validate range
    let day = value.substring(2, 4);
    if (parseInt(day) > 31) {
      day = '31';
    }
    if (value.length === 3 && parseInt(value[2]) > 3) {
      day = '0' + value[2];
    }
    formattedValue += '/' + day;
  }
  if (value.length >= 5) {
    // Add slash and year - max 4 digits
    formattedValue += '/' + value.substring(4, 8);
  }

  // Update the input value with formatted version
  e.target.value = formattedValue;

  // Try to parse and sync with calendar
  const manualDate = parseDateInput(formattedValue);
  if (manualDate) {
    selectedDate = manualDate;
    currentDate = new Date(manualDate);
    renderCalendar();
  }
});

// Prevent non-numeric input except backspace/delete
dateInput.addEventListener('keydown', (e) => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
    e.preventDefault();
  }
});

// Out of Tokens Modal Functionality
const outOfTokensModal = document.getElementById('outOfTokensModal');
const continueWithoutFiltersBtn = document.getElementById('continueWithoutFilters');
const purchaseTokensBtn = document.getElementById('purchaseTokensBtn');

function showOutOfTokensModal() {
  outOfTokensModal.style.display = 'flex';
  animateElement(outOfTokensModal, 'fade-in');
}

// Continue without filters - reset filters to "any"
continueWithoutFiltersBtn.addEventListener('click', () => {
  // Reset filters to "any"
  document.getElementById('genderFilter').value = 'any';
  document.getElementById('countryFilter').value = 'any';

  // Update UI to show "Any Gender" and "Any Country"
  const genderSelected = document.getElementById('genderSelected');
  if (genderSelected) {
    genderSelected.querySelector('span').innerHTML = '<i class="fas fa-users"></i> Any Gender';
  }

  const countrySelected = document.getElementById('countrySelected');
  if (countrySelected) {
    countrySelected.querySelector('span').textContent = 'Any Country';
  }

  // Close modal
  outOfTokensModal.style.display = 'none';

  // Now skip to next partner without filters
  socket.emit('endChat');
  appendMessage('<em>Searching for next partner...</em>', 'system');
  cleanup();
  status.style.display = 'flex';
  status.textContent = 'Finding new partner...';
  chat.style.display = 'none';
  socket.emit('findPartner', { genderFilter: 'any', countryFilter: 'any' });

  showNotification('Filters disabled. Connecting with anyone!', 'info');
});

// Purchase tokens - redirect to purchase page
purchaseTokensBtn.addEventListener('click', () => {
  outOfTokensModal.style.display = 'none';
  window.location.href = '/purchase';
});

// Report Modal Functionality
const reportModal = document.getElementById('reportModal');
const reportBtns = document.querySelectorAll('.report-user-btn');
const closeReportModal = document.getElementById('closeReportModal');
const cancelReport = document.getElementById('cancelReport');
const submitReport = document.getElementById('submitReport');

reportBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!partnerInfo) {
      showNotification('No user to report', 'error');
      return;
    }
    reportModal.style.display = 'flex';
    animateElement(reportModal, 'fade-in');
  });
});

closeReportModal.addEventListener('click', () => {
  reportModal.style.display = 'none';
});

cancelReport.addEventListener('click', () => {
  reportModal.style.display = 'none';
});

submitReport.addEventListener('click', async () => {
  const selectedReason = document.querySelector('input[name="reportReason"]:checked');
  const details = document.getElementById('reportDetails').value;

  if (!selectedReason) {
    showNotification('Please select a reason', 'error');
    return;
  }

  if (!partnerInfo) {
    showNotification('No user to report', 'error');
    return;
  }

  // Show processing notification
  showNotification('Processing report with AI verification...', 'info');

  try {
    // Use AI moderation for nudity/minor reports
    if (typeof ModerationModule !== 'undefined') {
      console.log('[User Report] Processing report with AI moderation...');

      const report = await ModerationModule.handleUserReport(
        remoteVideo,
        partnerInfo.id,
        currentUser.id,
        selectedReason.value,
        details
      );

      console.log('[User Report] Report processed:', report);

      if (report.aiChecked && report.aiResult && !report.aiResult.isSafe) {
        showNotification('Report confirmed by AI. User has been suspended. Searching for next partner...', 'success');

        // Close report modal
        reportModal.style.display = 'none';

        // Clear form
        document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
        document.getElementById('reportDetails').value = '';

        // Automatically skip to next partner
        setTimeout(() => {
          skipToNext();
        }, 1500); // Short delay to show the notification

        return; // Exit early to skip the normal cleanup
      } else if (report.aiChecked) {
        showNotification('Report submitted for admin review. Thank you for helping keep WanTok safe!', 'success');
      } else {
        showNotification('Report submitted successfully. Our team will review it shortly.', 'success');
      }
    } else {
      // Fallback if moderation module isn't loaded
      console.log('Report submitted:', {
        reportedUser: partnerInfo,
        reason: selectedReason.value,
        details: details
      });
      showNotification('Report submitted successfully', 'success');
    }

    reportModal.style.display = 'none';

    // Clear form
    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
    document.getElementById('reportDetails').value = '';

  } catch (error) {
    console.error('[User Report] Error processing report:', error);
    showNotification('Failed to submit report. Please try again.', 'error');
  }
});

// Camera Switch Functionality (for mobile devices with multiple cameras)
const switchCameraBtns = document.querySelectorAll('.switch-camera-btn');
let currentFacingMode = 'user'; // 'user' for front camera, 'environment' for back camera
let availableCameras = [];

// Detect available cameras with detailed info
async function detectCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter(device => device.kind === 'videoinput');
    console.log(`Detected ${availableCameras.length} camera(s):`, availableCameras);
    return availableCameras;
  } catch (err) {
    console.error('Error detecting cameras:', err);
    return [];
  }
}

// Check if a specific facing mode camera exists
async function hasCameraWithFacingMode(facingMode) {
  try {
    // Try to get a stream with the specific facing mode
    const testStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: facingMode } },
      audio: false
    });

    // If successful, stop the test stream immediately
    testStream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    return false;
  }
}

// Detect cameras when page loads
detectCameras();

// Click to toggle video controls visibility
const videoContainer = document.getElementById('videoContainer');
const videoControlsOverlay = document.getElementById('videoControlsOverlay');
let controlsVisible = true;

if (videoContainer && videoControlsOverlay) {
  videoContainer.addEventListener('click', (e) => {
    // Don't toggle if clicking on a button
    if (e.target.closest('button')) return;

    controlsVisible = !controlsVisible;
    if (controlsVisible) {
      videoControlsOverlay.classList.remove('hidden');
    } else {
      videoControlsOverlay.classList.add('hidden');
    }
  });
}

switchCameraBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!localStream) {
      showNotification('No camera active', 'error');
      return;
    }

    // Re-detect cameras to get latest list
    const cameras = await detectCameras();

    // Check if multiple cameras are available
    if (cameras.length < 2) {
      if (cameras.length === 0) {
        showNotification('No cameras detected on this device', 'error');
      } else {
        showNotification('Only one camera available on this device', 'error');
      }
      return;
    }

    // Determine target camera
    const targetFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    const targetCameraName = targetFacingMode === 'user' ? 'front' : 'back';

    // Check if target camera actually exists
    const hasTargetCamera = await hasCameraWithFacingMode(targetFacingMode);

    if (!hasTargetCamera) {
      showNotification(`No ${targetCameraName} camera available on this device`, 'error');
      return;
    }

    try {
      // Stop current video track
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }

      // Get new stream with switched camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacingMode },
        audio: true
      });

      // Replace video track in local stream
      const newVideoTrack = newStream.getVideoTracks()[0];
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newVideoTrack);

      // Update video element
      localVideo.srcObject = localStream;

      // Update peer connection if exists
      if (peerConnection) {
        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      // Update current facing mode only after successful switch
      currentFacingMode = targetFacingMode;

      showNotification(`Switched to ${currentFacingMode === 'user' ? 'front' : 'back'} camera`, 'success');
      animateElement(btn, 'bounce');
    } catch (err) {
      console.error('Camera switch error:', err);

      // Provide specific error messages
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        showNotification(`No ${targetCameraName} camera found on this device`, 'error');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showNotification('Camera permission denied', 'error');
      } else if (err.name === 'NotReadableError') {
        showNotification('Camera is already in use by another application', 'error');
      } else {
        showNotification('Could not switch camera', 'error');
      }
    }
  });
});

// Filter Toggle Functionality
const filterToggleBtn = document.getElementById('filterToggleBtn');
const filterContent = document.getElementById('filterContent');

if (filterToggleBtn && filterContent) {
  filterToggleBtn.addEventListener('click', () => {
    filterToggleBtn.classList.toggle('active');
    filterContent.classList.toggle('open');
  });
}

// Custom Searchable Country Dropdown
const countryDropdown = document.getElementById('countryDropdown');
const countrySelected = document.getElementById('countrySelected');
const countryMenu = document.getElementById('countryMenu');
const countrySearch = document.getElementById('countrySearch');
const countryOptions = document.getElementById('countryOptions');
const countryFilter = document.getElementById('countryFilter');

if (countryDropdown && countrySelected && countryMenu) {
  // Toggle dropdown
  countrySelected.addEventListener('click', (e) => {
    e.stopPropagation();
    countrySelected.classList.toggle('active');
    countryMenu.classList.toggle('open');
    // Don't auto-focus search to prevent keyboard from appearing on mobile
  });

  // Search functionality
  countrySearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const options = countryOptions.querySelectorAll('.dropdown-option');
    
    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.classList.remove('hidden');
      } else {
        option.classList.add('hidden');
      }
    });
  });

  // Select option
  countryOptions.addEventListener('click', (e) => {
    if (e.target.classList.contains('dropdown-option')) {
      const value = e.target.getAttribute('data-value');
      const text = e.target.textContent;
      
      // Update selected display
      countrySelected.querySelector('span').textContent = text;
      
      // Update hidden input
      countryFilter.value = value;
      
      // Update selected state
      countryOptions.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      e.target.classList.add('selected');
      
      // Close dropdown
      countrySelected.classList.remove('active');
      countryMenu.classList.remove('open');
      
      // Clear search
      countrySearch.value = '';
      countryOptions.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('hidden');
      });
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!countryDropdown.contains(e.target)) {
      countrySelected.classList.remove('active');
      countryMenu.classList.remove('open');
      countrySearch.value = '';
      countryOptions.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('hidden');
      });
    }
  });

  // Prevent dropdown from closing when clicking inside the menu
  countryMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Custom Gender Dropdown
const genderDropdown = document.getElementById('genderDropdown');
const genderSelected = document.getElementById('genderSelected');
const genderMenu = document.getElementById('genderMenu');
const genderOptions = document.getElementById('genderOptions');
const genderFilter = document.getElementById('genderFilter');

if (genderDropdown && genderSelected && genderMenu) {
  // Toggle dropdown
  genderSelected.addEventListener('click', (e) => {
    e.stopPropagation();
    genderSelected.classList.toggle('active');
    genderMenu.classList.toggle('open');
  });

  // Select option
  genderOptions.addEventListener('click', (e) => {
    const option = e.target.closest('.dropdown-option');
    if (option) {
      const value = option.getAttribute('data-value');
      const icon = option.querySelector('i').outerHTML;
      const text = option.querySelector('span').textContent;
      
      // Update selected display
      genderSelected.querySelector('span').innerHTML = icon + ' ' + text;
      
      // Update hidden input
      genderFilter.value = value;
      
      // Update selected state
      genderOptions.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      option.classList.add('selected');
      
      // Close dropdown
      genderSelected.classList.remove('active');
      genderMenu.classList.remove('open');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!genderDropdown.contains(e.target)) {
      genderSelected.classList.remove('active');
      genderMenu.classList.remove('open');
    }
  });

  // Prevent dropdown from closing when clicking inside the menu
  genderMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Filter Token System
let filterTokenInterval = null;
let activeFiltersCount = 0;

function startFilterTokenDeduction() {
  // Clear any existing interval
  if (filterTokenInterval) {
    clearInterval(filterTokenInterval);
  }

  // Count active filters (filters that are not "any")
  const genderFilter = document.getElementById('genderFilter')?.value || 'any';
  const countryFilter = document.getElementById('countryFilter')?.value || 'any';
  
  activeFiltersCount = 0;
  if (genderFilter !== 'any') activeFiltersCount++;
  if (countryFilter !== 'any') activeFiltersCount++;

  // Only deduct tokens if filters are active
  if (activeFiltersCount > 0) {
    // Add deducting animation to token balance
    const chatTokenBalance = document.getElementById('chatTokenBalance');
    if (chatTokenBalance) {
      chatTokenBalance.classList.add('deducting');
    }

    filterTokenInterval = setInterval(() => {
      if (currentUser && currentUser.tokens > 0) {
        // Deduct 1 token/sec for one filter, 2 tokens/sec for both filters
        const tokensToDeduct = activeFiltersCount === 2 ? 2 : 1;
        currentUser.tokens -= tokensToDeduct;

        // Update UI
        updateTokenDisplay();

        // Save to localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Update server
        updateServerTokens();

        // If tokens run out, show modal
        if (currentUser.tokens <= 0) {
          currentUser.tokens = 0;
          updateTokenDisplay();
          clearInterval(filterTokenInterval);

          // Remove deducting animation
          const chatTokenBalance = document.getElementById('chatTokenBalance');
          if (chatTokenBalance) {
            chatTokenBalance.classList.remove('deducting');
          }

          // Show the out of tokens modal
          showOutOfTokensModal();
        }
      } else {
        clearInterval(filterTokenInterval);

        // Remove deducting animation
        const chatTokenBalance = document.getElementById('chatTokenBalance');
        if (chatTokenBalance) {
          chatTokenBalance.classList.remove('deducting');
        }
      }
    }, 1000); // Deduct every second
  }
}

function stopFilterTokenDeduction() {
  if (filterTokenInterval) {
    clearInterval(filterTokenInterval);
    filterTokenInterval = null;
  }

  // Remove deducting animation
  const chatTokenBalance = document.getElementById('chatTokenBalance');
  if (chatTokenBalance) {
    chatTokenBalance.classList.remove('deducting');
  }
}

function updateServerTokens() {
  if (currentUser && currentUser.id) {
    fetch(`/api/user/${currentUser.id}/tokens`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens: currentUser.tokens })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Sync local storage with server response
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
    })
    .catch(error => {
      console.error('Failed to update server tokens:', error);
    });
  }
}

// Online users count is now handled in socket-shared.js

// Mobile Message Toggle Functionality
const messagesSection = document.querySelector('.messages-section');
const videoSection = document.querySelector('.video-section');
const toggleMessagesBtn = document.getElementById('toggleMessages');
const toggleMessagesBottomBtn = document.getElementById('toggleMessagesBottom');
const bottomControls = document.querySelector('.bottom-controls');
const toggleInputFab = document.getElementById('toggleInputFab');
const closeInputFab = document.getElementById('closeInputFab');
const floatingActions = document.querySelector('.floating-actions');
const chatContainer = document.querySelector('.chat-container');
let messagesVisible = false; // Messages hidden by default on mobile
let inputVisible = false; // Input hidden by default on mobile

// Function to check if we're on mobile
function isMobileView() {
  return window.innerWidth <= 900;
}

// Function to update video layout
function updateVideoLayout() {
  if (!isMobileView()) return; // Only apply on mobile

  if (messagesVisible) {
    // Messages are shown - local video goes into partner video (overlay mode)
    videoSection.classList.remove('split-view');
  } else {
    // Messages hidden - split view (both videos full width, stacked)
    videoSection.classList.add('split-view');
  }
}

// Function to update all toggle buttons
function updateToggleButtons() {
  if (messagesVisible) {
    // Messages are visible
    if (toggleMessagesBtn) {
      toggleMessagesBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
      toggleMessagesBtn.title = 'Hide Messages';
    }
    if (toggleMessagesBottomBtn) {
      toggleMessagesBottomBtn.innerHTML = '<i class="fas fa-comment-slash"></i>';
      toggleMessagesBottomBtn.title = 'Hide Messages';
      toggleMessagesBottomBtn.classList.add('messages-visible');
    }
  } else {
    // Messages are hidden
    if (toggleMessagesBtn) {
      toggleMessagesBtn.innerHTML = '<i class="fas fa-eye"></i>';
      toggleMessagesBtn.title = 'Show Messages';
    }
    if (toggleMessagesBottomBtn) {
      toggleMessagesBottomBtn.innerHTML = '<i class="fas fa-comment"></i>';
      toggleMessagesBottomBtn.title = 'Show Messages';
      toggleMessagesBottomBtn.classList.remove('messages-visible');
    }
  }
}

// Function to toggle FABs based on input visibility
function updateFABs() {
  if (!isMobileView()) return;

  if (inputVisible) {
    // Input is open - show close FAB, hide keyboard FAB, push FAB container up
    if (toggleInputFab) toggleInputFab.style.display = 'none';
    if (closeInputFab) closeInputFab.style.display = 'flex';
    if (floatingActions) floatingActions.classList.add('input-open');

    // Add spacing classes to containers
    if (chatContainer) {
      chatContainer.classList.remove('input-collapsed');
      chatContainer.classList.add('input-open');
    }
    if (messagesSection) messagesSection.classList.add('input-open');
  } else {
    // Input is closed - show keyboard FAB, hide close FAB, move FAB container down
    if (toggleInputFab) toggleInputFab.style.display = 'flex';
    if (closeInputFab) closeInputFab.style.display = 'none';
    if (floatingActions) floatingActions.classList.remove('input-open');

    // Remove spacing classes from containers
    if (chatContainer) {
      chatContainer.classList.remove('input-open');
      chatContainer.classList.add('input-collapsed');
    }
    if (messagesSection) messagesSection.classList.remove('input-open');
  }
}

// Toggle messages visibility function
function toggleMessages() {
  messagesVisible = !messagesVisible;

  if (messagesVisible) {
    messagesSection.classList.add('show-messages');
  } else {
    messagesSection.classList.remove('show-messages');
  }

  updateToggleButtons();
  updateVideoLayout();

  // Reset local video to default position when showing messages (after layout transition)
  if (messagesVisible && typeof window.resetLocalVideoPosition === 'function') {
    setTimeout(() => {
      window.resetLocalVideoPosition();
    }, 350); // Wait for transition to complete
  }
}

// Toggle messages visibility - top button
if (toggleMessagesBtn) {
  toggleMessagesBtn.addEventListener('click', toggleMessages);
}

// Toggle messages visibility - bottom button
if (toggleMessagesBottomBtn) {
  toggleMessagesBottomBtn.addEventListener('click', toggleMessages);
}

// Toggle input section visibility
function toggleInputSection() {
  if (!isMobileView()) return;

  inputVisible = !inputVisible;

  if (inputVisible) {
    bottomControls.classList.remove('collapsed');
  } else {
    bottomControls.classList.add('collapsed');
  }
}

// Open input section - Keyboard FAB button
if (toggleInputFab) {
  toggleInputFab.addEventListener('click', () => {
    inputVisible = true;
    bottomControls.classList.remove('collapsed');
    updateFABs();
    // Focus on input field after animation
    setTimeout(() => {
      const inputField = document.getElementById('input');
      if (inputField) inputField.focus();
    }, 300);
  });
}

// Close input section - Close FAB button
if (closeInputFab) {
  closeInputFab.addEventListener('click', () => {
    inputVisible = false;
    bottomControls.classList.add('collapsed');
    updateFABs();
  });
}

// Auto-hide input after sending message on mobile
const originalSendClick = () => {
  const msg = input.value.trim();
  if (msg) {
    // Send message
    appendMessage(msg, 'you', 'You');
    socket.emit('message', msg);
    input.value = '';
    // Show messages on mobile when user sends a message
    if (typeof showMessagesOnNewMessage === 'function') {
      showMessagesOnNewMessage();
    }
    // Hide input section on mobile after sending
    if (isMobileView()) {
      setTimeout(() => {
        inputVisible = false;
        bottomControls.classList.add('collapsed');
        updateFABs();
      }, 300);
    }
  }
};

// Override send button functionality
if (sendBtn) {
  sendBtn.replaceWith(sendBtn.cloneNode(true));
  const newSendBtn = document.getElementById('send');
  newSendBtn.addEventListener('click', originalSendClick);
}

// Handle Enter key
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    originalSendClick();
  }
});

// Show messages when a new message is received or sent (only on mobile)
function showMessagesOnNewMessage() {
  if (!isMobileView()) return;

  if (!messagesVisible) {
    messagesVisible = true;
    messagesSection.classList.add('show-messages');
    updateToggleButtons();
    updateVideoLayout();
  }
}

// Mobile message toggle handled in sendBtn event listener above

// Initialize layout on chat start
socket.on('paired', () => {
  if (isMobileView()) {
    // Start with messages hidden and videos in split view
    messagesVisible = false;
    messagesSection.classList.remove('show-messages');
    videoSection.classList.add('split-view');
    updateToggleButtons();

    // Start with input collapsed
    inputVisible = false;
    if (chatContainer) chatContainer.classList.add('input-collapsed');
    updateFABs();
  }
});

// Reset message visibility when chat ends
function resetMessageVisibility() {
  if (isMobileView()) {
    messagesVisible = false;
    messagesSection.classList.remove('show-messages');
    videoSection.classList.remove('split-view');
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (!isMobileView()) {
    // On desktop, always show messages and remove split view
    messagesSection.classList.remove('show-messages');
    messagesSection.style.display = '';
    videoSection.classList.remove('split-view');
  } else {
    // On mobile, apply current state
    updateVideoLayout();
  }
});

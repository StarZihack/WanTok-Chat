// Purchase Tokens Page JavaScript

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

// Update token display
function updateTokenDisplay() {
  const tokenDisplay = document.getElementById('currentTokens');
  if (tokenDisplay && currentUser) {
    tokenDisplay.textContent = currentUser.tokens || 0;
  }
}

// Initialize
updateTokenDisplay();

// Back button
const backBtn = document.getElementById('backFromPurchase');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = '/main';
  });
}

// Handle purchase button clicks
const purchaseButtons = document.querySelectorAll('.purchase-btn');
purchaseButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const packageType = btn.dataset.package;
    const packageCard = btn.closest('.token-package');
    const tokens = packageCard.dataset.tokens;
    const price = packageCard.dataset.price;

    // Show confirmation
    if (confirm(`Purchase ${tokens} tokens for $${price}?\n\nNote: This is a demo. No actual payment will be processed.`)) {
      processPurchase(packageType, parseInt(tokens));
    }
  });
});

// Process purchase (demo mode)
async function processPurchase(packageType, tokens) {
  // In a real app, this would integrate with a payment gateway
  // For now, we'll just add the tokens directly

  try {
    // Call server to add tokens
    const response = await fetch(`/api/user/${currentUser.id}/tokens/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: tokens })
    });

    const data = await response.json();

    if (data.success) {
      // Update local user data
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // Update display
      updateTokenDisplay();

      // Show success message
      showPurchaseSuccess(tokens);
    } else {
      alert('Purchase failed: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Purchase error:', error);
    alert('Purchase failed. Please try again.');
  }
}

// Show success notification
function showPurchaseSuccess(tokens) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #03dac6 0%, #00b4a1 100%);
    color: white;
    padding: 30px 40px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(3, 218, 198, 0.5);
    z-index: 10000;
    text-align: center;
    animation: slideIn 0.3s ease;
  `;

  notification.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 15px;">
      <i class="fas fa-check-circle"></i>
    </div>
    <h2 style="font-size: 1.8rem; margin-bottom: 10px;">Purchase Successful!</h2>
    <p style="font-size: 1.2rem; margin-bottom: 5px;">You received <strong>${tokens} tokens</strong></p>
    <p style="font-size: 1rem; opacity: 0.9;">Your new balance: ${currentUser.tokens} tokens</p>
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -60%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -40%);
    }
  }
`;
document.head.appendChild(style);

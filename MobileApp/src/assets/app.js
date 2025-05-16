// Mock user data for testing
const mockUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phoneNumber: '123-456-7890',
  points: 3500,
  referralCode: 'JOHNDOE25',
};

// Initialize screens with content
document.addEventListener('DOMContentLoaded', () => {
  // Setup Login Screen
  setupLoginScreen();
  
  // Setup Register Screen
  setupRegisterScreen();
  
  // Setup Home Screen
  setupHomeScreen();
  
  // Setup Profile Screen
  setupProfileScreen();
  
  // Setup Rewards Screen
  setupRewardsScreen();
  
  // Set up navigation
  setupNavigation();
});

// Screen setup functions
function setupLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  
  loginScreen.innerHTML = `
    <div class="logo-container">
      <div class="logo">OR</div>
      <div class="title">Opian Rewards</div>
    </div>
    <div class="form-container">
      <input type="text" class="input-field" placeholder="Username" id="login-username">
      <input type="password" class="input-field" placeholder="Password" id="login-password">
      <button class="button" id="login-button">Log In</button>
      <div class="link-container">
        <span>Don't have an account? </span>
        <a href="#" class="link" id="register-link">Register</a>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('login-button').addEventListener('click', handleLogin);
  document.getElementById('register-link').addEventListener('click', () => {
    showScreen('register-screen');
  });
}

function setupRegisterScreen() {
  const registerScreen = document.getElementById('register-screen');
  
  registerScreen.innerHTML = `
    <div class="header" style="text-align: center; padding: 20px;">
      <div class="title">Create an Account</div>
      <div style="color: #666; margin-top: 5px;">Join Opian Rewards today!</div>
    </div>
    <div class="form-container">
      <input type="text" class="input-field" placeholder="Username" id="register-username">
      <input type="email" class="input-field" placeholder="Email" id="register-email">
      <input type="text" class="input-field" placeholder="First Name" id="register-firstname">
      <input type="text" class="input-field" placeholder="Last Name" id="register-lastname">
      <input type="tel" class="input-field" placeholder="Phone Number" id="register-phone">
      <input type="password" class="input-field" placeholder="Password" id="register-password">
      <input type="password" class="input-field" placeholder="Confirm Password" id="register-confirm-password">
      <button class="button" id="register-button">Register</button>
      <div class="link-container">
        <span>Already have an account? </span>
        <a href="#" class="link" id="login-link">Log In</a>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('register-button').addEventListener('click', handleRegister);
  document.getElementById('login-link').addEventListener('click', () => {
    showScreen('login-screen');
  });
}

function setupHomeScreen() {
  const homeScreen = document.getElementById('home-screen');
  
  homeScreen.innerHTML = `
    <div class="header">
      <div class="welcome-text">Welcome back,</div>
      <div class="user-name">${mockUser.firstName}</div>
    </div>
    
    <div class="card">
      <div class="card-title">Your Points</div>
      <div class="points-value">${mockUser.points}</div>
      <button class="button" id="view-rewards-button">View Rewards</button>
    </div>
    
    <div class="card">
      <div class="card-title">Refer Friends</div>
      <div class="card-description">Share your referral code with friends and earn 2,000 points for each successful referral!</div>
      <div class="referral-code">${mockUser.referralCode}</div>
      <button class="button" id="share-button">Share Referral Code</button>
    </div>
    
    <div class="section-title">Latest Activities</div>
    
    <div class="activity-card">
      <div class="activity-header">
        <div class="activity-title">Points Earned</div>
        <div class="activity-points">+500</div>
      </div>
      <div class="activity-date">Today</div>
      <div class="activity-description">Account creation bonus</div>
    </div>
    
    <div class="activity-card">
      <div class="activity-header">
        <div class="activity-title">Subscription Renewed</div>
        <div class="activity-points">+1,500</div>
      </div>
      <div class="activity-date">Last week</div>
      <div class="activity-description">Monthly subscription renewed</div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('view-rewards-button').addEventListener('click', () => {
    showScreen('rewards-screen');
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector('[data-screen="rewards-screen"]').classList.add('active');
  });
  
  document.getElementById('share-button').addEventListener('click', () => {
    alert(`Sharing referral code: ${mockUser.referralCode}`);
  });
}

function setupProfileScreen() {
  const profileScreen = document.getElementById('profile-screen');
  
  profileScreen.innerHTML = `
    <div class="profile-header">
      <div class="avatar">${getInitials(mockUser)}</div>
      <div class="profile-name">${mockUser.firstName} ${mockUser.lastName}</div>
      <div class="profile-email">${mockUser.email}</div>
    </div>
    
    <div class="card" id="personal-info-card">
      <div class="card-header">
        <div class="card-title">Personal Information</div>
        <button class="edit-button" id="edit-profile-button">Edit</button>
      </div>
      <div class="divider"></div>
      
      <div class="info-item">
        <div class="info-label">First Name</div>
        <div class="info-value">${mockUser.firstName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Last Name</div>
        <div class="info-value">${mockUser.lastName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${mockUser.email}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">${mockUser.phoneNumber}</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Account Information</div>
      <div class="divider"></div>
      
      <div class="info-item">
        <div class="info-label">Member Since</div>
        <div class="info-value">May 2025</div>
      </div>
      <div class="info-item">
        <div class="info-label">Subscription</div>
        <div class="info-value">OPPORTUNITY</div>
      </div>
      <div class="info-item">
        <div class="info-label">Points Balance</div>
        <div class="info-value">${mockUser.points} points</div>
      </div>
      <div class="info-item">
        <div class="info-label">Referral Code</div>
        <div class="info-value">${mockUser.referralCode}</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Settings</div>
      <div class="divider"></div>
      
      <div class="settings-item">
        <div class="settings-left">
          <div class="settings-icon">🔑</div>
          <div>Change Password</div>
        </div>
        <div>➡️</div>
      </div>
      
      <div class="settings-item">
        <div class="settings-left">
          <div class="settings-icon">🔔</div>
          <div>Notification Preferences</div>
        </div>
        <div>➡️</div>
      </div>
      
      <div class="settings-item">
        <div class="settings-left">
          <div class="settings-icon">🛡️</div>
          <div>Privacy Settings</div>
        </div>
        <div>➡️</div>
      </div>
    </div>
    
    <button class="logout-button" id="logout-button">Log Out</button>
  `;
  
  // Add event listeners
  document.getElementById('edit-profile-button').addEventListener('click', () => {
    alert('Edit profile functionality would be implemented here');
  });
  
  document.getElementById('logout-button').addEventListener('click', handleLogout);
}

function setupRewardsScreen() {
  const rewardsScreen = document.getElementById('rewards-screen');
  
  const rewardsData = [
    {
      id: 1,
      title: 'Shopping Voucher',
      description: 'R500 shopping voucher for any participating retail store',
      pointsCost: 5000,
      category: 'Vouchers',
    },
    {
      id: 2,
      title: 'Wellness Discount',
      description: '25% discount on your next wellness treatment',
      pointsCost: 3000,
      category: 'Health',
    },
    {
      id: 3,
      title: 'Movie Tickets',
      description: 'Two free movie tickets at any cinema nationwide',
      pointsCost: 2500,
      category: 'Entertainment',
    },
    {
      id: 4,
      title: 'Restaurant Voucher',
      description: 'R250 voucher at participating restaurants',
      pointsCost: 2000,
      category: 'Dining',
    },
  ];
  
  // Generate rewards list HTML
  const rewardsListHTML = rewardsData.map(reward => {
    const isDisabled = mockUser.points < reward.pointsCost;
    return `
      <div class="reward-card">
        <div class="reward-image">
          <div class="category-tag">${reward.category}</div>
        </div>
        <div class="reward-content">
          <div class="reward-title">${reward.title}</div>
          <div class="reward-description">${reward.description}</div>
          <div class="reward-footer">
            <div class="reward-points">${reward.pointsCost} points</div>
            <button class="redeem-button" ${isDisabled ? 'disabled' : ''} data-reward-id="${reward.id}">
              Redeem
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  rewardsScreen.innerHTML = `
    <div class="header" style="text-align: center; padding: 20px;">
      <div class="title">Rewards</div>
    </div>
    
    <div class="points-card">
      <div class="points-label">Available Points</div>
      <div class="points-value-light">${mockUser.points}</div>
    </div>
    
    <div class="categories-container">
      <div class="category-chip active">All</div>
      <div class="category-chip">Vouchers</div>
      <div class="category-chip">Health</div>
      <div class="category-chip">Entertainment</div>
      <div class="category-chip">Dining</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="section-title">Available Rewards</div>
    
    ${rewardsListHTML}
  `;
  
  // Add event listeners
  document.querySelectorAll('.redeem-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const rewardId = e.target.getAttribute('data-reward-id');
      const reward = rewardsData.find(r => r.id === parseInt(rewardId));
      
      if (mockUser.points >= reward.pointsCost) {
        if (confirm(`Are you sure you want to redeem ${reward.title} for ${reward.pointsCost} points?`)) {
          alert(`You have successfully redeemed ${reward.title}!`);
        }
      } else {
        alert(`You need ${reward.pointsCost - mockUser.points} more points to redeem this reward.`);
      }
    });
  });
  
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.category-chip').forEach(c => {
        c.classList.remove('active');
      });
      e.target.classList.add('active');
      
      // In a real app, we would filter the rewards by category here
      alert(`Filtering by ${e.target.innerText} category`);
    });
  });
}

// Navigation setup
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const screenId = item.getAttribute('data-screen');
      
      // Update active nav item
      navItems.forEach(navItem => {
        navItem.classList.remove('active');
      });
      item.classList.add('active');
      
      // Show the selected screen
      showScreen(screenId);
    });
  });
}

// Helper functions
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Show the selected screen
  document.getElementById(screenId).classList.add('active');
  
  // Show/hide the bottom nav based on whether we're showing auth screens
  const bottomNav = document.querySelector('.bottom-nav');
  if (screenId === 'login-screen' || screenId === 'register-screen') {
    bottomNav.style.display = 'none';
  } else {
    bottomNav.style.display = 'flex';
  }
}

function getInitials(user) {
  if (!user) return 'OP';
  const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
  const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
  return (firstInitial + lastInitial).toUpperCase();
}

// Event handlers
function handleLogin() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }
  
  // In a real app, we would make an API call to the server here
  setTimeout(() => {
    showScreen('home-screen');
    document.querySelector('[data-screen="home-screen"]').classList.add('active');
  }, 1000);
}

function handleRegister() {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const firstName = document.getElementById('register-firstname').value;
  const lastName = document.getElementById('register-lastname').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  if (!username || !email || !firstName || !lastName || !phone || !password || !confirmPassword) {
    alert('Please fill out all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  // In a real app, we would make an API call to the server here
  setTimeout(() => {
    showScreen('home-screen');
    document.querySelector('[data-screen="home-screen"]').classList.add('active');
  }, 1000);
}

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    showScreen('login-screen');
  }
}
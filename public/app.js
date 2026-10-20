/**
 * Frontend JavaScript Controller
 * Handles client-side API requests, JWT decoding, clipboard helpers, and live response inspector.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const apiStatusBadge = document.getElementById('api-status-badge');
  const apiStatusText = document.getElementById('api-status-text');

  const registerForm = document.getElementById('register-form');
  const regName = document.getElementById('reg-name');
  const regEmail = document.getElementById('reg-email');
  const regPassword = document.getElementById('reg-password');
  const regRole = document.getElementById('reg-role');
  const btnMockRegister = document.getElementById('btn-mock-register');

  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const btnMockLogin = document.getElementById('btn-mock-login');

  const activeJwtDisplay = document.getElementById('active-jwt-display');
  const tokenStatusBadge = document.getElementById('token-status-badge');
  const btnCopyToken = document.getElementById('btn-copy-token');
  const btnCopyHeader = document.getElementById('btn-copy-header');
  const btnTamperToken = document.getElementById('btn-tamper-token');
  const btnClearToken = document.getElementById('btn-clear-token');

  const decodedSection = document.getElementById('decoded-section');
  const claimId = document.getElementById('claim-id');
  const claimEmail = document.getElementById('claim-email');
  const claimRole = document.getElementById('claim-role');
  const claimExp = document.getElementById('claim-exp');

  const btnGetProfile = document.getElementById('btn-get-profile');
  const btnVerifyToken = document.getElementById('btn-verify-token');
  const btnTestUnauthorized = document.getElementById('btn-test-unauthorized');
  const btnTestForbidden = document.getElementById('btn-test-forbidden');
  const quickSuiteBtn = document.getElementById('quick-suite-btn');

  const responseMetaText = document.getElementById('response-meta-text');
  const responseStatusPill = document.getElementById('response-status-pill');
  const responseJsonDisplay = document.getElementById('response-json-display');
  const toastContainer = document.getElementById('toast-container');

  // Application State
  let currentToken = localStorage.getItem('jwt_tracker_token') || '';

  // Initialize
  checkApiHealth();
  if (currentToken) {
    updateTokenDisplay(currentToken);
  }

  // --- API Health Probe ---
  async function checkApiHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        apiStatusBadge.className = 'status-indicator';
        apiStatusText.textContent = 'API Online (Port 5000)';
      } else {
        throw new Error('API returned ' + res.status);
      }
    } catch (err) {
      apiStatusBadge.className = 'status-indicator badge-tampered';
      apiStatusText.textContent = 'API Offline';
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Response Inspector Renderer ---
  function renderResponse(method, url, status, duration, data) {
    responseMetaText.textContent = `${method} ${url} • ${duration}ms`;

    responseStatusPill.className = 'status-pill';
    if (status >= 200 && status < 300) {
      responseStatusPill.classList.add('status-2xx');
      responseStatusPill.textContent = `${status} SUCCESS`;
    } else if (status >= 400 && status < 500) {
      responseStatusPill.classList.add('status-4xx');
      responseStatusPill.textContent = `${status} CLIENT ERROR`;
    } else {
      responseStatusPill.classList.add('status-5xx');
      responseStatusPill.textContent = `${status} SERVER ERROR`;
    }

    responseJsonDisplay.textContent = JSON.stringify(data, null, 2);
  }

  // --- JWT Decoding Helper ---
  function decodeJwtPayload(token) {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  function updateTokenDisplay(token) {
    currentToken = token;
    activeJwtDisplay.value = token;

    if (!token) {
      tokenStatusBadge.className = 'badge';
      tokenStatusBadge.textContent = 'No Token Active';
      decodedSection.classList.add('hidden');
      localStorage.removeItem('jwt_tracker_token');
      return;
    }

    localStorage.setItem('jwt_tracker_token', token);
    const decoded = decodeJwtPayload(token);

    if (decoded) {
      tokenStatusBadge.className = 'badge badge-active';
      tokenStatusBadge.textContent = 'Valid Token Cached';
      decodedSection.classList.remove('hidden');

      claimId.textContent = decoded.id ? `${decoded.id.slice(0, 14)}...` : 'N/A';
      claimEmail.textContent = decoded.email || 'N/A';
      claimRole.textContent = decoded.role || 'student';

      if (decoded.exp) {
        const expDate = new Date(decoded.exp * 1000);
        const isExpired = Date.now() > decoded.exp * 1000;
        claimExp.textContent = isExpired ? 'EXPIRED' : expDate.toLocaleTimeString();
        if (isExpired) {
          tokenStatusBadge.className = 'badge badge-tampered';
          tokenStatusBadge.textContent = 'Token Expired';
        }
      }
    } else {
      tokenStatusBadge.className = 'badge badge-tampered';
      tokenStatusBadge.textContent = 'Malformed Token';
      decodedSection.classList.add('hidden');
    }
  }

  // --- API Action Wrapper ---
  async function executeApiCall(method, url, body = null, customHeaders = {}) {
    const startTime = performance.now();
    const headers = { 'Content-Type': 'application/json', ...customHeaders };
    const options = { method, headers };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, options);
      const duration = Math.round(performance.now() - startTime);
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { message: await res.text() };
      }

      renderResponse(method, url, res.status, duration, data);
      return { status: res.status, data };
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      const errorObj = { error: 'Network Error', message: err.message };
      renderResponse(method, url, 500, duration, errorObj);
      showToast('Network request failed: ' + err.message, 'error');
      return { status: 500, data: errorObj };
    }
  }

  // --- Event Listeners: Registration ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: regName.value.trim(),
      email: regEmail.value.trim(),
      password: regPassword.value,
      role: regRole.value
    };

    const result = await executeApiCall('POST', '/api/users/register', payload);
    if (result.status === 201 && result.data.token) {
      updateTokenDisplay(result.data.token);
      showToast('Registration successful! JWT issued.', 'success');
      // Populate login fields for convenience
      loginEmail.value = payload.email;
      loginPassword.value = payload.password;
    } else {
      showToast(result.data.message || 'Registration failed', 'error');
    }
  });

  btnMockRegister.addEventListener('click', () => {
    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    regName.value = `Student ${randomSuffix}`;
    regEmail.value = `student${randomSuffix}@campus.edu`;
    regPassword.value = 'SecurePass2026!';
    regRole.value = 'student';
    showToast('Mock registration form populated', 'info');
  });

  // --- Event Listeners: Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      email: loginEmail.value.trim(),
      password: loginPassword.value
    };

    const result = await executeApiCall('POST', '/api/users/login', payload);
    if (result.status === 200 && result.data.token) {
      updateTokenDisplay(result.data.token);
      showToast('Login successful! Authenticated with JWT.', 'success');
    } else {
      showToast(result.data.message || 'Authentication failed', 'error');
    }
  });

  btnMockLogin.addEventListener('click', () => {
    if (regEmail.value) {
      loginEmail.value = regEmail.value;
      loginPassword.value = regPassword.value || 'SecurePass2026!';
    } else {
      loginEmail.value = 'alex@example.com';
      loginPassword.value = 'CorrectPassword99';
    }
    showToast('Credentials inserted', 'info');
  });

  // --- Token Hub Actions ---
  btnCopyToken.addEventListener('click', () => {
    if (!currentToken) return showToast('No active token to copy', 'error');
    navigator.clipboard.writeText(currentToken);
    showToast('JWT copied to clipboard', 'info');
  });

  btnCopyHeader.addEventListener('click', () => {
    if (!currentToken) return showToast('No active token to copy', 'error');
    navigator.clipboard.writeText(`Bearer ${currentToken}`);
    showToast('Authorization header copied', 'info');
  });

  btnTamperToken.addEventListener('click', () => {
    if (!currentToken) return showToast('No token active to tamper', 'error');
    const tampered = currentToken.slice(0, -8) + 'FORGED99';
    updateTokenDisplay(tampered);
    tokenStatusBadge.className = 'badge badge-tampered';
    tokenStatusBadge.textContent = 'Tampered Signature';
    showToast('Token signature tampered for test', 'warning');
  });

  btnClearToken.addEventListener('click', () => {
    updateTokenDisplay('');
    showToast('Token cleared from memory', 'info');
  });

  // --- Protected Route Actions ---
  btnGetProfile.addEventListener('click', async () => {
    if (!currentToken) {
      showToast('No active token. Please register or login first.', 'warning');
    }
    const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
    const result = await executeApiCall('GET', '/api/users/profile', null, headers);
    if (result.status === 200) {
      showToast('Profile retrieved successfully', 'success');
    }
  });

  btnVerifyToken.addEventListener('click', async () => {
    if (!currentToken) {
      showToast('No active token. Register or login first.', 'warning');
    }
    const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
    const result = await executeApiCall('GET', '/api/users/verify', null, headers);
    if (result.status === 200) {
      showToast('Token verified and valid', 'success');
    }
  });

  btnTestUnauthorized.addEventListener('click', async () => {
    showToast('Calling protected route WITHOUT Authorization header...', 'info');
    const result = await executeApiCall('GET', '/api/users/profile', null, {});
    if (result.status === 401) {
      showToast('Expected 401 Unauthorized received correctly!', 'success');
    }
  });

  btnTestForbidden.addEventListener('click', async () => {
    showToast('Calling protected route with FORGED signature...', 'info');
    const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered_invalid_signature';
    const result = await executeApiCall('GET', '/api/users/profile', null, {
      Authorization: `Bearer ${badToken}`
    });
    if (result.status === 403) {
      showToast('Expected 403 Forbidden received correctly!', 'success');
    }
  });

  // --- Run Automated Mini Suite ---
  quickSuiteBtn.addEventListener('click', async () => {
    quickSuiteBtn.disabled = true;
    quickSuiteBtn.textContent = '⏳ Testing...';

    const testEmail = `auto_test_${Date.now()}@domain.com`;
    const testPassword = 'SuitePassword123!';

    // Step 1: Register
    showToast('1/4 Testing Registration...', 'info');
    const regRes = await executeApiCall('POST', '/api/users/register', {
      name: 'Automated Suite Tester',
      email: testEmail,
      password: testPassword,
      role: 'student'
    });

    if (regRes.status !== 201) {
      showToast('Suite failed at Registration', 'error');
      quickSuiteBtn.disabled = false;
      quickSuiteBtn.textContent = '⚡ Run Automated Checks';
      return;
    }

    const testToken = regRes.data.token;
    updateTokenDisplay(testToken);
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Login
    showToast('2/4 Testing Login...', 'info');
    const loginRes = await executeApiCall('POST', '/api/users/login', {
      email: testEmail,
      password: testPassword
    });

    if (loginRes.status !== 200) {
      showToast('Suite failed at Login', 'error');
      quickSuiteBtn.disabled = false;
      quickSuiteBtn.textContent = '⚡ Run Automated Checks';
      return;
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 3: Access Protected Profile
    showToast('3/4 Testing Protected Profile...', 'info');
    const profRes = await executeApiCall('GET', '/api/users/profile', null, {
      Authorization: `Bearer ${testToken}`
    });

    if (profRes.status !== 200) {
      showToast('Suite failed at Profile check', 'error');
      quickSuiteBtn.disabled = false;
      quickSuiteBtn.textContent = '⚡ Run Automated Checks';
      return;
    }
    await new Promise((r) => setTimeout(r, 600));

    // Step 4: Verify Guard (401 check)
    showToast('4/4 Testing Unauthorized Guard...', 'info');
    const unauthRes = await executeApiCall('GET', '/api/users/profile', null, {});

    if (unauthRes.status === 401) {
      showToast('🎉 All 4 automated checks PASSED successfully!', 'success');
    } else {
      showToast('Unauthorized guard assertion failed', 'error');
    }

    quickSuiteBtn.disabled = false;
    quickSuiteBtn.textContent = '⚡ Run Automated Checks';
  });
});

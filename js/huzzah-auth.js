const COOLDOWNS = [30, 60, 300, 900];
const MAX_ATTEMPTS = 3;
const CONSOLE_PASSWORD_KEY = 'petal_console_authed';

let failedAttempts = 0;

async function checkLockout() {
  const rows = await fetchLatestLockout();
  if (!rows || rows.length === 0) return null;

  const latest = rows.find(r => r.lockout_until);
  if (!latest) return null;

  const until = new Date(latest.lockout_until);
  if (until > new Date()) return until;
  return null;
}

function startLockoutTimer(until) {
  const screen = document.getElementById('lockout-screen');
  const timer = document.getElementById('lockout-timer');
  const login = document.getElementById('login-screen');

  screen.classList.remove('hidden');
  login.classList.add('hidden');

  const interval = setInterval(() => {
    const diff = Math.max(0, Math.ceil((until - new Date()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    timer.textContent = `Unlocks in ${m}:${s.toString().padStart(2, '0')}`;

    if (diff <= 0) {
      clearInterval(interval);
      screen.classList.add('hidden');
      login.classList.remove('hidden');
      clearAuthAttempts();
    }
  }, 1000);
}

async function handleLogin(e) {
  e.preventDefault();

  const lockout = await checkLockout();
  if (lockout) {
    startLockoutTimer(lockout);
    return;
  }

  const pw = document.getElementById('login-password').value.trim();
  const correct = pw === (window.PETAL_ADMIN_PASSWORD || 'petal2025');

  if (correct) {
    sessionStorage.setItem(CONSOLE_PASSWORD_KEY, '1');
    await clearAuthAttempts();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initConsole();
    return;
  }

  failedAttempts++;
  const remaining = MAX_ATTEMPTS - failedAttempts;
  const attemptsDisplay = document.getElementById('attempts-display');
  const loginError = document.getElementById('login-error');

  loginError.classList.remove('hidden');

  if (failedAttempts >= MAX_ATTEMPTS) {
    const cooldownIndex = Math.min(failedAttempts - MAX_ATTEMPTS, COOLDOWNS.length - 1);
    const seconds = COOLDOWNS[cooldownIndex];
    const until = new Date(Date.now() + seconds * 1000);
    await insertAuthAttempt(until.toISOString());
    loginError.textContent = `Too many attempts. Locked for ${seconds >= 60 ? seconds / 60 + ' min' : seconds + ' sec'}.`;
    startLockoutTimer(until);
  } else {
    await insertAuthAttempt(null);
    loginError.textContent = `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
    attemptsDisplay.textContent = `${failedAttempts} of ${MAX_ATTEMPTS} attempts used`;
  }

  document.getElementById('login-password').value = '';
}

async function initAuth() {
  const alreadyAuthed = sessionStorage.getItem(CONSOLE_PASSWORD_KEY);

  if (alreadyAuthed) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initConsole();
    return;
  }

  const lockout = await checkLockout();
  if (lockout) {
    document.getElementById('login-screen').classList.add('hidden');
    startLockoutTimer(lockout);
    return;
  }

  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem(CONSOLE_PASSWORD_KEY);
  location.reload();
});

initAuth();
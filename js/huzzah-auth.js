const CONSOLE_PASSWORD_KEY = 'petal_console_authed';

async function checkLockoutOnLoad() {
  try {
    const res = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '__lockcheck__' })
    });
    if (res.status === 423) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('troll-screen').classList.remove('hidden');
      runTrollSequence();
    }
  } catch (e) {
    // network error on load — do nothing
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const btn = e.target.querySelector('[type="submit"]');
  const loginError = document.getElementById('login-error');
  const attemptsDisplay = document.getElementById('attempts-display');

  btn.disabled = true;
  btn.textContent = 'Checking...';
  loginError.classList.add('hidden');

  const pw = document.getElementById('login-password').value;

  try {
    const res = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });

    if (res.status === 423) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('troll-screen').classList.remove('hidden');
      runTrollSequence();
      return;
    }

    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem(CONSOLE_PASSWORD_KEY, '1');
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      initConsole();
      return;
    }

    loginError.classList.remove('hidden');
    const remaining = data.remaining;
    loginError.textContent = remaining != null
      ? `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      : 'Incorrect password.';

    if (remaining != null) {
      attemptsDisplay.textContent = `${3 - remaining} of 3 attempts used`;
    }

  } catch (err) {
    loginError.classList.remove('hidden');
    loginError.textContent = 'Connection error. Try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enter';
    document.getElementById('login-password').value = '';
  }
}

async function initAuth() {
  const alreadyAuthed = sessionStorage.getItem(CONSOLE_PASSWORD_KEY);

  if (alreadyAuthed) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initConsole();
    return;
  }

  await checkLockoutOnLoad();
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem(CONSOLE_PASSWORD_KEY);
  location.reload();
});

initAuth();
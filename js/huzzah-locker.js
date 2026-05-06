function trollFlash(then) {
  const f = document.getElementById('troll-flash');
  f.style.display = 'block';
  f.style.opacity = '1';
  f.style.transition = 'opacity 80ms ease-in';
  setTimeout(() => {
    f.style.transition = 'opacity 400ms ease-out';
    f.style.opacity = '0';
    setTimeout(() => {
      f.style.display = 'none';
      if (then) then();
    }, 420);
  }, 80);
}

function runTrollSequence() {
  const screen = document.getElementById('troll-screen');
  if (screen.classList.contains('hidden')) return;

  trollFlash(() => {
    const icon = document.getElementById('troll-icon');
    setTimeout(() => { icon.style.opacity = '1'; }, 50);

    setTimeout(() => {
      trollFlash(() => {
        icon.style.opacity = '0';

        setTimeout(() => {
          icon.style.display = 'none';
          const check = document.getElementById('troll-check');
          check.style.display = 'block';

          setTimeout(() => { check.classList.add('drawn'); }, 50);

          setTimeout(() => {
            check.style.transition = 'transform 0.4s ease';
            check.style.transform = 'scale(0.85)';
          }, 800);

          setTimeout(() => { check.classList.add('pulse'); }, 1300);
        }, 400);
      });
    }, 600);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const screen = document.getElementById('troll-screen');
  if (!screen) return;

  if (!screen.classList.contains('hidden')) {
    runTrollSequence();
    return;
  }

  const observer = new MutationObserver(() => {
    if (!screen.classList.contains('hidden')) {
      observer.disconnect();
      runTrollSequence();
    }
  });
  observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
});
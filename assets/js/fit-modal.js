document.addEventListener('DOMContentLoaded', function () {
  const openBtn = document.getElementById('open-fit-modal');
  if (!openBtn) return;

  // create modal elements
  const overlay = document.createElement('div');
  overlay.className = 'fit-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'fit-modal';

  dialog.innerHTML = `
    <h2>Experimental feature</h2>
    <p>This feature is experimental. Results may be incomplete or change frequently. Use at your own discretion.</p>
    <p style="font-size:0.9rem;color:#555;margin:0 0 8px 0">You can close this message or continue using the page as normal.</p>
    <div style="text-align:right">
      <button class="close-btn">Close</button>
      <button class="close-btn primary" id="dont-show">Don't show again</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  function openModal() {
    overlay.classList.add('open');
    // focus first button
    const btn = overlay.querySelector('.close-btn');
    if (btn) btn.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
  }

  openBtn.addEventListener('click', openModal);

  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) closeModal();
  });

  overlay.querySelectorAll('.close-btn').forEach((b) => b.addEventListener('click', closeModal));

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeModal();
  });
});

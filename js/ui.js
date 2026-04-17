/**
 * ui.js — DOM rendering helpers (v3)
 * Swipe-to-delete, renew button, progress bar, click-to-call
 */

const UI = (() => {

  // ── Formatters ─────────────────────────────────────────

  function formatDate(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatDays(days) {
    if (days < 0)   return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    if (days === 0) return 'Expires today!';
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  }

  function statusLabel(status) {
    return { active: 'Active', 'expiring-soon': 'Expiring Soon', expired: 'Expired' }[status] || status;
  }

  // ── Year Progress ───────────────────────────────────────

  function calcYearProgress(member) {
    const reg    = new Date(member.registrationDate + 'T00:00:00');
    const expiry = new Date(member.expiryDate + 'T00:00:00');
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const total  = (expiry - reg) / 86400000;
    const elapsed = (today - reg) / 86400000;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  // ── Avatar class by relationship ────────────────────────

  function avatarClass(rel) {
    const MAP = {
      Self: 'av-self', Husband: 'av-husband',
      Wife: 'av-wife', Child: 'av-child', Other: 'av-other'
    };
    return MAP[rel] || 'av-default';
  }

  // ── Swipe-to-delete ─────────────────────────────────────

  function addSwipeEvents(wrapper, card) {
    let startX = 0;
    let isSwiping = false;

    card.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      isSwiping = true;
      card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!isSwiping) return;
      const delta = e.touches[0].clientX - startX;
      if (delta < 0) {
        card.style.transform = `translateX(${Math.max(-80, delta)}px)`;
      }
    }, { passive: true });

    card.addEventListener('touchend', e => {
      if (!isSwiping) return;
      isSwiping = false;
      card.style.transition = '';
      const delta = e.changedTouches[0].clientX - startX;
      if (delta < -50) {
        card.classList.add('is-swiped');
        wrapper.classList.add('is-swiped');
      } else {
        card.style.transform = '';
        card.classList.remove('is-swiped');
        wrapper.classList.remove('is-swiped');
      }
    }, { passive: true });

    // tap anywhere else collapses swipe
    document.addEventListener('touchstart', e => {
      if (card.classList.contains('is-swiped') && !wrapper.contains(e.target)) {
        card.style.transform = '';
        card.classList.remove('is-swiped');
        wrapper.classList.remove('is-swiped');
      }
    }, { passive: true });
  }

  // ── Member Card ─────────────────────────────────────────

  function createMemberCard(member) {
    // Outer swipe wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-wrapper';

    // Hidden delete bg revealed on swipe
    const swipeBg = document.createElement('div');
    swipeBg.className = 'swipe-action-bg';
    swipeBg.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      <span>Delete</span>
    `;
    swipeBg.addEventListener('click', () => {
      // Trigger the existing btn-delete delegation by dispatching a synthetic click
      const fakeBtn = card.querySelector('.btn-delete');
      if (fakeBtn) fakeBtn.click();
    });

    // Card itself
    const card = document.createElement('div');
    card.className = `member-card status-${member.status}`;
    card.dataset.id = member.id;

    const initials  = member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const progress  = calcYearProgress(member);
    const relBadge  = (member.relationship && member.relationship !== 'Self')
      ? `<span class="rel-badge">${escapeHtml(member.relationship)}</span>` : '';
    const idText    = member.nhiaId ? `ID: ${escapeHtml(member.nhiaId)}` : 'ID: Unknown';

    const renewRow  = member.status === 'expired'
      ? `<button class="btn-renew" data-id="${member.id}" aria-label="Renew ${escapeHtml(member.name)}">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
           Mark as Renewed
         </button>` : '';

    card.innerHTML = `
      <div class="member-avatar ${avatarClass(member.relationship)}">${initials}</div>
      <div class="member-info">
        <div class="member-name">${escapeHtml(member.name)} ${relBadge}</div>
        <div class="member-phone">
          <a href="tel:${member.phone}" class="phone-link" aria-label="Call ${escapeHtml(member.name)}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${escapeHtml(member.phone)}
          </a>
          <span class="nhia-id-text">${idText}</span>
        </div>
        <div class="member-expiry">Expires: <strong>${formatDate(member.expiryDate)}</strong></div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="progress-meta">
          <div class="member-days">${formatDays(member.daysRemaining)}</div>
          <div class="progress-pct">${progress}% elapsed</div>
        </div>
      </div>
      <div class="member-actions">
        <span class="status-badge badge-${member.status}">${statusLabel(member.status)}</span>
        <div class="action-buttons">
          <button class="btn-icon btn-edit"   data-id="${member.id}" aria-label="Edit ${escapeHtml(member.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-delete" data-id="${member.id}" aria-label="Delete ${escapeHtml(member.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      ${renewRow}
    `;

    wrapper.appendChild(swipeBg);
    wrapper.appendChild(card);

    addSwipeEvents(wrapper, card);

    return wrapper;
  }

  // ── Summary Cards ───────────────────────────────────────

  function updateSummaryCards(summary) {
    document.getElementById('stat-total').textContent   = summary.total;
    document.getElementById('stat-active').textContent  = summary.active;
    document.getElementById('stat-soon').textContent    = summary.expiringSoon;
    document.getElementById('stat-expired').textContent = summary.expired;
  }

  // ── Member List ─────────────────────────────────────────

  function renderMemberList(members) {
    const list       = document.getElementById('member-list');
    const emptyState = document.getElementById('empty-state');
    list.innerHTML = '';

    if (members.length === 0) {
      emptyState.hidden = false;
      list.hidden = true;
      return;
    }

    emptyState.hidden = true;
    list.hidden = false;

    const sorted = [...members].sort((a, b) => {
      const order = { 'expiring-soon': 0, 'active': 1, 'expired': 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.daysRemaining - b.daysRemaining;
    });

    sorted.forEach((member, i) => {
      const wrapper = createMemberCard(member);
      wrapper.style.animationDelay = `${i * 0.05}s`;
      list.appendChild(wrapper);
    });
  }

  // ── Toast ──────────────────────────────────────────────

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ── Confirm Dialog ──────────────────────────────────────

  function showConfirm(message) {
    return new Promise(resolve => {
      const overlay   = document.getElementById('confirm-overlay');
      const msg       = document.getElementById('confirm-message');
      const btnOk     = document.getElementById('confirm-ok');
      const btnCancel = document.getElementById('confirm-cancel');
      msg.textContent = message;
      overlay.hidden  = false;

      function cleanup(result) {
        overlay.hidden = true;
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        resolve(result);
      }
      const onOk     = () => cleanup(true);
      const onCancel = () => cleanup(false);
      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
    });
  }

  // ── Helpers ────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { renderMemberList, updateSummaryCards, formatDate, showToast, showConfirm };
})();

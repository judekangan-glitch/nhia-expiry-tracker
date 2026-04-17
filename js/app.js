/**
 * app.js — App init, routing, dark mode, onboarding, alert banner,
 *           search, filter, nav badge, mark-as-renewed
 */

const App = (() => {

  let currentScreen  = 'dashboard';
  let editingId      = null;
  let activeFilter   = 'all';
  let searchQuery    = '';

  // ══════════════════════════════════════════════════════
  // DARK MODE
  // ══════════════════════════════════════════════════════

  function initDarkMode() {
    const saved = localStorage.getItem('nhia_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    document.getElementById('dark-mode-toggle').addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('nhia_theme', isDark ? 'light' : 'dark');
    });
  }

  // ══════════════════════════════════════════════════════
  // ONBOARDING
  // ══════════════════════════════════════════════════════

  function initOnboarding() {
    const hasOnboarded = localStorage.getItem('nhia_onboarded');
    if (hasOnboarded) return;

    const overlay   = document.getElementById('onboarding-overlay');
    const nextBtn   = document.getElementById('ob-next-btn');
    const skipBtn   = document.getElementById('ob-skip-btn');
    const slides    = document.querySelectorAll('.ob-slide');
    const dots      = document.querySelectorAll('.ob-dot');
    let currentSlide = 0;

    overlay.hidden = false;

    function goToSlide(n) {
      slides[currentSlide].classList.remove('ob-active');
      dots[currentSlide].classList.remove('ob-dot-active');
      currentSlide = n;
      slides[currentSlide].classList.add('ob-active');
      dots[currentSlide].classList.add('ob-dot-active');
      nextBtn.textContent = currentSlide === slides.length - 1 ? 'Get Started 🎉' : 'Next →';
    }

    function finishOnboarding() {
      localStorage.setItem('nhia_onboarded', '1');
      overlay.hidden = true;
    }

    nextBtn.addEventListener('click', () => {
      if (currentSlide < slides.length - 1) {
        goToSlide(currentSlide + 1);
      } else {
        finishOnboarding();
      }
    });

    skipBtn.addEventListener('click', finishOnboarding);

    // Tap dots to navigate
    dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));
  }

  // ══════════════════════════════════════════════════════
  // GREETING
  // ══════════════════════════════════════════════════════

  function setGreeting() {
    const h = new Date().getHours();
    let g;
    if      (h < 12) g = '☀️ Good morning!';
    else if (h < 17) g = '🌤️ Good afternoon!';
    else             g = '🌙 Good evening!';
    const el = document.getElementById('header-greeting');
    if (el) el.textContent = g;
  }

  // ══════════════════════════════════════════════════════
  // ALERT BANNER
  // ══════════════════════════════════════════════════════

  function updateAlertBanner(summary) {
    const banner    = document.getElementById('alert-banner');
    const icon      = document.getElementById('alert-icon');
    const title     = document.getElementById('alert-title');
    const sub       = document.getElementById('alert-sub');

    const { expiringSoon, expired } = summary;
    const total = expiringSoon + expired;

    if (total === 0) {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    banner.className = 'alert-banner';

    if (expired > 0 && expiringSoon > 0) {
      banner.classList.add('alert-mixed');
      icon.textContent   = '⚠️';
      title.textContent  = `${total} member${total !== 1 ? 's' : ''} need attention`;
      sub.textContent    = `${expired} expired · ${expiringSoon} expiring soon`;
    } else if (expired > 0) {
      banner.classList.add('alert-expired');
      icon.textContent   = '❌';
      title.textContent  = `${expired} member${expired !== 1 ? 's' : ''} expired`;
      sub.textContent    = 'Renew now to restore coverage';
    } else {
      banner.classList.add('alert-soon');
      icon.textContent   = '⏰';
      title.textContent  = `${expiringSoon} member${expiringSoon !== 1 ? 's' : ''} expiring soon`;
      sub.textContent    = 'Tap View to see who needs renewal';
    }
  }

  // ══════════════════════════════════════════════════════
  // NAV BADGE
  // ══════════════════════════════════════════════════════

  function updateNavBadge(summary) {
    const badge = document.getElementById('nav-badge');
    const count = summary.expiringSoon + summary.expired;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  // ══════════════════════════════════════════════════════
  // SCREEN NAVIGATION
  // ══════════════════════════════════════════════════════

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen-active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('nav-active'));
    const screen  = document.getElementById(`screen-${name}`);
    if (screen) screen.classList.add('screen-active');
    const navItem = document.querySelector(`[data-nav="${name}"]`);
    if (navItem) navItem.classList.add('nav-active');
    currentScreen = name;
    if (name === 'dashboard') refreshDashboard();
    if (name === 'settings')  loadSettings();
  }

  // ══════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════

  function refreshDashboard() {
    const summary = MembersService.getSummary();
    UI.updateSummaryCards(summary);
    updateAlertBanner(summary);
    updateNavBadge(summary);

    let members = MembersService.getAll();
    if (activeFilter !== 'all') members = members.filter(m => m.status === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      members = members.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.nhiaId && m.nhiaId.toLowerCase().includes(q))
      );
    }
    UI.renderMemberList(members);
  }

  // ══════════════════════════════════════════════════════
  // MEMBER FORM
  // ══════════════════════════════════════════════════════

  function openAddForm() {
    editingId = null;
    document.getElementById('form-title').textContent = 'Add Member';
    document.getElementById('member-form').reset();
    document.getElementById('field-day').value   = '';
    document.getElementById('field-month').value = '';
    document.getElementById('field-year').value  = '';
    document.getElementById('field-expiry-preview').textContent = '—';
    document.getElementById('field-nhia-id').disabled = false;
    showScreen('form');
  }

  function openEditForm(id) {
    const member = MembersService.getById(id);
    if (!member) return;
    editingId = id;
    document.getElementById('form-title').textContent   = 'Edit Member';
    document.getElementById('field-name').value         = member.name;
    document.getElementById('field-phone').value        = member.phone;
    document.getElementById('field-relationship').value = member.relationship || 'Self';
    document.getElementById('field-nhia-id').value      = member.nhiaId || '';
    // Populate 3-field date picker
    if (member.registrationDate) {
      const [y, m, d] = member.registrationDate.split('-');
      document.getElementById('field-day').value   = parseInt(d);
      document.getElementById('field-month').value = m;
      document.getElementById('field-year').value  = y;
    }
    const noId = document.getElementById('field-no-id');
    noId.checked = !member.nhiaId;
    document.getElementById('field-nhia-id').disabled = !member.nhiaId;
    document.getElementById('field-expiry-preview').textContent = UI.formatDate(member.expiryDate);
    showScreen('form');
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const name         = document.getElementById('field-name').value.trim();
    const phone        = document.getElementById('field-phone').value.trim();
    const relationship = document.getElementById('field-relationship').value;
    const noId         = document.getElementById('field-no-id').checked;
    const nhiaId       = noId ? '' : document.getElementById('field-nhia-id').value.trim();

    // Build ISO date from 3 fields
    const day   = String(document.getElementById('field-day').value).padStart(2, '0');
    const month = document.getElementById('field-month').value;
    const year  = document.getElementById('field-year').value;
    const registrationDate = (day && month && year) ? `${year}-${month}-${day}` : '';

    if (!name || !registrationDate || !phone) {
      UI.showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (editingId) {
      MembersService.update(editingId, { name, phone, registrationDate, relationship, nhiaId });
      UI.showToast('Member updated successfully.');
    } else {
      MembersService.add({ name, phone, registrationDate, relationship, nhiaId });
      UI.showToast('Member added successfully.');
    }

    showScreen('dashboard');
  }

  // ══════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════

  async function handleDelete(id) {
    const member = MembersService.getById(id);
    if (!member) return;
    const confirmed = await UI.showConfirm(`Delete "${member.name}"? This cannot be undone.`);
    if (confirmed) {
      MembersService.remove(id);
      UI.showToast('Member removed.', 'info');
      refreshDashboard();
    }
  }

  // ══════════════════════════════════════════════════════
  // MARK AS RENEWED
  // ══════════════════════════════════════════════════════

  async function handleRenew(id) {
    const member = MembersService.getById(id);
    if (!member) return;
    const confirmed = await UI.showConfirm(
      `Renew "${member.name}" from today?\nNew expiry will be 1 year from now.`
    );
    if (confirmed) {
      const today = new Date().toISOString().split('T')[0];
      MembersService.update(id, {
        name: member.name, phone: member.phone,
        registrationDate: today,
        relationship: member.relationship,
        nhiaId: member.nhiaId
      });
      UI.showToast(`${member.name} renewed! ✓ Active for 1 year.`);
      refreshDashboard();
    }
  }

  // ══════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════

  function loadSettings() {
    const s = StorageService.getSettings();
    document.getElementById('settings-phone').value = s.phone || '';
  }

  function saveSettings() {
    const phone = document.getElementById('settings-phone').value.trim();
    StorageService.saveSettings({ phone });
    UI.showToast('Settings saved.');
    
    // Visual feedback on button
    const btn = document.getElementById('btn-save-settings');
    const originalText = btn.textContent;
    btn.textContent = 'Saved ✓';
    btn.style.background = 'var(--grad-active)';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  }

  async function handleResetData() {
    const confirmed = await UI.showConfirm('Reset ALL data? This will delete all members and settings permanently.');
    if (confirmed) {
      StorageService.resetAll();
      UI.showToast('All data has been reset.', 'info');
      activeFilter = 'all';
      searchQuery  = '';
      showScreen('dashboard');
    }
  }

  // ══════════════════════════════════════════════════════
  // EXPIRY PREVIEW
  // ══════════════════════════════════════════════════════

  function updateExpiryPreview() {
    const regDate = document.getElementById('field-reg-date').value;
    const preview = document.getElementById('field-expiry-preview');
    preview.textContent = regDate ? UI.formatDate(MembersService.calcExpiryDate(regDate)) : '—';
  }

  // ══════════════════════════════════════════════════════
  // FILTER CHIPS
  // ══════════════════════════════════════════════════════

  function setActiveFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('chip-active', c.dataset.filter === filter);
    });
    refreshDashboard();
  }

  // ══════════════════════════════════════════════════════
  // EVENT BINDING
  // ══════════════════════════════════════════════════════

  function bindEvents() {
    // Bottom nav
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () =>
        btn.dataset.nav === 'add' ? openAddForm() : showScreen(btn.dataset.nav)
      );
    });

    // FAB
    document.getElementById('fab-add').addEventListener('click', openAddForm);

    // Empty state button
    const emptyAddBtn = document.getElementById('empty-add-btn');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', openAddForm);

    // Form submit + cancel
    document.getElementById('member-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-cancel-form').addEventListener('click', () => showScreen('dashboard'));

    // NHIA ID toggle
    const nhiaInput = document.getElementById('field-nhia-id');
    document.getElementById('field-no-id').addEventListener('change', e => {
      nhiaInput.disabled = e.target.checked;
      if (e.target.checked) nhiaInput.value = '';
    });

    // Expiry preview: fires when any of the 3 date fields change
    function onDateChange() {
      const day   = String(document.getElementById('field-day').value).padStart(2, '0');
      const month = document.getElementById('field-month').value;
      const year  = document.getElementById('field-year').value;
      if (day && month && year) {
        const iso = `${year}-${month}-${day}`;
        document.getElementById('field-expiry-preview').textContent =
          UI.formatDate(MembersService.calcExpiryDate(iso));
      } else {
        document.getElementById('field-expiry-preview').textContent = '—';
      }
    }
    document.getElementById('field-day').addEventListener('input', onDateChange);
    document.getElementById('field-month').addEventListener('change', onDateChange);
    document.getElementById('field-year').addEventListener('input', onDateChange);

    // Member list delegation (edit / delete / renew)
    document.getElementById('member-list').addEventListener('click', e => {
      const editBtn   = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');
      const renewBtn  = e.target.closest('.btn-renew');
      if (editBtn)   openEditForm(editBtn.dataset.id);
      if (deleteBtn) handleDelete(deleteBtn.dataset.id);
      if (renewBtn)  handleRenew(renewBtn.dataset.id);
    });

    // Search
    document.getElementById('member-search').addEventListener('input', e => {
      searchQuery = e.target.value;
      refreshDashboard();
    });

    // Filter chips
    document.querySelectorAll('.chip').forEach(chip =>
      chip.addEventListener('click', () => setActiveFilter(chip.dataset.filter))
    );

    // Alert banner actions
    const alertViewBtn = document.getElementById('alert-view-btn');
    if (alertViewBtn) {
      alertViewBtn.addEventListener('click', () => {
        const summary = MembersService.getSummary();
        if (summary.expired > 0) setActiveFilter('expired');
        else setActiveFilter('expiring-soon');
      });
    }

    const alertDismiss = document.getElementById('alert-dismiss');
    if (alertDismiss) {
      alertDismiss.addEventListener('click', () => {
        document.getElementById('alert-banner').hidden = true;
      });
    }

    // Settings
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-reset-data').addEventListener('click', handleResetData);
  }

  // ══════════════════════════════════════════════════════
  // SERVICE WORKER
  // ══════════════════════════════════════════════════════

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err =>
        console.warn('SW registration failed:', err)
      );
    }
  }

  // ══════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════

  function init() {
    registerSW();
    initDarkMode();
    setGreeting();
    initOnboarding();
    bindEvents();
    showScreen('dashboard');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);

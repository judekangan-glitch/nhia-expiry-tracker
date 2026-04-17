/**
 * storage.js — StorageService
 * Clean localStorage wrapper. Swap this out for IndexedDB or Supabase later.
 */

const StorageService = (() => {
  const MEMBERS_KEY = 'nhia_members';
  const SETTINGS_KEY = 'nhia_settings';

  // ── Members ─────────────────────────────────────────────

  function getMembers() {
    try {
      return JSON.parse(localStorage.getItem(MEMBERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveMember(member) {
    const members = getMembers();
    const idx = members.findIndex(m => m.id === member.id);
    if (idx >= 0) {
      members[idx] = member; // update
    } else {
      members.push(member); // insert
    }
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  }

  function deleteMember(id) {
    const members = getMembers().filter(m => m.id !== id);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  }

  function getMemberById(id) {
    return getMembers().find(m => m.id === id) || null;
  }

  // ── Settings ─────────────────────────────────────────────

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { phone: '' };
    } catch {
      return { phone: '' };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ── Reset ────────────────────────────────────────────────

  function resetAll() {
    localStorage.removeItem(MEMBERS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }

  // ── UUID ─────────────────────────────────────────────────

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  return { getMembers, saveMember, deleteMember, getMemberById, getSettings, saveSettings, resetAll, generateId };
})();

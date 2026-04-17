/**
 * members.js — Member business logic
 * Handles expiry calculations, status classification, and member CRUD.
 */

const MembersService = (() => {

  const STATUS = {
    ACTIVE: 'active',
    EXPIRING_SOON: 'expiring-soon',
    EXPIRED: 'expired'
  };

  // ── Expiry Calculation ───────────────────────────────────

  function calcExpiryDate(registrationDate) {
    const d = new Date(registrationDate);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function calcDaysRemaining(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  }

  function getStatus(daysRemaining) {
    if (daysRemaining > 30) return STATUS.ACTIVE;
    if (daysRemaining >= 0) return STATUS.EXPIRING_SOON;
    return STATUS.EXPIRED;
  }

  // ── Member enrichment (adds computed fields) ─────────────

  function enrichMember(member) {
    const daysRemaining = calcDaysRemaining(member.expiryDate);
    return {
      ...member,
      daysRemaining,
      status: getStatus(daysRemaining)
    };
  }

  // ── CRUD ─────────────────────────────────────────────────

  function getAll() {
    return StorageService.getMembers().map(enrichMember);
  }

  function getById(id) {
    const member = StorageService.getMemberById(id);
    return member ? enrichMember(member) : null;
  }

  function add({ name, phone, registrationDate, relationship, nhiaId }) {
    const expiryDate = calcExpiryDate(registrationDate);
    const member = {
      id: StorageService.generateId(),
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship || 'Self',
      nhiaId: nhiaId ? nhiaId.trim() : '',
      registrationDate,
      expiryDate,
      createdAt: new Date().toISOString()
    };
    StorageService.saveMember(member);
    return enrichMember(member);
  }

  function update(id, { name, phone, registrationDate, relationship, nhiaId }) {
    const existing = StorageService.getMemberById(id);
    if (!existing) return null;
    const expiryDate = calcExpiryDate(registrationDate);
    const updated = { ...existing, name: name.trim(), phone: phone.trim(), relationship: relationship || 'Self', nhiaId: nhiaId ? nhiaId.trim() : '', registrationDate, expiryDate };
    StorageService.saveMember(updated);
    return enrichMember(updated);
  }

  function remove(id) {
    StorageService.deleteMember(id);
  }

  // ── Summary stats ────────────────────────────────────────

  function getSummary() {
    const members = getAll();
    return {
      total: members.length,
      active: members.filter(m => m.status === STATUS.ACTIVE).length,
      expiringSoon: members.filter(m => m.status === STATUS.EXPIRING_SOON).length,
      expired: members.filter(m => m.status === STATUS.EXPIRED).length
    };
  }

  return { getAll, getById, add, update, remove, getSummary, calcExpiryDate, STATUS };
})();

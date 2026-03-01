// storage.js — camada de dados (localStorage)

const Storage = (() => {
  const K = {
    PLAYERS:  'ff_players',
    MATCHES:  'ff_matches',
    SESSIONS: 'ff_sessions',
    ADMIN_KEY:'ff_admin_key',
    IS_ADMIN: 'ff_is_admin',
    TOURNAMENT:'ff_tournament',
  };

  const get = key => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  };
  const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  // ── Players ──────────────────────────────────────────────────────────────
  const getPlayers  = ()  => get(K.PLAYERS) || {};
  const setPlayers  = (p) => set(K.PLAYERS, p);

  const getPlayer = (nick) => getPlayers()[nick] || null;

  const upsertPlayer = (nick, data) => {
    const all = getPlayers();
    all[nick] = {
      nick,
      rank: 'Bronze',
      matches: [],
      achievements: [],
      joinedAt: Date.now(),
      ...(all[nick] || {}),
      ...data,
    };
    setPlayers(all);
    return all[nick];
  };

  const deletePlayer = (nick) => {
    const all = getPlayers();
    delete all[nick];
    setPlayers(all);
  };

  // ── Matches ───────────────────────────────────────────────────────────────
  const getMatches = () => get(K.MATCHES) || [];

  const addMatch = (match) => {
    const all = getMatches();
    const m = { id: Date.now(), createdAt: Date.now(), ...match };
    all.unshift(m);
    set(K.MATCHES, all);
    return m;
  };

  const deleteMatch = (id) => {
    set(K.MATCHES, getMatches().filter(m => m.id !== id));
  };

  // ── Sessions (agendamento) ────────────────────────────────────────────────
  const getSessions  = ()  => get(K.SESSIONS) || [];

  const addSession = (session) => {
    const all = getSessions();
    const s = { id: Date.now(), confirmed: [], createdAt: Date.now(), ...session };
    all.unshift(s);
    set(K.SESSIONS, all);
    return s;
  };

  const updateSession = (id, updates) => {
    const all = getSessions();
    const i = all.findIndex(s => s.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...updates }; set(K.SESSIONS, all); }
    return all[i] || null;
  };

  const deleteSession = (id) => set(K.SESSIONS, getSessions().filter(s => s.id !== id));

  // ── Confirmação local (por dispositivo) ───────────────────────────────────
  // Guarda no navegador do membro: qual nick ele confirmou e se já editou
  // Formato: { nick: 'João', edited: false }
  const getMyConfirmation = (sessionId) => get(`ff_myconf_${sessionId}`);
  const setMyConfirmation = (sessionId, data) => set(`ff_myconf_${sessionId}`, data);

  // Adicionar nick confirmado à sessão (chamado pelo admin ou pelo membro)
  const addConfirmed = (sessionId, nick) => {
    const all = getSessions();
    const i = all.findIndex(s => s.id === sessionId);
    if (i < 0) return null;
    const confirmed = all[i].confirmed || [];
    if (!confirmed.includes(nick)) {
      all[i].confirmed = [...confirmed, nick];
      set(K.SESSIONS, all);
    }
    return all[i];
  };

  // Trocar nick confirmado (edição única do membro)
  const replaceConfirmed = (sessionId, oldNick, newNick) => {
    const all = getSessions();
    const i = all.findIndex(s => s.id === sessionId);
    if (i < 0) return null;
    all[i].confirmed = (all[i].confirmed || []).map(n => n === oldNick ? newNick : n);
    set(K.SESSIONS, all);
    return all[i];
  };

  // Remover nick da lista (admin)
  const removeConfirmed = (sessionId, nick) => {
    const all = getSessions();
    const i = all.findIndex(s => s.id === sessionId);
    if (i < 0) return null;
    all[i].confirmed = (all[i].confirmed || []).filter(n => n !== nick);
    set(K.SESSIONS, all);
    return all[i];
  };

  // ── Admin ─────────────────────────────────────────────────────────────────
  const isAdmin    = ()    => get(K.IS_ADMIN) === true;
  const setAdmin   = (v)   => set(K.IS_ADMIN, v);
  const getAdminKey= ()    => get(K.ADMIN_KEY) || '';
  const setAdminKey= (k)   => set(K.ADMIN_KEY, k);

  // ── Tournament ────────────────────────────────────────────────────────────
  const getTournament  = ()  => get(K.TOURNAMENT);
  const setTournament  = (t) => set(K.TOURNAMENT, t);
  const clearTournament= ()  => localStorage.removeItem(K.TOURNAMENT);

  return {
    getPlayers, setPlayers, getPlayer, upsertPlayer, deletePlayer,
    getMatches, addMatch, deleteMatch,
    getSessions, addSession, updateSession, deleteSession,
    addConfirmed, replaceConfirmed, removeConfirmed,
    getMyConfirmation, setMyConfirmation,
    isAdmin, setAdmin, getAdminKey, setAdminKey,
    getTournament, setTournament, clearTournament,
  };
})();

// db.js — camada de dados em tempo real (Firebase Realtime Database)
// Síncrono via cache local atualizado pelo listener on('value')

const DB = (() => {
  let _db            = null;
  let _ready         = false;
  let _usingFallback = false;
  let _cache         = {};          // sessionId → session object
  let _onChange      = null;        // callback chamado quando dados mudam

  // ── Inicialização ─────────────────────────────────────────────────────────
  const init = () => {
    const cfg = window.FIREBASE_CONFIG;

    if (!cfg || cfg.databaseURL === 'COLE_AQUI') {
      console.warn('[DB] Firebase não configurado — usando localStorage como fallback.');
      _usingFallback = true;
      _ready = true;
      _loadFallback();
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      _db = firebase.database();

      _db.ref('sessions').on('value', snap => {
        const raw = snap.val() || {};
        // Normaliza: confirmed pode ser objeto {key:{nick,addedAt}} ou array legado
        Object.keys(raw).forEach(id => {
          const s = raw[id];
          s.confirmed = _normalizeConfirmed(s.confirmed);
        });
        _cache = raw;
        _ready = true;
        if (_onChange) _onChange();
      }, err => {
        console.error('[DB] Firebase error:', err);
        _usingFallback = true;
        _ready = true;
        _loadFallback();
        if (_onChange) _onChange();
      });
    } catch(e) {
      console.error('[DB] Firebase init failed:', e);
      _usingFallback = true;
      _ready = true;
      _loadFallback();
    }
  };

  // Confirmed pode vir como objeto Firebase {key:{nick,addedAt}} ou array de strings
  const _normalizeConfirmed = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw; // legado
    return Object.values(raw)
      .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
      .map(v => typeof v === 'string' ? v : v.nick);
  };

  // ── Fallback localStorage ─────────────────────────────────────────────────
  const _loadFallback = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('ff_sessions') || '[]');
      _cache = {};
      saved.forEach(s => {
        s.confirmed = _normalizeConfirmed(s.confirmed);
        _cache[s.id] = s;
      });
    } catch { _cache = {}; }
  };

  const _saveFallback = () => {
    localStorage.setItem('ff_sessions', JSON.stringify(Object.values(_cache)));
  };

  // ── API pública ───────────────────────────────────────────────────────────
  const isReady        = () => _ready;
  const isUsingFallback= () => _usingFallback;
  const onReady        = (fn) => { if (_ready) fn(); else { const t = setInterval(() => { if (_ready) { clearInterval(t); fn(); } }, 50); } };
  const setOnChange    = (fn) => { _onChange = fn; };

  const getSessions = () =>
    Object.values(_cache).sort((a, b) => b.createdAt - a.createdAt);

  const getSession = (id) => _cache[id] || null;

  // Chave segura pra usar como key no Firebase (nick sanitizado)
  const _nickKey = (nick) => nick.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) + '_' + Date.now();

  const addSession = async (session) => {
    const id = Date.now();
    const s  = { id, confirmed: [], createdAt: id, ...session };
    if (_usingFallback) {
      _cache[id] = s;
      _saveFallback();
      if (_onChange) _onChange();
      return s;
    }
    // No Firebase, confirmed como objeto vazio pra início
    const fbSession = { ...s, confirmed: {} };
    await _db.ref(`sessions/${id}`).set(fbSession);
    // o listener on('value') vai atualizar _cache automaticamente
    return s;
  };

  const deleteSession = async (id) => {
    delete _cache[id];
    if (_usingFallback) { _saveFallback(); if (_onChange) _onChange(); return; }
    await _db.ref(`sessions/${id}`).remove();
  };

  const updateSession = async (id, updates) => {
    const s = _cache[id];
    if (!s) return null;
    _cache[id] = { ...s, ...updates };
    if (_usingFallback) { _saveFallback(); if (_onChange) _onChange(); return _cache[id]; }
    // no confirmed changes here — just metadata/teams
    const { confirmed, ...rest } = updates;
    if (Object.keys(rest).length > 0) {
      await _db.ref(`sessions/${id}`).update(rest);
    }
    return _cache[id];
  };

  // Adiciona nick confirmado — usa nick como parte da chave pra evitar duplicatas
  const addConfirmed = async (sessionId, nick) => {
    const s = _cache[sessionId];
    if (!s) return;

    // Checar duplicata no cache local
    if (s.confirmed.some(n => n.toLowerCase() === nick.toLowerCase())) return;
    // enforce capacity based on format string (e.g. "2v2" → 4 jogadores)
    if (s.format && typeof s.format === 'string' && s.format.includes('v')) {
      const num = parseInt(s.format.split('v')[0], 10);
      if (!isNaN(num)) {
        const cap = num * 2; // times times players per time
        if (s.confirmed.length >= cap) return;
      }
    }

    if (_usingFallback) {
      s.confirmed = [...s.confirmed, nick];
      _saveFallback();
      if (_onChange) _onChange();
      return;
    }

    // Chave segura: nick normalizado + timestamp pra ser único
    const safeKey = nick.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)
                  || 'p' + Date.now();
    await _db.ref(`sessions/${sessionId}/confirmed/${safeKey}`).set({
      nick,
      addedAt: Date.now(),
    });
    // listener atualiza _cache
  };

  const replaceConfirmed = async (sessionId, oldNick, newNick) => {
    const s = _cache[sessionId];
    if (!s) return;

    if (_usingFallback) {
      s.confirmed = s.confirmed.map(n => n === oldNick ? newNick : n);
      _saveFallback();
      if (_onChange) _onChange();
      return;
    }

    // No Firebase: busca a entrada com nick == oldNick e atualiza
    const snap = await _db.ref(`sessions/${sessionId}/confirmed`).once('value');
    const data = snap.val() || {};
    const entry = Object.entries(data).find(([, v]) => v.nick === oldNick);
    if (entry) {
      await _db.ref(`sessions/${sessionId}/confirmed/${entry[0]}`).update({
        nick: newNick,
        editedAt: Date.now(),
      });
    }
  };

  const removeConfirmed = async (sessionId, nick) => {
    const s = _cache[sessionId];
    if (!s) return;

    if (_usingFallback) {
      s.confirmed = s.confirmed.filter(n => n !== nick);
      _saveFallback();
      if (_onChange) _onChange();
      return;
    }

    const snap = await _db.ref(`sessions/${sessionId}/confirmed`).once('value');
    const data = snap.val() || {};
    const entry = Object.entries(data).find(([, v]) => v.nick === nick);
    if (entry) {
      await _db.ref(`sessions/${sessionId}/confirmed/${entry[0]}`).remove();
    }
  };

  return {
    init,
    isReady, isUsingFallback, onReady, setOnChange,
    getSessions, getSession,
    addSession, deleteSession, updateSession,
    addConfirmed, replaceConfirmed, removeConfirmed,
  };
})();
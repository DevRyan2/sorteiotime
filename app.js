// app.js — controlador principal da UI

const UI = (() => {

  // ── Utilitários ────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

  let _toastTimer = null;
  const toast = (msg, type = 'ok') => {
    const t = $('toast');
    t.textContent = msg;
    t.className   = 'toast show toast-' + type;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.className = 'toast', 3000);
  };

  const confirm = (msg) => window.confirm(msg);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const TABS = ['sorteio', 'partidas', 'jogadores', 'torneio'];
  let activeTab = 'sorteio';

  const showTab = (tab) => {
    if (!TABS.includes(tab)) return;
    activeTab = tab;
    TABS.forEach(t => {
      $('tab-btn-' + t)?.classList.toggle('active', t === tab);
      $('tab-' + t)?.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'partidas')   renderPartidasTab();
    if (tab === 'jogadores')  renderJogadoresTab();
    if (tab === 'torneio')    renderTorneioTab();
    if (tab === 'sorteio')    { /* state kept */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Admin ──────────────────────────────────────────────────────────────────
  const toggleAdmin = () => {
    if (Storage.isAdmin()) {
      Storage.setAdmin(false);
      renderAdminBtn();
      toast('🔓 Modo admin desativado');
      showTab(activeTab);
    } else {
      const pw = prompt('Senha de administrador:');
      if (pw === null) return;
      const saved = Storage.getAdminKey();
      if (!saved) {
        // Primeira vez: define a senha
        Storage.setAdminKey(pw);
        Storage.setAdmin(true);
        toast('🔑 Senha definida! Admin ativado.');
      } else if (pw === saved) {
        Storage.setAdmin(true);
        toast('🔑 Modo admin ativado!');
      } else {
        toast('❌ Senha incorreta', 'err');
        return;
      }
      renderAdminBtn();
      showTab(activeTab);
    }
  };

  const renderAdminBtn = () => {
    const btn = $('admin-btn');
    if (!btn) return;
    btn.textContent = Storage.isAdmin() ? '🔑 Admin ON' : '🔒 Admin';
    btn.classList.toggle('admin-active', Storage.isAdmin());
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  TAB: SORTEIO
  // ══════════════════════════════════════════════════════════════════════════
  let sorteioStep = 1;

  const setStep = (n) => {
    sorteioStep = n;
    for (let i = 1; i <= 4; i++) {
      const s = $('stp' + i);
      if (!s) continue;
      s.className = 'stp';
      if (i < n) s.classList.add('done');
      else if (i === n) s.classList.add('active');
    }
    ['p1','p2','p3','p4'].forEach((id, i) => {
      const el = $(id);
      if (el) el.classList.toggle('hidden', i + 1 !== n);
    });
    $('line1')?.classList.toggle('filled', n > 1);
    $('line2')?.classList.toggle('filled', n > 2);
    $('line3')?.classList.toggle('filled', n > 3);
  };

  const renderPool = () => {
    const pool  = $('playerPool');
    const meta  = $('poolMeta');
    const pl    = Sorteio.getPlayers();
    if (!pool) return;
    pool.innerHTML = pl.map((p, i) => `
      <div class="ptag">
        <span>${p}</span>
        <button onclick="UI.removePlayer(${i})">✕</button>
      </div>`).join('');
    if (meta) meta.innerHTML = pl.length === 0
      ? 'Nenhum jogador adicionado.'
      : `<b>${pl.length}</b> jogador${pl.length > 1 ? 'es' : ''} na lista`;
  };

  const removePlayer = (i) => { Sorteio.removePlayer(i); renderPool(); };

  const updateSummary = () => {
    const n   = Math.max(2, parseInt($('numTeams')?.value) || 2);
    const pl  = Sorteio.getPlayers();
    const per = Math.floor(pl.length / n);
    const rem = pl.length % n;
    const modes = { balanced:'Equilibrado', snake:'Snake Draft', sequential:'Sequencial' };
    const mode = $('modeSelect')?.value || 'balanced';
    const box  = $('configSummary');
    if (!box) return;
    box.innerHTML = `
      <span style="color:var(--muted);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Resumo</span><br><br>
      <span style="color:var(--accent);font-weight:600;">${pl.length}</span> jogadores em
      <span style="color:var(--accent);font-weight:600;">${n} times</span> de
      <span style="color:var(--accent);font-weight:600;">${per}${rem ? '–' + (per + 1) : ''} jogadores</span>
      · modo <b style="color:var(--text)">${modes[mode]}</b>`;
  };

  const renderResults = () => {
    const teams  = Sorteio.getTeams();
    const tcs    = ['tc0','tc1','tc2','tc3','tc4','tc5','tc6','tc7'];
    const emojis = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱'];
    const grid   = $('resultsGrid');
    if (!grid) return;
    grid.innerHTML = teams.map((team, i) => `
      <div class="team-block ${tcs[i % 8]}" style="animation-delay:${i * 0.07}s">
        <div class="team-block-label">
          <div class="team-dot"></div>
          ${emojis[i % 8]} Time ${i + 1}
          <div class="team-count-badge">${team.length} jogadores</div>
        </div>
        <div class="team-members">
          ${team.map(p => `<div class="team-member">${p}</div>`).join('')}
        </div>
      </div>`).join('');

    const preview = $('outputPreview');
    const eventName = $('eventName')?.value.trim() || '';
    if (preview) preview.textContent = Sorteio.buildMessage(eventName);

    // Preencher select de time vencedor na step 4
    renderResultStep4();
  };

  const renderResultStep4 = () => {
    const teams     = Sorteio.getTeams();
    const selWinner = $('sel-winner');
    const selMvp    = $('sel-mvp');
    if (!selWinner || !selMvp) return;

    selWinner.innerHTML = teams.map((_, i) => `<option value="${i}">Time ${i + 1}</option>`).join('');

    const allPlayers = teams.flat();
    selMvp.innerHTML = `<option value="">— Sem MVP —</option>` +
      allPlayers.map(p => `<option value="${p}">${p}</option>`).join('');
  };

  const doDraw = () => {
    const n    = Math.max(2, parseInt($('numTeams')?.value) || 2);
    const mode = $('modeSelect')?.value || 'balanced';
    if (n >= Sorteio.getPlayers().length) { toast('⚠️ Mais jogadores que times!', 'warn'); return; }
    const overlay = $('drawOverlay');
    if (overlay) overlay.classList.add('active');
    setTimeout(() => {
      Sorteio.draw(n, mode);
      renderResults();
      if (overlay) overlay.classList.remove('active');
      setStep(3);
    }, 900);
  };

  const saveMatchResult = () => {
    const winnerIdx = parseInt($('sel-winner')?.value ?? '0');
    const mvpNick   = $('sel-mvp')?.value || null;
    const eventName = $('eventName')?.value.trim() || '';
    const { match, newAchievements } = Sorteio.saveResult(winnerIdx, mvpNick, eventName);

    const achCount = Object.values(newAchievements).flat().length;
    toast(`✅ Resultado salvo!${achCount > 0 ? ` ${achCount} conquista(s) desbloqueada(s) 🏅` : ''}`, 'ok');

    if (achCount > 0) {
      setTimeout(() => {
        const names = Object.entries(newAchievements)
          .map(([nick, ids]) => {
            const labels = ids.map(id => ACHIEVEMENTS_DEF.find(a => a.id === id)?.name || id).join(', ');
            return `${nick}: ${labels}`;
          }).join('\n');
        alert(`🏅 Novas conquistas!\n\n${names}`);
      }, 400);
    }

    $('result-saved-msg').classList.remove('hidden');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  TAB: PARTIDAS
  // ══════════════════════════════════════════════════════════════════════════
  const renderPartidasTab = () => {
    renderSessions();
    renderMatchHistory();
  };

  const renderSessions = () => {
    const wrap     = $('sessions-list');
    const sessions = Storage.getSessions();
    if (!wrap) return;

    if (sessions.length === 0) {
      wrap.innerHTML = `<p style="color:var(--muted);font-size:13px;padding:20px 0">Nenhuma sessão agendada.</p>`;
      return;
    }

    wrap.innerHTML = sessions.map(s => {
      const dateStr   = new Date(s.scheduledAt).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' });
      const confirmed = s.confirmed || [];
      const myConf    = Storage.getMyConfirmation(s.id);
      const isAdmin   = Storage.isAdmin();

      // O que o membro vê sobre o próprio status
      let myStatus = '';
      if (!isAdmin) {
        if (myConf) {
          myStatus = `<div class="conf-status conf-ok">
            ✅ Você confirmou como <b>${myConf.nick}</b>
            ${!myConf.edited
              ? `<button class="btn btn-ghost btn-sm" style="margin-left:8px" onclick="UI.editMyPresence(${s.id})">✏️ Corrigir nick</button>`
              : `<span style="color:var(--muted);font-size:11px;margin-left:8px">(edição usada)</span>`}
          </div>`;
        } else {
          myStatus = `<div class="conf-status conf-pending">
            ⚠️ Você ainda não confirmou presença.
          </div>`;
        }
      }

      // Lista de confirmados — admin vê botão de expulsar em cada um
      const listHTML = confirmed.length > 0
        ? `<div class="session-confirmed-list">
            ${confirmed.map(p => `
              <div class="conf-row">
                <span class="conf-nick">${p}</span>
                ${isAdmin ? `<button class="conf-kick" onclick="UI.kickFromSession(${s.id},'${p.replace(/'/g,"\\'")}')">✕</button>` : ''}
              </div>`).join('')}
           </div>`
        : `<p style="color:var(--muted);font-size:12px;margin-top:4px">Nenhuma confirmação ainda.</p>`;

      return `<div class="session-card">
        <div class="session-head">
          <div>
            <div class="session-name">${s.eventName || 'Partida'}</div>
            <div class="session-date">📅 ${dateStr} · <b style="color:var(--accent)">${confirmed.length} confirmado${confirmed.length !== 1 ? 's' : ''}</b></div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="UI.adminAddToSession(${s.id})">+ Adicionar</button>` : ''}
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="UI.deleteSession(${s.id})">🗑</button>` : ''}
          </div>
        </div>

        ${myStatus}
        ${listHTML}

        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          ${(!myConf && !isAdmin)
            ? `<button class="btn btn-primary btn-sm" onclick="UI.confirmPresence(${s.id})">✅ Confirmar presença</button>`
            : ''}
          <button class="btn btn-ghost btn-sm" onclick="UI.copySessionLink(${s.id})">🔗 Copiar link</button>
        </div>
      </div>`;
    }).join('');
  };

  const renderMatchHistory = () => {
    const wrap    = $('match-history');
    const matches = Storage.getMatches();
    if (!wrap) return;
    if (matches.length === 0) {
      wrap.innerHTML = `<p style="color:var(--muted);font-size:13px;padding:20px 0">Nenhuma partida registrada.</p>`;
      return;
    }
    wrap.innerHTML = matches.slice(0, 20).map(m => {
      const dateStr = new Date(m.date || m.createdAt).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' });
      const winTeam = m.teams?.[m.winner];
      return `<div class="match-row">
        <div class="match-row-head">
          <span class="match-row-name">${m.eventName || 'Partida'}</span>
          <span class="match-row-date">${dateStr}</span>
          ${Storage.isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="UI.deleteMatch(${m.id})">🗑</button>` : ''}
        </div>
        <div class="match-row-body">
          ${m.teams?.map((t, i) => `
            <div class="match-team-pill ${i === m.winner ? 'match-team-won' : ''}">
              ${i === m.winner ? '🏆 ' : ''}Time ${i+1}: ${t.join(', ')}
            </div>`).join('') || ''}
          ${m.mvp ? `<div class="mvp-pill">⭐ MVP: ${m.mvp}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  };

  const createSession = () => {
    const name   = $('session-name')?.value.trim() || '';
    const dateVal = $('session-date')?.value;
    if (!dateVal) { toast('⚠️ Informe a data/hora', 'warn'); return; }
    Storage.addSession({ eventName: name, scheduledAt: new Date(dateVal).getTime() });
    $('session-name').value = '';
    $('session-date').value = '';
    toast('📅 Sessão agendada!');
    renderSessions();
  };

  // Membro confirma presença pela primeira vez
  const confirmPresence = (sessionId) => {
    const myConf = Storage.getMyConfirmation(sessionId);
    if (myConf) { toast('⚠️ Você já confirmou como ' + myConf.nick, 'warn'); return; }

    const modal = $('modal-confirm');
    if (!modal) return;
    modal.dataset.sessionId = sessionId;
    modal.dataset.mode = 'confirm';
    $('confirm-modal-title').textContent = '✅ Confirmar presença';
    $('confirm-nick-input').value = '';
    $('confirm-nick-input').placeholder = 'Seu nick exato no Free Fire';
    $('confirm-hint').textContent = 'Você poderá corrigir o nick uma única vez após confirmar.';
    modal.classList.remove('hidden');
    $('confirm-nick-input').focus();
  };

  // Membro edita o próprio nick (uma única vez)
  const editMyPresence = (sessionId) => {
    const myConf = Storage.getMyConfirmation(sessionId);
    if (!myConf || myConf.edited) { toast('⚠️ Edição não disponível', 'warn'); return; }

    const modal = $('modal-confirm');
    if (!modal) return;
    modal.dataset.sessionId = sessionId;
    modal.dataset.mode = 'edit';
    modal.dataset.oldNick = myConf.nick;
    $('confirm-modal-title').textContent = '✏️ Corrigir nick';
    $('confirm-nick-input').value = myConf.nick;
    $('confirm-nick-input').placeholder = 'Novo nick correto';
    $('confirm-hint').textContent = '⚠️ Após salvar, não será possível alterar novamente.';
    modal.classList.remove('hidden');
    $('confirm-nick-input').focus();
  };

  // Submete o modal de confirmação (serve pra confirm e edit)
  const submitConfirmModal = () => {
    const modal     = $('modal-confirm');
    const sessionId = parseInt(modal.dataset.sessionId);
    const mode      = modal.dataset.mode;
    const nick      = $('confirm-nick-input').value.trim();

    if (!nick) { toast('⚠️ Digite seu nick', 'warn'); return; }
    if (nick.length < 2 || nick.length > 40) { toast('⚠️ Nick inválido', 'warn'); return; }

    const session = Storage.getSessions().find(s => s.id === sessionId);
    if (!session) { toast('Sessão não encontrada', 'err'); return; }

    if (mode === 'confirm') {
      // Checar se o nick já está na lista (pra evitar duplicata óbvia)
      if ((session.confirmed || []).some(n => n.toLowerCase() === nick.toLowerCase())) {
        toast('⚠️ Esse nick já está confirmado!', 'warn'); return;
      }
      Storage.addConfirmed(sessionId, nick);
      Storage.setMyConfirmation(sessionId, { nick, edited: false });
      toast(`✅ ${nick} confirmado!`);
    } else {
      // mode === 'edit'
      const oldNick = modal.dataset.oldNick;
      Storage.replaceConfirmed(sessionId, oldNick, nick);
      Storage.setMyConfirmation(sessionId, { nick, edited: true });
      toast(`✏️ Nick atualizado para ${nick}`);
    }

    modal.classList.add('hidden');
    renderSessions();
  };

  const closeConfirmModal = () => $('modal-confirm')?.classList.add('hidden');

  // Admin: remove jogador da lista
  const kickFromSession = (sessionId, nick) => {
    if (!Storage.isAdmin()) return;
    if (!confirm(`Remover "${nick}" da sessão?`)) return;
    Storage.removeConfirmed(sessionId, nick);
    renderSessions();
    toast(`🚫 ${nick} removido`);
  };

  // Admin: adiciona jogador manualmente
  const adminAddToSession = (sessionId) => {
    if (!Storage.isAdmin()) return;
    const nick = prompt('Nick do jogador a adicionar:');
    if (!nick?.trim()) return;
    const session = Storage.getSessions().find(s => s.id === sessionId);
    if (!session) return;
    if ((session.confirmed || []).some(n => n.toLowerCase() === nick.trim().toLowerCase())) {
      toast('⚠️ Nick já está na lista', 'warn'); return;
    }
    Storage.addConfirmed(sessionId, nick.trim());
    renderSessions();
    toast(`✅ ${nick.trim()} adicionado`);
  };

  const copySessionLink = (sessionId) => {
    const url = `${location.href.split('#')[0]}#session=${sessionId}`;
    navigator.clipboard.writeText(url).then(() => toast('🔗 Link copiado! Mande pro grupo.')).catch(() => toast('Copie: ' + url));
  };

  const deleteSession = (id) => {
    if (!confirm('Deletar sessão?')) return;
    Storage.deleteSession(id);
    renderSessions();
    toast('🗑 Sessão removida');
  };

  const deleteMatch = (id) => {
    if (!confirm('Deletar partida do histórico?')) return;
    Storage.deleteMatch(id);
    renderMatchHistory();
    toast('🗑 Partida removida');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  TAB: JOGADORES
  // ══════════════════════════════════════════════════════════════════════════
  let profileNick = null;

  const renderJogadoresTab = () => {
    const wrap = $('jogadores-content');
    if (!wrap) return;

    if (profileNick) {
      const html = Players.renderProfile(profileNick);
      wrap.innerHTML = `<div class="card profile-card">${html}</div>`;
      return;
    }

    const list = Players.getList();
    const adminActions = Storage.isAdmin() ? `
      <button class="btn btn-ghost btn-sm" onclick="UI.openRegisterModal()">+ Cadastrar</button>` : '';

    wrap.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title"><div class="card-icon">👤</div> Jogadores</div>
          <div style="display:flex;gap:8px">
            ${adminActions}
            <button class="btn btn-ghost btn-sm" onclick="UI.openInviteModal()">🔗 Gerar convite</button>
          </div>
        </div>
        ${list.length === 0
          ? `<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum jogador cadastrado. Clique em "+ Cadastrar" ou gere um link de convite.</p>`
          : `<div class="players-table">
              ${list.map(p => {
                const stats = Players.getStats(p.nick);
                const wrColor = stats.winrate >= 60 ? 'var(--green)' : stats.winrate >= 40 ? 'var(--accent)' : 'var(--red)';
                return `<div class="player-row" onclick="UI.openProfile('${p.nick}')">
                  <div class="player-avatar">${p.nick.charAt(0).toUpperCase()}</div>
                  <div class="player-row-info">
                    <div class="player-row-nick">${p.nick}</div>
                    <div class="player-row-rank">${p.rank || 'Bronze'}</div>
                  </div>
                  <div class="player-row-stats">
                    <span style="color:${wrColor}">${stats.winrate}% WR</span>
                    <span style="color:var(--muted);font-size:11px">${stats.total}j</span>
                    ${(p.achievements||[]).length > 0 ? `<span title="${(p.achievements||[]).length} conquistas">🏅×${(p.achievements||[]).length}</span>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>`
        }
      </div>`;
  };

  const openProfile = (nick) => {
    profileNick = nick;
    renderJogadoresTab();
  };

  const deletePlayer = (nick) => {
    if (!Storage.isAdmin()) return;
    if (!confirm(`Deletar ${nick}? Isso não remove o histórico de partidas.`)) return;
    Storage.deletePlayer(nick);
    profileNick = null;
    renderJogadoresTab();
    toast('🗑 Jogador removido');
  };

  const openRegisterModal = () => {
    const modal = $('modal-register');
    if (modal) { modal.classList.remove('hidden'); $('reg-nick')?.focus(); }
  };

  const closeRegisterModal = () => {
    $('modal-register')?.classList.add('hidden');
  };

  const doRegister = () => {
    const nick = $('reg-nick')?.value.trim();
    const rank = $('reg-rank')?.value || 'Bronze';
    if (!nick) { toast('⚠️ Informe o nick', 'warn'); return; }
    if (Players.register(nick, rank)) {
      toast(`✅ ${nick} cadastrado!`);
      closeRegisterModal();
      renderJogadoresTab();
    } else {
      toast('⚠️ Nick já cadastrado', 'warn');
    }
  };

  const openInviteModal = () => {
    const modal = $('modal-invite');
    if (modal) modal.classList.remove('hidden');
  };

  const closeInviteModal = () => $('modal-invite')?.classList.add('hidden');

  const generateInviteLink = () => {
    const nick = $('invite-nick')?.value.trim();
    const rank = $('invite-rank')?.value || 'Bronze';
    if (!nick) { toast('⚠️ Informe o nick', 'warn'); return; }
    const url  = `${location.href.split('#')[0]}#invite=${encodeURIComponent(nick)}:${encodeURIComponent(rank)}`;
    const out  = $('invite-link-out');
    if (out) { out.value = url; out.classList.remove('hidden'); }
    navigator.clipboard.writeText(url).then(() => toast('🔗 Link copiado!')).catch(() => {});
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  TAB: TORNEIO
  // ══════════════════════════════════════════════════════════════════════════
  const renderTorneioTab = () => {
    const wrap = $('torneio-content');
    if (!wrap) return;

    const saved = Tournament.load();
    let setupHtml = '';

    if (!saved) {
      const lastTeams = Sorteio.getTeams();
      const teamOptions = lastTeams.length >= 2
        ? `<button class="btn btn-ghost" onclick="UI.startTournamentFromSorteio()">🎲 Usar times do último sorteio</button>`
        : '';
      setupHtml = `
        <div class="card">
          <div class="card-head">
            <div class="card-title"><div class="card-icon">🏆</div> Novo Torneio</div>
          </div>
          <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Digite os nomes dos times (um por linha) ou use os times do último sorteio.</p>
          <textarea class="field" id="tournament-teams" placeholder="Time Alpha&#10;Time Beta&#10;Time Gamma&#10;Time Delta..." style="min-height:120px"></textarea>
          <div class="btn-bar" style="margin-top:16px">
            <button class="btn btn-primary" onclick="UI.startTournamentManual()">⚡ Criar chaveamento</button>
            ${teamOptions}
          </div>
        </div>`;
    } else {
      setupHtml = `
        <div class="card-head" style="margin-bottom:16px">
          <div class="card-title"><div class="card-icon">🏆</div> Torneio em andamento</div>
          <button class="btn btn-ghost btn-sm" onclick="UI.resetTournament()">🗑 Zerar torneio</button>
        </div>
        ${!Storage.isAdmin() ? `<p class="hint">💡 <span>Apenas o admin pode definir o vencedor de cada partida.</span></p>` : ''}`;
    }

    wrap.innerHTML = `
      ${setupHtml}
      <div class="card" id="bracket-container">
        ${Tournament.render()}
      </div>`;
  };

  const startTournamentManual = () => {
    const raw = $('tournament-teams')?.value || '';
    const names = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (names.length < 2) { toast('⚠️ Mínimo 2 times', 'warn'); return; }
    Tournament.create(names);
    renderTorneioTab();
    toast('🏆 Chaveamento criado!');
  };

  const startTournamentFromSorteio = () => {
    const teams = Sorteio.getTeams();
    if (teams.length < 2) { toast('⚠️ Faça um sorteio primeiro', 'warn'); return; }
    const names = teams.map((t, i) => `Time ${i + 1} (${t.slice(0, 2).join(', ')}${t.length > 2 ? '…' : ''})`);
    Tournament.create(names);
    renderTorneioTab();
    toast('🏆 Chaveamento criado!');
  };

  const pickWinner = (roundIdx, matchIdx, side) => {
    if (!Storage.isAdmin()) { toast('⚠️ Apenas admin pode definir vencedor', 'warn'); return; }
    const b     = Tournament.getBracket();
    const match = b?.rounds[roundIdx]?.matches[matchIdx];
    if (!match) return;
    const winner = side === 't1' ? match.t1 : match.t2;
    if (!winner) return;
    Tournament.setWinner(roundIdx, matchIdx, winner);
    const champ = Tournament.getBracket().champion;
    if (champ) {
      toast(`👑 Campeão: ${champ}! 🎉`, 'ok');
    }
    renderTorneioTab();
  };

  const resetTournament = () => {
    if (!confirm('Zerar torneio?')) return;
    Tournament.reset();
    renderTorneioTab();
    toast('🗑 Torneio zerado');
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  URL Hash (convites e sessões)
  // ══════════════════════════════════════════════════════════════════════════
  const handleHash = () => {
    const hash = location.hash.slice(1);
    if (!hash) return;

    // Link de sessão: #session=ID
    if (hash.startsWith('session=')) {
      const sessionId = parseInt(hash.slice(8));
      history.replaceState(null, '', location.pathname);
      if (isNaN(sessionId)) return;

      // Muda pra aba de partidas e abre modal de confirmação
      setTimeout(() => {
        showTab('partidas');
        if (Storage.isAdmin()) {
          toast('ℹ️ Admin: gerencie as presenças abaixo');
          return;
        }
        const myConf = Storage.getMyConfirmation(sessionId);
        if (myConf) {
          toast(`ℹ️ Você já está confirmado como ${myConf.nick}`);
          return;
        }
        confirmPresence(sessionId);
      }, 400);
    }

    // Convite de cadastro: #invite=Nick:Rank
    if (hash.startsWith('invite=')) {
      const parts = decodeURIComponent(hash.slice(7)).split(':');
      const nick  = parts[0];
      const rank  = parts[1] || 'Bronze';
      history.replaceState(null, '', location.pathname);
      if (nick) {
        setTimeout(() => {
          if (confirm(`Confirmar cadastro?\n\nNick: ${nick}\nRank: ${rank}`)) {
            if (Players.register(nick, rank)) toast(`✅ Bem-vindo, ${nick}!`);
            else toast(`ℹ️ ${nick} já está cadastrado`);
          }
        }, 500);
      }
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  Init & eventos
  // ══════════════════════════════════════════════════════════════════════════
  const init = () => {
    renderAdminBtn();
    renderPool();
    handleHash();

    // Navegação
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => showTab(btn.dataset.tab));
    });

    // Botão admin
    $('admin-btn')?.addEventListener('click', toggleAdmin);

    // ── Sorteio: step 1 ────────────────────────────────────────────────────
    $('btnParse')?.addEventListener('click', () => {
      const added = Sorteio.parseText($('pasteArea').value);
      $('pasteArea').value = '';
      renderPool();
      toast(added > 0 ? `✅ ${added} nome(s) adicionado(s)!` : '⚠️ Nenhum nome novo');
    });

    $('btnClear')?.addEventListener('click', () => {
      Sorteio.clearPlayers();
      $('pasteArea').value = '';
      renderPool();
    });

    $('btnAdd')?.addEventListener('click', () => {
      const input = $('addInput');
      const r = Sorteio.addPlayer(input.value);
      if (r.ok) { input.value = ''; renderPool(); }
      else toast(r.reason === 'dup' ? '⚠️ Nome já está na lista!' : '⚠️ Nome inválido', 'warn');
    });

    $('addInput')?.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const r = Sorteio.addPlayer($('addInput').value);
      if (r.ok) { $('addInput').value = ''; renderPool(); }
      else toast(r.reason === 'dup' ? '⚠️ Nome já está na lista!' : '⚠️ Nome inválido', 'warn');
    });

    $('btnToConfig')?.addEventListener('click', () => {
      if (Sorteio.getPlayers().length < 2) { toast('⚠️ Adicione pelo menos 2 jogadores!', 'warn'); return; }
      updateSummary();
      setStep(2);
    });

    // ── Sorteio: step 2 ────────────────────────────────────────────────────
    $('btnBack1')?.addEventListener('click', () => setStep(1));
    $('numTeams')?.addEventListener('input', updateSummary);
    $('modeSelect')?.addEventListener('change', updateSummary);
    $('btnDraw')?.addEventListener('click', doDraw);

    // ── Sorteio: step 3 ────────────────────────────────────────────────────
    $('btnBack2')?.addEventListener('click', () => setStep(2));
    $('btnResort')?.addEventListener('click', () => {
      const overlay = $('drawOverlay');
      if (overlay) overlay.classList.add('active');
      setTimeout(() => {
        const n    = Math.max(2, parseInt($('numTeams')?.value) || 2);
        const mode = $('modeSelect')?.value || 'balanced';
        Sorteio.draw(n, mode);
        renderResults();
        if (overlay) overlay.classList.remove('active');
        toast('🎲 Novo sorteio feito!');
      }, 700);
    });

    $('btnCopy')?.addEventListener('click', () => {
      const text = $('outputPreview')?.textContent;
      navigator.clipboard.writeText(text)
        .then(() => toast('✅ Copiado!'))
        .catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('✅ Copiado!'); });
    });

    $('btnWA')?.addEventListener('click', () => {
      window.open('https://wa.me/?text=' + encodeURIComponent($('outputPreview')?.textContent || ''), '_blank');
    });

    $('btnToResult')?.addEventListener('click', () => setStep(4));
    $('btnBack3')?.addEventListener('click', () => setStep(3));
    $('btnSaveResult')?.addEventListener('click', saveMatchResult);

    // ── Partidas ───────────────────────────────────────────────────────────
    $('btn-create-session')?.addEventListener('click', createSession);
    $('modal-confirm-close')?.addEventListener('click', closeConfirmModal);
    $('btn-submit-confirm')?.addEventListener('click', submitConfirmModal);
    $('confirm-nick-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') submitConfirmModal(); });
    $('modal-confirm')?.addEventListener('click', e => { if (e.target === $('modal-confirm')) closeConfirmModal(); });

    // ── Jogadores: modais ──────────────────────────────────────────────────
    $('modal-register-close')?.addEventListener('click', closeRegisterModal);
    $('btn-do-register')?.addEventListener('click', doRegister);
    $('modal-invite-close')?.addEventListener('click', closeInviteModal);
    $('btn-gen-invite')?.addEventListener('click', generateInviteLink);

    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) { closeRegisterModal(); closeInviteModal(); } });
    });
  };

  return {
    init, showTab,
    // sorteio
    removePlayer, updateSummary,
    // torneio
    startTournamentManual, startTournamentFromSorteio, pickWinner, resetTournament,
    // jogadores
    openProfile, deletePlayer, openRegisterModal, openInviteModal,
    closeRegisterModal, closeInviteModal, doRegister, generateInviteLink,
    // partidas
    confirmPresence, editMyPresence, submitConfirmModal, closeConfirmModal,
    kickFromSession, adminAddToSession, copySessionLink, deleteSession, deleteMatch,
    toast,
  };
})();

document.addEventListener('DOMContentLoaded', UI.init);

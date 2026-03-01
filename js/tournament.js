// tournament.js — modo chaveamento tipo copa

const Tournament = (() => {
  let bracket = null;

  const _nextPow2 = n => Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));

  const create = (teamNames) => {
    const size = _nextPow2(teamNames.length);
    const padded = [...teamNames];
    while (padded.length < size) padded.push(null); // bye

    // Embaralhar para evitar seed óbvia
    for (let i = padded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [padded[i], padded[j]] = [padded[j], padded[i]];
    }

    bracket = {
      teams: padded,
      rounds: [],
      champion: null,
    };

    _generateNextRound(padded);
    Storage.setTournament(bracket);
    return bracket;
  };

  const load = () => {
    bracket = Storage.getTournament();
    return bracket;
  };

  const reset = () => {
    bracket = null;
    Storage.clearTournament();
  };

  const _generateNextRound = (participants) => {
    const matches = [];
    for (let i = 0; i < participants.length; i += 2) {
      const t1 = participants[i];
      const t2 = participants[i + 1] ?? null;
      matches.push({
        id: `r${bracket.rounds.length}-m${i / 2}`,
        t1, t2,
        winner: t2 === null ? t1 : null, // bye auto-avança
      });
    }
    bracket.rounds.push({ matches });
  };

  const setWinner = (roundIdx, matchIdx, winner) => {
    if (!bracket) return null;
    bracket.rounds[roundIdx].matches[matchIdx].winner = winner;

    const round  = bracket.rounds[roundIdx];
    const done   = round.matches.every(m => m.winner !== null);

    if (done) {
      const winners = round.matches.map(m => m.winner);
      if (winners.length === 1) {
        bracket.champion = winners[0];
      } else {
        _generateNextRound(winners);
      }
    }

    Storage.setTournament(bracket);
    return bracket;
  };

  // ── Renderização HTML ──────────────────────────────────────────────────────
  const render = () => {
    if (!bracket) return '<p style="color:var(--muted);text-align:center;padding:40px">Nenhum torneio ativo.</p>';

    const totalRounds = bracket.rounds.length;
    const roundNames  = _roundNames(totalRounds);

    let html = `<div class="bracket-scroll"><div class="bracket-wrap">`;

    bracket.rounds.forEach((round, ri) => {
      html += `<div class="bracket-col">
        <div class="bracket-round-label">${roundNames[ri] || `Fase ${ri+1}`}</div>`;

      round.matches.forEach((match, mi) => {
        const t1class = match.winner === match.t1 ? 'match-winner' : match.winner ? 'match-loser' : '';
        const t2class = match.winner === match.t2 ? 'match-winner' : match.winner ? 'match-loser' : '';
        const bye     = match.t2 === null;
        const isLast  = ri === bracket.rounds.length - 1;

        html += `<div class="match-card">
          <div class="match-slot ${t1class}">
            <span class="match-team-name">${match.t1 || 'BYE'}</span>
            ${(!match.winner && !bye && Storage.isAdmin()) ? `<button class="pick-btn" onclick="UI.pickWinner(${ri},${mi},'t1')">✓</button>` : ''}
            ${match.winner === match.t1 ? '<span class="match-crown">🏆</span>' : ''}
          </div>
          <div class="match-vs">${bye ? 'BYE' : 'vs'}</div>
          <div class="match-slot ${t2class}">
            <span class="match-team-name">${match.t2 || (bye ? '—' : '???')}</span>
            ${(!match.winner && !bye && Storage.isAdmin()) ? `<button class="pick-btn" onclick="UI.pickWinner(${ri},${mi},'t2')">✓</button>` : ''}
            ${match.winner === match.t2 ? '<span class="match-crown">🏆</span>' : ''}
          </div>
        </div>`;
      });

      html += `</div>`; // bracket-col
    });

    html += `</div></div>`;

    if (bracket.champion) {
      html += `<div class="champion-banner">
        👑 Campeão: <strong>${bracket.champion}</strong>
      </div>`;
    }

    return html;
  };

  const _roundNames = (total) => {
    const map = {
      1: ['Final'],
      2: ['Semifinal', 'Final'],
      3: ['Quartas', 'Semifinal', 'Final'],
      4: ['Oitavas', 'Quartas', 'Semifinal', 'Final'],
    };
    if (map[total]) return map[total];
    return Array.from({ length: total }, (_, i) => i === total - 1 ? 'Final' : `Fase ${i + 1}`);
  };

  const getBracket = () => bracket;

  return { create, load, reset, setWinner, render, getBracket };
})();

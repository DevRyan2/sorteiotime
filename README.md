# FF Squad Manager 🎮

Gerenciador completo de partidas de Free Fire: sorteio de times, perfis de jogadores, conquistas, histórico e modo torneio.

## 📁 Estrutura

```
ff-sorteio/
├── index.html          # Shell principal com todas as abas
├── css/
│   └── style.css       # Todos os estilos
└── js/
    ├── storage.js      # Camada de dados (localStorage)
    ├── players.js      # Perfis, stats, conquistas
    ├── tournament.js   # Modo torneio / chaveamento
    ├── sorteio.js      # Lógica de sorteio de times
    └── app.js          # Controlador principal de UI
```

## ✨ Funcionalidades

### 🎲 Sorteio
- Cole nomes do grupo ou adicione manualmente
- Modos: Equilibrado, Snake Draft, Sequencial
- Gera mensagem formatada para WhatsApp
- **Registre o resultado** após a partida (time vencedor + MVP)

### 📅 Partidas
- Agende partidas com data/hora
- Jogadores confirmam presença via link
- Histórico completo de partidas registradas

### 👤 Jogadores
- Cadastro com nick e rank
- Perfil individual com stats: vitórias, derrotas, WR, MVPs
- Gráfico de winrate por mês
- Sequência atual de vitórias/derrotas
- Melhor dupla (com quem vence mais)
- **Conquistas automáticas**: 🥇 Primeira Vitória, 🔥 Em Chamas (3 seguidas), 💥 Dominante (5), ⚡ Imparável (10), ⭐ MVP, 👑 Rei do MVP, 🎮 Veterano, 🏆 Lenda...

### 🏆 Torneio
- Chaveamento automático tipo copa
- Suporte a 2–16 times (preenche byes automaticamente)
- Avança rodadas ao definir vencedores
- Revela o campeão com banner especial

### 🔑 Modo Admin
- Ative com uma senha (definida no primeiro acesso)
- Admin pode: deletar jogadores, deletar partidas, definir vencedores no torneio, deletar sessões agendadas

### 🔗 Links
- **Convite**: gere um link para o jogador se auto-cadastrar (sem você precisar digitar)
- **Sessão**: compartilhe o link da partida agendada para confirmação de presença

## 🚀 Como usar

Basta abrir `index.html` no navegador. Todos os dados são salvos localmente no `localStorage` do dispositivo.

> **Nota:** Para usar online (GitHub Pages, por exemplo), suba a pasta inteira e acesse `index.html`.

## 📱 Mobile friendly
Layout responsivo para uso no celular durante as partidas.

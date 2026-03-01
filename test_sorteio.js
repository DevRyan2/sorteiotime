const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/sorteio.js','utf8');
vm.runInThisContext(code);
Sorteio.setPlayers(['Alice','Bob','Carlos','Dani']);
const teams = Sorteio.draw(2,'balanced');
console.log('teams', teams);
console.log('message:\n', Sorteio.buildMessage('Teste Evento'));

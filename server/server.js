// simple Express server to hold the admin password
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

app.post('/admin/verify', (req, res) => {
  const pw = req.body.password || '';
  if (pw === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  res.json({ ok: false });
});

app.get('/', (req, res) => {
  res.send('SorteioTime backend running.');
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend listening on port ${port}`));

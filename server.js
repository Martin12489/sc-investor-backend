// ═══════════════════════════════════════════════════════════
// Smart Care Investor Portal – Secure Login Backend
// Express + Session-Cookie · Passwörter serverseitig (nie im HTML)
// ═══════════════════════════════════════════════════════════
const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// ─── 60 Investor-Passwörter (serverseitig, nie im Browser sichtbar) ───
const PASSWORDS = [
  'djgn-hytj-147', 'liha-sngd-966', 'ecvp-b2yz-078',
  'cusc-tajq-655', 'yrew-do83-357', 'jrvu-yiox-728',
  'pxbd-lksz-418', 'msws-i6rs-165', 'ddfa-9k0s-591',
  'dpwg-4cmf-551', 'hfri-yxye-261', 'mfzd-q8db-935',
  'ksvo-qlqp-475', 'donk-90wm-275', 'madw-qeu4-080',
  'snaq-8lc7-979', 'stvb-twcf-249', 'zwen-4au3-135',
  'ziug-ef9e-524', 'pvxi-duqn-244', 'rhef-vffg-774',
  'bzhk-23gt-077', 'gjsj-v38v-406', 'ohko-n4gg-946',
  'blto-a83s-943', 'bdow-20rm-283', 'brny-3g43-105',
  'bsup-iw97-786', 'buqr-vhhp-815', 'cvgu-in1d-710',
  'elzy-il0m-665', 'eofb-rglk-846', 'esxv-l9i3-273',
  'fpmd-fu8x-372', 'fzvq-vpkj-576', 'idfs-rfbw-942',
  'ikxi-di6u-828', 'jebm-k05u-229', 'kmho-2a4m-367',
  'kxoe-jcex-899', 'lwsb-nc3e-982', 'mybi-vbli-385',
  'nggq-pwpx-385', 'pewz-krsu-537', 'rvbb-zrd9-326',
  'rwhy-wmha-188', 'samn-ti4g-646', 'sgfd-3hgk-960',
  'ssdv-f20w-535', 'svgx-t3yp-515', 'tpdm-09fp-272',
  'ursm-3tml-153', 'vlyi-u6ov-369', 'wqyl-ybxz-598',
  'xqzy-jstz-295', 'xwcb-8exa-640', 'xwcl-hw5d-365',
  'ymzn-8lgh-813', 'yvev-z5ut-449', 'yyaf-dztc-558'
];

// ─── Google Sheets Tracking Webhook ───
const TRACKING_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxEqFQX_yfKaWcVW0rjomUgMIghlWvGFRH9tcMNdx0zyYdZQTrHJvx1RskAXAeVmr85/exec';

app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12  // 12 Stunden
  }
}));

// ─── Login-Seite (öffentlich) ───
app.get('/', (req, res) => {
  if (req.session.authed) {
    return res.sendFile(path.join(__dirname, 'protected', 'investor.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ─── Login-Prüfung (serverseitig) ───
app.post('/api/login', (req, res) => {
  const pw = (req.body.password || '').trim().toLowerCase();
  const matched = PASSWORDS.find(p => p === pw);

  if (matched) {
    req.session.authed = true;
    req.session.pw = matched;

    // Tracking ans Google Sheet (serverseitig)
    const ua = req.headers['user-agent'] || '';
    const device = /Mobi|Android|iPhone/i.test(ua) ? 'Mobil' : 'Desktop';
    const payload = JSON.stringify({
      passwort: matched,
      zeitpunkt: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
      geraet: device,
      sprache: req.headers['accept-language']?.split(',')[0] || 'de'
    });
    fetch(TRACKING_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    }).catch(() => {});

    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false });
});

// ─── Geschützter Inhalt (nur mit Session) ───
app.get('/investor.html', (req, res) => {
  if (!req.session.authed) return res.status(401).send('Nicht autorisiert');
  res.sendFile(path.join(__dirname, 'protected', 'investor.html'));
});

// ─── Statische Assets (Logo, Bilder, Video) – öffentlich, da kein Geheimnis ───
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// ─── Logout ───
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Smart Care Investor Backend läuft auf Port ${PORT}`);
});

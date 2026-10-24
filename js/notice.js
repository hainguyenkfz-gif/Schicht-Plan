// Hinweis: Die Web-Version wird eingestellt. Nutzer sollen ihre Sicherung speichern
// und die App aus dem App Store (iPhone) oder von Google Play (Android) laden.
// Der Knopf „Sicherung speichern“ nutzt die vorhandene Sicherungs-Funktion der App (data-backup).

const APP_STORE_URL = 'https://apps.apple.com/de/app/hai-schichtplan/id6818241407';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=io.github.hainguyenkfzgif.schichtplan'; // seit 24.10.2026 live

const css = `
.hai-notice { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(15, 12, 35, .55); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.hai-notice[hidden] { display: none; }
.hai-notice .box { width: 100%; max-width: 420px; max-height: 92vh; overflow-y: auto; background: var(--card, #fff); color: var(--text, #1c1c1e);
  border-radius: 24px; padding: 22px 18px 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, .35); text-align: center; }
.hai-notice h2 { margin: 4px 0 8px; font-size: 22px; }
.hai-notice p { margin: 0 0 12px; font-size: 15px; line-height: 1.45; }
.hai-notice ol { text-align: left; margin: 0 0 14px; padding-left: 22px; font-size: 15px; line-height: 1.45; }
.hai-notice .hai { font-weight: 900; background: linear-gradient(100deg, #FFB300, #FF5E7E, #1E88E5, #5E35B1);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.hai-notice .btn { margin-top: 8px; }
.hai-notice a.btn { display: block; text-decoration: none; }
.hai-notice .store { background: #000; color: #fff; }
.hai-notice .soon { font-size: 13px; opacity: .7; margin-top: 10px; }
`;

const el = document.createElement('div');
el.className = 'hai-notice';
el.setAttribute('role', 'dialog');
el.setAttribute('aria-modal', 'true');
el.innerHTML = `
  <style>${css}</style>
  <div class="box">
    <div style="font-size:44px">📲</div>
    <h2>Jetzt als App: <span class="hai">HAI</span> Schichtplan</h2>
    <p>Diese Web-Version wird bald <b>abgeschaltet</b>. Bitte wechsle zur App – kostenlos, mit neuem Design.</p>
    <ol>
      <li><b>Sicherung speichern</b> (unten tippen, Datei aufbewahren).</li>
      <li>App laden: <b>iPhone</b> im App Store, <b>Android</b> bei Google Play.</li>
      <li>In der App: <b>Plan → Sicherung laden</b> – fertig, alle Schichten sind wieder da.</li>
    </ol>
    <button type="button" class="btn primary big" data-backup>💾 1. Sicherung speichern</button>
    <a class="btn big store" href="${APP_STORE_URL}" target="_blank" rel="noopener">🍎 2. iPhone: Im App Store laden</a>
    ${PLAY_URL ? `<a class="btn big store" href="${PLAY_URL}" target="_blank" rel="noopener">▶ 2. Android: Bei Google Play laden</a>` : '<p class="soon">Android: bald bei Google Play.</p>'}
    <button type="button" class="btn ghost" data-notice-close>Später – weiter zur Web-Version</button>
  </div>`;

document.body.append(el);
el.addEventListener('click', (e) => {
  if (e.target.closest('[data-notice-close]')) el.hidden = true;
});

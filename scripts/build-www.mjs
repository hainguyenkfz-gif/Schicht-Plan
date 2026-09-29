// Kopiert die Web-App in den Ordner www/, aus dem Capacitor die iPhone- und Android-App baut.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons', 'fonts'];

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log('www/ aktualisiert');

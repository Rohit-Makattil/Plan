// Node script to generate standard PNG files for PWA icons
const fs = require('fs');
const path = require('path');

// 1x1 transparent/warm PNG base64 fallback or basic valid PNG
const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(minimalPngBase64, 'base64');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), buffer);
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), buffer);

console.log('Icons generated.');

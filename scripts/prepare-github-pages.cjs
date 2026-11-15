const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '../dist/ipb-app/browser');
const indexPath = path.join(output, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('Execute npm run build:github-pages antes de preparar a publicação.');
}

const index = fs.readFileSync(indexPath, 'utf8');
fs.writeFileSync(path.join(output, '404.html'), index);

const redirectScript = `<script>sessionStorage.redirect=location.pathname+location.search+location.hash;const base=document.querySelector('base')?.getAttribute('href')||'/';location.replace(base+'?p='+encodeURIComponent(sessionStorage.redirect))</script>`;
const notFound = index.replace('</head>', `${redirectScript}</head>`);
fs.writeFileSync(path.join(output, '404.html'), notFound);

console.log(`GitHub Pages configurado em ${output}`);

// Publish only app assets, never repository notes, SQL, tests or athlete datasets.
import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('dist',{recursive:true});
for(const file of ['index.html','stride-config.js','terms.html','privacy.html','og-card.png']) copyFileSync(file,`dist/${file}`);
console.log('Prepared 5 public app assets.');

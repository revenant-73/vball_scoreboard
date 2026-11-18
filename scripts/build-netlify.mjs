import {mkdir,copyFile} from 'node:fs/promises';
const files=['index.html','app.js','model.js','remote.js','style.css','remote.css','touch.js','touch-logic.js','touch.css'];
await mkdir(new URL('../public/',import.meta.url),{recursive:true});
for(const file of files)await copyFile(new URL('../dist/'+file,import.meta.url),new URL('../public/'+file,import.meta.url));
console.log('Built Netlify static assets. Session API is bundled from netlify/functions/.');

const fs = require('fs');
const https = require('https');
const path = require('path');

const DICT_URL = 'https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/Liste-de-mots-francais-Gutenberg/liste.de.mots.francais.frgut.txt';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'dictionary.json');

console.log('📥 Téléchargement du dictionnaire français (OpenLexicon)...');

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

downloadFile(DICT_URL)
  .then((data) => {
    console.log('✅ Téléchargement terminé. Traitement des données...');
    
    // Supporte différents types de sauts de ligne
    const words = data.split(/\r?\n/);
    const dictionary = {};
    let count = 0;

    words.forEach(line => {
      const word = line.trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

      if (word.length >= 2 && word.length <= 15 && /^[A-Z]+$/.test(word)) {
        if (!dictionary[word.length]) {
          dictionary[word.length] = new Set();
        }
        if (!dictionary[word.length].has(word)) {
          dictionary[word.length].add(word);
          count++;
        }
      }
    });

    const finalDict = {};
    for (const len in dictionary) {
      finalDict[len] = Array.from(dictionary[len]).sort();
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalDict));
    console.log(`✨ Dictionnaire généré ! ${count} mots uniques intégrés.`);
    console.log(`📍 Emplacement : ${OUTPUT_PATH}`);
  })
  .catch((err) => {
    console.error('❌ Erreur :', err.message);
  });

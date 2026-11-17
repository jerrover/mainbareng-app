import https from 'https';
import fs from 'fs';

async function fetchCsv(gid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/1-vt-rE7BKRa0_lhX9Zb3HwLKJEFcKAf-Psxebrl7D8Y/export?format=csv&gid=${gid}`;
    
    function get(u: string) {
      https.get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    }

    get(url);
  });
}

async function main() {
  const gids = ['1599343374', '1294167579', '1110114645'];
  for (const gid of gids) {
    console.log(`Fetching gid=${gid}...`);
    try {
      const csv = await fetchCsv(gid);
      fs.writeFileSync(`backend/scripts/sheet_${gid}.csv`, csv, 'utf-8');
      console.log(`Saved sheet_${gid}.csv (size: ${csv.length} bytes, lines: ${csv.split('\n').length})`);
    } catch (e: any) {
      console.error(`Error fetching gid=${gid}:`, e.message);
    }
  }
}

main().catch(console.error);

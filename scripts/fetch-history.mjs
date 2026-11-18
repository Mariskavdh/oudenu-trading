import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const symbols = ['eurusd', 'gbpusd', 'audusd'];
const from = '2026-04-22';
const to = '2026-05-22';
const outputDir = 'market-data';
mkdirSync(outputDir, { recursive: true });
const manifest = { source: 'Dukascopy', priceSide: 'bid', timeframe: 'M1', timezone: 'UTC', from, toExclusive: to, generatedAt: new Date().toISOString(), files: {} };
let failed = false;
for (const symbol of symbols) {
  const filename = symbol + '-m1-bid-' + from + '-' + to + '.csv';
  const destination = join(outputDir, filename);
  try {
    if (!existsSync(destination) || readFileSync(destination, 'utf8').trim().split('\n').length < 100) {
      execFileSync('npx', ['--yes', 'dukascopy-node', '-i', symbol, '-from', from, '-to', to, '-t', 'm1', '-f', 'csv', '-p', 'bid', '--cache', '--retries', '3', '--batch-size', '5', '--batch-pause', '2000', '-dir', outputDir], { stdio: 'inherit', timeout: 1500000 });
    }
    if (!existsSync(destination)) throw new Error('Missing output file: ' + destination);
    const content = readFileSync(destination, 'utf8');
    const rows = content.trim().split(/\r?\n/);
    if (rows.length < 100 || !rows[0].toLowerCase().startsWith('timestamp,open,high,low,close')) throw new Error('Invalid or empty CSV for ' + symbol);
    manifest.files[symbol.toUpperCase()] = { path: destination, candles: rows.length - 1 };
  } catch (error) {
    failed = true;
    console.error(symbol + ': ' + error.message);
  }
}
writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (failed) process.exitCode = 1;

/*
 * Reasigna colecciones al template nativo (collection.json) limpiando su template_suffix.
 * Dry-run por defecto; pasar --apply para ejecutar.
 * Mantiene intactas las colecciones cuyo suffix esté en KEEP (diseños nativos propios).
 *
 * Uso:
 *   node reasignar-collections-nativas.js           (dry-run)
 *   node reasignar-collections-nativas.js --apply    (aplica)
 */
const https = require('https');
const fs = require('fs');

const SHOP = '5mas2r-gt.myshopify.com';
const APPLY = process.argv.includes('--apply');

// Suffixes a CONSERVAR (no tocar): diseños nativos propios intencionales.
const KEEP = new Set(['bodys', 'size-guides']);

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
let TOKEN = env.SHOPIFY_ADMIN_TOKEN;

async function renewToken() {
  const body = new URLSearchParams({
    client_id: env.SHOPIFY_CLIENT_ID,
    client_secret: env.SHOPIFY_CLIENT_SECRET,
    grant_type: 'client_credentials'
  }).toString();
  const j = await raw('POST', '/admin/oauth/access_token', body, 'application/x-www-form-urlencoded', true);
  if (j.access_token) { TOKEN = j.access_token; console.log('Token renovado.'); }
  else throw new Error('No se pudo renovar token: ' + JSON.stringify(j).slice(0, 200));
}

function raw(method, path, body, contentType, noAuth) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': contentType || 'application/json' };
    if (!noAuth) headers['X-Shopify-Access-Token'] = TOKEN;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request('https://' + SHOP + path, { method, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(d) }); } catch (e) { resolve({ status: res.statusCode, json: null, text: d }); } });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function gql(query, variables) {
  let r = await raw('POST', '/admin/api/2024-10/graphql.json', JSON.stringify({ query, variables }));
  if (r.status === 401) { await renewToken(); r = await raw('POST', '/admin/api/2024-10/graphql.json', JSON.stringify({ query, variables })); }
  return r.json;
}

(async () => {
  // 1. Listar todas las colecciones con suffix
  let cursor = null; const cols = [];
  for (;;) {
    const j = await gql(`{collections(first:250${cursor ? `, after:"${cursor}"` : ''}){pageInfo{hasNextPage endCursor} edges{node{id handle templateSuffix}}}}`);
    const p = j.data.collections;
    p.edges.forEach(e => cols.push(e.node));
    if (!p.pageInfo.hasNextPage) break;
    cursor = p.pageInfo.endCursor;
  }

  const targets = cols.filter(c => {
    const s = c.templateSuffix || '';
    return s !== '' && !KEEP.has(s);
  });

  console.log(`Colecciones totales: ${cols.length}`);
  console.log(`A reasignar a nativa (suffix -> vacío): ${targets.length}`);
  targets.forEach(c => console.log('  ' + c.handle + '   (' + c.templateSuffix + ')'));
  const kept = cols.filter(c => (c.templateSuffix || '') !== '' && KEEP.has(c.templateSuffix));
  if (kept.length) { console.log('Conservadas (KEEP):'); kept.forEach(c => console.log('  ' + c.handle + '   (' + c.templateSuffix + ')')); }

  if (!APPLY) { console.log('\n[DRY-RUN] Nada aplicado. Corre con --apply para ejecutar.'); return; }

  console.log('\nAplicando...');
  let ok = 0, fail = 0;
  for (const c of targets) {
    const j = await gql(
      `mutation($input: CollectionInput!){ collectionUpdate(input:$input){ collection{ id templateSuffix } userErrors{ field message } } }`,
      { input: { id: c.id, templateSuffix: '' } }
    );
    const ue = j.data && j.data.collectionUpdate && j.data.collectionUpdate.userErrors;
    if (ue && ue.length) { fail++; console.log('  ERROR ' + c.handle + ': ' + JSON.stringify(ue)); }
    else { ok++; console.log('  OK ' + c.handle); }
  }
  console.log(`\nListo. OK: ${ok} | Fallos: ${fail}`);
})();

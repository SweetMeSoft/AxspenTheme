/*
 * Sincroniza el metafield list custom.tallas_disponibles por producto:
 * contiene solo las tallas cuyas variantes tienen availableForSale = true
 * (respeta stock e inventory_policy). Sirve para un filtro en Search & Discovery
 * que, a diferencia del filtro por opción nativa, sí respeta existencias.
 *
 * Uso:
 *   node sincronizar-tallas-disponibles.js                 (dry-run: muestra cambios)
 *   node sincronizar-tallas-disponibles.js --create-def    (crea la definición del metafield)
 *   node sincronizar-tallas-disponibles.js --apply         (escribe los metafields)
 *   node sincronizar-tallas-disponibles.js --apply --limit 20   (subconjunto para probar)
 *
 * Nombre de la opción de talla: se detecta por regex /talla/i.
 * Correr programado (cron/tarea nocturna) para mantenerlo sincronizado.
 */
const https = require('https');
const fs = require('fs');

const SHOP = '5mas2r-gt.myshopify.com';
const APPLY = process.argv.includes('--apply');
const CREATE_DEF = process.argv.includes('--create-def');
const limArg = process.argv.indexOf('--limit');
const LIMIT = limArg > -1 ? parseInt(process.argv[limArg + 1], 10) : Infinity;

const NAMESPACE = 'custom';
const KEY = 'tallas_disponibles';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
let TOKEN = env.SHOPIFY_ADMIN_TOKEN;

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
async function renewToken() {
  const body = new URLSearchParams({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }).toString();
  const j = await raw('POST', '/admin/oauth/access_token', body, 'application/x-www-form-urlencoded', true);
  if (j.json && j.json.access_token) { TOKEN = j.json.access_token; console.log('Token renovado.'); }
  else throw new Error('No se pudo renovar token');
}
async function gql(query, variables) {
  let r = await raw('POST', '/admin/api/2024-10/graphql.json', JSON.stringify({ query, variables }));
  if (r.status === 401) { await renewToken(); r = await raw('POST', '/admin/api/2024-10/graphql.json', JSON.stringify({ query, variables })); }
  return r.json;
}

async function ensureDefinition() {
  const q = `mutation($def: MetafieldDefinitionInput!){ metafieldDefinitionCreate(definition:$def){ createdDefinition{ id } userErrors{ code field message } } }`;
  const def = {
    name: 'Tallas disponibles',
    namespace: NAMESPACE, key: KEY,
    description: 'Tallas con existencia (availableForSale). Se sincroniza por script.',
    type: 'list.single_line_text_field',
    ownerType: 'PRODUCT',
    access: { admin: 'MERCHANT_READ_WRITE', storefront: 'PUBLIC_READ' }
  };
  const j = await gql(q, { def });
  const ue = j.data && j.data.metafieldDefinitionCreate && j.data.metafieldDefinitionCreate.userErrors;
  if (ue && ue.length) {
    if (ue.some(e => e.code === 'TAKEN')) { console.log('Definición ya existía. OK.'); return; }
    console.log('Error creando definición:', JSON.stringify(ue));
  } else console.log('Definición custom.tallas_disponibles creada.');
}

async function* allProducts() {
  let cursor = null;
  for (;;) {
    const q = `query($cursor: String){ products(first: 100, after: $cursor, query: null){ pageInfo{ hasNextPage endCursor } edges{ node{
      id handle
      options{ name values }
      metafield(namespace:"${NAMESPACE}", key:"${KEY}"){ value }
      variants(first: 100){ edges{ node{ availableForSale selectedOptions{ name value } } } }
    } } } }`;
    const j = await gql(q, { cursor });
    if (!j.data) { console.log('ERR', JSON.stringify(j).slice(0, 300)); return; }
    for (const e of j.data.products.edges) yield e.node;
    if (!j.data.products.pageInfo.hasNextPage) break;
    cursor = j.data.products.pageInfo.endCursor;
  }
}

function computeAvailableTallas(prod) {
  const opt = prod.options.find(o => /talla/i.test(o.name));
  if (!opt) return null; // sin opción de talla
  const inStock = new Set();
  for (const e of prod.variants.edges) {
    const v = e.node;
    if (!v.availableForSale) continue;
    const t = (v.selectedOptions.find(o => /talla/i.test(o.name)) || {}).value;
    if (t) inStock.add(t);
  }
  // preservar el orden de la opción
  return opt.values.filter(v => inStock.has(v));
}

(async () => {
  if (CREATE_DEF) { await ensureDefinition(); if (!APPLY) return; }

  let scanned = 0, noTalla = 0, changed = 0, same = 0, written = 0, cleared = 0;
  for await (const prod of allProducts()) {
    if (scanned >= LIMIT) break;
    scanned++;
    const tallas = computeAvailableTallas(prod);
    if (tallas === null) { noTalla++; continue; }
    const current = prod.metafield ? JSON.parse(prod.metafield.value) : null;
    const nextVal = JSON.stringify(tallas);
    const curVal = current ? JSON.stringify(current) : null;
    if (curVal === nextVal) { same++; continue; }
    // Sin tallas y sin metafield previo: nada que filtrar, no escribir.
    if (tallas.length === 0 && current === null) { same++; continue; }
    changed++;
    if (tallas.length === 0) cleared++;
    console.log((APPLY ? 'SET ' : 'DIFF') + ' ' + prod.handle + '  [' + (curVal || '-') + '] -> ' + nextVal);
    if (APPLY) {
      const m = `mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
      const j = await gql(m, { mf: [{ ownerId: prod.id, namespace: NAMESPACE, key: KEY, type: 'list.single_line_text_field', value: nextVal }] });
      const ue = j.data && j.data.metafieldsSet && j.data.metafieldsSet.userErrors;
      if (ue && ue.length) console.log('   ERROR: ' + JSON.stringify(ue)); else written++;
    }
  }
  console.log(`\nEscaneados: ${scanned} | sin talla: ${noTalla} | con cambios: ${changed} (vacíos: ${cleared}) | iguales: ${same}` + (APPLY ? ` | escritos: ${written}` : ''));
  if (!APPLY) console.log('[DRY-RUN] Nada escrito. Usa --create-def una vez y luego --apply.');
})().catch(e => console.log('FATAL', e.message));

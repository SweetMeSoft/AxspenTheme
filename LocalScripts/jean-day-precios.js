/*
 * Jean Day: baja el precio base de los productos de cada colección Jean Day y deja el tachado.
 *   - compare_at = precio del tramo (tachado), price = precio promo.
 *   - Solo toca variantes cuyo precio actual == precio del tramo; las ya más baratas se saltan y se reportan.
 *   - Lee la MEMBRESÍA EXACTA directo de cada colección inteligente por su ID.
 *   - La regla de la colección incluye "Precio de comparación = X", así que al repricar
 *     los productos NO se salen de la colección.
 *
 * Uso:
 *   node jean-day-precios.js            (dry-run)
 *   node jean-day-precios.js --apply    (aplica)
 *   node jean-day-precios.js --revert   (deshace: price = tramo, compare_at = null)
 *
 * Discounty: dejar SOLO el nivel 3+ (precio fijo) por tramo; el precio base 1-2 lo pone este script.
 */
const https = require('https');
const fs = require('fs');

const SHOP = '5mas2r-gt.myshopify.com';
const API = '2026-07';
const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

const TIERS = [
  { name: '100k', collectionId: '664122294557', match: '100000.00', promo: '89900.00' },
  { name: '130k', collectionId: '664122327325', match: '130000.00', promo: '120000.00' },
  { name: '150k', collectionId: '664122491165', match: '150000.00', promo: '140000.00' },
];

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
let TOKEN = env.SHOPIFY_ADMIN_TOKEN;

const sleep = ms => new Promise(r => setTimeout(r, ms));
function raw(m, p, b, ct, na) {
  return new Promise((res, rej) => {
    const h = { 'Content-Type': ct || 'application/json' };
    if (!na) h['X-Shopify-Access-Token'] = TOKEN;
    if (b) h['Content-Length'] = Buffer.byteLength(b);
    const r = https.request('https://' + SHOP + p, { method: m, headers: h }, rs => { let d = ''; rs.on('data', c => d += c); rs.on('end', () => { try { res({ s: rs.statusCode, j: JSON.parse(d) }); } catch (e) { res({ s: rs.statusCode, j: null, t: d }); } }); });
    r.on('error', rej); if (b) r.write(b); r.end();
  });
}
async function renew() { const b = new URLSearchParams({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }).toString(); const r = await raw('POST', '/admin/oauth/access_token', b, 'application/x-www-form-urlencoded', true); if (r.j && r.j.access_token) TOKEN = r.j.access_token; else throw new Error('renew fail'); }
async function gql(query, variables) {
  for (let tries = 0; ; tries++) {
    let r = await raw('POST', '/admin/api/' + API + '/graphql.json', JSON.stringify({ query, variables }));
    if (r.s === 401) { await renew(); continue; }
    if (r.j && r.j.data) return r.j;
    if (tries > 5) throw new Error('gql fail: ' + JSON.stringify(r.j || r.t).slice(0, 200));
    await sleep(1500 * (tries + 1));
  }
}

async function* collectionProducts(collectionId) {
  let cursor = null;
  for (;;) {
    const q = `query($id:ID!,$cursor:String){ collection(id:$id){ products(first:50, after:$cursor){ pageInfo{hasNextPage endCursor} edges{ node{ id handle title status variants(first:100){ edges{ node{ id price compareAtPrice } } } } } } } }`;
    const j = await gql(q, { id: 'gid://shopify/Collection/' + collectionId, cursor });
    const conn = j.data.collection && j.data.collection.products;
    if (!conn) return;
    for (const e of conn.edges) yield e.node;
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
    await sleep(150);
  }
}

async function bulkUpdate(productId, variants) {
  const q = `mutation($pid:ID!,$vars:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$vars){ userErrors{ field message } } }`;
  const j = await gql(q, { pid: productId, vars: variants });
  const ue = j.data.productVariantsBulkUpdate && j.data.productVariantsBulkUpdate.userErrors;
  return ue && ue.length ? ue : null;
}

(async () => {
  let applied = 0, failed = 0;
  const skipped = [];
  for (const tier of TIERS) {
    let members = 0, prodsChanged = 0, varsChanged = 0;
    for await (const prod of collectionProducts(tier.collectionId)) {
      members++;
      let vs;
      if (REVERT) {
        vs = prod.variants.edges.filter(e => e.node.price === tier.promo && e.node.compareAtPrice === tier.match)
          .map(e => ({ id: e.node.id, price: tier.match, compareAtPrice: null }));
      } else {
        vs = [];
        for (const e of prod.variants.edges) {
          const v = e.node;
          if (v.price === tier.match) vs.push({ id: v.id, price: tier.promo, compareAtPrice: tier.match });
          else if (v.price !== tier.promo) { if (skipped.length < 20) skipped.push(`${tier.name} ${prod.handle} precio=${v.price} ca=${v.compareAtPrice}`); }
        }
      }
      if (!vs.length) continue;
      prodsChanged++; varsChanged += vs.length;
      const label = REVERT ? (APPLY ? 'REVERT' : 'DIFF-REV') : (APPLY ? 'SET ' : 'DIFF');
      const to = REVERT ? `price ${tier.match}, ca null` : `${tier.promo} / ca ${tier.match}`;
      console.log(`${label} ${prod.handle} (${tier.name}) x${vs.length} -> ${to}`);
      if (APPLY) { const err = await bulkUpdate(prod.id, vs); if (err) { failed++; console.log('   ERR ' + JSON.stringify(err)); } else applied++; }
    }
    console.log(`  == ${tier.name}: miembros=${members}, productos a cambiar=${prodsChanged}, variantes=${varsChanged}`);
  }
  if (skipped.length) { console.log('\nVariantes saltadas (precio ≠ tramo, revisar aparte):'); skipped.forEach(s => console.log('   ' + s)); }
  console.log('\n===== ' + (APPLY ? 'APLICADO' : REVERT ? 'DRY-RUN REVERT' : 'DRY-RUN') + ' =====');
  if (APPLY) console.log(`Productos OK: ${applied} | Fallos: ${failed}`);
  else console.log('Nada escrito. Corre con --apply para ejecutar' + (REVERT ? ' el revert.' : '.'));
})().catch(e => console.log('FATAL', e.message));

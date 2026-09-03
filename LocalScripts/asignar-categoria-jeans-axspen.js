/**
 * vincular-opcion-talla-axspen.js
 * ------------------------------------------------------------------
 * Paso final después de asignar categoría (ver
 * asignar-categoria-jeans-axspen.js): un producto puede ya tener
 * Categoría "Vaqueros en Pantalones" y aun así mostrar el selector
 * de talla como dropdown feo en vez de botones, porque la OPCIÓN
 * "Talla" en sí (no el producto) sigue sin estar vinculada
 * (linkedMetafield) a la taxonomía, y sus valores existentes no
 * apuntan a los metaobjetos correspondientes (linkedMetafieldValue).
 *
 * Este script:
 *   1. Encuentra, entre tus productos, un ejemplo donde la opción
 *      "Talla" YA esté correctamente vinculada (ej. Ax-3119) y toma
 *      de ahí: a) el namespace/key del linkedMetafield de la opción,
 *      y b) el mapa "6" -> gid del metaobjeto, "8" -> gid, etc.
 *   2. Busca productos donde la opción "Talla" existe pero NO está
 *      vinculada (linkedMetafield es null).
 *   3. Si TODOS los valores de talla de ese producto tienen match en
 *      el mapa de referencia, arma el update completo (vincula la
 *      opción + todos sus valores). Si falta algún valor (ej. una
 *      talla rara que no existe en ningún producto de referencia),
 *      el producto se reporta aparte en vez de aplicarse a medias.
 *
 * FLUJO SEGURO:
 *   1. node vincular-opcion-talla-axspen.js          -> DRY RUN
 *      Genera "opciones-detectadas.json" con lo propuesto.
 *   2. Revisa el archivo antes de aplicar.
 *   3. node vincular-opcion-talla-axspen.js --apply   -> Aplica.
 *   (--audit también disponible, igual que en los otros scripts)
 *
 * CREDENCIALES: mismas variables .env que los scripts anteriores.
 *
 * VARIABLES OPCIONALES:
 *   SHOPIFY_API_VERSION   default "2025-01"
 *   VENDOR_FILTER          default "" (vacío = toda la tienda,
 *                           sin pasar por el índice de búsqueda)
 *   OPTION_NAME             default "Talla"
 *
 * Requiere Node.js 18+ (usa fetch nativo). No necesita npm install.
 * ------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const parts = trimmed.split("=");
        if (parts.length > 1) {
          const key = parts[0].trim();
          const value = parts
            .slice(1)
            .join("=")
            .trim()
            .replace(/^["']|["']$/g, "");
          process.env[key] = value;
        }
      }
    });
}

let STORE = "";
let TOKEN = "";
let ENDPOINT = "";
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const VENDOR_FILTER =
  process.env.VENDOR_FILTER !== undefined ? process.env.VENDOR_FILTER : "";
const OPTION_NAME = process.env.OPTION_NAME || "Talla";
const APPLY = process.argv.includes("--apply");
const AUDIT = process.argv.includes("--audit");

async function ensureToken(force = false) {
  if (!force && (process.env.SHOPIFY_ADMIN_TOKEN || process.env.ACCESS_TOKEN)) {
    return;
  }
  const store =
    process.env.SHOPIFY_STORE ||
    (process.env.SHOP ? process.env.SHOP.replace(".myshopify.com", "") : "");
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!store || !clientId || !clientSecret) {
    return;
  }

  console.log(`Token no encontrado en .env. Solicitando token de acceso para ${store}...`);
  try {
    const res = await fetch(`https://${store}.myshopify.com/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      console.log("Token obtenido exitosamente.");
      process.env.SHOPIFY_ADMIN_TOKEN = data.access_token;
      process.env.ACCESS_TOKEN = data.access_token;
      try {
        if (fs.existsSync(envPath)) {
          let content = fs.readFileSync(envPath, "utf-8");
          ["SHOPIFY_ADMIN_TOKEN", "ACCESS_TOKEN"].forEach((key) => {
            const regex = new RegExp(`^(${key}\\s*=\\s*).*$`, "m");
            if (regex.test(content)) {
              content = content.replace(regex, `$1"${data.access_token}"`);
            } else {
              content += `\n${key}="${data.access_token}"`;
            }
          });
          fs.writeFileSync(envPath, content, "utf-8");
        }
      } catch (e) {}
    } else {
      console.error("Error al solicitar token de Shopify:", data);
    }
  } catch (err) {
    console.error("Error de red al conectar con Shopify:", err.message);
  }
}

async function shopifyGraphQL(query, variables = {}, isRetry = false) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401) {
    if (isRetry) {
      throw new Error(
        "El token sigue siendo inválido después de renovarlo. Revisa SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN o SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET en tu .env."
      );
    }
    console.log("Token inválido o expirado. Solicitando uno nuevo...");
    delete process.env.SHOPIFY_ADMIN_TOKEN;
    delete process.env.ACCESS_TOKEN;
    await ensureToken(true);
    TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || process.env.ACCESS_TOKEN;
    if (!TOKEN) {
      throw new Error(
        "No se pudo renovar el token automáticamente (faltan SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET en .env)."
      );
    }
    return shopifyGraphQL(query, variables, true);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error("GraphQL error: " + JSON.stringify(json.errors));
  }

  const cost = json.extensions?.cost;
  if (cost && cost.throttleStatus) {
    const { currentlyAvailable, restoreRate } = cost.throttleStatus;
    const requested = cost.requestedQueryCost || 0;
    if (currentlyAvailable < requested + 50) {
      const waitMs = Math.ceil((requested / restoreRate) * 1000);
      await sleep(waitMs);
    }
  }

  return json.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllProducts() {
  const query = `
    query Products($cursor: String, $searchQuery: String) {
      products(first: 50, after: $cursor, query: $searchQuery) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            title
            options {
              id
              name
              linkedMetafield { namespace key }
              optionValues {
                id
                name
                linkedMetafieldValue
              }
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  let hasNextPage = true;
  const products = [];
  const searchQuery = VENDOR_FILTER ? `vendor:${VENDOR_FILTER}` : null;

  while (hasNextPage) {
    const data = await shopifyGraphQL(query, { cursor, searchQuery });
    const edges = data.products.edges;
    for (const edge of edges) {
      products.push(edge.node);
      cursor = edge.cursor;
    }
    hasNextPage = data.products.pageInfo.hasNextPage;
    console.log(`  ...${products.length} productos escaneados`);
  }

  return products;
}

function getTallaOption(product) {
  return product.options.find(
    (o) => o.name.toLowerCase() === OPTION_NAME.toLowerCase()
  );
}

function buildReference(products) {
  let linkedMetafield = null;
  const valueMap = new Map(); // "6" -> gid del metaobjeto

  for (const product of products) {
    const option = getTallaOption(product);
    if (!option || !option.linkedMetafield) continue;

    if (!linkedMetafield) {
      linkedMetafield = option.linkedMetafield;
    }

    for (const value of option.optionValues) {
      if (value.linkedMetafieldValue && !valueMap.has(value.name.trim())) {
        valueMap.set(value.name.trim(), value.linkedMetafieldValue);
      }
    }
  }

  return { linkedMetafield, valueMap };
}

function detectTargets(products, reference) {
  const changeList = [];
  const unresolved = [];

  for (const product of products) {
    const option = getTallaOption(product);
    if (!option || option.linkedMetafield) continue; // no tiene opcion Talla, o ya esta linkeada

    const missing = [];
    const optionValuesToUpdate = [];

    for (const value of option.optionValues) {
      const gid = reference.valueMap.get(value.name.trim());
      if (gid) {
        optionValuesToUpdate.push({ id: value.id, linkedMetafieldValue: gid });
      } else {
        missing.push(value.name);
      }
    }

    if (missing.length > 0) {
      unresolved.push({
        productId: product.id,
        title: product.title,
        optionId: option.id,
        missingValues: missing,
        reason:
          "Alguno(s) de los valores de talla de este producto no tienen equivalente en el mapa de referencia. No se aplica nada para evitar dejarlo a medias.",
      });
      continue;
    }

    changeList.push({
      productId: product.id,
      title: product.title,
      optionId: option.id,
      optionValuesToUpdate,
    });
  }

  return { changeList, unresolved };
}

async function applyChanges(changeList, linkedMetafield) {
  const mutation = `
    mutation ProductOptionUpdate(
      $productId: ID!
      $option: OptionUpdateInput!
      $optionValuesToUpdate: [OptionValueUpdateInput!]
    ) {
      productOptionUpdate(
        productId: $productId
        option: $option
        optionValuesToUpdate: $optionValuesToUpdate
      ) {
        userErrors { field message code }
        product { id }
      }
    }
  `;

  const results = { success: [], failed: [] };

  for (const change of changeList) {
    const variables = {
      productId: change.productId,
      option: { id: change.optionId, linkedMetafield },
      optionValuesToUpdate: change.optionValuesToUpdate,
    };

    try {
      const data = await shopifyGraphQL(mutation, variables);
      const errors = data.productOptionUpdate.userErrors;
      if (errors && errors.length > 0) {
        console.error(`  ✗ ${change.title}:`, errors);
        results.failed.push({ ...change, errors });
      } else {
        console.log(`  ✓ ${change.title}`);
        results.success.push(change);
      }
    } catch (err) {
      console.error(`  ✗ ${change.title}: ${err.message}`);
      results.failed.push({ ...change, errors: [{ message: err.message }] });
    }

    await sleep(300);
  }

  return results;
}

async function main() {
  await ensureToken();

  STORE =
    process.env.SHOPIFY_STORE ||
    (process.env.SHOP ? process.env.SHOP.replace(".myshopify.com", "") : "");
  TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || process.env.ACCESS_TOKEN;
  ENDPOINT = `https://${STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

  if (!STORE || !TOKEN) {
    console.error(
      "Faltan credenciales. Define SHOPIFY_STORE + SHOPIFY_ADMIN_TOKEN, o SHOPIFY_STORE + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (por entorno o en .env)."
    );
    process.exit(1);
  }

  console.log(
    VENDOR_FILTER
      ? `Buscando productos del vendor "${VENDOR_FILTER}"...`
      : "Buscando productos en toda la tienda (sin filtro de vendor)..."
  );
  const products = await fetchAllProducts();
  console.log(`Total productos encontrados: ${products.length}\n`);

  if (AUDIT) {
    const audit = products
      .map((p) => ({ id: p.id, title: p.title, tallaOption: getTallaOption(p) || null }))
      .filter((p) => p.tallaOption);
    fs.writeFileSync("auditoria-opcion-talla.json", JSON.stringify(audit, null, 2));
    console.log(
      `Modo auditoría: ${audit.length} productos tienen opción "${OPTION_NAME}". Guardado en "auditoria-opcion-talla.json".`
    );
    return;
  }

  console.log(`Buscando referencia de opción "${OPTION_NAME}" ya vinculada...`);
  const reference = buildReference(products);

  if (!reference.linkedMetafield) {
    console.error(
      `No se encontró ningún producto con la opción "${OPTION_NAME}" ya vinculada a un metafield.\n` +
        "No hay referencia de la cual copiar el namespace/key. Vincula uno manualmente en el admin primero."
    );
    process.exit(1);
  }

  console.log(
    `  linkedMetafield de referencia: namespace="${reference.linkedMetafield.namespace}" key="${reference.linkedMetafield.key}"`
  );
  console.log(`  Valores de referencia mapeados: ${reference.valueMap.size}\n`);

  const { changeList, unresolved } = detectTargets(products, reference);

  console.log(`Productos con "${OPTION_NAME}" sin vincular y listos para arreglar: ${changeList.length}`);
  if (unresolved.length > 0) {
    console.log(`⚠️  ${unresolved.length} productos con valores de talla sin match (ver unresolved.json)\n`);
    fs.writeFileSync("unresolved.json", JSON.stringify(unresolved, null, 2));
  } else {
    console.log("");
  }

  if (!APPLY) {
    fs.writeFileSync(
      "opciones-detectadas.json",
      JSON.stringify({ linkedMetafield: reference.linkedMetafield, changes: changeList }, null, 2)
    );
    console.log(
      'DRY RUN completado. Revisa "opciones-detectadas.json" antes de aplicar.\n' +
        "Cuando estés listo, ejecuta:\n" +
        "  node vincular-opcion-talla-axspen.js --apply"
    );
    return;
  }

  if (changeList.length === 0) {
    console.log("No hay cambios pendientes. Nada que aplicar.");
    return;
  }

  console.log("Aplicando cambios...\n");
  const results = await applyChanges(changeList, reference.linkedMetafield);

  fs.writeFileSync("resultado-opciones.json", JSON.stringify(results, null, 2));

  console.log(`\nListo. Éxitos: ${results.success.length} | Fallos: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('Revisa "resultado-opciones.json" para el detalle de los fallos.');
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
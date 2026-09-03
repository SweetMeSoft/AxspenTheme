/**
 * limpiar-tallas-axspen.js
 * ------------------------------------------------------------------
 * Limpia valores de opción "Talla" contaminados con texto extra
 * (ej. "6 wide leg" -> "6") en todos los productos de un vendor dado,
 * usando la mutation productOptionUpdate del Admin GraphQL API.
 *
 * POR QUÉ ESTE MÉTODO Y NO CSV:
 * productOptionUpdate renombra el valor de la opción EN SITIO.
 * Las variantes conservan su ID, inventario, SKU e historial.
 * (A diferencia de CSV import, que en muchos casos crea una variante
 * nueva y borra la anterior con todo su inventario).
 *
 * IMPORTANTE - OPCIONES LINKEADAS A TAXONOMÍA:
 * Si tu opción "Talla" está vinculada a la categoría estándar de
 * Shopify (linkedMetafield), los valores correctos apuntan a un
 * metaobjeto y NO se pueden renombrar con "name" directo (Shopify
 * lo rechaza con CANNOT_COMBINE_LINKED_AND_NONLINKED_OPTION_VALUES).
 * El script detecta esto automáticamente: busca en todo tu catálogo
 * un valor YA correcto y linkeado para el mismo número (ej. "6" en
 * otro producto sin el sufijo "wide leg") y reutiliza ese mismo
 * metaobjeto (linkedMetafieldValue) en vez de poner un texto suelto.
 * Si no encuentra ningún "6" correcto en ningún producto, lo reporta
 * en "unresolved.json" para revisión manual.
 *
 * FLUJO SEGURO:
 *   1. node limpiar-tallas-axspen.js                -> DRY RUN (no escribe nada real)
 *      Genera "cambios-detectados.json" con todo lo que se propone cambiar.
 *   2. Revisa el archivo cambios-detectados.json manualmente.
 *   3. node limpiar-tallas-axspen.js --apply         -> Aplica los cambios reales.
 *
 * CREDENCIALES (dos formas, en orden de prioridad):
 *   A) Token directo:
 *      SHOPIFY_STORE           ej: "5mas2r-gt" (sin .myshopify.com)
 *      SHOPIFY_ADMIN_TOKEN     token del Custom App
 *   B) OAuth client_credentials (si no hay token, se solicita uno):
 *      SHOPIFY_STORE
 *      SHOPIFY_CLIENT_ID
 *      SHOPIFY_CLIENT_SECRET
 *
 *   Estas variables se pueden definir por entorno o en un archivo .env
 *   junto a este script.
 *
 * VARIABLES OPCIONALES:
 *   SHOPIFY_API_VERSION     default "2025-01"
 *   VENDOR_FILTER           default "Axspen"
 *   OPTION_NAME             default "Talla"
 *
 * Requiere Node.js 18+ (usa fetch nativo). No necesita npm install.
 * ------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

// Cargar variables de entorno desde .env si existe
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
          if (value) {
            process.env[key] = value;
          }
        }
      }
    });
}

let STORE = "";
let TOKEN = "";
let ENDPOINT = "";
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const VENDOR_FILTER = process.env.VENDOR_FILTER || "Axspen";
const OPTION_NAME = process.env.OPTION_NAME || "Talla";
const APPLY = process.argv.includes("--apply");

// Regex: captura un valor de talla numérico seguido de texto extra
// "6 wide leg" -> grupo1 "6"
// "8 straight" -> grupo1 "8"
// "10"          -> no matchea (ya está limpio)
const DIRTY_VALUE_REGEX = /^(\d+)\s+\S.*$/;

async function ensureToken(forceRefresh = false) {
  if (!forceRefresh && (process.env.SHOPIFY_ADMIN_TOKEN || process.env.ACCESS_TOKEN)) {
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

  console.log(`Solicitando token de acceso para ${store}...`);
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
      TOKEN = data.access_token;

      // Intentar guardar en .env para la próxima vez
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
      } catch (e) {
        // no bloquea el flujo si falla el guardado en .env
      }
    } else {
      console.error("Error al solicitar token de Shopify:", data);
    }
  } catch (err) {
    console.error("Error de red al conectar con Shopify:", err.message);
  }
}

async function shopifyGraphQL(query, variables = {}, retried = false) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    const errorMsg = JSON.stringify(json.errors);
    if (errorMsg.includes("Invalid API key or access token") && !retried) {
      console.log("Token inválido o expirado. Intentando solicitar un nuevo token...");
      await ensureToken(true);
      if (TOKEN && TOKEN !== process.env.SHOPIFY_ADMIN_TOKEN) {
        TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
      }
      return shopifyGraphQL(query, variables, true);
    }
    throw new Error("GraphQL error: " + errorMsg);
  }

  // Manejo simple de throttling basado en el costo devuelto por la API
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
    query Products($cursor: String) {
      products(first: 50, after: $cursor) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            title
            vendor
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

  while (hasNextPage) {
    const data = await shopifyGraphQL(query, { cursor });

    const edges = data.products.edges;
    for (const edge of edges) {
      if (
        !VENDOR_FILTER ||
        (edge.node.vendor &&
          edge.node.vendor.toLowerCase().includes(VENDOR_FILTER.toLowerCase()))
      ) {
        products.push(edge.node);
      }
      cursor = edge.cursor;
    }
    hasNextPage = data.products.pageInfo.hasNextPage;
    console.log(`  ...${products.length} productos coincidentes encontrados`);
  }

  return products;
}

function buildLinkedValueMap(products) {
  // Mapa "6" -> gid del metaobjeto, tomado de valores YA correctos
  // (linkeados a la taxonomia) en cualquier producto del catalogo.
  const map = new Map();

  for (const product of products) {
    const option = product.options.find((o) =>
      o.name.toLowerCase().includes(OPTION_NAME.toLowerCase())
    );
    if (!option || !option.linkedMetafield) continue;

    for (const value of option.optionValues) {
      if (value.linkedMetafieldValue && !map.has(value.name.trim())) {
        map.set(value.name.trim(), value.linkedMetafieldValue);
      }
    }
  }

  return map;
}

function detectDirtyValues(products, linkedValueMap) {
  // changesByProduct: { productId: { optionId, title, updates: [...] } }
  const changesByProduct = {};
  const unresolved = [];

  for (const product of products) {
    const option = product.options.find((o) =>
      o.name.toLowerCase().includes(OPTION_NAME.toLowerCase())
    );
    if (!option) continue;

    const isLinked = !!option.linkedMetafield;
    const updates = [];

    for (const value of option.optionValues) {
      const match = value.name.match(DIRTY_VALUE_REGEX);
      if (!match) continue;

      const cleanNumber = match[1];

      if (!isLinked) {
        // Opcion normal (no linkeada a metafield): renombrar por texto
        updates.push({
          id: value.id,
          oldName: value.name,
          newName: cleanNumber,
          mode: "name",
        });
        continue;
      }

      // Opcion linkeada a metafield: no se puede usar "name" directo,
      // hay que apuntar al metaobjeto correcto.
      const gid = linkedValueMap.get(cleanNumber);
      if (gid) {
        updates.push({
          id: value.id,
          oldName: value.name,
          newName: cleanNumber,
          linkedMetafieldValueId: gid,
          mode: "linked",
        });
      } else {
        unresolved.push({
          productId: product.id,
          productTitle: product.title,
          optionId: option.id,
          valueId: value.id,
          oldName: value.name,
          targetNumber: cleanNumber,
          reason:
            "No se encontro ningun metaobjeto correcto para este numero en todo el catalogo. Requiere revision manual (crear/enlazar el metaobjeto).",
        });
      }
    }

    if (updates.length > 0) {
      changesByProduct[product.id] = {
        productId: product.id,
        productTitle: product.title,
        optionId: option.id,
        updates,
      };
    }
  }

  return { changeList: Object.values(changesByProduct), unresolved };
}

async function applyChanges(changeList) {
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
      option: { id: change.optionId },
      optionValuesToUpdate: change.updates.map((u) =>
        u.mode === "linked"
          ? { id: u.id, linkedMetafieldValue: u.linkedMetafieldValueId }
          : { id: u.id, name: u.newName }
      ),
    };

    try {
      const data = await shopifyGraphQL(mutation, variables);
      const errors = data.productOptionUpdate.userErrors;
      if (errors && errors.length > 0) {
        console.error(`  ✗ ${change.productTitle}:`, errors);
        results.failed.push({ ...change, errors });
      } else {
        console.log(`  ✓ ${change.productTitle}`);
        results.success.push(change);
      }
    } catch (err) {
      console.error(`  ✗ ${change.productTitle}: ${err.message}`);
      results.failed.push({ ...change, errors: [{ message: err.message }] });
    }

    await sleep(300); // margen extra de cortesía además del control de costo
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

  console.log(`Buscando productos del vendor "${VENDOR_FILTER}"...`);
  const products = await fetchAllProducts();
  console.log(`Total productos encontrados: ${products.length}\n`);

  console.log("Construyendo mapa de valores ya linkeados correctamente...");
  const linkedValueMap = buildLinkedValueMap(products);
  console.log(`  Valores linkeados de referencia encontrados: ${linkedValueMap.size}`);

  console.log(`\nDetectando valores sucios en la opción "${OPTION_NAME}"...`);
  const { changeList, unresolved } = detectDirtyValues(products, linkedValueMap);

  const totalValueChanges = changeList.reduce(
    (sum, c) => sum + c.updates.length,
    0
  );

  console.log(
    `\nProductos afectados: ${changeList.length} | Valores a corregir: ${totalValueChanges}`
  );
  if (unresolved.length > 0) {
    console.log(
      `⚠️  ${unresolved.length} valores NO se pudieron resolver automáticamente (ver unresolved.json)\n`
    );
  } else {
    console.log("");
  }

  if (unresolved.length > 0) {
    fs.writeFileSync("unresolved.json", JSON.stringify(unresolved, null, 2));
  }

  if (!APPLY) {
    fs.writeFileSync(
      "cambios-detectados.json",
      JSON.stringify(changeList, null, 2)
    );
    console.log(
      'DRY RUN completado. Revisa "cambios-detectados.json" antes de aplicar.\n' +
        "Cuando estés listo, ejecuta:\n" +
        "  node limpiar-tallas-axspen.js --apply"
    );
    return;
  }

  if (changeList.length === 0) {
    console.log("No hay cambios pendientes. Nada que aplicar.");
    return;
  }

  console.log("Aplicando cambios...\n");
  const results = await applyChanges(changeList);

  fs.writeFileSync(
    "resultado-aplicacion.json",
    JSON.stringify(results, null, 2)
  );

  console.log(
    `\nListo. Éxitos: ${results.success.length} | Fallos: ${results.failed.length}`
  );
  if (results.failed.length > 0) {
    console.log('Revisa "resultado-aplicacion.json" para el detalle de los fallos.');
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
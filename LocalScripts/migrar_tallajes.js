/**
 * Migración de "GUIAS DE TALLAS" (page_reference) -> "Imagen de Tallaje" (file_reference)
 * Tienda: Axspen
 *
 * QUÉ HACE:
 *  FASE 1 (discovery):  recorre todos los productos, agrupa por página de guía de tallas
 *                        única, y te muestra un resumen SIN modificar nada.
 *  FASE 2 (migrate):     sube cada imagen única a Shopify Files (una sola vez por guía),
 *                        y asigna esa referencia al metacampo "Imagen de Tallaje" de cada
 *                        producto correspondiente.
 *  FASE 3 (cleanup):     borra la definición del metacampo "guias_de_tallas_" y TODOS sus
 *                        valores asociados en los 544 productos. SOLO correr esto después
 *                        de confirmar visualmente que la Fase 2 quedó bien.
 *
 * CÓMO CORRERLO:
 *   1. npm install node-fetch@2
 *   2. Configura las variables de entorno (o edítalas abajo directamente):
 *        SHOP=axspen.myshopify.com
 *        ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   3. node migrar_tallajes.js discovery
 *   4. Revisa el archivo mapeo_tallajes.json que se genera
 *   5. node migrar_tallajes.js migrate
 *   6. Revisa un puñado de productos en el admin para confirmar que la imagen quedó bien
 *   7. Solo si todo está correcto: node migrar_tallajes.js cleanup
 *
 * PERMISOS NECESARIOS en tu app personalizada (Configuración > Apps y canales de venta
 * > Desarrollar apps > [tu app] > Configuración de API > Admin API):
 *   read_products, write_products, read_content, read_files, write_files
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env si existe
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length > 1) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
          if (value) {
            process.env[key] = value;
          }
        }
      }
    });
}

// ===================== CONFIG =====================
let SHOP = '';
let ACCESS_TOKEN = '';
let ENDPOINT = '';
const API_VERSION = '2025-01';
const MAPEO_FILE = './mapeo_tallajes.json';
// ====================================================

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('Error GraphQL:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL error');
  }
  if (json.data && json.data.userErrors && json.data.userErrors.length) {
    console.error('userErrors:', json.data.userErrors);
  }
  return json.data;
}

// ---------------------------------------------------------------
// FASE 1: Descubrimiento — agrupa productos por página de guía
// ---------------------------------------------------------------
async function discovery() {
  console.log('Recorriendo productos...');
  let cursor = null;
  let hasNextPage = true;
  const paginaAProductos = {}; // pageId -> { pageTitle, pageHandle, productIds: [] }
  const productosYaConImagen = [];

  while (hasNextPage) {
    const data = await shopifyGraphQL(`
      query ($cursor: String) {
        products(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              metafield_imagen: metafield(namespace: "custom", key: "imagen_de_tallaje") {
                id
                value
              }
              metafield_guia: metafield(namespace: "custom", key: "guias_de_tallas_") {
                id
                value
              }
            }
          }
        }
      }
    `, { cursor });

    for (const edge of data.products.edges) {
      const p = edge.node;

      if (p.metafield_imagen && p.metafield_imagen.value) {
        productosYaConImagen.push(p.id);
        continue; // ya tiene Imagen de Tallaje, no necesita migración
      }

      if (p.metafield_guia && p.metafield_guia.value) {
        // el value de un metacampo page_reference es el GID de la página, ej: "gid://shopify/OnlineStorePage/123456"
        const pageId = p.metafield_guia.value;
        if (!paginaAProductos[pageId]) {
          paginaAProductos[pageId] = { productIds: [] };
        }
        paginaAProductos[pageId].productIds.push(p.id);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  // Ahora resolvemos título/contenido de cada página única
  const pageIds = Object.keys(paginaAProductos);
  console.log(`Encontradas ${pageIds.length} páginas de guía de tallas únicas.`);
  console.log(`${productosYaConImagen.length} productos ya tienen Imagen de Tallaje (se omiten).`);

  for (const pageId of pageIds) {
    const data = await shopifyGraphQL(`
      query ($id: ID!) {
        page(id: $id) {
          id
          title
          handle
          body
        }
      }
    `, { id: pageId });

    if (!data.page) {
      console.warn(`⚠️  No se pudo resolver la página ${pageId}`);
      continue;
    }

    const contenido = data.page.body || '';
    const match = contenido.match(/src="([^"]+)"/);
    const imagenUrl = match ? match[1] : null;

    paginaAProductos[pageId].pageTitle = data.page.title;
    paginaAProductos[pageId].pageHandle = data.page.handle;
    paginaAProductos[pageId].imagenUrl = imagenUrl;

    console.log(`- ${data.page.title}: ${paginaAProductos[pageId].productIds.length} productos, imagen: ${imagenUrl ? 'encontrada' : '❌ NO ENCONTRADA'}`);
  }

  fs.writeFileSync(MAPEO_FILE, JSON.stringify(paginaAProductos, null, 2));
  console.log(`\nMapeo guardado en ${MAPEO_FILE}. Revísalo antes de correr "migrate".`);
  console.log('Presta especial atención a cualquier página marcada "❌ NO ENCONTRADA" — esas necesitarán carga manual.');
}

// ---------------------------------------------------------------
// FASE 2: Migración — sube cada imagen única y asigna a productos
// ---------------------------------------------------------------
async function fileCreateFromUrl(url, altText) {
  const data = await shopifyGraphQL(`
    mutation ($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          ... on MediaImage {
            image { url }
          }
        }
        userErrors { field message }
      }
    }
  `, {
    files: [{
      originalSource: url,
      contentType: 'IMAGE',
      alt: altText,
    }],
  });

  const file = data.fileCreate.files[0];
  // El archivo puede quedar en estado PROCESSING; esperamos y reconsultamos su estado
  return await esperarArchivoListo(file.id);
}

async function esperarArchivoListo(fileId, intentos = 10) {
  for (let i = 0; i < intentos; i++) {
    const data = await shopifyGraphQL(`
      query ($id: ID!) {
        node(id: $id) {
          ... on MediaImage {
            id
            fileStatus
          }
        }
      }
    `, { id: fileId });

    const status = data.node && data.node.fileStatus;
    if (status === 'READY') return fileId;
    if (status === 'FAILED') throw new Error(`El archivo ${fileId} falló al procesarse`);

    console.log(`  Esperando procesamiento de imagen... (${i + 1}/${intentos})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timeout esperando que ${fileId} quede READY`);
}

async function setMetafieldImagenTallaje(productId, fileGid) {
  const data = await shopifyGraphQL(`
    mutation ($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `, {
    metafields: [{
      ownerId: productId,
      namespace: 'custom',
      key: 'imagen_de_tallaje',
      type: 'file_reference',
      value: fileGid,
    }],
  });

  if (data.metafieldsSet.userErrors.length) {
    console.error(`  ❌ Error en producto ${productId}:`, data.metafieldsSet.userErrors);
  }
}

async function migrate() {
  if (!fs.existsSync(MAPEO_FILE)) {
    console.error(`No existe ${MAPEO_FILE}. Corre primero: node migrar_tallajes.js discovery`);
    return;
  }
  const mapeo = JSON.parse(fs.readFileSync(MAPEO_FILE, 'utf-8'));

  for (const pageId of Object.keys(mapeo)) {
    const entry = mapeo[pageId];
    if (!entry.imagenUrl) {
      console.warn(`⚠️  Saltando "${entry.pageTitle}" — no tiene imagenUrl (revísala manualmente).`);
      continue;
    }

    console.log(`\nSubiendo imagen de "${entry.pageTitle}"...`);
    const fileGid = await fileCreateFromUrl(entry.imagenUrl, `Tabla de tallaje ${entry.pageTitle}`);
    console.log(`  Subida OK: ${fileGid}`);

    console.log(`  Asignando a ${entry.productIds.length} productos...`);
    for (const productId of entry.productIds) {
      await setMetafieldImagenTallaje(productId, fileGid);
    }
    console.log(`  ✅ Listo para "${entry.pageTitle}"`);
  }

  console.log('\nMigración completa. Revisa varios productos en el admin antes de correr "cleanup".');
}

// ---------------------------------------------------------------
// FASE 3: Limpieza — borra el metacampo antiguo y TODOS sus valores
// ---------------------------------------------------------------
async function cleanup() {
  console.log('⚠️  Esto borrará la definición "guias_de_tallas_" y TODOS sus valores en los 544 productos.');
  console.log('Esta acción no se puede deshacer fácilmente. Asegúrate de haber confirmado la Fase 2 primero.');

  // Necesitamos el ID de la definición del metacampo (no el key), lo buscamos primero
  const data = await shopifyGraphQL(`
    query {
      metafieldDefinitions(first: 50, ownerType: PRODUCT, namespace: "custom") {
        edges {
          node { id key name }
        }
      }
    }
  `);

  const def = data.metafieldDefinitions.edges
    .map((e) => e.node)
    .find((n) => n.key === 'guias_de_tallas_');

  if (!def) {
    console.error('No se encontró la definición del metacampo "guias_de_tallas_". ¿Ya fue borrada?');
    return;
  }

  const result = await shopifyGraphQL(`
    mutation ($id: ID!) {
      metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: true) {
        deletedDefinitionId
        userErrors { field message }
      }
    }
  `, { id: def.id });

  console.log('Resultado:', result.metafieldDefinitionDelete);
}

async function ensureToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN || process.env.ACCESS_TOKEN) {
    return;
  }
  const store = process.env.SHOPIFY_STORE || (process.env.SHOP ? process.env.SHOP.replace('.myshopify.com', '') : '');
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!store || !clientId || !clientSecret) {
    return;
  }
  console.log(`Token no encontrado en .env. Solicitando token de acceso para ${store}...`);
  try {
    const res = await fetch(`https://${store}.myshopify.com/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      console.log('Token obtenido exitosamente.');
      process.env.SHOPIFY_ADMIN_TOKEN = data.access_token;
      process.env.ACCESS_TOKEN = data.access_token;
      
      // Intentar guardar en .env para la próxima vez
      try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
          let content = fs.readFileSync(envPath, 'utf-8');
          ['SHOPIFY_ADMIN_TOKEN', 'ACCESS_TOKEN'].forEach(key => {
            const regex = new RegExp(`^(${key}\\s*=\\s*).*$`, 'm');
            if (regex.test(content)) {
              content = content.replace(regex, `$1"${data.access_token}"`);
            } else {
              content += `\n${key}="${data.access_token}"`;
            }
          });
          fs.writeFileSync(envPath, content, 'utf-8');
        }
      } catch (e) {}
    } else {
      console.error('Error al solicitar token de Shopify:', data);
    }
  } catch (err) {
    console.error('Error de red al conectar con Shopify:', err.message);
  }
}

async function start() {
  await ensureToken();

  SHOP = process.env.SHOP || (process.env.SHOPIFY_STORE ? `${process.env.SHOPIFY_STORE}.myshopify.com` : 'axspen.myshopify.com');
  ACCESS_TOKEN = process.env.ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_TOKEN;
  ENDPOINT = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

  if (!SHOP || !ACCESS_TOKEN) {
    console.error('Faltan variables de entorno. Define SHOP y ACCESS_TOKEN o configura tu archivo .env con credenciales.\n');
    process.exit(1);
  }

  const comando = process.argv[2];
  if (comando === 'discovery') discovery().catch(console.error);
  else if (comando === 'migrate') migrate().catch(console.error);
  else if (comando === 'cleanup') cleanup().catch(console.error);
  else console.log('Uso: node migrar_tallajes.js [discovery|migrate|cleanup]');
}

start().catch(console.error);

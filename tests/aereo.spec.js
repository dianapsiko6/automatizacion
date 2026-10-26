// @ts-check
// ↑ Le pide a VS Code que revise los tipos del archivo JavaScript y marque errores en rojo.
//   No afecta la ejecución de los tests, solo ayuda al escribir el código.

// Importa dos herramientas de Playwright:
//   - test:   sirve para definir cada prueba.
//   - expect: sirve para hacer las verificaciones (por ejemplo "esto debe estar visible").
import { test, expect } from '@playwright/test';

// ============================================================
//  FUNCIÓN AUXILIAR: aceptar el aviso de cookies
// ============================================================
// Esta función no es un test, es una ayuda que reutilizamos en varios tests.
// El aviso de cookies tapa la página y bloquea los clics, por eso hay que cerrarlo primero.

// Comentario especial (JSDoc): le dice a VS Code que "page" es una página de Playwright.
// Sin esto, VS Code marca "page" en rojo por no saber de qué tipo es.
/** @param {import('@playwright/test').Page} page */
async function aceptarCookies(page) {
  // Busca un BOTÓN cuyo texto contenga "aceptar", "accept" o "entendido".
  //   - getByRole('button', ...) → busca por tipo de elemento (botón).
  //   - /aceptar|accept|entendido/i → expresión regular; el símbolo "|" significa "o",
  //     y la "i" final significa que no importa si es mayúscula o minúscula.
  //   - .first() → si hay varios botones que coinciden, toma solo el primero.
  const boton = page.getByRole('button', { name: /aceptar|accept|entendido/i }).first();

  // try/catch: "intenta esto, y si falla, no detengas el test".
  try {
    // Hace clic en el botón. Espera máximo 3 segundos (3000 ms) a que aparezca.
    await boton.click({ timeout: 3000 });
  } catch {
    // Si el aviso no apareció (por ejemplo, ya lo aceptaste antes), cae aquí
    // y simplemente seguimos con el test normal, sin error.
  }
}

// Ruta de la página que vamos a probar. Se une con el "baseURL" del config:
// 'https://shalom.com.pe' + '/aereo' = 'https://shalom.com.pe/aereo'
// La guardamos en una constante para no repetirla en cada test.
const URL_AEREO = '/aereo';

// ============================================================
//  GRUPO DE TESTS
// ============================================================
// test.describe agrupa varios tests bajo un mismo nombre.
// En el reporte aparecen juntos, y comparten el beforeEach de abajo.
test.describe('Vista Aéreo - actualización a envíos aéreos nacionales', () => {

  // Estas dos listas guardan los problemas técnicos que ocurran mientras carga la página.
  // Se declaran aquí (fuera de los tests) para que el beforeEach las llene
  // y el test de "errores técnicos" las pueda leer después.

  // Lista de mensajes de error que salgan en la consola del navegador.
  // El comentario @type le dice a VS Code que es una lista de textos (string[]).
  /** @type {string[]} */
  let erroresConsola = [];

  // Lista de peticiones que fallaron (por ejemplo, una imagen que da error 404).
  /** @type {string[]} */
  let peticionesFallidas = [];

  // ----------------------------------------------------------
  //  PREPARACIÓN: se ejecuta ANTES de cada test del grupo
  // ----------------------------------------------------------
  test.beforeEach(async ({ page }) => {
    // Vaciamos las listas para que cada test empiece limpio,
    // sin arrastrar errores del test anterior.
    erroresConsola = [];
    peticionesFallidas = [];

    // page.on(...) = "escucha este evento y avísame cada vez que ocurra".
    // Aquí escuchamos los mensajes de la consola del navegador.
    page.on('console', (msg) => {
      // Si el mensaje es de tipo "error", lo guardamos en la lista.
      if (msg.type() === 'error') erroresConsola.push(msg.text());
    });

    // Aquí escuchamos cada respuesta que el servidor devuelve (imágenes, scripts, datos...).
    page.on('response', (res) => {
      // Un código de estado 400 o mayor significa que algo falló
      // (404 = no encontrado, 500 = error del servidor).
      // Guardamos el código y la dirección que falló.
      if (res.status() >= 400) peticionesFallidas.push(`${res.status()} ${res.url()}`);
    });

    // Abre la página /aereo y guarda la respuesta del servidor.
    // (En tu código esta línea estaba repetida dos veces; con "const" solo puede
    //  declararse una vez, por eso daba error. Aquí quedó una sola.)
    const respuesta = await page.goto(URL_AEREO);

    // Acepta el aviso de cookies si apareció.
    await aceptarCookies(page);

    // Verifica que la página respondió bien: el código debe ser menor a 400.
    //   - respuesta?.status() → el "?." evita error si la respuesta viniera vacía.
    //   - El texto entre comillas es el mensaje que verás si el test falla.
    //   - toBeLessThan(400) → "debe ser menor que 400".
    expect(respuesta?.status(), 'La página /aereo no respondió OK').toBeLessThan(400);

    // Espera a que la página termine de cargar todo (que ya no haya
    // peticiones de red pendientes). Así evitamos revisar una página a medio cargar.
    await page.waitForLoadState('networkidle');
  });

  // ============================================================
  //  1. CONTENIDO
  // ============================================================

  // TEST 1: verifica que las secciones nuevas existan y se vean.
  test('Muestra las secciones nuevas RESTRINGIDO y MANUAL DE EMBALAJE', async ({ page }) => {
    // getByText(/restringido/i) → busca cualquier elemento que contenga ese texto
    //   (sin importar mayúsculas o minúsculas).
    // .first() → si el texto aparece en varios lugares (menú, título...), usa el primero.
    //   Así evitamos el error "strict mode violation".
    // toBeVisible() → verifica que el elemento esté visible en pantalla.
    await expect(page.getByText(/restringido/i).first()).toBeVisible();

    // Lo mismo para la sección "MANUAL DE EMBALAJE".
    await expect(page.getByText(/manual de embalaje/i).first()).toBeVisible();
  });

  // TEST 2: verifica que lo viejo ya no esté.
  test('Ya no muestra las terminales específicas de envío aéreo', async ({ page }) => {
    // Busca el texto "terminales específicas" y verifica que haya CERO coincidencias.
    // toHaveCount(0) → "no debe existir ningún elemento con ese texto".
    await expect(page.getByText(/terminales específicas/i)).toHaveCount(0);
  });

  // TEST 3: DESACTIVADO.
  // El texto "nivel nacional" está dentro de la imagen del banner (diseño del Figma),
  // no como texto de la página, y getByText solo puede leer texto real, no el contenido
  // de una imagen. Por eso este test fallaba aunque el banner se viera bien.
  // El banner se valida visualmente y con el test de imágenes de más abajo.
  //
  // test('Muestra el nuevo contexto: envíos aéreos a nivel nacional', async ({ page }) => {
  //   await expect(page.getByText(/nivel nacional/i).first()).toBeVisible();
  // });

  // ============================================================
  //  2. IMÁGENES
  // ============================================================

  // TEST 4: verifica que ninguna imagen de la página esté rota.
  test('Todas las imágenes visibles cargan correctamente', async ({ page }) => {
    // Muchas webs cargan las imágenes solo cuando haces scroll (lazy loading).
    // Si no bajamos por la página, esas imágenes nunca se cargarían y las daríamos por rotas.
    // page.evaluate ejecuta código DENTRO del navegador, como si fuera la consola.
    await page.evaluate(async () => {
      // Recorre la página de arriba hacia abajo, de 400 en 400 píxeles.
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y); // baja hasta la posición y
        // Espera 100 ms para dar tiempo a que cargue lo que apareció.
        await new Promise((r) => setTimeout(r, 100));
      }
      // Al terminar, vuelve a la parte de arriba.
      window.scrollTo(0, 0);
    });

    // Espera de nuevo a que termine de cargar lo que se activó con el scroll.
    await page.waitForLoadState('networkidle');

    // Localiza todas las imágenes (<img>) que sean visibles.
    // "img:visible" ignora las que están ocultas.
    const imagenes = page.locator('img:visible');

    // Cuenta cuántas imágenes hay.
    const total = await imagenes.count();

    // Verifica que haya al menos una. Si no hay ninguna, algo anda mal con la página
    // (o con nuestro localizador), y el test avisa con ese mensaje.
    expect(total, 'No se encontraron imágenes en la vista').toBeGreaterThan(0);

    // Lista donde guardaremos la dirección (src) de cada imagen rota.
    /** @type {(string | null)[]} */
    const rotas = [];

    // Revisa las imágenes una por una.
    for (let i = 0; i < total; i++) {
      // Toma la imagen número i.
      const img = imagenes.nth(i);

      // Pregunta al navegador si la imagen cargó bien.
      const ok = await img.evaluate((el) => {
        // Le indicamos a VS Code que "el" es una imagen (así reconoce complete y naturalWidth).
        const imagen = /** @type {HTMLImageElement} */ (el);
        // complete = el navegador terminó de intentar cargarla.
        // naturalWidth > 0 = realmente tiene ancho, o sea que se descargó bien.
        // Si una imagen está rota, naturalWidth vale 0.
        return imagen.complete && imagen.naturalWidth > 0;
      });

      // Si NO cargó bien, guardamos su dirección para mostrarla en el error.
      if (!ok) rotas.push(await img.getAttribute('src'));
    }

    // Verifica que la lista de imágenes rotas esté vacía.
    // Si falla, el mensaje muestra cuáles son las imágenes con problema.
    expect(rotas, `Imágenes rotas: ${rotas.join(', ')}`).toEqual([]);
  });

  // ============================================================
  //  3. NAVEGACIÓN
  // ============================================================

  // TEST 5: verifica que desde el menú se llegue a la vista Aéreo.
  test('Desde el menú Servicios se llega a la vista Aéreo', async ({ page }) => {
    // Abre la página de inicio (en tu código esta línea estaba repetida; aquí quedó una sola).
    await page.goto('/');

    // Cierra el aviso de cookies, que bloquea el menú si no se acepta.
    await aceptarCookies(page);

    // Ajusta los nombres si el menú usa otro texto o es hamburguesa en móvil.
    // Busca un ENLACE que diga "servicios" y le hace clic.
    await page.getByRole('link', { name: /servicios/i }).first().click();

    // Busca un enlace que diga "aéreo" o "aereo" y le hace clic.
    // En la expresión regular, [eé] significa "la letra e con o sin tilde".
    await page.getByRole('link', { name: /a[eé]reo/i }).first().click();

    // Verifica que la dirección actual contenga la palabra "aereo".
    // Confirma que la navegación terminó en la vista correcta.
    await expect(page).toHaveURL(/aereo/);
  });

  // ============================================================
  //  4. ERRORES TÉCNICOS
  // ============================================================

  // TEST 6: revisa lo que se fue guardando en el beforeEach.
  // No necesita "page" porque solo lee las listas.
  test('No hay errores de consola ni peticiones fallidas', async () => {
    // Verifica que la lista de errores de consola esté vacía.
    // Si falla, el mensaje muestra cada error en una línea (join('\n') los une con saltos de línea).
    expect(erroresConsola, `Errores de consola:\n${erroresConsola.join('\n')}`).toEqual([]);

    // Verifica que no haya peticiones fallidas (404, 500...).
    expect(peticionesFallidas, `Peticiones fallidas:\n${peticionesFallidas.join('\n')}`).toEqual([]);
  });

  // ============================================================
  //  5. EVIDENCIA
  // ============================================================

  // TEST 7: toma una captura de pantalla para adjuntar a tu reporte.
  // "testInfo" trae datos del test en ejecución, como el navegador que se está usando.
  test('Captura de pantalla completa como evidencia', async ({ page }, testInfo) => {
    // Toma el nombre del navegador (por ejemplo "Mobile Safari") y lo deja
    // en minúsculas y con guiones ("mobile-safari") para usarlo en el nombre del archivo.
    //   - \s+ significa "uno o más espacios"; los reemplaza por "-".
    const nombre = testInfo.project.name.replace(/\s+/g, '-').toLowerCase();

    // Toma la captura y la guarda en la carpeta evidencias/.
    await page.screenshot({
      path: `evidencias/aereo-${nombre}.png`, // un archivo distinto por cada navegador
      fullPage: true, // captura TODA la página, no solo lo que cabe en pantalla
    });
  });
});
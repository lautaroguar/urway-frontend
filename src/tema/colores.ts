/**
 * ============================================================================
 * tema/colores.ts — Constantes de diseño compartidas por toda la app
 * ============================================================================
 *
 * QUÉ ES:
 *   Un archivo que no dibuja nada: solo exporta objetos con los VALORES de
 *   diseño (colores, espacios, radios de borde, sombras). Todos los componentes
 *   y pantallas los importan en lugar de escribir "#2563EB" o "16" sueltos.
 *
 * POR QUÉ EXISTE:
 *   Si mañana cambia el azul de la marca, se cambia UNA línea acá y se actualiza
 *   toda la app. Además evita que dos pantallas usen dos grises "casi iguales".
 *
 * TEORÍA:
 *   [EST] "Organizando styles / Externalizar un StyleSheet": la cátedra permite
 *   declarar los estilos en el mismo archivo del componente o en uno aparte.
 *   Acá se combinan las dos: cada componente tiene su StyleSheet al pie de su
 *   archivo, y lo que se COMPARTE entre archivos (estos valores) vive acá.
 *   [EST] "Unidades": en React Native ninguna medida lleva unidad (no "16px"):
 *   son dp (píxeles independientes de la densidad de la pantalla).
 *
 * SOBRE `as const`:
 *   Sin `as const`, TypeScript pensaría que `fondo` es un `string` cualquiera.
 *   Con `as const`, el objeto queda de SOLO LECTURA y cada valor conserva su
 *   tipo exacto ("#000000"). Resultado: el editor autocompleta `colores.` y
 *   marca error si escribís un nombre que no existe (por ejemplo `colores.rojo`).
 */

// ---------------------------------------------------------------------------
// COLORES
// ---------------------------------------------------------------------------

/**
 * Tema oscuro de URWAY.
 *
 * Los hex salen del panel "Colores" de los frames del archivo de Figma,
 * no fueron elegidos a mano. Si el diseño cambia, este es el único archivo
 * que hay que tocar.
 */
export const colores = {
  /**
   * Fondos. El negro es puro a propósito: en pantallas OLED el píxel queda
   * apagado, así que no hay halo alrededor del contenido y la barra de estado
   * del sistema se funde con la app en vez de recortar un rectángulo.
   * Las superficies son grises muy oscuros para que las tarjetas se despeguen
   * del negro sin necesidad de bordes fuertes.
   */
  fondo: "#000000", // fondo de todas las pantallas
  superficie: "#0E1216", // el gris más oscuro: buscadores y chips sin seleccionar
  superficieAlta: "#14191D", // tarjetas y filas (un escalón más claro que `superficie`)
  superficieSuave: "#1B2126", // encabezados dentro de una tarjeta y fondos de miniaturas

  // Azules de marca
  primario: "#2563EB", // el azul principal: botones, pestaña activa, chips activos
  primarioOscuro: "#1E3A8A", // bordes de elementos azules
  primarioProfundo: "#172554", // fondo de tarjetas azules e íconos
  pizarra: "#1E293B", // el "riel" vacío de la barra de progreso
  azulClaro: "#A4C9FF", // enlaces, íconos y textos destacados
  azulTenue: "#B4C5FF", // logo "urway" y campana del header
  azulPalido: "#D6E5FF", // texto sobre fondos azules

  // Texto (de más fuerte a más débil)
  texto: "#EEEFFF", // títulos y texto principal
  textoSuave: "#DFE3E7", // texto de lectura
  textoSecundario: "#C3C6D7", // subtítulos
  textoTenue: "#8D90A0", // detalles y rótulos
  textoDebil: "#6B7280", // placeholders y elementos deshabilitados
  blanco: "#FFFFFF", // texto sobre botones azules

  // Bordes
  borde: "#434655", // borde marcado (botones secundarios)
  bordeSuave: "#313539", // borde sutil de tarjetas y separadores

  // Estados
  alerta: "#FFB4AB", // rojo claro: parciales, borrar, avisos

  /**
   * Capas translúcidas de la barra de tabs, que va sobre un desenfoque.
   * `velo` es apenas más claro que el negro para que la cápsula se despegue del
   * fondo OLED en vez de desaparecer.
   */
  velo: "rgba(20, 25, 30, 0.72)", // rgba(rojo, verde, azul, opacidad de 0 a 1)
  bordeVidrio: "rgba(255, 255, 255, 0.12)", // borde blanco casi transparente

  /** Tinte azul muy suave para resaltar la columna de hoy en el calendario. */
  resaltadoHoy: "rgba(37, 99, 235, 0.10)",
} as const;

// ---------------------------------------------------------------------------
// ESPACIADO Y FORMAS
// ---------------------------------------------------------------------------

/** Escala de espaciado. Todos los números son dp, sin unidad. */
// Se usa en padding, margin y gap: `espaciado.lg` en vez de un 16 suelto.
// xs = extra small (4), sm = small (8), md = medium (12), lg = large (16),
// xl = extra large (24), xxl = 32.
export const espaciado = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Radios de borde (borderRadius). `pastilla: 999` es un radio enorme a
// propósito: redondea por completo los lados cortos y da forma de "píldora".
export const radios = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pastilla: 999,
} as const;

// ---------------------------------------------------------------------------
// BARRA DE TABS
// ---------------------------------------------------------------------------

/**
 * Medidas de la barra de tabs. Como flota por encima del contenido
 * (`position: absolute`), no ocupa lugar en el layout: cada pantalla tiene que
 * dejar este hueco al final de su scroll o el último ítem queda tapado.
 */
export const barraTabs = {
  alto: 62, // alto de la cápsula
  margenLateral: 16, // separación de la cápsula con los bordes izquierdo y derecho
  /**
   * Separación extra sobre el área segura inferior. En 0 la barra apoya justo
   * en el límite del área segura, pegada arriba de la rayita de inicio.
   */
  margenInferior: 0,
  /** Piso para teléfonos sin área segura abajo (Android con botones). */
  margenMinimo: 12,
} as const;

/** Alto del área segura inferior de un iPhone con rayita de inicio. */
// Es una constante privada (no lleva `export`): solo se usa acá abajo.
const AREA_SEGURA_INFERIOR = 34;

/**
 * Padding inferior que necesita el contenido scrolleable de cada pantalla.
 * Suma el área segura porque las pantallas no la reservan abajo: el scroll
 * llega hasta el borde físico y pasa por detrás de la barra.
 */
// Se calcula sumando los otros valores: 34 + 0 + 62 + 16 = 112.
// Las cuatro pantallas de las pestañas lo usan como `paddingBottom`.
export const espacioBajoTabs =
  AREA_SEGURA_INFERIOR +
  barraTabs.margenInferior +
  barraTabs.alto +
  espaciado.lg;

// ---------------------------------------------------------------------------
// SOMBRAS
// ---------------------------------------------------------------------------

/**
 * Sombra de tarjeta. Lleva las dos familias a propósito:
 * `shadow*` solo funciona en iOS y `elevation` solo en Android.
 */
// [EST] "shadowColor, shadowOffset, shadowOpacity y shadowRadius": la sombra
// de iOS. `elevation` es la de Android ("Solo para Android" en la teoría).
// Se usa con el operador spread: `...sombraTarjeta` copia estas 5 propiedades
// dentro del estilo que la necesite (ver componentes/Tarjeta.tsx).
export const sombraTarjeta = {
  shadowColor: "#000000", // color de la sombra
  shadowOffset: { width: 0, height: 2 }, // desplazamiento: 2 dp hacia abajo
  shadowOpacity: 0.3, // 30 % de opacidad
  shadowRadius: 8, // cuán difuminada es
  elevation: 4, // altura de la sombra en Android
} as const;

// Sombra más profunda para elementos que "flotan" (la barra de tabs).
export const sombraFlotante = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 16,
  elevation: 12,
} as const;

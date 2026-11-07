/**
 * ============================================================================
 * utilidades/zoom.ts — Las cuentas del zoom de una foto (funciones puras)
 * ============================================================================
 *
 * QUÉ ES:
 *   Las constantes y las cuentas con las que `FotoConZoom` decide cuánto agrandar
 *   la foto y hasta dónde dejar moverla. Están acá, separadas del componente, para
 *   que el componente solo conecte los gestos y estas cuentas se puedan leer (y
 *   probar) sin pantalla.
 *
 * POR QUÉ LLEVAN `'worklet'`:
 *   Los callbacks de un gesto corren en el HILO DE UI, no en el de JavaScript
 *   [GESTOS 10]. Una función común vive en el hilo de JavaScript; para llamarla
 *   desde un callback de gesto hay que marcarla con la directiva `'worklet'`, que
 *   le dice a Reanimated "copiá esta función al hilo de UI". Solo hacen cuentas con
 *   números, que es justo lo que un worklet puede hacer.
 *
 * LAS COORDENADAS — TODO MEDIDO DESDE EL CENTRO:
 *   La foto se agranda desde su CENTRO. Por eso todo se mide desde el centro del
 *   recuadro: el punto del medio es (0, 0), y los de la izquierda o de arriba son
 *   negativos. `traslado` es cuánto se corrió la foto de su lugar.
 *
 * TEORÍA:
 *   [GESTOS 10] Worklets: funciones que cruzan al hilo de UI.
 *   [GESTOS 15] Pinch: guardar la escala anterior y MULTIPLICAR, con límites; el
 *               zoom ocurre donde están los dedos (`focalX`/`focalY`).
 *   [JS 9]      Funciones puras: mismos números adentro, mismo resultado; no
 *               modifican nada de afuera.
 */

/** Lo más chica que puede quedar la foto: su tamaño normal. */
export const ESCALA_MINIMA = 1;
/** Lo más grande que se puede acercar. */
export const ESCALA_MAXIMA = 5;
/** A cuánto acerca el doble toque. */
export const ESCALA_DOBLE_TOQUE = 2.5;
/** Cuánto agrandan o achican los botones «+» y «−» en cada toque (por 1,5). */
export const PASO_BOTONES = 1.5;
/** Desde esta escala se considera que la foto está acercada (y no «en reposo»). */
const ESCALA_ACERCADA = 1.01;

/** Deja `valor` entre `minimo` y `maximo` (como `Math.min` y `Math.max` juntos). */
export function limitar(valor: number, minimo: number, maximo: number): number {
  'worklet';
  return Math.min(Math.max(valor, minimo), maximo);
}

/** ¿La foto está acercada? (Si es así, arrastrar la mueve en vez de pasar la página). */
export function estaAcercada(escala: number): boolean {
  'worklet';
  return escala > ESCALA_ACERCADA;
}

/**
 * Cuánto se puede correr la foto hacia cada lado sin que se vea el borde del
 * recuadro. `lado` es el ancho (o el alto) del recuadro.
 *
 *   escala 1  → 0           (entra justo: no hay nada que mover)
 *   escala 2  → lado / 2    (la foto mide el doble: sobra un lado entero, mitad por banda)
 *   escala 3  → lado        ...
 */
export function limiteDeTraslado(lado: number, escala: number): number {
  'worklet';
  return Math.max(0, (lado * escala - lado) / 2);
}

/**
 * Cuánto hay que correr la foto para que, al cambiar la escala, el punto que está
 * debajo de los dedos SIGA debajo de los dedos (si no, la foto se agrandaría hacia
 * el centro y se "escaparía" de entre los dedos).
 *
 *   foco0     → dónde estaban los dedos al empezar el gesto (desde el centro)
 *   foco      → dónde están ahora (si los dedos se mueven mientras pellizcan,
 *               la foto los acompaña)
 *   traslado0 → cuánto estaba corrida la foto al empezar el gesto
 *   escala0   → la escala al empezar el gesto
 *   escala1   → la escala nueva
 *
 * La cuenta: el punto de la foto que estaba bajo `foco0` es `(foco0 - traslado0) / escala0`.
 * Después del cambio ese punto queda en `escala1 * punto + traslado1`, y queremos
 * que coincida con `foco`. Despejando `traslado1` sale la fórmula de abajo.
 */
export function trasladoAlHacerZoom(
  foco0: number,
  foco: number,
  traslado0: number,
  escala0: number,
  escala1: number
): number {
  'worklet';
  return foco - (escala1 * (foco0 - traslado0)) / escala0;
}

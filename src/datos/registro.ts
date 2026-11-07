/**
 * ============================================================================
 * datos/registro.ts — Opciones de las preguntas del registro
 * ============================================================================
 *
 * QUÉ ES:
 *   Las preguntas con opciones de la pantalla "Crear cuenta" (`app/registro.tsx`),
 *   escritas a mano como el resto de `datos/`. Cada opción tiene una `clave`
 *   (identificador interno, estable: es lo que se guarda en el usuario) y una
 *   `etiqueta` (lo que se lee en pantalla).
 *
 * POR QUÉ SOLO HAY UNA CARRERA:
 *   Todos los datos de ejemplo de la app (materias, plan, compañeros) son de
 *   Ingeniería en Informática, así que es la única carrera que se ofrece.
 *
 * TEORÍA:
 *   [JS 3]  Arrays de objetos como "base de datos" de la demo.
 *   [JS 8]  `find` para buscar una opción por su clave.
 */

/** Una opción de una pregunta: `clave` es interna y `etiqueta` es lo que se lee. */
export type OpcionPregunta = {
  clave: string;
  etiqueta: string;
};

/** "¿A qué facultad vas?" */
export const facultades: OpcionPregunta[] = [{ clave: "uca", etiqueta: "UCA" }];

/** "¿Qué carrera cursás?" */
export const carreras: OpcionPregunta[] = [
  { clave: "informatica", etiqueta: "Ingeniería Informática" },
];

/**
 * Lo que se lee de una opción a partir de su clave: ("uca") → "UCA". Si la clave
 * no existe (por ejemplo, un dato guardado con una opción que ya se sacó) devuelve
 * la clave misma, así nunca se muestra un texto vacío.
 */
export function etiquetaDe(opciones: OpcionPregunta[], clave: string): string {
  // `find` devuelve la primera opción que cumple la condición, o `undefined`.
  // `?.` (encadenamiento opcional) evita un error si no se encontró nada, y `??`
  // da el valor de reserva en ese caso.
  return opciones.find((opcion) => opcion.clave === clave)?.etiqueta ?? clave;
}

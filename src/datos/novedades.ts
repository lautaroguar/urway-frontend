/**
 * ============================================================================
 * datos/novedades.ts — Avisos institucionales de la pantalla Inicio
 * ============================================================================
 *
 * QUÉ ES:
 *   La forma de una novedad: los avisos del bloque "Novedades" de Inicio (por
 *   ejemplo "Inscripción a finales abierta"). Vienen del backend
 *   (`GET /api/novedades`); las de ejemplo están en `backend/src/semilla.ts`.
 *
 * QUIÉN LO USA:
 *   app/(tabs)/inicio.tsx, que recorre la lista con `map`.
 *
 * Las "próximas fechas" de Inicio no viven acá: se derivan de los eventos de la
 * agenda (los de tipo parcial y entrega).
 */

// La "forma" de una novedad.
export type Novedad = {
  id: string;
  titulo: string;
  detalle: string;
  // Qué ícono usar: Inicio traduce "megafono" y "calendario" al nombre real del
  // ícono de Ionicons.
  icono: "megafono" | "calendario";
};

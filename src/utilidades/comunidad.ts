/**
 * ============================================================================
 * utilidades/comunidad.ts — Las opciones de privacidad
 * ============================================================================
 *
 * QUÉ ES:
 *   Las dos opciones de "¿Quién ve mis apuntes / mis notas?" del perfil:
 *   todos los estudiantes, o solo mis amigos.
 *
 * LA REGLA DE QUIÉN PUEDE VER QUÉ:
 *   La aplica el SERVIDOR (`puedeVer` en `backend/src/consultas.ts`): si algo es
 *   "solo para amigos" y quien pregunta no es amigo, esos datos ni siquiera viajan.
 */
import type { Visibilidad } from "@/datos/comunidad";

/** Las dos opciones de privacidad, con la forma que espera `ChipsFiltro`. */
export const OPCIONES_VISIBILIDAD: { clave: Visibilidad; etiqueta: string }[] = [
  { clave: "todos", etiqueta: "Todos los estudiantes" },
  { clave: "amigos", etiqueta: "Solo mis amigos" },
];

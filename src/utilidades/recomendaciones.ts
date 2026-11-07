/**
 * ============================================================================
 * utilidades/recomendaciones.ts — "Encontrá compañeros"
 * ============================================================================
 *
 * QUÉ ES:
 *   Dos funciones puras que, dado el listado de estudiantes y las materias que
 *   yo cursé, calculan con quién comparto más materias.
 *
 * QUIÉN LO USA:
 *   - app/(tabs)/conectar.tsx   → lista de compañeros recomendados
 *   - app/perfil.tsx            → lista de amigos con materias en común
 *
 * TEORÍA:
 *   [JS 7] spread y [JS 8] map/filter. [JS 9] funciones puras: no modifican los
 *   datos que reciben, devuelven objetos NUEVOS.
 */

// `import type`: solo se importa el TIPO `Estudiante` (no existe en la app ya
// compilada, solo lo usa TypeScript para verificar).
import type { Estudiante } from "@/datos/comunidad";

// `Estudiante & { enComun: string[] }` es una INTERSECCIÓN de tipos: una
// Recomendacion es un Estudiante (con todas sus propiedades) MÁS el campo
// `enComun`, la lista de materias que compartimos.
export type Recomendacion = Estudiante & {
  /** Materias que el compañero comparte con el estudiante. */
  enComun: string[];
};

/**
 * Cruza las materias de cada compañero con las del estudiante y los ordena de
 * más a menos en común. Función pura: arma objetos nuevos, no toca los originales.
 */
// Recibe la lista de estudiantes y los códigos de MIS materias
// (por ejemplo ["MAT-201", "CS-302"]) y devuelve la lista de Recomendacion.
export function cruzarMaterias(
  estudiantes: Estudiante[],
  misMaterias: string[]
): Recomendacion[] {
  return estudiantes
    // `map` transforma cada elemento en otro: acá, cada estudiante en un objeto
    // NUEVO. `...estudiante` (spread [JS 7]) copia todas sus propiedades y
    // después se agrega `enComun`. El estudiante original queda intacto.
    .map((estudiante) => ({
      ...estudiante,
      // `filter` conserva solo las materias del compañero que TAMBIÉN están
      // en mi lista (`includes` responde si un array contiene un valor).
      enComun: estudiante.materias.filter((materia) =>
        misMaterias.includes(materia)
      ),
    }))
    // `sort` ordena. La función recibe dos elementos (a, b): si devuelve un
    // número positivo, `b` va antes. `b.enComun.length - a.enComun.length`
    // pone primero al que comparte MÁS materias (orden descendente).
    // Se llama después de `map` porque `sort` MODIFICA el array sobre el que
    // se ejecuta: así ordena la copia nueva que creó `map`, no la lista original.
    .sort((a, b) => b.enComun.length - a.enComun.length);
}

/** Candidatos para "Encontrá compañeros": los que todavía no son amigos. */
// Igual que la anterior, pero antes descarta a los que ya son amigos
// (`!==` = "distinto de"). Reutiliza `cruzarMaterias` en lugar de repetir la lógica.
export function recomendar(
  estudiantes: Estudiante[],
  misMaterias: string[]
): Recomendacion[] {
  return cruzarMaterias(
    estudiantes.filter((estudiante) => estudiante.relacion !== "amigos"),
    misMaterias
  );
}

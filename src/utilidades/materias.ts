/**
 * ============================================================================
 * utilidades/materias.ts — La lógica de las materias (funciones puras)
 * ============================================================================
 *
 * QUÉ ES:
 *   Todo lo que se DECIDE o se CALCULA con las materias, sin dibujar nada:
 *     1. En qué año y cuatrimestre cae una materia.
 *     2. Si se puede cargar algo rendido y qué va a pasar con la materia.
 *     3. El promedio del estudiante, a partir de las notas de los finales.
 *     4. Los totales de la carrera (aprobadas, créditos, finales).
 *     5. Qué materias se están cursando.
 *   El ESTADO de cada materia lo calcula el backend (`resolverMateria` en
 *   `backend/src/reglas.ts`): primero las CORRELATIVAS ("bloqueada" hasta aprobar la
 *   cursada de las que pide; después "disponible") y la marca «arrancó la cursada»
 *   (disponible → en curso). Una vez en curso, recorre el historial con estas reglas:
 *
 * LAS REGLAS (el historial se recorre de lo más viejo a lo más nuevo):
 *   Se arranca "en curso" y cada cosa rendida puede mover el estado:
 *     - Parcial, recuperatorio, TP o exposición APROBADO (4 o más) y marcado
 *       "Terminé de cursar"                 → cursando        → pendienteFinal
 *     - Final APROBADO (4 o más)            → pendienteFinal  → aprobada (con esa nota)
 *     - Recuperatorio o final DESAPROBADO y
 *       el estudiante eligió "Recursar"     → vuelve a cursando, con un intento nuevo
 *     - Cualquier otra cosa (un parcial con 7 sin terminar la cursada, un final con 2
 *       si "aún puede rendirlo") queda en el historial pero NO cambia el estado.
 *
 * QUÉ SE PUEDE CARGAR (`validarInstancia`):
 *   - Lo de la CURSADA (parcial, recuperatorio, TP, exposición): solo si la
 *     materia está "en curso".
 *   - El FINAL: solo si está "pendiente de final" (con la cursada aprobada).
 *   - Nada si está bloqueada, disponible (primero hay que arrancar la cursada) o ya
 *     aprobada.
 *   - La nota va de 1 a 10 y la fecha no puede ser futura ni anterior a lo último
 *     que se cargó de esa materia (así el historial queda siempre en orden).
 *
 * POR QUÉ SON FUNCIONES PURAS Y NO VIVEN EN UNA PANTALLA:
 *   Las usan varias pantallas (Inicio, Plan, Perfil, el detalle de la materia, el
 *   formulario "Rendí") y el Context. Al ser puras, dan siempre el mismo
 *   resultado para los mismos datos y se pueden probar sueltas.
 *   El backend tiene las mismas reglas (`backend/src/reglas.ts`): la app avisa
 *   ANTES de mandar (y muestra qué va a pasar), y el servidor vuelve a validar
 *   todo, porque nunca se confía solo en el cliente.
 *
 * TEORÍA:
 *   [JS 9]  Función pura: mismo input → mismo output; no modifican lo que reciben.
 *   [JS 8]  `filter`, `map` y `reduce` ("reduce: n entradas → 1 resultado").
 *   [JS 25] Estado derivado: el estado, el promedio, los totales y las materias en
 *           curso se CALCULAN a partir de los datos; nunca se guardan aparte.
 */
// Solo los TIPOS: no traen código.
import type {
  BorradorInstancia,
  EstadoMateria,
  Materia,
  MateriaDelPlan,
  TipoInstancia,
} from "@/datos/carrera";
import { aTextoFecha, claveFecha } from "@/utilidades/fechas";

// ---------------------------------------------------------------------------
// AÑO Y CUATRIMESTRE
// ---------------------------------------------------------------------------

// Cómo se llama cada año. Con el índice como posición: NOMBRES_ANIO[0] es "Primer".
const NOMBRES_ANIO = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto"];

/** El año de la carrera al que pertenece un cuatrimestre: 1º y 2º → 1; 3º y 4º → 2. */
// `Math.ceil` redondea hacia arriba: 1 / 2 = 0,5 → 1; 3 / 2 = 1,5 → 2.
export function anioDe(cuatrimestre: number): number {
  return Math.ceil(cuatrimestre / 2);
}

/** Si es el 1º o el 2º cuatrimestre DE SU AÑO: el cuatrimestre 3 es el 1º del segundo año. */
// `%` es el resto de la división: los impares (1, 3, 5...) son el primero del año.
export function cuatrimestreDelAnio(cuatrimestre: number): 1 | 2 {
  return cuatrimestre % 2 === 1 ? 1 : 2;
}

/** "Primer año", "Segundo año"... (y "6º año" si hubiera más de cinco). */
export function nombreDelAnio(anio: number): string {
  // `??` usa el segundo valor si el primero es `undefined` (no hay nombre).
  return `${NOMBRES_ANIO[anio - 1] ?? `${anio}º`} año`;
}

/** "Primer año · 2º cuatrimestre": dónde cae una materia en el plan. */
export function etiquetaPeriodo(materia: MateriaDelPlan): string {
  return `${nombreDelAnio(anioDe(materia.cuatrimestre))} · ${cuatrimestreDelAnio(
    materia.cuatrimestre
  )}º cuatrimestre`;
}

// ---------------------------------------------------------------------------
// NOTAS
// ---------------------------------------------------------------------------

/** Las notas van de 1 a 10; con 4 o más está aprobado. */
// (`export const`: otras pantallas las importan, por ejemplo para escribir "1 a 10".)
export const NOTA_MINIMA = 1;
export const NOTA_APROBACION = 4;
export const NOTA_MAXIMA = 10;

/** Valida la nota que se escribió: un entero de 1 a 10. Devuelve el error o `null`. */
export function validarNota(texto: string): string | null {
  // `trim()` saca los espacios de los extremos; si no queda nada, no escribió nada.
  if (texto.trim().length === 0) return "Cargá la nota.";
  // `Number("abc")` da `NaN`; `Number.isInteger` descarta `NaN` y los decimales.
  const nota = Number(texto);
  if (!Number.isInteger(nota) || nota < NOTA_MINIMA || nota > NOTA_MAXIMA) {
    return `La nota va de ${NOTA_MINIMA} a ${NOTA_MAXIMA}, sin decimales.`;
  }
  return null;
}

/** ¿Con esta nota se aprueba? (4 o más). */
export const aprobo = (nota: number) => nota >= NOTA_APROBACION;

/** ¿Es algo de la cursada? Todo menos el final. */
export const esDeCursada = (tipo: TipoInstancia) => tipo !== "final";

/** ¿Después de desaprobarlo se puede elegir "Recursar la materia"? */
// Solo después de un recuperatorio (ya no queda otra oportunidad en la cursada) o
// de un final (si se quedó sin fechas para volver a rendirlo).
export const permiteRecursar = (tipo: TipoInstancia) =>
  tipo === "recuperatorio" || tipo === "final";

/** En qué estado tiene que estar la materia para cargar ese tipo de instancia. */
export function estadoNecesario(tipo: TipoInstancia): EstadoMateria {
  return tipo === "final" ? "pendienteFinal" : "cursando";
}

// ---------------------------------------------------------------------------
// LO QUE SE RINDE: QUÉ SE PUEDE CARGAR Y QUÉ VA A PASAR
// ---------------------------------------------------------------------------

// Las reglas del recorrido (las aplica el SERVIDOR, `backend/src/reglas.ts`):
// se arranca "en curso" y cada cosa rendida puede mover el estado (ver la
// cabecera). Acá quedan las que la app necesita ANTES de mandar algo: qué
// materias se ofrecen, si se puede cargar y qué va a pasar.

/** Las materias en las que se puede cargar ese tipo de instancia. */
// Lo de la cursada, en las que están "en curso"; el final, en las pendientes.
export function materiasPara(tipo: TipoInstancia, materias: Materia[]): Materia[] {
  return materias.filter((materia) => materia.estado === estadoNecesario(tipo));
}

/**
 * ¿Se puede cargar esta instancia en esta materia? Devuelve el MOTIVO por el que
 * no (un texto para mostrar) o `null` si se puede. `hoy` se puede pasar para probar.
 */
export function validarInstancia(
  materia: Materia,
  borrador: BorradorInstancia,
  hoy = new Date()
): string | null {
  // Las reglas se miran en orden y la primera que aplica corta con `return`.
  if (materia.estado === "bloqueada") {
    return "Esta materia está bloqueada: todavía no la podés cursar.";
  }
  if (materia.estado === "disponible") {
    return "Primero tenés que arrancar la cursada de esta materia.";
  }
  if (materia.estado === "aprobada") {
    return "Ya aprobaste esta materia: no hay nada más para cargar.";
  }
  if (materia.estado !== estadoNecesario(borrador.tipo)) {
    return borrador.tipo === "final"
      ? "Para cargar el final primero tenés que terminar la cursada: cargá tu último parcial, TP o exposición y marcá «Terminé de cursar»."
      : "La cursada de esta materia ya terminó: lo que te queda es el final.";
  }

  // La nota: `String(8)` la pasa a texto, que es lo que valida `validarNota`.
  const errorNota = validarNota(String(borrador.nota));
  if (errorNota) return errorNota;

  // La fecha: no puede ser futura (se carga lo que YA se rindió). Las claves
  // "AAAA-MM-DD" se comparan como texto (ver `utilidades/fechas.ts`).
  if (borrador.fecha > claveFecha(hoy)) {
    return "La fecha no puede ser futura: cargá lo que ya rendiste.";
  }
  // Ni anterior a lo último que se cargó de esta materia: el historial queda en orden.
  // `at(-1)` es el ÚLTIMO elemento del array (o `undefined` si está vacío).
  const ultima = materia.historial.at(-1)?.instancia.fecha;
  if (ultima && borrador.fecha < ultima) {
    return `No puede ser anterior a lo último que cargaste de esta materia (${aTextoFecha(ultima)}).`;
  }

  const aprobada = aprobo(borrador.nota);
  if (borrador.cierraCursada && (!esDeCursada(borrador.tipo) || !aprobada)) {
    return "Con menos de 4 no se aprueba la cursada.";
  }
  if (borrador.recursa && (!permiteRecursar(borrador.tipo) || aprobada)) {
    return "Solo se recursa después de desaprobar un recuperatorio o un final.";
  }
  return null;
}

/**
 * Qué le va a pasar a la materia si se guarda esta instancia, en una frase. La
 * muestra el formulario "Rendí" ANTES de guardar, para que no haya sorpresas.
 */
export function consecuencia(materia: Materia, borrador: BorradorInstancia): string {
  const aprobada = aprobo(borrador.nota);

  if (borrador.tipo === "final") {
    if (aprobada) {
      return `Aprobás ${materia.nombre} con ${borrador.nota}: pasa a «Aprobada» y la nota cuenta para tu promedio.`;
    }
    return borrador.recursa
      ? "Perdés la cursada: la materia vuelve a «En curso» para que la recurses. Todo lo rendido queda en el historial."
      : "Queda en el historial y la materia sigue «Pendiente de final»: podés volver a rendirlo.";
  }

  // Desde acá, algo de la cursada.
  if (aprobada && borrador.cierraCursada) {
    return "Terminás la cursada: la materia pasa a «Pendiente de final» y sus clases dejan de aparecer en la agenda.";
  }
  if (!aprobada && borrador.recursa) {
    return `Empezás la cursada de nuevo (intento ${materia.intento + 1}). Lo rendido hasta ahora queda en el historial.`;
  }
  if (!aprobada && borrador.tipo !== "recuperatorio") {
    return "Queda en el historial y la materia sigue «En curso». Si tenés recuperatorio, cargalo cuando lo rindas.";
  }
  return "Queda en el historial y la materia sigue «En curso».";
}

// ---------------------------------------------------------------------------
// PROMEDIO Y TOTALES
// ---------------------------------------------------------------------------

/**
 * El promedio de las notas de los finales de las materias APROBADAS, o `null` si
 * todavía no hay ninguna.
 */
export function promedioDe(materias: Materia[]): number | null {
  // 1) `filter`: solo las aprobadas.  2) `map`: de cada una, su nota (que puede
  // faltar: `number | undefined`).  3) `filter` con un "type guard" (`nota is
  // number`): le avisa a TypeScript que ya no quedan `undefined`.
  const notas = materias
    .filter((materia) => materia.estado === "aprobada")
    .map((materia) => materia.notaFinal)
    .filter((nota): nota is number => nota !== undefined);
  return promedioDeNotas(notas);
}

/** El promedio de una lista de notas, o `null` si está vacía. */
export function promedioDeNotas(notas: number[]): number | null {
  if (notas.length === 0) return null;
  // `reduce` suma todas las notas (empieza en 0) y se divide por la cantidad.
  return notas.reduce((total, nota) => total + nota, 0) / notas.length;
}

// Suma los créditos de una lista de materias [JS 8] "reduce: n entradas → 1 resultado".
const sumarCreditos = (lista: Materia[]) =>
  lista.reduce((total, materia) => total + materia.creditos, 0);

/** Los totales de la carrera, calculados a partir de las materias actuales. */
export function resumenCarrera(materias: Materia[]) {
  // Dos sublistas con `filter` (cada una es un array NUEVO; `materias` no se toca).
  const aprobadas = materias.filter((materia) => materia.estado === "aprobada");
  const pendientes = materias.filter(
    (materia) => materia.estado === "pendienteFinal"
  );

  // Devuelve un OBJETO con todas las cifras de una vez. Cada pantalla toma las que
  // necesita: `resumen.materiasAprobadas`, `resumen.creditosObtenidos`...
  return {
    materiasTotales: materias.length,
    materiasAprobadas: aprobadas.length,
    creditosObtenidos: sumarCreditos(aprobadas),
    creditosTotales: sumarCreditos(materias),
    // Cada materia aprobada tiene su final aprobado.
    finalesAprobados: aprobadas.length,
    finalesPendientes: pendientes.length,
  };
}

/** Los nombres de las correlativas que todavía no cumplo: "Cálculo Elemental, Informática General". */
export function correlativasFaltantes(materia: Materia): string[] {
  return materia.correlativas
    .filter((correlativa) => !correlativa.cumplida)
    .map((correlativa) => correlativa.nombre);
}

/** Los códigos de las materias que se están cursando, por ejemplo ["MAT-201", "CS-302"]. */
// Sirve para saber qué materias comparto con otros compañeros. Una materia
// pendiente de final YA NO cuenta: la cursada terminó.
export function codigosEnCurso(materias: Materia[]): string[] {
  return materias
    .filter((materia) => materia.estado === "cursando")
    .map((materia) => materia.id);
}

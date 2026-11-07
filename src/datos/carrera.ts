/**
 * ============================================================================
 * datos/carrera.ts — Tipos del plan de estudios y del historial académico
 * ============================================================================
 *
 * QUÉ ES:
 *   La FORMA de los datos de la carrera: una materia del plan, lo que se rinde
 *   (parciales, recuperatorios, TP, exposiciones y finales) y una materia tal
 *   como la usan las pantallas. Más los textos de cada estado y de cada tipo.
 *
 * DE DÓNDE SALEN LOS DATOS:
 *   Del BACKEND (`GET /api/materias`). Los datos de ejemplo (las 10 materias y el
 *   historial de la demo) ahora viven en `backend/src/semilla.ts`.
 *
 * LA IDEA CENTRAL — EL ESTADO NO SE ELIGE, SE DEDUCE:
 *   Cada materia guarda SU HISTORIAL (lo que el estudiante rindió, presentó o
 *   expuso) y el estado se CALCULA (`backend/src/reglas.ts` en el servidor) con las
 *   CORRELATIVIDADES, si el estudiante arrancó la cursada y ese historial:
 *
 *     bloqueada ──(aprobó la CURSADA de todas sus correlativas)──▶ disponible
 *     disponible ──(toca "Arrancar la cursada")──▶ cursando
 *     cursando ──(toca "Abandonar cursada")──▶ disponible      (solo mientras cursa)
 *     cursando ──(último parcial / TP / exposición aprobado + "terminé de cursar")──▶ pendienteFinal
 *     pendienteFinal ──(final con 4 o más)──▶ aprobada (con esa nota)
 *     cursando o pendienteFinal ──(desaprobó un recuperatorio o un final y eligió
 *                                  "Recursar la materia")──▶ cursando (intento nuevo)
 *
 *   "Cursada aprobada" es estar en pendienteFinal o aprobada: eso desbloquea las
 *   materias que la piden como correlativa, sin esperar al final.
 *   Así nunca puede quedar un estado que no coincida con lo que pasó de verdad.
 *
 * TEORÍA:
 *   [JS 3]  Tipos de TypeScript para describir los datos.
 *   [JS 25] Estado derivado: el estado de la materia se calcula, no se guarda.
 *   [PRÁCTICA 03] El modelo es un CONTRATO: estos tipos coinciden con lo que
 *           devuelve la API.
 */

// ---------------------------------------------------------------------------
// TIPOS (la "forma" de los datos; no generan código, solo los verifica TypeScript)
// ---------------------------------------------------------------------------

// Los cinco estados posibles de una materia (ver arriba).
export type EstadoMateria =
  | "bloqueada"
  | "disponible"
  | "cursando"
  | "pendienteFinal"
  | "aprobada";

// Las cuatro solapas de "Apuntes y recursos" en el detalle de una materia:
// los recursos OFICIALES, los apuntes públicos de la COMUNIDAD, los apuntes de MIS
// AMIGOS y MIS APUNTES.
export type CategoriaRecurso = "oficiales" | "comunidad" | "amigos" | "misApuntes";

// Un recurso descargable de una materia (un PDF, un documento...). Los de la
// comunidad y los de mis amigos no son recursos: son apuntes de estudiantes (`Apunte`).
export type Recurso = {
  id: string; // único: el código de la materia + un número ("MAT-101-1")
  nombre: string;
  formato: string; // "PDF", "DOCX"...
  peso: string; // "1.1 MB"
  categoria: CategoriaRecurso; // en qué solapa aparece
};

/** Una correlativa de una materia y si ya la cumplo (tengo su cursada aprobada). */
export type Correlativa = {
  id: string; // código de la materia que se pide
  nombre: string;
  cumplida: boolean;
};

/** Lo que NO cambia de una materia: es igual para todos los estudiantes. */
export type MateriaDelPlan = {
  id: string; // código de la materia, por ejemplo "MAT-201"
  nombre: string;
  /**
   * Número de cuatrimestre DE LA CARRERA, de 1 a 10: el 1º y el 2º son del primer
   * año, el 3º y el 4º del segundo, etc. (`anioDe` en `utilidades/materias.ts`).
   */
  cuatrimestre: number;
  creditos: number;
  profesor: string;
  /**
   * 0 a 5: el promedio de las reseñas de los estudiantes que la cursan. Se recalcula
   * en el servidor cada vez que se pide la materia. Mientras `resenias` sea 0, es la
   * estimación inicial del plan.
   */
  dificultad: number;
  /** Cuántas reseñas hay (las de quienes la están cursando o la cursaron). */
  resenias: number;
  recursos: Recurso[]; // los recursos oficiales (puede estar vacía)
  /** Las materias cuya cursada hay que tener aprobada para poder cursar esta. */
  correlativas: Correlativa[];
};

// Las cinco cosas que se pueden rendir, presentar o exponer. Las cuatro primeras
// son de la CURSADA; el final es lo que viene después.
export type TipoInstancia =
  | "parcial"
  | "recuperatorio"
  | "tp"
  | "exposicion"
  | "final";

/** Una cosa rendida: un registro del historial de una materia. */
export type Instancia = {
  id: string;
  materiaId: string; // de qué materia es
  tipo: TipoInstancia;
  /** De 1 a 10, sin decimales. Con 4 o más está aprobada. */
  nota: number;
  /** Cuándo se rindió, en formato `AAAA-MM-DD`. */
  fecha: string;
  /**
   * Solo en las de cursada: con esta instancia (aprobada) se terminó de cursar.
   * Es lo que pasa la materia a "pendiente de final".
   */
  cierraCursada?: boolean;
  /**
   * Solo en un recuperatorio o un final DESAPROBADO: el estudiante eligió
   * "Recursar la materia". La materia vuelve a "en curso" con un intento nuevo.
   */
  recursa?: boolean;
};

/** Lo que hay que mandar para registrar una instancia: todo menos el `id`. */
// `Omit<T, "id">` = el tipo T SIN el campo `id` (el id lo genera quien guarda).
export type BorradorInstancia = Omit<Instancia, "id">;

/**
 * Qué provocó una instancia al recorrer el historial (para mostrarlo en
 * pantalla): cerrar la cursada, aprobar la materia, empezar a recursarla o nada.
 */
export type EfectoInstancia = "cierraCursada" | "aprueba" | "recursa" | null;

/** Un paso del historial ya interpretado: la instancia, en qué cursada cayó y qué provocó. */
export type PasoHistorial = {
  instancia: Instancia;
  /** 1 = la primera vez que se cursa; 2 = la segunda (después de recursar)... */
  intento: number;
  efecto: EfectoInstancia;
};

/**
 * Una materia como la ven las pantallas: la del plan MÁS lo que se deduce de su
 * historial. `&` es una INTERSECCIÓN de tipos: tiene todo lo de `MateriaDelPlan`
 * y además estos campos.
 */
export type Materia = MateriaDelPlan & {
  // En qué estado ESTÁ la materia. Se calcula con el historial (no se elige).
  estado: EstadoMateria;
  /** Nota del final, de 4 a 10. Solo las materias aprobadas la tienen. */
  // El `?` hace el campo OPCIONAL: puede faltar (las que no están aprobadas no tienen).
  notaFinal?: number;
  /** El día en que se terminó de cursar (`AAAA-MM-DD`): desde ahí no hay más clases. */
  finCursada?: string;
  /** En qué cursada va (1 = la primera; sube cada vez que se recursa). */
  intento: number;
  /** Todo lo rendido, en el orden en que se cargó, con el efecto de cada cosa. */
  historial: PasoHistorial[];
  /** MI reseña de dificultad (1 a 5 estrellas), si ya dejé una. */
  miResenia?: number;
};

// ---------------------------------------------------------------------------
// LA CARRERA Y LOS TEXTOS
// ---------------------------------------------------------------------------

// El nombre de la carrera y de la universidad (la app es, por ahora, de una sola
// carrera). Los TOTALES (materias aprobadas, créditos...) no están escritos: se
// calculan con `resumenCarrera` (`utilidades/materias.ts`) a partir de las materias.
export const carrera = {
  nombre: "Ingeniería en Informática",
  universidad: "UCA · Buenos Aires",
};

// Cómo se escribe cada estado en pantalla ("pendienteFinal" → "Pendiente de final").
// `Record<EstadoMateria, string>` obliga a escribir UNA etiqueta por cada estado:
// si se agrega un estado y falta acá, TypeScript avisa.
export const etiquetasEstado: Record<EstadoMateria, string> = {
  bloqueada: "Bloqueada",
  disponible: "Disponible",
  cursando: "En curso",
  pendienteFinal: "Pendiente de final",
  aprobada: "Aprobada",
};

// Cómo se escribe cada cosa rendida ("tp" → "Trabajo práctico").
export const etiquetasInstancia: Record<TipoInstancia, string> = {
  parcial: "Parcial",
  recuperatorio: "Recuperatorio",
  tp: "Trabajo práctico",
  exposicion: "Exposición",
  final: "Final",
};

// Nombre de cada solapa de recursos.
export const etiquetasCategoria: Record<CategoriaRecurso, string> = {
  oficiales: "Oficiales",
  comunidad: "Comunidad",
  amigos: "De mis amigos",
  misApuntes: "Mis apuntes",
};

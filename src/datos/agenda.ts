/**
 * ============================================================================
 * datos/agenda.ts — Tipos de la agenda y los eventos de ejemplo
 * ============================================================================
 *
 * QUÉ ES:
 *   La DEFINICIÓN de qué es un evento (sus campos y sus tipos posibles),
 *   incluida su REPETICIÓN (cada cuánto se repite y hasta cuándo). Los eventos
 *   vienen del backend (`GET /api/eventos`); los de ejemplo están en
 *   `backend/src/semilla.ts`.
 *
 * LA IDEA DE LA REPETICIÓN — UN EVENTO, MUCHAS FECHAS:
 *   Un evento que se repite se guarda UNA sola vez, con su regla: la primera
 *   fecha, la frecuencia ("cada semana"), los días (lunes y miércoles) y hasta
 *   cuándo. Las fechas concretas ("ocurrencias") se CALCULAN cuando hacen falta
 *   (`utilidades/repeticion.ts`): así editar la clase cambia todas las semanas de
 *   una vez, y borrar un solo día es agregarlo a `excepciones`.
 *
 * LAS CLASES SE REPITEN SOLAS:
 *   Al cargar una CLASE, la frecuencia queda fija en "cada semana" hasta el fin
 *   del cuatrimestre. Y si se aprueba la cursada de su materia antes, las clases
 *   dejan de aparecer desde ese día (eso lo calcula `repeticion.ts`).
 *
 * DE DÓNDE SE USA:
 *   Inicio, Agenda, el detalle y el formulario de eventos, las notificaciones y
 *   el Context de datos.
 *
 * TEORÍA:
 *   [JS 11] Módulos: el archivo "exporta" (`export`) lo que otros necesitan y
 *   los demás lo "importan".
 */
// Los cuatro tipos de evento posibles. Es una UNIÓN de textos literales: una
// variable de este tipo solo puede valer exactamente uno de ellos.
// "estudio" es una juntada para estudiar con amigos (ver "Estudiar juntos").
export type TipoEvento = "clase" | "parcial" | "entrega" | "estudio";

// Cada cuánto se repite un evento. "nunca" = es de un solo día.
export type Frecuencia = "nunca" | "diaria" | "semanal" | "quincenal" | "mensual";

/** Un amigo invitado a una juntada de estudio, con su respuesta. */
export type Invitado = {
  id: string;
  nombre: string;
  respuesta: "pendiente" | "aceptada" | "rechazada";
};

// La "forma" de un evento. Un `type` no genera código: solo le dice a
// TypeScript qué propiedades debe tener el objeto.
export type Evento = {
  id: string; // identificador único: "ev-1", "ev-1727640000000"...
  titulo: string;
  /** Código de materia, cuando el evento pertenece a una. */
  // El `?` significa OPCIONAL: puede faltar (no todos los eventos tienen materia).
  materiaId?: string;
  /** La PRIMERA fecha del evento, en formato `AAAA-MM-DD` (hora local). */
  fecha: string;
  desde: string; // hora de inicio "HH:MM"
  hasta: string; // hora de fin "HH:MM"
  lugar: string;
  tipo: TipoEvento;
  notas?: string; // opcional

  // ----- La repetición -----
  frecuencia: Frecuencia;
  /**
   * Los días de la semana en que se repite (0 = domingo ... 6 = sábado), para
   * "cada semana" y "cada 2 semanas". Si falta, se usa el día de `fecha`.
   */
  dias?: number[];
  /** Última fecha en que se repite (`AAAA-MM-DD`, incluida). Sin valor: siempre. */
  repetirHasta?: string;
  /** Fechas sueltas que se borraron de la serie ("eliminar solo este día"). */
  excepciones: string[];

  // ----- Estudiar juntos -----
  /** En una juntada de estudio MÍA: a qué amigos invité y qué respondieron. */
  invitados?: Invitado[];
  /** Si el evento lo organiza otro estudiante (me invitó y acepté). */
  organizador?: { id: string; nombre: string; invitacionId: string };
};

/**
 * Lo que completa el formulario: el evento sin lo que se genera solo (el id, las
 * excepciones, los invitados con su respuesta y el organizador) y, en su lugar,
 * los ids de los amigos a invitar.
 */
export type BorradorEvento = Omit<
  Evento,
  "id" | "excepciones" | "invitados" | "organizador"
> & { invitadosIds: string[] };

// Cómo se escribe cada tipo en pantalla ("clase" → "Clase").
// `Record<TipoEvento, string>` = un objeto con una entrada por cada tipo.
export const etiquetasTipo: Record<TipoEvento, string> = {
  clase: "Clase",
  parcial: "Parcial",
  entrega: "Entrega",
  estudio: "Estudio",
};

// Cómo se escribe cada frecuencia en el formulario.
export const etiquetasFrecuencia: Record<Frecuencia, string> = {
  nunca: "No se repite",
  diaria: "Todos los días",
  semanal: "Cada semana",
  quincenal: "Cada 2 semanas",
  mensual: "Cada mes",
};


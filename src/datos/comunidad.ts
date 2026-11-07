/**
 * ============================================================================
 * datos/comunidad.ts — Compañeros, sus apuntes, sus notas y los links oficiales
 * ============================================================================
 *
 * QUÉ ES:
 *   La FORMA de los datos de la pestaña "Conectar" y de los perfiles: otro
 *   estudiante (con mi relación con él y su privacidad), su perfil completo, un
 *   apunte y un link oficial. Vienen del backend (`/api/estudiantes`,
 *   `/api/apuntes`, `/api/links`); los de ejemplo están en `backend/src/semilla.ts`.
 *
 * LOS CUATRO ESTADOS DE AMISTAD (`Relacion`):
 *   - "amigos"   → botón "Amigos"   (en los datos de ejemplo: Mariana)
 *   - "enviada"  → botón "Enviada"  (le mandé una solicitud: David)
 *   - "recibida" → botón "Aceptar"  (ME mandó una solicitud: Tomás)
 *   - "ninguna"  → botón "Agregar"  (Elena)
 *
 * LA PRIVACIDAD — CADA UNO ELIGE QUIÉN VE SUS APUNTES Y SUS NOTAS:
 *   Cada estudiante decide, por separado, si sus APUNTES y sus NOTAS los ve
 *   "todos" los estudiantes o "solo sus amigos" (`Privacidad`). El perfil de otro
 *   muestra cada sección solo si se puede; si no, un candado. La regla se aplica
 *   en el SERVIDOR: lo que no se puede ver ni siquiera viaja al teléfono.
 *
 * TEORÍA:
 *   [JS 3] Tipos de TypeScript para describir los datos.
 */

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

/** Quién puede ver algo: cualquier estudiante, o solo los amigos. */
export type Visibilidad = "todos" | "amigos";

/** Lo que cada estudiante elige compartir (se cambia en "Mi perfil"). */
export type Privacidad = {
  apuntes: Visibilidad;
  notas: Visibilidad;
};

/** Mi relación con otro estudiante. */
export type Relacion = "amigos" | "enviada" | "recibida" | "ninguna";

// La "forma" de otro estudiante, tal como lo veo yo.
export type Estudiante = {
  id: string;
  nombre: string;
  /** La dirección completa de su foto de perfil, si tiene (si no, se ven sus iniciales). */
  foto?: string;
  cuatrimestre: number;
  /** Códigos de las materias que está cursando. */
  materias: string[];
  /** Cantidad de amigos que tiene él, no en común conmigo. */
  amigos: number;
  /** Qué somos: amigos, solicitud enviada, solicitud recibida o nada. */
  relacion: Relacion;
  privacidad: Privacidad;
};

/** Qué tipo de archivo es un apunte: decide cómo se previsualiza. */
export type FormatoApunte = "pdf" | "imagen";

/** Un apunte: una foto o un PDF, con título y descripción, asociado a una materia. */
export type Apunte = {
  id: string;
  /** Quién lo subió (el id de un estudiante, o el mío). */
  autorId: string;
  /** Su nombre (viene en los apuntes de la comunidad y de mis amigos). */
  autorNombre?: string;
  materiaId: string; // a qué materia pertenece
  titulo: string;
  /** Lo que escribió el autor para explicar de qué trata (opcional). */
  descripcion?: string;
  /** Cuándo se subió (`AAAA-MM-DD`). */
  fecha: string;
  /** La dirección completa del archivo en el servidor. */
  uri?: string;
  /** Foto o PDF. */
  formato?: FormatoApunte;
};

/** Los apuntes de otros estudiantes de una materia: los públicos y los de mis amigos. */
export type ApuntesDeMateria = {
  comunidad: Apunte[];
  amigos: Apunte[];
};

/**
 * El perfil completo de otro estudiante. Sus notas y sus apuntes vienen con
 * `visible: false` (y sin contenido) si su privacidad no me deja verlos.
 */
export type PerfilEstudiante = Estudiante & {
  notas: {
    visible: boolean;
    promedio: number | null;
    /** Las materias que aprobó, con la nota del final. */
    aprobadas: { materiaId: string; nota: number }[];
  };
  apuntes: {
    visible: boolean;
    /** Cuántos subió (se informa aunque no se puedan ver). */
    cantidad: number;
    lista: Apunte[];
  };
};

// ---------------------------------------------------------------------------
// LOS LINKS OFICIALES
// ---------------------------------------------------------------------------

// Los tipos de link posibles (determinan el ícono que se muestra).
export type TipoLink = "discord" | "whatsapp" | "campus" | "web" | "repositorio";

// La "forma" de un link oficial.
export type LinkOficial = {
  id: string;
  materiaId: string; // a qué materia pertenece
  titulo: string;
  detalle: string;
  url: string;
  tipo: TipoLink;
};

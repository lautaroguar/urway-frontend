/**
 * ============================================================================
 * datos/notificaciones.ts — Los avisos que le llegan al estudiante
 * ============================================================================
 *
 * QUÉ ES:
 *   La forma de una notificación. Las crea el BACKEND cuando pasa algo (un amigo
 *   sube un apunte, alguien manda una solicitud o una invitación...) y la app las
 *   pide (`GET /api/notificaciones`, y otra vez cada 20 segundos). Se marcan como
 *   leídas al abrir la pantalla, y las de amistad y de estudio se pueden responder
 *   (Aceptar / Rechazar) desde la misma lista.
 *
 * LOS CUATRO TIPOS:
 *   - "apunte"     → un amigo subió un apunte nuevo (lleva al perfil, filtrado por
 *                    la materia del apunte).
 *   - "amistad"    → una solicitud recibida (con Aceptar / Rechazar) o aceptada.
 *   - "estudio"    → una invitación a estudiar (con Aceptar / Rechazar) o su respuesta.
 *   - "calendario" → un aviso de la agenda.
 *   Además, la pantalla calcula sola los RECORDATORIOS de los próximos días (los
 *   parciales y entregas que se acercan): esos no se guardan, se derivan de la agenda.
 *
 * QUIÉN LO USA:
 *   El Context de datos y `app/notificaciones.tsx`.
 */
// `import type`: solo se importa el tipo de evento (clase | parcial | entrega | estudio).
import type { TipoEvento } from "@/datos/agenda";

// La "forma" de una notificación.
export type Notificacion = {
  id: string;
  tipo: "calendario" | "amistad" | "apunte" | "estudio";
  /** Solo en las de calendario: decide el color y el ícono. */
  tipoEvento?: TipoEvento; // opcional: las demás no lo tienen
  titulo: string;
  detalle: string;
  /** Cuándo llegó (fecha y hora en formato ISO, "2026-10-24T09:00:00.000Z"). */
  creadaEn: string;
  leida: boolean; // false = aparece en "Nuevas"; true = en "Anteriores"
  /** De quién se trata (quien subió el apunte, quien invitó...): abre su perfil. */
  estudianteId?: string;
  /** La materia relacionada (filtra los apuntes del perfil). */
  materiaId?: string;
  /** Una solicitud de amistad o una invitación todavía SIN responder. */
  pendiente?: { clase: "solicitud" | "invitacion"; id: string };
  /** Cómo se respondió (después de tocar Aceptar o Rechazar). */
  respuesta?: "aceptada" | "rechazada";
};

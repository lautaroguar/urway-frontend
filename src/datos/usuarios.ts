/**
 * ============================================================================
 * datos/usuarios.ts — Quién es el usuario: el tipo de una cuenta
 * ============================================================================
 *
 * QUÉ ES:
 *   La forma de un USUARIO de la app (`Usuario`), tal como la devuelve el
 *   backend (`/api/auth/ingreso` y `/api/yo`).
 *
 * DE DÓNDE SALE:
 *   Del servidor, al iniciar sesión. La app guarda una copia en el teléfono
 *   (AsyncStorage) para abrirse rápido; ver `estado/sesion.tsx`.
 *
 * QUÉ NO ESTÁ ACÁ:
 *   La contraseña. Nunca vuelve del servidor (él guarda solo su hash) y tampoco
 *   se guarda en el teléfono.
 *
 * TEORÍA:
 *   [JS 3] Objetos y tipos de TypeScript para describir los datos.
 *   [PRÁCTICA 03] El modelo es un contrato: la base, la API y la app usan los
 *   mismos nombres de campos.
 */
// Lo que cada estudiante elige compartir con los demás (apuntes y notas).
import type { Privacidad } from "@/datos/comunidad";

/** Un usuario de la app. `facultad` y `carrera` son CLAVES de `datos/registro.ts`. */
export type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  /** Clave de la opción elegida en "¿A qué facultad vas?" (por ejemplo "uca"). */
  facultad: string;
  /** Clave de la opción elegida en "¿Qué carrera cursás?" (por ejemplo "informatica"). */
  carrera: string;
  /** En qué cuatrimestre de la carrera va (1 a 10). */
  cuatrimestre: number;
  dni?: string;
  /** `DD/MM/AAAA`. */
  fechaNacimiento?: string;
  /** La dirección completa de mi foto de perfil, si tengo (si no, se ven mis iniciales). */
  foto?: string;
  /** Quién ve mis apuntes y mis notas: todos o solo mis amigos (se cambia en el perfil). */
  privacidad: Privacidad;
};

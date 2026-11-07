/**
 * ============================================================================
 * utilidades/usuario.ts — Cómo se escribe el nombre de un usuario
 * ============================================================================
 *
 * QUÉ ES:
 *   Dos funciones puras para mostrar el nombre del usuario en distintos lugares:
 *   el saludo de Inicio usa solo el primer nombre y el perfil y el avatar usan el
 *   nombre completo. Aceptan `null` (cuando no hay sesión) y devuelven "".
 *
 * TEORÍA:
 *   [JS 9] Función pura.
 *   [JS 8] `split` y `trim` sobre textos.
 */
// Solo el TIPO de una cuenta (nombre, apellido, correo...): no trae código.
import type { Usuario } from "@/datos/usuarios";

/** "María José" "Pérez" → "María José Pérez". */
// `Usuario | null`: o hay un usuario o no hay sesión. El ternario `cond ? A : B`
// devuelve el nombre armado con una plantilla (`${...}` inserta valores en el
// texto) o un texto vacío si no hay usuario.
export function nombreCompleto(usuario: Usuario | null): string {
  return usuario ? `${usuario.nombre} ${usuario.apellido}` : "";
}

/** "María José" → "María". Para el saludo: "Hola, María". */
export function primerNombre(usuario: Usuario | null): string {
  // `split(" ")[0]` es la primera palabra del nombre: `trim()` saca los espacios
  // de los extremos, `split(" ")` corta en cada espacio y `[0]` toma el primer pedazo.
  return usuario ? usuario.nombre.trim().split(" ")[0] : "";
}

/**
 * ============================================================================
 * utilidades/archivos.ts — Leer un archivo del teléfono para mandarlo al servidor
 * ============================================================================
 *
 * QUÉ ES:
 *   Lo que hace falta para subir un apunte o una foto de perfil: pasar el contenido
 *   de un archivo a texto base64 (la forma de escribir bytes con letras, que sí
 *   viaja dentro del JSON) y saber cuánto pesa.
 *
 * CÓMO SE LEE UN ARCHIVO:
 *   El selector de archivos y la galería dan una `uri` (la ruta del archivo en el
 *   teléfono, o un `blob:` en la web). `fetch(uri)` la lee como cualquier pedido, y
 *   `FileReader.readAsDataURL` convierte ese contenido en un texto
 *   "data:application/pdf;base64,JVBERi0x...". Funciona igual en iOS, Android y web,
 *   sin librerías extra. El servidor le saca el prefijo "data:...;base64,".
 *
 * TEORÍA:
 *   [JS 14] `async/await` y `Promise` (el `FileReader` avisa con eventos, no con
 *           promesas: se lo envuelve en una).
 */

/** El máximo que acepta el servidor: 8 MB (`backend/src/archivos.ts`). */
export const MAXIMO_BYTES = 8 * 1024 * 1024;

/** Lee el archivo de esa `uri` y devuelve su contenido como texto base64 (con prefijo "data:"). */
export async function leerComoBase64(uri: string): Promise<string> {
  const respuesta = await fetch(uri);
  const contenido = await respuesta.blob();
  // `FileReader` trabaja con eventos: una promesa los vuelve esperables con `await`.
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onloadend = () =>
      typeof lector.result === "string"
        ? resolver(lector.result)
        : rechazar(new Error("No se pudo leer el archivo."));
    lector.onerror = () => rechazar(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(contenido);
  });
}

/**
 * Cuánto pesa un archivo, a partir de su texto base64: 3 bytes se escriben con 4
 * letras, así que los bytes son el 75 % del largo (menos el prefijo "data:...,").
 */
export function bytesDeBase64(base64: string): number {
  const datos = base64.replace(/^data:[^,]*,/, "");
  return Math.floor((datos.length * 3) / 4);
}

/** "1.2 MB", "340 KB". */
export function tamanioLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

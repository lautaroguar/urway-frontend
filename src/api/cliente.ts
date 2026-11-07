/**
 * ============================================================================
 * api/cliente.ts — Cómo habla la app con el backend (fetch + JSON)
 * ============================================================================
 *
 * QUÉ ES:
 *   La única función que hace `fetch` en toda la app (`pedir`). Las demás
 *   (`api/urway.ts`) la usan para cada ruta de la API. Se ocupa de:
 *     1. Armar la URL con la dirección del servidor (`API_URL`).
 *     2. Mandar el cuerpo como JSON y el token de la sesión en el header
 *        `Authorization: Bearer <token>`.
 *     3. Si la respuesta no es `ok`, leer el `{ error }` que manda Express y
 *        lanzarlo como `ErrorApi` (con el status), así el mensaje del servidor
 *        llega hasta la pantalla.
 *     4. Si ni siquiera hay respuesta (servidor apagado, sin red), lanzar un
 *        error claro con status 0.
 *
 * LA DIRECCIÓN DEL SERVIDOR (se decide sola, en este orden):
 *   1. Si el archivo `.env` define `EXPO_PUBLIC_API_URL`, se usa esa. (Expo reemplaza
 *      `process.env.EXPO_PUBLIC_...` por su valor al armar la app: solo esas
 *      variables, y escritas así, con punto.)
 *   2. Si no, se DETECTA: Expo sabe en qué dirección está sirviendo la app
 *      (`Constants.expoConfig.hostUri`, por ejemplo "192.168.1.25:8081"). Esa es la IP
 *      de la PC en la red, así que el backend (puerto 3000) está en la misma IP. Por
 *      eso en el celular con Expo Go funciona sin tocar nada, aunque la IP cambie.
 *   3. Si tampoco hay `hostUri`, `http://localhost:3000`.
 *   Para que la detección automática funcione, la línea de `.env` tiene que estar
 *   comentada o borrada (con un valor, manda el valor).
 *
 * TEORÍA:
 *   [PRÁCTICA 15] `fetch` con `method`, `headers` y `body: JSON.stringify(...)`;
 *                 "la primera deuda a pagar": mostrar el error del backend.
 *   [PRÁCTICA 13] Un 204 no tiene cuerpo: no se llama a `response.json()`.
 *   [JS 14]       `async/await` + `try/catch`.
 *   [JS 12]       Errores propios con `class ... extends Error`.
 */
import Constants from "expo-constants";

// La IP (sin el puerto) desde la que Expo sirve la app: "192.168.1.25:8081" → "192.168.1.25".
const hostAuto = Constants.expoConfig?.hostUri?.split(":")[0];

const direccion =
  process.env.EXPO_PUBLIC_API_URL ??
  (hostAuto ? `http://${hostAuto}:3000` : "http://localhost:3000");

/** La dirección del backend, sin la barra del final ("http://...:3000/" → "...:3000"). */
export const API_URL = direccion.replace(/\/+$/, "");

/** Un error que vino del servidor (o de no poder llegar a él, con `estado` 0). */
export class ErrorApi extends Error {
  /** El status HTTP (401, 404...), o 0 si no se pudo llegar al servidor. */
  estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje); // el mensaje queda en `this.message`, como en cualquier Error
    this.estado = estado;
  }
}

type Opciones = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  token?: string | null;
};

/**
 * Hace el pedido a la API y devuelve el JSON de la respuesta (`T` es su tipo).
 * Si algo sale mal, lanza `ErrorApi` con el mensaje para mostrar.
 */
export async function pedir<T>(ruta: string, { metodo = "GET", cuerpo, token }: Opciones = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json", // cómo interpretar el cuerpo
        // El token solo si hay sesión (spread de un objeto vacío = no agrega nada).
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // `JSON.stringify` convierte el objeto en texto apto para viajar por HTTP.
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    // `fetch` solo falla así cuando no llegó al servidor.
    throw new ErrorApi(
      "No se pudo conectar con el servidor. Revisá que el backend esté prendido y la dirección en el archivo .env.",
      0
    );
  }

  // 204 No Content: salió bien y no hay cuerpo que leer.
  if (respuesta.status === 204) return undefined as T;

  // Se intenta leer el JSON (si viniera vacío o roto, queda `null`).
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(datos?.error ?? `Error ${respuesta.status} del servidor.`, respuesta.status);
  }
  return datos as T;
}

/** Una ruta de archivo del servidor ("/uploads/x.jpg") → su dirección completa. */
export function urlDeArchivo(ruta: string | undefined): string | undefined {
  return ruta ? `${API_URL}${ruta}` : undefined;
}

/** El mensaje para mostrar de cualquier error. */
export function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : "Algo salió mal.";
}

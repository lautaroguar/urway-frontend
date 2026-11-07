/**
 * ============================================================================
 * utilidades/claves.ts — Guarda, lee y borra el TOKEN de la sesión
 * ============================================================================
 *
 * QUÉ ES:
 *   Tres funciones para el token que da el backend al iniciar sesión. Con ese
 *   token la app demuestra quién es en cada pedido (`Authorization: Bearer ...`)
 *   y, al reabrirla, no hay que volver a ingresar.
 *
 * QUÉ CAMBIÓ CON EL BACKEND:
 *   Antes (sprint 1, sin servidor) acá se guardaba la CONTRASEÑA de cada cuenta,
 *   porque la validación se hacía en el teléfono. Ahora la contraseña no se
 *   guarda en el teléfono en ningún lado: viaja una sola vez al ingresar y el
 *   servidor guarda solo su hash. Lo que queda en el teléfono es el token, que se
 *   puede invalidar cerrando sesión (y vence a los 30 días).
 *
 * POR QUÉ SECURESTORE Y NO ASYNCSTORAGE:
 *   El token es un dato sensible (quien lo tenga entra como vos). La teoría lo
 *   dice: para eso "no uses AsyncStorage: va `expo-secure-store`, que lo guarda
 *   cifrado" (Keychain en iOS, Keystore en Android).
 *
 * LA EXCEPCIÓN: LA WEB
 *   `expo-secure-store` no existe en la web, y la app se abre ahí solo para
 *   desarrollar. En la web el token va a AsyncStorage (el `localStorage` del
 *   navegador), SIN cifrar. Es aceptable para probar; no para producción.
 *
 * TEORÍA:
 *   [ALM]   AsyncStorage (`setItem`, `getItem`, `removeItem`) y la advertencia
 *           sobre datos sensibles. (ALM = "Almacenamiento Local".)
 *   [JS 14] `async/await`: leer y guardar en disco son operaciones que tardan.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Las claves de SecureStore solo pueden tener letras, números, ".", "-" y "_".
const CLAVE_TOKEN = "urway-token";

// En la web no hay SecureStore (ver arriba).
const esWeb = Platform.OS === "web";

/** Guarda el token de la sesión. */
export async function guardarToken(token: string): Promise<void> {
  if (esWeb) return AsyncStorage.setItem(CLAVE_TOKEN, token);
  return SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

/** Lee el token guardado, o `null` si no hay sesión. */
export async function leerToken(): Promise<string | null> {
  if (esWeb) return AsyncStorage.getItem(CLAVE_TOKEN);
  return SecureStore.getItemAsync(CLAVE_TOKEN);
}

/** Borra el token (al cerrar sesión o si el servidor dice que venció). */
export async function borrarToken(): Promise<void> {
  if (esWeb) return AsyncStorage.removeItem(CLAVE_TOKEN);
  return SecureStore.deleteItemAsync(CLAVE_TOKEN);
}

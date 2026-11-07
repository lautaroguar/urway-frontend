/**
 * ============================================================================
 * estado/sesion.tsx — El Context de la SESIÓN: quién está adentro
 * ============================================================================
 *
 * QUÉ ES:
 *   El "almacén" de quién inició sesión. Con el backend, la cuenta vive en el
 *   SERVIDOR; en el teléfono quedan solo dos cosas:
 *     1. El TOKEN de la sesión, cifrado (SecureStore, ver `utilidades/claves.ts`).
 *     2. Una COPIA del perfil (nombre, correo, privacidad...) en AsyncStorage,
 *        para mostrar la app enseguida al abrirla, sin esperar a la red. No es
 *        un dato sensible: no tiene contraseña ni token.
 *
 * CÓMO SE AUTENTICA:
 *   - Registro: `POST /api/auth/registro`. NO inicia sesión (como antes, vuelve
 *     al login con el aviso "Cuenta creada").
 *   - Ingreso: `POST /api/auth/ingreso` con correo y contraseña. El servidor
 *     compara con el hash guardado y, si coinciden, devuelve un token.
 *   - Salida: `POST /api/auth/salida` (el servidor borra la sesión) y se borra
 *     el token del teléfono.
 *   Ya no hay "cuenta de demostración que entra con cualquier correo": para
 *   probar están los usuarios de ejemplo del backend (contraseña `urway2026`).
 *
 * EL PATRÓN DE ASYNCSTORAGE (de la teoría, en cuatro pasos):
 *   1. Al montar el Provider se LEE lo guardado (token y copia del perfil).
 *   2. Recién cuando terminó de leer, `listo` pasa a `true`.
 *   3. Con sesión, se le pregunta al servidor los datos actualizados (`/api/yo`);
 *      si responde 401 (la sesión venció), se cierra la sesión.
 *   4. Mientras `listo` es `false` no se dibuja nada (`return null`).
 *
 * TEORÍA:
 *   [ALM]   AsyncStorage y SecureStore; el patrón con `listo` (`isHydrated`).
 *   [CTX]   Context con `createContext<T | undefined>`, Provider con el `value`
 *           memoizado con `useMemo` y un hook propio con `throw`.
 *   [JS 26] `useEffect` para sincronizar con sistemas externos (disco y red).
 *   [JS 14] `async/await` y `try/catch`.
 *   [PRÁCTICA 15] La app pide y el servidor decide: la contraseña se valida allá.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ErrorApi } from "@/api/cliente";
import * as api from "@/api/urway";
import type { Privacidad } from "@/datos/comunidad";
import type { Usuario } from "@/datos/usuarios";
import { borrarToken, guardarToken, leerToken } from "@/utilidades/claves";

// Los datos del registro (el tipo vive junto a la función que los manda).
export type { DatosRegistro } from "@/api/urway";

// La clave de la copia del perfil en AsyncStorage.
const CLAVE_USUARIO = "urway-usuario";

/** Cómo terminó el intento de iniciar sesión. */
export type ResultadoIngreso = "ok" | "credencialesIncorrectas";

// PASO 1 — El contrato: qué viaja por el canal [CTX].
type ValorSesion = {
  /** Quien tiene la sesión iniciada, o `null` si no hay sesión. */
  usuario: Usuario | null;
  /** El token para hablar con el backend (lo usa `estado/datos.tsx`). */
  token: string | null;
  /** Crea la cuenta en el servidor. Si falla, lanza el error (por ejemplo, 409). */
  registrar: (datos: api.DatosRegistro) => Promise<void>;
  /** Inicia sesión. Si no hay conexión, lanza el error. */
  iniciarSesion: (email: string, contrasenia: string) => Promise<ResultadoIngreso>;
  /** Cierra la sesión (en el servidor y en el teléfono). */
  cerrarSesion: () => Promise<void>;
  /** Cambia quién ve mis apuntes y mis notas. */
  cambiarPrivacidad: (privacidad: Privacidad) => Promise<void>;
  /**
   * Guarda los cambios de mi perfil (datos y/o foto). Hace falta la contraseña
   * actual: si no es correcta, el servidor responde 403 y se lanza el error.
   */
  editarPerfil: (cambios: api.CambiosPerfil) => Promise<void>;
  /** Lo llama `estado/datos.tsx` si el servidor dice 401: la sesión venció. */
  sesionVencida: () => void;
};

// PASO 2 — El canal.
const ContextoSesion = createContext<ValorSesion | undefined>(undefined);

/** Guarda y ofrece la sesión. Va en la raíz de la app. */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  // PASO 3 — El estado real vive acá.
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  // Olvida la sesión en el teléfono (token y copia del perfil).
  const olvidar = () => {
    setToken(null);
    setUsuario(null);
    borrarToken().catch(() => {});
    AsyncStorage.removeItem(CLAVE_USUARIO).catch(() => {});
  };

  // [ALM 1 y 2] AL MONTAR: se lee el token y la copia del perfil.
  useEffect(() => {
    Promise.all([leerToken(), AsyncStorage.getItem(CLAVE_USUARIO)])
      .then(([guardado, perfil]) => {
        if (guardado && perfil) {
          setToken(guardado);
          setUsuario(JSON.parse(perfil));
        }
      })
      .catch(() => {}) // si falla la lectura, se arranca sin sesión
      .finally(() => setListo(true));
  }, []);

  // [ALM 3] Con sesión, se piden los datos actualizados al servidor. Si la sesión
  // venció (401), se cierra. Si no hay red, se sigue con la copia guardada.
  useEffect(() => {
    if (!token) return;
    api
      .obtenerYo(token)
      .then((actual) => {
        setUsuario(actual);
        AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(actual)).catch(() => {});
      })
      .catch((error) => {
        if (error instanceof ErrorApi && error.estado === 401) olvidar();
      });
  }, [token]);

  // PASO 4 — Las acciones.

  const registrar = async (datos: api.DatosRegistro) => {
    await api.registrarse(datos); // si falla, el error sigue hasta la pantalla
  };

  const iniciarSesion = async (email: string, contrasenia: string): Promise<ResultadoIngreso> => {
    try {
      const respuesta = await api.ingresar(email, contrasenia);
      // Primero se guarda (token cifrado y copia del perfil) y después se usa.
      await guardarToken(respuesta.token);
      await AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(respuesta.usuario));
      setToken(respuesta.token);
      setUsuario(respuesta.usuario);
      return "ok";
    } catch (error) {
      // 401 = correo o contraseña incorrectos. Cualquier otro error (sin red), se lanza.
      if (error instanceof ErrorApi && error.estado === 401) return "credencialesIncorrectas";
      throw error;
    }
  };

  const cerrarSesion = async () => {
    // Se avisa al servidor (si falla, no importa: igual se olvida en el teléfono).
    if (token) await api.salir(token).catch(() => {});
    olvidar();
  };

  const cambiarPrivacidad = async (privacidad: Privacidad) => {
    if (!token) return;
    const actual = await api.guardarPrivacidad(token, privacidad);
    setUsuario(actual);
    AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(actual)).catch(() => {});
  };

  const editarPerfil = async (cambios: api.CambiosPerfil) => {
    if (!token) return;
    // Si la contraseña está mal, el servidor responde 403 y el error sigue hasta la
    // pantalla (que lo muestra). No es un 401, así que no cierra la sesión.
    const actual = await api.editarPerfil(token, cambios);
    setUsuario(actual);
    AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(actual)).catch(() => {});
  };

  // El `value` va MEMOIZADO [CTX]: se recalcula solo si cambia la sesión.
  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      token,
      registrar,
      iniciarSesion,
      cerrarSesion,
      cambiarPrivacidad,
      editarPerfil,
      sesionVencida: olvidar,
    }),
    [usuario, token]
  );

  // [ALM 4] Hasta terminar de leer el disco no se dibuja nada.
  if (!listo) return null;

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

// PASO 5 — El hook propio [CTX].
export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) {
    throw new Error("useSesion tiene que usarse dentro de <ProveedorSesion>");
  }
  return valor;
}

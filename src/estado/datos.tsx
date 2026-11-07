/**
 * ============================================================================
 * estado/datos.tsx — El Context de los datos (conectado al backend)
 * ============================================================================
 *
 * QUÉ ES:
 *   El "almacén" de los datos que necesitan varias pantallas a la vez:
 *     1. las MATERIAS con su estado e HISTORIAL (lo rendido),
 *     2. los EVENTOS de la agenda,
 *     3. los COMPAÑEROS (con la relación conmigo) y el perfil de cada uno,
 *     4. MIS APUNTES (y el apunte que se está preparando para subir),
 *     5. las NOTIFICACIONES,
 *     6. los links oficiales y las novedades.
 *   Todo viene del BACKEND (`api/urway.ts`): la app ya no tiene datos propios,
 *   muestra lo que está guardado de verdad en la base.
 *
 * CÓMO FUNCIONA:
 *   - Al iniciar sesión (cambia el `token`), un `useEffect` pide TODO junto
 *     (`Promise.all`). Al cerrarla, se vacía.
 *   - Cada acción (cargar un parcial, crear un evento...) hace su pedido y
 *     después VUELVE A PEDIR la lista que cambió, en vez de modificarla a mano:
 *     así la pantalla muestra lo que quedó guardado de verdad. [PRÁCTICA 15:
 *     "loadPeople() vuelve a preguntar en vez de asumir"]
 *   - Cada 20 segundos se vuelven a pedir las notificaciones: así llegan los
 *     avisos que generan otros (un amigo que subió un apunte).
 *   - Si el servidor responde 401 (la sesión venció), se cierra la sesión.
 *   - SUBIR UN APUNTE tiene dos pasos: al elegir el archivo (o sacar la foto) queda
 *     como BORRADOR en memoria (`borradorApunte`); recién cuando el estudiante le pone
 *     título y toca «Confirmar» (`confirmarApunte`) viaja al servidor. Así no llegan
 *     archivos de más a `uploads/` ni hay que borrar los que se subieron sin querer.
 *
 * LAS PANTALLAS NO CAMBIARON:
 *   El "contrato" del Context (`ValorContexto`) es el mismo que en el sprint 1,
 *   cuando los datos vivían en memoria: las acciones ya eran `async`. Por eso
 *   conectar el backend fue cambiar ESTE archivo, no las pantallas.
 *
 * TEORÍA:
 *   [JS 29] Context; [CTX] `value` memoizado con `useMemo`.
 *   [JS 26] `useEffect` para sincronizar con un sistema externo (el servidor),
 *           con LIMPIEZA: un flag `activo` y `clearInterval`.
 *   [JS 14] `async/await`, `try/catch` y `throw`.
 *   [PRÁCTICA 10] "FlatList no consulta la base: lee el estado".
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ErrorApi, mensajeDe } from "@/api/cliente";
import * as api from "@/api/urway";
import type { BorradorEvento, Evento } from "@/datos/agenda";
import type { BorradorInstancia, Materia } from "@/datos/carrera";
import type {
  Apunte,
  ApuntesDeMateria,
  Estudiante,
  LinkOficial,
  PerfilEstudiante,
} from "@/datos/comunidad";
import type { Notificacion } from "@/datos/notificaciones";
import type { Novedad } from "@/datos/novedades";
import { useSesion } from "@/estado/sesion";
import { validarInstancia } from "@/utilidades/materias";

/**
 * Un apunte que se eligió (archivo, foto de la galería o foto de la cámara) y todavía
 * NO se subió: espera que se le ponga título y se confirme.
 */
export type BorradorApunte = {
  materiaId: string;
  /** Dónde está el archivo en el teléfono: sirve para la vista previa. */
  uri: string;
  /** El contenido, como texto base64 (con prefijo "data:...;base64," o sin él). */
  base64: string;
  /** El nombre del archivo ("Resumen.pdf"), para mostrarlo. */
  nombre: string;
  esPdf: boolean;
};

// Cada cuánto se vuelven a pedir las notificaciones (en milisegundos).
const CADA_CUANTO_NOTIFICACIONES = 20000;

// PASO 1 — Todo lo que el contexto ofrece a las pantallas.
type ValorContexto = {
  /** `true` cuando terminó la primera carga después de iniciar sesión. */
  listo: boolean;
  /** El error de la última carga completa (por ejemplo, el servidor apagado). */
  error: string | null;
  /** Vuelve a pedir todo al servidor (tirar para actualizar, "Reintentar"). */
  recargar: () => Promise<void>;

  // ----- Materias -----
  materias: Materia[];
  /** Vuelve a pedir SOLO las materias (así se recalcula, por ejemplo, la dificultad). */
  recargarMaterias: () => Promise<void>;
  registrarInstancia: (borrador: BorradorInstancia) => Promise<void>;
  deshacerUltimaInstancia: (materiaId: string) => Promise<void>;
  /** «Arrancar la cursada» de una materia disponible. */
  arrancarCursada: (materiaId: string) => Promise<void>;
  /** «Abandonar cursada»: vuelve a quedar disponible y se borra mi reseña. */
  abandonarCursada: (materiaId: string) => Promise<void>;
  /** Deja mi reseña de dificultad (1 a 5 estrellas) o cambia la que ya tenía. */
  guardarResenia: (materiaId: string, estrellas: number) => Promise<void>;
  /** Los apuntes de otros estudiantes de la materia: los públicos y los de mis amigos. */
  cargarApuntesDeMateria: (materiaId: string) => Promise<ApuntesDeMateria>;

  // ----- Agenda -----
  eventos: Evento[];
  agregarEvento: (borrador: BorradorEvento) => Promise<void>;
  editarEvento: (id: string, borrador: BorradorEvento) => Promise<void>;
  eliminarEvento: (id: string) => Promise<void>;
  omitirFecha: (id: string, fecha: string) => Promise<void>;

  // ----- Comunidad -----
  estudiantes: Estudiante[];
  alternarSolicitud: (estudianteId: string) => Promise<void>;
  responderSolicitud: (estudianteId: string, acepta: boolean) => Promise<void>;
  cargarPerfil: (estudianteId: string) => Promise<PerfilEstudiante | null>;
  links: LinkOficial[];
  novedades: Novedad[];

  // ----- Mis apuntes -----
  apuntes: Apunte[];
  /** El apunte elegido que espera título y confirmación (o `null`). */
  borradorApunte: BorradorApunte | null;
  /** Deja un apunte como borrador; la pantalla «Nuevo apunte» lo muestra. */
  prepararApunte: (borrador: BorradorApunte) => void;
  /** Tira el borrador sin subir nada. */
  descartarApunte: () => void;
  /** Sube el borrador con su título y descripción (recién ahora viaja al servidor). */
  confirmarApunte: (titulo: string, descripcion: string) => Promise<void>;
  eliminarApunte: (id: string) => Promise<void>;

  // ----- Notificaciones -----
  notificaciones: Notificacion[];
  marcarLeidas: () => Promise<void>;
  responderInvitacion: (invitacionId: string, acepta: boolean) => Promise<void>;
};

// PASO 2 — El contexto.
const ContextoDatos = createContext<ValorContexto | null>(null);

// PASO 3 — El proveedor.
export function ProveedorDatos({ children }: { children: ReactNode }) {
  const { token, sesionVencida } = useSesion();

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [apuntes, setApuntes] = useState<Apunte[]>([]);
  const [borradorApunte, setBorradorApunte] = useState<BorradorApunte | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [links, setLinks] = useState<LinkOficial[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Hace un pedido con el token de la sesión. Si el servidor dice 401, la sesión
   * venció: se cierra (y la pantalla vuelve al login). El error sigue de largo
   * para que quien llamó pueda mostrarlo.
   */
  const conToken = async <T,>(pedido: (token: string) => Promise<T>): Promise<T> => {
    if (!token) throw new Error("No hay una sesión iniciada.");
    try {
      return await pedido(token);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 401) sesionVencida();
      throw e;
    }
  };

  // Una función por lista: pide y guarda en el estado.
  const recargarMaterias = async () => setMaterias(await conToken(api.obtenerMaterias));
  const recargarEventos = async () => setEventos(await conToken(api.obtenerEventos));
  const recargarEstudiantes = async () => setEstudiantes(await conToken(api.obtenerEstudiantes));
  const recargarApuntes = async () => setApuntes(await conToken(api.obtenerApuntes));
  const recargarNotificaciones = async () =>
    setNotificaciones(await conToken(api.obtenerNotificaciones));

  /** Pide TODO junto. `sigueActivo` evita guardar respuestas viejas (ver el efecto). */
  const cargarTodo = async (sigueActivo: () => boolean) => {
    setError(null);
    try {
      // `Promise.all`: los siete pedidos salen a la vez y se espera a todos.
      const [m, e, est, ap, no, li, nov] = await Promise.all([
        conToken(api.obtenerMaterias),
        conToken(api.obtenerEventos),
        conToken(api.obtenerEstudiantes),
        conToken(api.obtenerApuntes),
        conToken(api.obtenerNotificaciones),
        conToken(api.obtenerLinks),
        conToken(api.obtenerNovedades),
      ]);
      if (!sigueActivo()) return;
      setMaterias(m);
      setEventos(e);
      setEstudiantes(est);
      setApuntes(ap);
      setNotificaciones(no);
      setLinks(li);
      setNovedades(nov);
      setListo(true);
    } catch (e) {
      if (sigueActivo()) setError(mensajeDe(e));
    }
  };

  // [JS 26] Al iniciar sesión se carga todo; al cerrarla, se vacía. Si el token
  // cambia antes de que lleguen las respuestas, la limpieza (`activo = false`)
  // hace que se descarten: nunca se mezclan datos de dos cuentas.
  useEffect(() => {
    let activo = true;
    if (!token) {
      setMaterias([]);
      setEventos([]);
      setEstudiantes([]);
      setApuntes([]);
      setBorradorApunte(null);
      setNotificaciones([]);
      setListo(false);
      setError(null);
      return;
    }
    cargarTodo(() => activo);
    return () => {
      activo = false;
    };
  }, [token]);

  // [JS 26] Cada 20 segundos, las notificaciones. `clearInterval` en la limpieza:
  // al cerrar sesión deja de preguntar.
  useEffect(() => {
    if (!token) return;
    const intervalo = setInterval(() => {
      recargarNotificaciones().catch(() => {}); // si falla, se reintenta en 20 s
    }, CADA_CUANTO_NOTIFICACIONES);
    return () => clearInterval(intervalo);
  }, [token]);

  // PASO 4 — Las acciones: el pedido y, después, volver a pedir lo que cambió.

  const registrarInstancia = async (borrador: BorradorInstancia) => {
    // Primera defensa, en el teléfono (el servidor vuelve a validar).
    const materia = materias.find((m) => m.id === borrador.materiaId);
    if (!materia) throw new Error("No encontramos esa materia.");
    const motivo = validarInstancia(materia, borrador);
    if (motivo) throw new Error(motivo);
    await conToken((t) => api.cargarInstancia(t, borrador));
    await recargarMaterias();
  };

  const deshacerUltimaInstancia = async (materiaId: string) => {
    await conToken((t) => api.deshacerInstancia(t, materiaId));
    await recargarMaterias();
  };

  // Arrancar, abandonar y reseñar cambian el estado o la dificultad de la materia:
  // después se vuelven a pedir las materias (el servidor es el que sabe cómo quedó).
  const arrancarCursada = async (materiaId: string) => {
    await conToken((t) => api.arrancarCursada(t, materiaId));
    await recargarMaterias();
  };

  const abandonarCursada = async (materiaId: string) => {
    await conToken((t) => api.abandonarCursada(t, materiaId));
    await recargarMaterias();
  };

  const guardarResenia = async (materiaId: string, estrellas: number) => {
    await conToken((t) => api.guardarResenia(t, materiaId, estrellas));
    await recargarMaterias();
  };

  const cargarApuntesDeMateria = (materiaId: string) =>
    conToken((t) => api.obtenerApuntesDeMateria(t, materiaId));

  const agregarEvento = async (borrador: BorradorEvento) => {
    await conToken((t) => api.crearEvento(t, borrador));
    await recargarEventos();
  };

  const editarEvento = async (id: string, borrador: BorradorEvento) => {
    await conToken((t) => api.editarEvento(t, id, borrador));
    await recargarEventos();
  };

  const eliminarEvento = async (id: string) => {
    await conToken((t) => api.borrarEvento(t, id));
    await recargarEventos();
  };

  const omitirFecha = async (id: string, fecha: string) => {
    await conToken((t) => api.borrarFecha(t, id, fecha));
    await recargarEventos();
  };

  // Manda la solicitud o, si ya estaba enviada, la retira.
  const alternarSolicitud = async (estudianteId: string) => {
    const persona = estudiantes.find((e) => e.id === estudianteId);
    if (persona?.relacion === "enviada") {
      await conToken((t) => api.retirarSolicitud(t, estudianteId));
    } else {
      await conToken((t) => api.mandarSolicitud(t, estudianteId));
    }
    await recargarEstudiantes();
  };

  const responderSolicitud = async (estudianteId: string, acepta: boolean) => {
    await conToken((t) => api.responderSolicitud(t, estudianteId, acepta));
    await Promise.all([recargarEstudiantes(), recargarNotificaciones()]);
  };

  const cargarPerfil = (estudianteId: string) =>
    conToken((t) => api.obtenerPerfil(t, estudianteId));

  // Los apuntes se suben en DOS pasos: elegir (queda de borrador) y confirmar.
  const prepararApunte = (borrador: BorradorApunte) => setBorradorApunte(borrador);
  const descartarApunte = () => setBorradorApunte(null);

  const confirmarApunte = async (titulo: string, descripcion: string) => {
    if (!borradorApunte) throw new Error("No hay ningún apunte para subir.");
    await conToken((t) =>
      api.subirApunte(t, {
        materiaId: borradorApunte.materiaId,
        archivo: borradorApunte.base64,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
      })
    );
    setBorradorApunte(null); // ya se subió: el borrador sobra
    await recargarApuntes();
  };

  const eliminarApunte = async (id: string) => {
    await conToken((t) => api.borrarApunte(t, id));
    await recargarApuntes();
  };

  const marcarLeidas = async () => {
    await conToken(api.marcarLeidas);
    await recargarNotificaciones();
  };

  const responderInvitacion = async (invitacionId: string, acepta: boolean) => {
    await conToken((t) => api.responderInvitacion(t, invitacionId, acepta));
    await Promise.all([recargarEventos(), recargarNotificaciones()]);
  };

  const recargar = () => cargarTodo(() => true);

  // El `value` va MEMOIZADO [CTX]: se recalcula solo si cambian los datos.
  const valor = useMemo<ValorContexto>(
    () => ({
      listo,
      error,
      recargar,
      materias,
      recargarMaterias,
      registrarInstancia,
      deshacerUltimaInstancia,
      arrancarCursada,
      abandonarCursada,
      guardarResenia,
      cargarApuntesDeMateria,
      eventos,
      agregarEvento,
      editarEvento,
      eliminarEvento,
      omitirFecha,
      estudiantes,
      alternarSolicitud,
      responderSolicitud,
      cargarPerfil,
      links,
      novedades,
      apuntes,
      borradorApunte,
      prepararApunte,
      descartarApunte,
      confirmarApunte,
      eliminarApunte,
      notificaciones,
      marcarLeidas,
      responderInvitacion,
    }),
    [
      listo,
      error,
      materias,
      eventos,
      estudiantes,
      apuntes,
      borradorApunte,
      notificaciones,
      links,
      novedades,
      token,
    ]
  );

  return <ContextoDatos.Provider value={valor}>{children}</ContextoDatos.Provider>;
}

// PASO 5 — El hook para leer el contexto.
export function useDatos(): ValorContexto {
  const valor = useContext(ContextoDatos);
  if (!valor) {
    throw new Error("useDatos tiene que usarse dentro de <ProveedorDatos>");
  }
  return valor;
}

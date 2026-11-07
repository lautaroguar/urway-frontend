/**
 * ============================================================================
 * api/urway.ts — Una función por cada ruta de la API de urway
 * ============================================================================
 *
 * QUÉ ES:
 *   El "control remoto" del backend: cada función hace UN pedido (con `pedir`,
 *   de `api/cliente.ts`) y devuelve los datos con los TIPOS de la app. Las
 *   pantallas no llaman a estas funciones directamente: las usan los Context
 *   (`estado/sesion.tsx` y `estado/datos.tsx`).
 *
 * EL CONTRATO:
 *   Los nombres de los campos son los mismos en la base, en la API y en los tipos
 *   de la app (`datos/*.ts`). Por eso acá casi no hay conversiones: solo los
 *   archivos (apuntes y fotos de perfil), que llegan como ruta ("/uploads/x.jpg") y
 *   se completan con la dirección del servidor para que `<Image>` los pueda mostrar.
 *
 * TEORÍA:
 *   [PRÁCTICA 05] El verbo es parte del significado: GET lee, POST crea, PATCH
 *                 cambia una parte, DELETE elimina.
 *   [JS 11]       Módulos: se exportan funciones chicas y con nombre claro.
 */
import { pedir, urlDeArchivo } from "@/api/cliente";
import type { BorradorEvento, Evento } from "@/datos/agenda";
import type { BorradorInstancia, Materia } from "@/datos/carrera";
import type {
  Apunte,
  ApuntesDeMateria,
  Estudiante,
  LinkOficial,
  PerfilEstudiante,
  Privacidad,
  Relacion,
} from "@/datos/comunidad";
import type { Notificacion } from "@/datos/notificaciones";
import type { Novedad } from "@/datos/novedades";
import type { Usuario } from "@/datos/usuarios";

/** Lo que pide el registro para crear la cuenta. */
export type DatosRegistro = {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  dni: string;
  email: string;
  contrasenia: string;
  facultad: string;
  carrera: string;
};

/**
 * Lo que se puede cambiar en "Editar perfil". Todo es opcional (solo viaja lo que
 * cambió), salvo la contraseña actual, que se pide siempre para guardar.
 */
export type CambiosPerfil = {
  contrasenia: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  fechaNacimiento?: string;
  /** La foto nueva, como texto base64. */
  foto?: string;
  /** `true` para dejar la cuenta sin foto. */
  quitarFoto?: boolean;
};

/** Lo que se manda al confirmar un apunte nuevo. */
export type DatosApunte = {
  materiaId: string;
  /** El contenido del archivo (foto o PDF) como texto base64. */
  archivo: string;
  titulo: string;
  descripcion?: string;
};

// Un archivo del servidor (apunte o foto) con su dirección completa (o sin archivo).
const conUrl = (apunte: Apunte): Apunte => ({ ...apunte, uri: urlDeArchivo(apunte.uri) });
const conFoto = <T extends { foto?: string }>(persona: T): T => ({
  ...persona,
  foto: urlDeArchivo(persona.foto),
});

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

export const registrarse = (datos: DatosRegistro) =>
  pedir<{ usuario: Usuario }>("/api/auth/registro", { metodo: "POST", cuerpo: datos });

export const ingresar = async (email: string, contrasenia: string) => {
  const respuesta = await pedir<{ token: string; usuario: Usuario }>("/api/auth/ingreso", {
    metodo: "POST",
    cuerpo: { email, contrasenia },
  });
  return { ...respuesta, usuario: conFoto(respuesta.usuario) };
};

export const salir = (token: string) => pedir<void>("/api/auth/salida", { metodo: "POST", token });

export const obtenerYo = async (token: string) => conFoto(await pedir<Usuario>("/api/yo", { token }));

export const guardarPrivacidad = async (token: string, privacidad: Privacidad) =>
  conFoto(await pedir<Usuario>("/api/yo", { metodo: "PATCH", token, cuerpo: { privacidad } }));

/** Guarda los cambios del perfil (datos y/o foto). El servidor exige la contraseña. */
export const editarPerfil = async (token: string, cambios: CambiosPerfil) =>
  conFoto(await pedir<Usuario>("/api/yo/perfil", { metodo: "PATCH", token, cuerpo: cambios }));

// ---------------------------------------------------------------------------
// Materias, cursada, reseñas e historial
// ---------------------------------------------------------------------------

export const obtenerMaterias = (token: string) => pedir<Materia[]>("/api/materias", { token });

/** «Arrancar la cursada» de una materia disponible. Devuelve la materia ya actualizada. */
export const arrancarCursada = (token: string, materiaId: string) =>
  pedir<Materia>(`/api/materias/${materiaId}/cursada`, { metodo: "POST", token });

/** «Abandonar cursada»: la materia vuelve a quedar disponible y mi reseña se borra. */
export const abandonarCursada = (token: string, materiaId: string) =>
  pedir<Materia>(`/api/materias/${materiaId}/cursada`, { metodo: "DELETE", token });

/** Deja mi reseña de dificultad (1 a 5) o, si ya tenía una, la cambia. */
export const guardarResenia = (token: string, materiaId: string, estrellas: number) =>
  pedir<Materia>(`/api/materias/${materiaId}/resenia`, {
    metodo: "PUT",
    token,
    cuerpo: { estrellas },
  });

/** Los apuntes de otros estudiantes de una materia: los públicos y los de mis amigos. */
export const obtenerApuntesDeMateria = async (token: string, materiaId: string) => {
  const apuntes = await pedir<ApuntesDeMateria>(`/api/materias/${materiaId}/apuntes`, { token });
  return { comunidad: apuntes.comunidad.map(conUrl), amigos: apuntes.amigos.map(conUrl) };
};

export const cargarInstancia = (token: string, borrador: BorradorInstancia) => {
  // La materia va en la URL; el resto, en el cuerpo.
  const { materiaId, ...cuerpo } = borrador;
  return pedir<Materia>(`/api/materias/${materiaId}/historial`, { metodo: "POST", token, cuerpo });
};

export const deshacerInstancia = (token: string, materiaId: string) =>
  pedir<Materia>(`/api/materias/${materiaId}/historial/ultimo`, { metodo: "DELETE", token });

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export const obtenerEventos = (token: string) => pedir<Evento[]>("/api/eventos", { token });

export const crearEvento = (token: string, borrador: BorradorEvento) =>
  pedir<Evento>("/api/eventos", { metodo: "POST", token, cuerpo: borrador });

export const editarEvento = (token: string, id: string, borrador: BorradorEvento) =>
  pedir<Evento>(`/api/eventos/${id}`, { metodo: "PATCH", token, cuerpo: borrador });

export const borrarEvento = (token: string, id: string) =>
  pedir<void>(`/api/eventos/${id}`, { metodo: "DELETE", token });

export const borrarFecha = (token: string, id: string, fecha: string) =>
  pedir<Evento>(`/api/eventos/${id}/excepciones`, { metodo: "POST", token, cuerpo: { fecha } });

export const responderInvitacion = (token: string, invitacionId: string, acepta: boolean) =>
  pedir<unknown>(`/api/invitaciones/${invitacionId}/respuesta`, {
    metodo: "POST",
    token,
    cuerpo: { acepta },
  });

// ---------------------------------------------------------------------------
// Comunidad
// ---------------------------------------------------------------------------

export const obtenerEstudiantes = async (token: string) =>
  (await pedir<Estudiante[]>("/api/estudiantes", { token })).map(conFoto);

export const obtenerPerfil = async (token: string, id: string) => {
  const perfil = await pedir<PerfilEstudiante>(`/api/estudiantes/${id}`, { token });
  return {
    ...conFoto(perfil),
    apuntes: { ...perfil.apuntes, lista: perfil.apuntes.lista.map(conUrl) },
  };
};

export const mandarSolicitud = (token: string, id: string) =>
  pedir<{ relacion: Relacion }>(`/api/amistades/${id}`, { metodo: "POST", token });

export const retirarSolicitud = (token: string, id: string) =>
  pedir<void>(`/api/amistades/${id}`, { metodo: "DELETE", token });

export const responderSolicitud = (token: string, id: string, acepta: boolean) =>
  pedir<{ relacion: Relacion }>(`/api/amistades/${id}/respuesta`, {
    metodo: "POST",
    token,
    cuerpo: { acepta },
  });

export const obtenerLinks = (token: string) => pedir<LinkOficial[]>("/api/links", { token });

export const obtenerNovedades = (token: string) => pedir<Novedad[]>("/api/novedades", { token });

// ---------------------------------------------------------------------------
// Apuntes y notificaciones
// ---------------------------------------------------------------------------

export const obtenerApuntes = async (token: string) =>
  (await pedir<Apunte[]>("/api/apuntes", { token })).map(conUrl);

/** Sube un apunte confirmado: el archivo (en base64), su título y su descripción. */
export const subirApunte = (token: string, datos: DatosApunte) =>
  pedir<Apunte>("/api/apuntes", { metodo: "POST", token, cuerpo: datos });

export const borrarApunte = (token: string, id: string) =>
  pedir<void>(`/api/apuntes/${id}`, { metodo: "DELETE", token });

export const obtenerNotificaciones = (token: string) =>
  pedir<Notificacion[]>("/api/notificaciones", { token });

export const marcarLeidas = (token: string) =>
  pedir<void>("/api/notificaciones/leidas", { metodo: "POST", token });

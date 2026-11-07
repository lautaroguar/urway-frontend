/**
 * ============================================================================
 * utilidades/dni.ts — Interpreta el texto del código de barras del DNI
 * ============================================================================
 *
 * QUÉ ES:
 *   Una función PURA que recibe el texto que lee la cámara del PDF417 del DNI y
 *   devuelve los datos que se pueden completar en el registro: nombre, apellido,
 *   DNI y fecha de nacimiento.
 *
 * EL FORMATO QUE SE ESPERA (campos separados por "@"):
 *   trámite @ APELLIDO @ NOMBRE @ SEXO @ DNI @ EJEMPLAR @ NACIMIENTO @ EMISIÓN @ CÓDIGO
 *   por ejemplo: 00123456789@PEREZ@JUAN CARLOS@M@12345678@A@01/02/1990@03/04/2020@123
 *   Es el formato que publican fuentes NO oficiales para el DNI tarjeta. Falta
 *   confirmarlo con más DNI reales (ver el informe del sprint 1).
 *
 * POR QUÉ ES TAN ESTRICTA:
 *   En iPhone el texto del PDF417 llega con caracteres basura en el medio de los
 *   campos (lo entrega `stringValue` de Apple). Un dato mal leído, como un DNI al
 *   que le faltan dígitos, es PEOR que un campo vacío, porque nadie lo notaría.
 *   Por eso:
 *     - Un campo solo se acepta si pasa las mismas validaciones del formulario.
 *     - Nunca se "limpia" un campo con caracteres raros: se descarta entero.
 *     - Cada dato se busca por su ESTRUCTURA (la letra de ejemplar antes de la
 *       fecha, el sexo antes del DNI...) y no por un número de posición fijo.
 *   Lo que no se pueda leer queda sin devolver y la persona lo completa a mano.
 *
 * TEORÍA:
 *   [JS 9]  Función pura.
 *   [JS 8]  `split`, `map`, `filter` y `findIndex` sobre arrays.
 *   [JS 19] `hoy = new Date()` es un parámetro con valor por defecto.
 */
import {
  validarDni,
  validarFechaNacimiento,
  validarNombre,
} from "@/utilidades/validaciones";

/** Los datos que se lograron leer. Cada uno es opcional: puede faltar. */
export type DatosDni = {
  nombre?: string;
  apellido?: string;
  dni?: string;
  /** `DD/MM/AAAA`, igual que como lo imprime el DNI. */
  fechaNacimiento?: string;
};

// Patrones de los campos "de estructura" que sirven para ubicar a los demás.
const ES_TRAMITE = /^\d{11}$/; // el número de trámite: 11 dígitos
const ES_SEXO = /^[MFX]$/; // una sola letra: M, F o X
const ES_EJEMPLAR = /^[A-Z]$/; // el ejemplar del documento: una letra

/**
 * "JUAN CARLOS" → "Juan Carlos". El DNI trae todo en mayúsculas y así no queda
 * gritando en el formulario.
 */
function aTitulo(texto: string): string {
  // Pasa todo a minúscula y después pone en mayúscula la letra que va al
  // principio o después de un espacio, guion o apóstrofe.
  return texto
    .toLowerCase()
    .replace(/(^|[ '’-])(\S)/g, (_coincidencia, separador: string, letra: string) =>
      separador + letra.toUpperCase()
    );
}

/**
 * Interpreta el texto leído del PDF417 y devuelve solo lo que pudo validar.
 * `hoy` se puede pasar para probar la función con una fecha fija.
 */
export function leerDatosDni(texto: string, hoy = new Date()): DatosDni {
  // Se corta por "@" y se sacan los espacios de los extremos de cada campo.
  const campos = texto.split("@").map((campo) => campo.trim());
  const datos: DatosDni = {};

  // --- DNI: el único campo que es un número de 7 u 8 dígitos. Si hubiera dos
  //     candidatos no se sabe cuál es, así que no se devuelve ninguno.
  const esDni = (campo: string) => validarDni(campo) === null;
  const posicionDni = campos.findIndex(esDni);
  const dniEsUnico = posicionDni !== -1 && campos.filter(esDni).length === 1;
  if (dniEsUnico) datos.dni = campos[posicionDni];

  // --- FECHA DE NACIMIENTO: es la que viene justo después de la letra de
  //     ejemplar. La de emisión viene más adelante y también parece una fecha
  //     válida: por eso no alcanza con "la primera fecha que se vea".
  const posicionEjemplar = campos.findIndex(
    (campo, posicion) =>
      ES_EJEMPLAR.test(campo) &&
      posicion + 1 < campos.length &&
      validarFechaNacimiento(campos[posicion + 1], hoy) === null
  );
  if (posicionEjemplar !== -1) {
    datos.fechaNacimiento = campos[posicionEjemplar + 1];
  }

  // --- NOMBRE Y APELLIDO: van antes del sexo. Se ubica el nombre así:
  //     1) si hay un DNI único precedido por el sexo → el nombre está 2 lugares
  //        antes del DNI y el apellido, 3;
  //     2) si no, pero el primer campo es un trámite de 11 dígitos → el apellido
  //        es el segundo campo y el nombre, el tercero.
  let posicionNombre = -1;
  if (dniEsUnico && posicionDni >= 3 && ES_SEXO.test(campos[posicionDni - 1])) {
    posicionNombre = posicionDni - 2;
  } else if (ES_TRAMITE.test(campos[0])) {
    posicionNombre = 2;
  }

  if (posicionNombre >= 1 && posicionNombre < campos.length) {
    const apellido = campos[posicionNombre - 1];
    const nombre = campos[posicionNombre];
    if (validarNombre(apellido, "apellido") === null) {
      datos.apellido = aTitulo(apellido);
    }
    if (validarNombre(nombre, "nombre") === null) {
      datos.nombre = aTitulo(nombre);
    }
  }

  return datos;
}

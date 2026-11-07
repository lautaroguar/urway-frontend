/**
 * ============================================================================
 * utilidades/fechas.ts — Funciones para trabajar con fechas y horas
 * ============================================================================
 *
 * QUÉ ES:
 *   Un conjunto de FUNCIONES PURAS: reciben datos, devuelven un resultado, y no
 *   modifican nada de afuera ni guardan estado.
 *
 * TEORÍA:
 *   [JS 9] "Función pura: mismo input → mismo output; no modifica variables
 *   externas; no produce efectos observables." Por eso estas funciones siempre
 *   devuelven una fecha NUEVA en lugar de modificar la que reciben.
 *
 * LA IDEA CLAVE DE ESTE ARCHIVO — la "clave de fecha":
 *   En toda la app un día se representa como un texto `AAAA-MM-DD`
 *   (por ejemplo "2026-10-02"). Ventajas:
 *     1. Se puede comparar con `<`, `>=` y `===` porque, escrita así, el orden
 *        alfabético coincide con el orden cronológico ("2026-10-02" > "2026-09-30").
 *     2. Se evitan los problemas de zona horaria.
 *   En los FORMULARIOS, en cambio, la fecha se escribe como en Argentina
 *   ("02/10/2026"): `aTextoFecha` y `aClaveFecha` traducen entre las dos formas.
 *
 * Utilidades de fecha. Funciones puras, sin dependencias: reciben `Date` o
 * strings y devuelven valores nuevos, nunca mutan lo que reciben.
 *
 * Convención: una "clave" es la fecha en formato `AAAA-MM-DD` calculada en
 * hora local. Se usa como identificador de día en los datos y para comparar,
 * porque `toISOString()` convierte a UTC y en Argentina (UTC-3) adelanta el día.
 */

// Los nombres se escriben a mano porque `Date` devuelve el mes como número
// (0 = enero ... 11 = diciembre) y el día de la semana también (0 = domingo).
// Así se puede usar ese número como POSICIÓN dentro del array:
// NOMBRES_MES[0] es "enero".
const NOMBRES_MES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Ojo: en JavaScript la semana arranca en domingo (posición 0).
const NOMBRES_DIA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

// Función privada (sin `export`): completa con un cero a la izquierda para que
// siempre tenga 2 dígitos. conCeros(5) → "05"; conCeros(12) → "12".
// `padStart(2, "0")` es un método de los textos que rellena por delante.
function conCeros(numero: number): string {
  return numero.toString().padStart(2, "0");
}

/** `AAAA-MM-DD` en hora local. */
// Convierte un Date en la "clave" de fecha. Las llaves `${...}` dentro de las
// comillas invertidas (`) son una plantilla de texto ("template literal"):
// insertan el valor de la expresión. `getMonth()` devuelve 0–11, por eso el `+ 1`.
// NO se usa `toISOString()` porque convierte a hora UTC, y en Argentina (UTC-3)
// después de las 21:00 devolvería el día SIGUIENTE.
export function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${conCeros(fecha.getMonth() + 1)}-${conCeros(
    fecha.getDate()
  )}`;
}

/** Convierte `AAAA-MM-DD` en un `Date` local a medianoche. */
// Hace lo inverso de `claveFecha`. `"2026-10-02".split("-")` da
// ["2026", "10", "02"]; `.map(Number)` convierte cada texto en número.
// Los corchetes de la izquierda son DESESTRUCTURACIÓN [JS 7]: sacan cada valor
// del array a una variable (anio, mes, dia). El mes de `Date` empieza en 0,
// por eso `mes - 1`.
export function desdeClave(clave: string): Date {
  const [anio, mes, dia] = clave.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, la forma en que se escribe una fecha en los formularios. */
// Los formularios muestran la fecha como se escribe en Argentina ("24/10/2026"),
// pero adentro de la app se sigue guardando la clave ("2026-10-24"). Esta
// función y la siguiente traducen entre las dos formas.
export function aTextoFecha(clave: string): string {
  const [anio, mes, dia] = clave.split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * `DD/MM/AAAA` → `AAAA-MM-DD`, o `null` si el texto no tiene esa forma o la fecha
 * no existe en el calendario ("31/02/2026").
 */
// Misma doble verificación que la fecha de nacimiento del registro: primero la
// FORMA (expresión regular) y después que EXISTA (si `Date` la "corrige", no existía).
export function aClaveFecha(texto: string): string | null {
  // `exec` devuelve las partes capturadas por los paréntesis, o `null`.
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) return null;
  const [, dia, mes, anio] = partes; // la coma inicial saltea el texto completo
  const clave = `${anio}-${mes}-${dia}`;
  return claveFecha(desdeClave(clave)) === clave ? clave : null;
}

/** El nombre del día de la semana (0 = domingo ... 6 = sábado): 1 → "lunes". */
export function nombreDia(numero: number): string {
  return NOMBRES_DIA[numero];
}

/** Copia con la hora en cero, para comparar días sin que moleste el horario. */
// Sirve para saber cuántos DÍAS separan dos fechas ignorando la hora.
export function aMedianoche(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Cuántos días hay de `desde` a `hasta` (negativo si `hasta` es anterior). */
// Se pasan las dos fechas a medianoche y se divide la diferencia en milisegundos
// por los de un día. `Math.round` absorbe el cambio de horario de verano (un día de
// 23 o 25 horas).
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round(
    (aMedianoche(hasta).getTime() - aMedianoche(desde).getTime()) / 86400000
  );
}

// Devuelve la fecha más `dias` días (puede ser negativo para restar).
// Trabaja sobre una COPIA (`new Date(fecha)`) para no modificar la fecha
// original que recibió: eso es lo que la hace una función pura.
export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/** "jueves 4 de septiembre" */
// `fecha.getDay()` devuelve el día de la semana (0–6) y se usa como posición
// en NOMBRES_DIA; `getMonth()` hace lo mismo con NOMBRES_MES.
export function etiquetaDiaLargo(fecha: Date): string {
  return `${NOMBRES_DIA[fecha.getDay()]} ${fecha.getDate()} de ${
    NOMBRES_MES[fecha.getMonth()]
  }`;
}

/** "Hoy", "Mañana", "Ayer" o el día largo ("Jueves 4 de septiembre"). */
// `referencia = new Date()` es un parámetro con VALOR POR DEFECTO [JS 19]:
// si quien llama no lo pasa, se usa "ahora".
export function etiquetaRelativa(fecha: Date, referencia = new Date()): string {
  // Diferencia en días entre las dos fechas (ambas llevadas a medianoche).
  // `getTime()` da milisegundos; 86400000 son los milisegundos de un día
  // (24 h × 60 min × 60 s × 1000 ms). `Math.round` redondea (el cambio de
  // horario de verano puede dejar un día de 23 o 25 horas).
  const dias = Math.round(
    (aMedianoche(fecha).getTime() - aMedianoche(referencia).getTime()) /
      86400000
  );

  // Retornos tempranos: si se cumple una condición, se devuelve enseguida.
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";

  // Para cualquier otro día: "jueves 4 de septiembre" con la primera letra en
  // mayúscula → "Jueves 4 de septiembre". `charAt(0)` toma la primera letra y
  // `slice(1)` el resto del texto.
  const texto = etiquetaDiaLargo(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** El lunes de la semana de `fecha`, a medianoche. La semana va de lunes a domingo. */
// `getDay()` da 0 para el domingo ... 6 para el sábado. Para contar cuántos días
// pasaron desde el lunes se corre una posición: `(getDay() + 6) % 7` da lunes → 0,
// martes → 1 ... domingo → 6. Es la misma convención de `cuatrimestre.ts`, donde
// los cuatrimestres arrancan un lunes.
export function inicioDeSemana(fecha: Date): Date {
  const desdeElLunes = (fecha.getDay() + 6) % 7;
  return sumarDias(aMedianoche(fecha), -desdeElLunes);
}

/** "Lun", "Mar"... las tres primeras letras del día, con mayúscula. */
export function etiquetaDiaCorto(fecha: Date): string {
  const texto = NOMBRES_DIA[fecha.getDay()].slice(0, 3);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "28 sep – 4 oct" o, si la semana cae en un solo mes, "5 – 11 oct". */
// `inicio` es el lunes; el domingo es 6 días después. `slice(0, 3)` se queda con
// las tres primeras letras del mes ("septiembre" → "sep").
export function etiquetaSemana(inicio: Date): string {
  const fin = sumarDias(inicio, 6);
  const mesFin = NOMBRES_MES[fin.getMonth()].slice(0, 3);

  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()} – ${fin.getDate()} ${mesFin}`;
  }
  const mesInicio = NOMBRES_MES[inicio.getMonth()].slice(0, 3);
  return `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin}`;
}

/** La hora en punto como texto: 7 → "07:00". */
export function etiquetaHora(hora: number): string {
  return `${conCeros(hora)}:00`;
}

/** "08:30" a 510. Devuelve 0 si el texto no tiene forma de hora. */
// Convierte una hora en "minutos desde la medianoche" para poder compararlas
// con `<`, `<=` o restarlas. 08:30 → 8 × 60 + 30 = 510.
export function aMinutos(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  // `Number("abc")` da NaN ("Not a Number"). `Number.isNaN` lo detecta.
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return 0;
  return horas * 60 + minutos;
}

/** Duración legible: "2 h", "1 h 30 min", "45 min". */
export function duracion(desde: string, hasta: string): string {
  // `Math.max(..., 0)` evita duraciones negativas si "hasta" es antes que "desde".
  const total = Math.max(aMinutos(hasta) - aMinutos(desde), 0);
  const horas = Math.floor(total / 60); // división entera: minutos → horas
  const minutos = total % 60; // `%` es el resto de la división

  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas} h`;
  return `${horas} h ${minutos} min`;
}

/**
 * Hace cuánto pasó algo, para las notificaciones: "Recién", "Hace 5 min",
 * "Hace 2 h", "Ayer", "Hace 3 días" o, si es más viejo, "24/10/2026".
 * `iso` es una fecha con hora en formato ISO ("2026-10-24T09:00:00.000Z").
 */
export function haceCuanto(iso: string, ahora = new Date()): string {
  const momento = new Date(iso);
  // Diferencia en minutos (`getTime()` da milisegundos).
  const minutos = Math.floor((ahora.getTime() - momento.getTime()) / 60000);
  if (minutos < 1) return "Recién";
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 24 * 60) return `Hace ${Math.floor(minutos / 60)} h`;
  // Desde acá se cuentan DÍAS de calendario (no de 24 horas).
  const dias = diasEntre(momento, ahora);
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return aTextoFecha(claveFecha(momento));
}

/**
 * ============================================================================
 * utilidades/validaciones.ts — Validaciones de FORMATO de los formularios
 * ============================================================================
 *
 * QUÉ ES:
 *   Funciones PURAS que revisan si un texto tiene la forma correcta: correo,
 *   contraseña, nombre, DNI, fecha de nacimiento y cualquier otra fecha. Las usan
 *   el login (`app/login.tsx`), el registro (`app/registro.tsx`), los formularios
 *   de eventos y de "Rendí", y también el lector del DNI (`utilidades/dni.ts`)
 *   para no aceptar datos mal leídos.
 *
 * POR QUÉ NO HAY UNA LIBRERÍA:
 *   Expo no trae validación de formularios incorporada. Lo nativo del
 *   `TextInput` (`keyboardType`, `maxLength`, `secureTextEntry`) ayuda a escribir
 *   mejor, pero no valida nada: un teclado numérico no impide pegar letras. Para
 *   validar de verdad se usan estas funciones (o librerías externas como React
 *   Hook Form, que la cátedra no enseñó).
 *
 * CÓMO SE USAN:
 *   Todas devuelven el MENSAJE de error (un texto) o `null` si está bien. Así la
 *   pantalla puede hacer `const errorEmail = validarEmail(email)` en el render y
 *   mostrar el texto si existe; es el mismo patrón de `evento/nuevo.tsx`.
 *
 * TEORÍA:
 *   [JS 9]  Función pura: mismo texto → mismo resultado, sin tocar nada de afuera.
 *   [JS 25] Estado derivado: el error se CALCULA en el render, no se guarda.
 *   [JS 19] `hoy = new Date()` es un parámetro con valor por defecto.
 *   [JS 8]  `slice`, `replace` y `test` (expresiones regulares) sobre textos.
 */

import { aClaveFecha } from "@/utilidades/fechas";

// EXPRESIONES REGULARES (patrones para validar texto). Cómo se leen:
//   `^` empieza el texto · `$` termina · `\d` un dígito · `{7,8}` entre 7 y 8
//   veces · `+` una o más veces · `[...]` uno de estos caracteres.
//
// ES_EMAIL: algo, una arroba, algo, un punto y al menos dos letras al final. `\s`
//   es un espacio, y `[^\s@]` es "cualquier cosa que NO sea espacio ni arroba".
const ES_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// ES_NOMBRE: palabras de letras (con tildes y ñ: el rango À-ÿ) separadas por UN
//   espacio, guion o apóstrofe. Acepta "María José", "De la Fuente", "O'Brien".
const LETRA = "A-Za-zÀ-ÖØ-öø-ÿ";
const ES_NOMBRE = new RegExp(`^[${LETRA}]+(?:[ '’-][${LETRA}]+)*$`);
// ES_DNI: 7 u 8 dígitos y que no empiece con cero.
const ES_DNI = /^[1-9]\d{6,7}$/;
// ES_FECHA: dos dígitos, barra, dos dígitos, barra y cuatro dígitos. Los
//   paréntesis "capturan" cada parte para poder leerla después.
const ES_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Correo: obligatorio y con forma de dirección (`nombre@dominio.ar`). */
export function validarEmail(texto: string): string | null {
  // `trim()` saca los espacios de los extremos, que a veces agrega el teclado.
  const limpio = texto.trim();
  if (limpio.length === 0) return "Ingresá tu correo.";
  if (!ES_EMAIL.test(limpio)) {
    return "El correo no tiene un formato válido, por ejemplo nombre@uca.edu.ar.";
  }
  return null;
}

/**
 * Contraseña del LOGIN: solo se pide que no esté vacía. No se revisa el largo ni
 * los caracteres porque la cuenta puede haberse creado con otras reglas.
 */
export function validarContraseniaLogin(texto: string): string | null {
  return texto.length === 0 ? "Ingresá tu contraseña." : null;
}

/** Contraseña NUEVA (registro): al menos 8 caracteres, con letras y números. */
export function validarContrasenia(texto: string): string | null {
  if (texto.length === 0) return "Elegí una contraseña.";
  if (texto.length < 8) return "Tiene que tener al menos 8 caracteres.";
  if (texto.length > 64) return "Puede tener hasta 64 caracteres.";
  // `/[A-Za-z]/.test(texto)` es true si hay al menos una letra; igual con `\d`.
  if (!/[A-Za-z]/.test(texto) || !/\d/.test(texto)) {
    return "Tiene que combinar letras y números.";
  }
  return null;
}

/** Nombre o apellido: solo letras, espacios, guiones y apóstrofes. */
export function validarNombre(
  texto: string,
  campo: "nombre" | "apellido"
): string | null {
  const limpio = texto.trim();
  if (limpio.length === 0) return `Completá tu ${campo}.`;
  if (limpio.length < 2 || limpio.length > 40) {
    return `El ${campo} tiene que tener entre 2 y 40 letras.`;
  }
  if (!ES_NOMBRE.test(limpio)) {
    return `El ${campo} solo puede tener letras, espacios, guiones y apóstrofes.`;
  }
  return null;
}

/** DNI: 7 u 8 números, sin puntos. */
export function validarDni(texto: string): string | null {
  if (texto.length === 0) return "Ingresá tu DNI.";
  if (!ES_DNI.test(texto)) return "El DNI tiene 7 u 8 números, sin puntos.";
  return null;
}

/**
 * Fecha de nacimiento `DD/MM/AAAA`: con la forma correcta, que EXISTA en el
 * calendario y que no sea futura. `hoy` se puede pasar para probar la función.
 */
export function validarFechaNacimiento(
  texto: string,
  hoy = new Date()
): string | null {
  if (texto.length === 0) return "Ingresá tu fecha de nacimiento.";
  const partes = ES_FECHA.exec(texto);
  // `exec` devuelve `null` si el texto no tiene la forma de la expresión regular.
  if (!partes) {
    return "Usá el formato DD/MM/AAAA, por ejemplo 25/12/2001.";
  }
  // `exec` devuelve el texto completo y después cada parte capturada. Los
  // corchetes de la izquierda son DESESTRUCTURACIÓN [JS 7]; el `_` ignora el
  // primero. `Number("07")` da 7.
  const [, diaTexto, mesTexto, anioTexto] = partes;
  // Los tres pedazos llegan como texto; `Number(...)` los pasa a número.
  const dia = Number(diaTexto);
  const mes = Number(mesTexto);
  const anio = Number(anioTexto);

  if (anio < 1900) return "Revisá el año de nacimiento.";
  // Doble verificación: `Date` corrige las fechas imposibles ("31/02" pasa a
  // "03/03"); si lo que devuelve no coincide con lo escrito, la fecha no existe.
  const fecha = new Date(anio, mes - 1, dia);
  // Los meses de `Date` van de 0 a 11, por eso se compara contra `mes - 1`.
  const existe =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia;
  if (!existe) return "Esa fecha no existe en el calendario.";
  // `getTime()` son los milisegundos desde 1970: se pueden comparar con `>`.
  if (fecha.getTime() > hoy.getTime()) return "La fecha no puede ser futura.";
  return null;
}

/**
 * Una fecha cualquiera `DD/MM/AAAA` (la de un evento o la de algo que se rindió):
 * con la forma correcta y que EXISTA. Si puede o no ser futura lo decide cada
 * formulario (un evento sí; un parcial ya rendido, no).
 */
export function validarFecha(texto: string): string | null {
  if (texto.length === 0) return "Ingresá la fecha.";
  // `aClaveFecha` devuelve `null` si el texto no tiene la forma o la fecha no existe.
  if (aClaveFecha(texto) === null) {
    return "Usá el formato DD/MM/AAAA con una fecha que exista, por ejemplo 24/10/2026.";
  }
  return null;
}

/**
 * Deja solo dígitos y corta en `maximo`. Se usa en `onChangeText` para que, aunque
 * se pegue texto con letras o puntos, el campo (DNI) solo quede con números.
 */
export function soloDigitos(texto: string, maximo: number): string {
  // `\D` es "todo lo que NO es un dígito"; la `g` final reemplaza TODAS las veces.
  return texto.replace(/\D/g, "").slice(0, maximo);
}

/**
 * Da forma de fecha a lo que se va escribiendo: "01021990" → "01/02/1990". Quien
 * escribe solo tipea números y las barras aparecen solas, así no hace falta un
 * teclado con símbolos (el teclado numérico de Android no tiene la barra).
 */
export function formatearFecha(texto: string): string {
  // Se descarta todo lo que no sea número y se corta en 8 (DDMMAAAA).
  const digitos = soloDigitos(texto, 8);
  // Según cuántos dígitos haya, se pone la primera barra, la segunda o ninguna.
  // `slice(a, b)` toma de la posición `a` hasta antes de la `b`.
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

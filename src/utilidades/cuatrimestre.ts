/**
 * ============================================================================
 * utilidades/cuatrimestre.ts — Cuánto avanzó el cuatrimestre, según la fecha de hoy
 * ============================================================================
 *
 * QUÉ ES:
 *   Una función pura que, a partir del DÍA DE HOY, dice en qué semana va el
 *   cuatrimestre y qué porcentaje del total representa. Es lo que dibuja el
 *   círculo de Inicio.
 *
 * LA REGLA:
 *   - Un cuatrimestre dura 16 semanas.
 *   - Arranca el primer lunes de marzo (1º cuatrimestre) y el primer lunes de
 *     agosto (2º cuatrimestre).
 *   - Semana = cuántas semanas pasaron desde el inicio + 1. Porcentaje = semana /
 *     16. Si voy por la semana 8, es el 50 %.
 *   - Fuera de esas 16 semanas (entre cuatrimestres) no hay avance: se avisa
 *     cuándo empieza el próximo.
 *
 * TAMBIÉN DICE DÓNDE EMPIEZA Y TERMINA UN CUATRIMESTRE:
 *   `limitesDelCuatrimestre(fecha)` devuelve el primer lunes y el último viernes
 *   del cuatrimestre de esa fecha. Las CLASES de la agenda lo usan para repetirse
 *   todas las semanas hasta que termina el cuatrimestre.
 *
 * ESTO NO ES EL "CUATRIMESTRE ACTUAL" DEL PLAN:
 *   `estudiante.cuatrimestreActual` (datos/carrera.ts) es en qué cuatrimestre DE
 *   LA CARRERA va el estudiante (1 a 10). Esto es el calendario del AÑO. Se
 *   parecen de nombre y no tienen nada que ver.
 *
 * TEORÍA:
 *   [JS 9]  Función pura. `hoy = new Date()` es un parámetro con valor por defecto
 *           [JS 19]: se puede pasar otra fecha para probarla.
 *   [JS 8]  `flatMap`/`map`/`find` sobre arrays.
 */
import { aMedianoche, diasEntre, sumarDias } from "@/utilidades/fechas";

/** Un cuatrimestre dura 16 semanas. */
export const SEMANAS_CUATRIMESTRE = 16;

// Los meses en que arrancan los dos cuatrimestres del año. `Date` cuenta los meses
// desde 0 (enero = 0), así que marzo es 2 y agosto es 7.
const MESES_DE_INICIO = [2, 7];

/** La fecha del primer lunes de un mes. */
function primerLunes(anio: number, mes: number): Date {
  const primero = new Date(anio, mes, 1);
  // `getDay()`: 0 = domingo, 1 = lunes ... 6 = sábado. Días que faltan para el
  // lunes: si el 1 es domingo (0) falta 1; si es lunes (1) faltan 0; si es
  // sábado (6) faltan 2. `% 7` hace que el lunes dé 0 en vez de 7.
  const faltan = (8 - primero.getDay()) % 7;
  return new Date(anio, mes, 1 + faltan);
}

/** Qué se sabe del cuatrimestre según el día: en curso (con la semana) o entre cuatrimestres. */
export type AvanceCuatrimestre =
  | {
      enCurso: true;
      /** Semana en la que va, de 1 a 16. */
      semana: number;
      semanasTotales: number;
      /** De 0 a 1: semana / 16. */
      porcentaje: number;
      semanasRestantes: number;
      /** El último día de clases (el viernes de la semana 16). */
      fin: Date;
    }
  | {
      enCurso: false;
      porcentaje: 0;
      /** El lunes en que empieza el próximo cuatrimestre. */
      proximoInicio: Date;
    };

/**
 * Todos los inicios de cuatrimestre del año de `dia` y del siguiente, en orden:
 * [mar, ago, mar, ago]. Con el año siguiente incluido, siempre hay un "próximo"
 * aunque estemos en diciembre.
 */
// `flatMap` hace `map` y aplana el resultado: de dos listas de dos fechas sale UNA de cuatro.
function iniciosCercanos(dia: Date): Date[] {
  const anio = dia.getFullYear();
  return [anio, anio + 1].flatMap((a) =>
    MESES_DE_INICIO.map((mes) => primerLunes(a, mes))
  );
}

/** El inicio del cuatrimestre que está en curso en `dia`, o `undefined` en el receso. */
// El que empezó hace entre 0 y 111 días (16 semanas).
function inicioEnCurso(dia: Date): Date | undefined {
  return iniciosCercanos(dia).find((inicio) => {
    const dias = diasEntre(inicio, dia);
    return dias >= 0 && dias < SEMANAS_CUATRIMESTRE * 7;
  });
}

/** El último día de clases de un cuatrimestre: el viernes de su semana 16. */
// 16 semanas = 112 días; el viernes está 3 días antes de que termine la semana 16.
function finDesdeInicio(inicio: Date): Date {
  return sumarDias(inicio, SEMANAS_CUATRIMESTRE * 7 - 3);
}

/**
 * El cuatrimestre al que pertenece una fecha: el que está en curso ese día o, si
 * cae en el receso, el próximo. Lo usan las CLASES de la agenda, que se repiten
 * todas las semanas desde `inicio` hasta `fin`.
 */
export function limitesDelCuatrimestre(fecha: Date): { inicio: Date; fin: Date } {
  const dia = aMedianoche(fecha);
  // `??`: si no hay uno en curso (receso), el primero que todavía no empezó.
  const inicio =
    inicioEnCurso(dia) ??
    iniciosCercanos(dia).find((candidato) => candidato > dia) ??
    iniciosCercanos(dia)[0];
  return { inicio, fin: finDesdeInicio(inicio) };
}

/** El avance del cuatrimestre en el día `hoy` (por defecto, el día de hoy). */
// `hoy = new Date()` es un parámetro con VALOR POR DEFECTO: si no se pasa ninguno, se
// usa la fecha de hoy (pasar otra sirve para probar la función con días conocidos).
export function avanceCuatrimestre(hoy = new Date()): AvanceCuatrimestre {
  // Se descarta la hora (queda a las 00:00) para comparar solo días enteros.
  const dia = aMedianoche(hoy);
  const inicios = iniciosCercanos(dia);

  // El inicio del cuatrimestre en curso (o `undefined` si estamos en el receso).
  const actual = inicioEnCurso(dia);

  // Si `actual` existe, estamos dentro de un cuatrimestre; si es `undefined`, en el receso.
  if (actual) {
    // `Math.floor` descarta los días sueltos: 65 días son 9 semanas completas y
    // se está en la semana 10.
    const semana = Math.floor(diasEntre(actual, dia) / 7) + 1;
    // El campo `enCurso: true` es el que le dice a TypeScript que este objeto es la
    // primera forma de `AvanceCuatrimestre` (la que tiene `semana`, `fin`, etc.).
    return {
      enCurso: true,
      semana,
      semanasTotales: SEMANAS_CUATRIMESTRE,
      porcentaje: semana / SEMANAS_CUATRIMESTRE,
      semanasRestantes: SEMANAS_CUATRIMESTRE - semana,
      // El último día de clases: el viernes de la semana 16.
      fin: finDesdeInicio(actual),
    };
  }

  // Entre cuatrimestres: el próximo es el primer inicio que todavía no llegó.
  // `find` puede devolver `undefined` según TypeScript, pero nunca pasa: la lista
  // incluye el año que viene. El `?? inicios[0]` es solo el respaldo del tipo.
  const proximoInicio = inicios.find((inicio) => inicio > dia) ?? inicios[0];
  return { enCurso: false, porcentaje: 0, proximoInicio };
}

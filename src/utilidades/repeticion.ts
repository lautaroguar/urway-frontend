/**
 * ============================================================================
 * utilidades/repeticion.ts — Las fechas en que cae cada evento (funciones puras)
 * ============================================================================
 *
 * QUÉ ES:
 *   Un evento que se repite se guarda UNA vez, con su regla (ver `datos/agenda.ts`).
 *   Estas funciones convierten esa regla en las fechas concretas ("ocurrencias")
 *   que se ven en la agenda, en "Hoy" y en "Próximas fechas":
 *
 *     Clase de Álgebra · cada semana · lunes y miércoles · hasta el 20/11
 *        └─▶ lun 03/08, mié 05/08, lun 10/08, mié 12/08 ... mié 18/11
 *
 * CÓMO SE USA:
 *   `ocurrenciasEntre(eventos, desde, hasta, cortes)` devuelve TODAS las
 *   ocurrencias de todos los eventos entre dos fechas. Cada una es el evento con
 *   la fecha de ESE día (`fecha`) y un id propio (`idOcurrencia`), así las
 *   pantallas la dibujan igual que a un evento común.
 *
 * LOS "CORTES" — LAS CLASES TERMINAN CON LA CURSADA:
 *   `cortes` dice, para cada materia, el día en que se terminó de cursar. Las
 *   CLASES de esa materia no aparecen después de ese día, aunque su regla diga
 *   "hasta el fin del cuatrimestre". Y si la materia ya no se cursa (se abandonó
 *   la cursada), sus clases no aparecen nunca: el corte es `SIN_CLASES`. Se arma
 *   con `cortesDeClases(materias)`.
 *
 * TEORÍA:
 *   [JS 9]  Funciones puras: no modifican los eventos que reciben.
 *   [JS 8]  `map`, `filter`, `some`, `flatMap`; [JS 7] spread para copiar.
 *   [JS 25] Estado derivado: las ocurrencias NUNCA se guardan, se calculan.
 */
import type { Materia } from "@/datos/carrera";
import type { Evento, Frecuencia } from "@/datos/agenda";
import {
  claveFecha,
  desdeClave,
  diasEntre,
  etiquetaDiaLargo,
  inicioDeSemana,
  nombreDia,
  sumarDias,
} from "@/utilidades/fechas";

/** Un evento en UNA de sus fechas. `fecha` ya es la de ese día. */
export type Ocurrencia = Evento & {
  /** Único por día: "ev-1@2026-10-24". Sirve de `key` en las listas. */
  idOcurrencia: string;
};

/** Cuántos días hay entre dos repeticiones (salvo la mensual, que va por mes). */
const PASO_EN_DIAS: Record<Exclude<Frecuencia, "nunca" | "mensual">, number> = {
  diaria: 1,
  semanal: 7,
  quincenal: 14,
};

/** ¿El evento se repite? */
export const seRepite = (evento: Evento) => evento.frecuencia !== "nunca";

/** Los días de la semana de un evento semanal: los elegidos o el de su primera fecha. */
export function diasDeLaSemana(evento: Evento): number[] {
  // `??`: si no hay `dias`, una lista con el día de la semana de `fecha`.
  return evento.dias && evento.dias.length > 0
    ? evento.dias
    : [desdeClave(evento.fecha).getDay()];
}

/**
 * Las fechas (`AAAA-MM-DD`) de UN evento entre `desde` y `hasta`, incluidas, sin
 * mirar las excepciones. Es la traducción de la regla a días concretos.
 */
function fechasDeLaSerie(evento: Evento, desde: string, hasta: string): string[] {
  // Un rango vacío, o un evento que empieza después: no hay fechas.
  if (hasta < desde || evento.fecha > hasta) return [];

  const inicio = desdeClave(evento.fecha);
  const fechas: string[] = [];
  // Agrega la fecha solo si está dentro del rango (y no antes de que empiece la serie).
  const agregar = (dia: Date) => {
    const clave = claveFecha(dia);
    if (clave >= desde && clave <= hasta && clave >= evento.fecha) fechas.push(clave);
  };

  // `switch` elige un camino según la frecuencia.
  switch (evento.frecuencia) {
    case "nunca":
      agregar(inicio);
      break;

    case "diaria": {
      // Desde el primer día que puede caer en el rango, de a un día.
      const primero = Math.max(0, diasEntre(inicio, desdeClave(desde)));
      const ultimo = diasEntre(inicio, desdeClave(hasta));
      for (let n = primero; n <= ultimo; n++) agregar(sumarDias(inicio, n));
      break;
    }

    case "semanal":
    case "quincenal": {
      // Se avanza de a semanas (o de a dos) desde el lunes de la primera fecha, y en
      // cada una se agregan los días elegidos.
      const paso = PASO_EN_DIAS[evento.frecuencia];
      const lunes = inicioDeSemana(inicio);
      const dias = diasDeLaSemana(evento);
      // La primera semana que puede tocar el rango: se saltean las anteriores.
      const desdeSemana = Math.max(
        0,
        Math.floor(diasEntre(lunes, desdeClave(desde)) / paso)
      );
      for (let n = desdeSemana; ; n++) {
        const lunesDeEsta = sumarDias(lunes, n * paso);
        if (claveFecha(lunesDeEsta) > hasta) break; // ya se pasó del rango
        // `(dia + 6) % 7`: cuántos días después del lunes cae (lunes → 0 ... domingo → 6).
        for (const dia of dias) agregar(sumarDias(lunesDeEsta, (dia + 6) % 7));
      }
      break;
    }

    case "mensual": {
      // El mismo número de día todos los meses. Si ese mes no lo tiene (un 31 en
      // abril), ese mes se saltea, como en los calendarios del teléfono.
      const diaDelMes = inicio.getDate();
      const fin = desdeClave(hasta);
      const desdeFecha = desdeClave(desde);
      // Cuántos meses saltear de entrada (con uno de margen).
      const salteo = Math.max(
        0,
        (desdeFecha.getFullYear() - inicio.getFullYear()) * 12 +
          desdeFecha.getMonth() -
          inicio.getMonth() -
          1
      );
      for (let n = salteo; ; n++) {
        const candidato = new Date(
          inicio.getFullYear(),
          inicio.getMonth() + n, // `Date` acomoda solo los meses de más (13 → enero del año siguiente)
          diaDelMes
        );
        if (candidato > fin) break;
        // Si `Date` lo corrió al mes siguiente, ese día no existía: no se agrega.
        if (candidato.getDate() === diaDelMes) agregar(candidato);
      }
      break;
    }
  }

  return fechas;
}

/**
 * Hasta qué fecha llega un evento: la menor entre el final del rango pedido, su
 * `repetirHasta` y, si es una clase, el día en que terminó la cursada.
 */
function limiteDe(evento: Evento, hasta: string, cortes: Record<string, string>) {
  let limite = hasta;
  if (evento.repetirHasta && evento.repetirHasta < limite) limite = evento.repetirHasta;
  // Solo las CLASES se cortan con la cursada (un parcial o una entrega no).
  const corte =
    evento.tipo === "clase" && evento.materiaId ? cortes[evento.materiaId] : undefined;
  if (corte && corte < limite) limite = corte;
  return limite;
}

/**
 * Todas las ocurrencias de todos los eventos entre `desde` y `hasta` (claves
 * `AAAA-MM-DD`, incluidas), sin las fechas borradas a mano. NO vienen ordenadas.
 */
export function ocurrenciasEntre(
  eventos: Evento[],
  desde: string,
  hasta: string,
  cortes: Record<string, string> = {}
): Ocurrencia[] {
  // `flatMap`: cada evento da una LISTA de ocurrencias y se juntan todas en una.
  return eventos.flatMap((evento) =>
    fechasDeLaSerie(evento, desde, limiteDe(evento, hasta, cortes))
      .filter((fecha) => !evento.excepciones.includes(fecha))
      // Spread [JS 7]: una copia del evento con la fecha de ESE día.
      .map((fecha) => ({ ...evento, fecha, idOcurrencia: `${evento.id}@${fecha}` }))
  );
}

/**
 * Un corte anterior a cualquier fecha real: ninguna clase de esa materia aparece. Se
 * usa para las materias que no se están cursando (por ejemplo, tras abandonarlas).
 */
const SIN_CLASES = "0000-00-00";

/**
 * Para cada materia que NO se está cursando, hasta qué día siguen sus clases:
 *   - terminó de cursarse el 12/10 → `{ "MAT-201": "2026-10-12" }` (siguen hasta ese día);
 *   - sin cursada arrancada (disponible o bloqueada) → `SIN_CLASES` (no aparece ninguna).
 * Las materias que se están cursando no tienen corte: sus clases siguen.
 */
export function cortesDeClases(materias: Materia[]): Record<string, string> {
  const cortes: Record<string, string> = {};
  for (const materia of materias) {
    if (materia.estado === "disponible" || materia.estado === "bloqueada") {
      cortes[materia.id] = SIN_CLASES;
    } else if (materia.estado !== "cursando" && materia.finCursada) {
      cortes[materia.id] = materia.finCursada;
    }
  }
  return cortes;
}

/** "lunes y miércoles", "martes, jueves y viernes". */
function listaDeDias(dias: number[]): string {
  // Ordenados de lunes a domingo: `(dia + 6) % 7` pone el lunes primero.
  const nombres = [...dias]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map(nombreDia);
  if (nombres.length === 1) return nombres[0];
  // Todos menos el último separados por coma, y el último con "y".
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/**
 * Cómo se repite un evento, en una frase: "Cada semana: lunes y miércoles, hasta
 * el viernes 20 de noviembre". Para "No se repite" devuelve `null`.
 */
export function describirRepeticion(evento: Evento): string | null {
  if (!seRepite(evento)) return null;

  const base =
    evento.frecuencia === "diaria"
      ? "Todos los días"
      : evento.frecuencia === "mensual"
        ? `Todos los meses, el día ${desdeClave(evento.fecha).getDate()}`
        : `${evento.frecuencia === "semanal" ? "Cada semana" : "Cada 2 semanas"}: ${listaDeDias(
            diasDeLaSemana(evento)
          )}`;

  return evento.repetirHasta
    ? `${base}, hasta el ${etiquetaDiaLargo(desdeClave(evento.repetirHasta))}`
    : base;
}

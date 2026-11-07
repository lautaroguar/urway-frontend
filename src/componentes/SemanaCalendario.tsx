/**
 * ============================================================================
 * componentes/SemanaCalendario.tsx — La grilla de una semana (lunes a domingo)
 * ============================================================================
 *
 * QUÉ ES:
 *   Un calendario de UNA semana: arriba los siete días (con el de hoy
 *   resaltado), a la izquierda las horas y en el medio siete columnas con los
 *   eventos colocados según su hora. Se desplaza hacia abajo para ver las horas
 *   que no entran en pantalla; el encabezado de los días queda fijo.
 *   Un parcial o una entrega que cae dentro de una clase de su materia no ocupa un
 *   bloque al lado de la clase: se dibuja como un círculo con su ícono adentro de
 *   la clase (uno para el parcial y otro para la entrega, si hay los dos).
 *
 *     ┌────┬─────┬─────┬─────┬─ ─ ─┐
 *     │    │ Lun │ Mar │ Mié │ ... │   ← encabezado (fijo)
 *     ├────┼─────┼─────┼─────┼─ ─ ─┤
 *     │ 07 │     │     │     │     │   ← de acá para abajo hay scroll
 *     │ 08 │▇▇▇▇▇│     │     │     │
 *     │ 09 │▇▇▇▇▇│     │     │     │
 *     │ …  │     │     │     │     │
 *
 * LA IDEA CENTRAL — TODO SE CALCULA EN EL RENDER:
 *   Este componente NO tiene `useState` ni `useEffect`. Recibe las ocurrencias de
 *   la semana (las fechas concretas de cada evento, ya calculadas por la Agenda) y
 *   el lunes de la semana, y en cada render DERIVA todo lo demás: los siete días,
 *   los eventos de cada uno, el rango de horas, quién se pisa con quién y hasta
 *   la línea de "ahora". Es la misma idea que `CirculoProgreso` (cada rayita se
 *   coloca con números calculados al dibujar), pero con `top` y `height`.
 *
 * CÓMO ESTÁ ARMADO EL ANCHO:
 *   Las siete columnas son `flex: 1`: se reparten solas el ancho que sobra
 *   después de la columna de horas, sin medir la pantalla. Los bloques usan
 *   porcentajes de su columna.
 *
 * TEORÍA:
 *   [EST]   `flexDirection: "row"`, `flex: 1`, `position: "absolute"`,
 *           `StyleSheet.hairlineWidth`, `borderRadius` (círculo del día).
 *   [COMP]  `ScrollView` con `contentContainerStyle`, `Array.from` + `map` con
 *           `key` estable. Componente de presentación: no navega, avisa con
 *           `alTocarEvento` (datos bajan, eventos suben).
 *   [JS 25] Estado derivado: nada de lo calculado acá se guarda.
 *   [JS 26] Sin `useEffect`: calcular para dibujar no es un efecto.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BloqueEvento } from "@/componentes/BloqueEvento";
import type { Evento } from "@/datos/agenda";
import type { Ocurrencia } from "@/utilidades/repeticion";
import {
  colores,
  espaciado,
  espacioBajoTabs,
} from "@/tema/colores";
import {
  ALTO_HORA,
  distanciaDesdeArriba,
  distribuirSolapados,
  rangoHorario,
  separarMarcas,
} from "@/utilidades/calendario";
import {
  claveFecha,
  etiquetaDiaCorto,
  etiquetaHora,
  sumarDias,
} from "@/utilidades/fechas";

// Ancho de la columna de las horas ("07:00") a la izquierda de la grilla.
const ANCHO_HORAS = 32;

type Props = {
  /** Las fechas concretas de los eventos en esta semana (ya calculadas). */
  ocurrencias: Ocurrencia[];
  /** TODOS los eventos, solo para decidir el rango de horas (ver abajo). */
  todos: Evento[];
  /** El lunes de la semana a mostrar. */
  inicioSemana: Date;
  /** Se ejecuta con el id del evento tocado y el día de esa ocurrencia. */
  alTocarEvento: (id: string, fecha: string) => void;
};

/** Grilla de una semana con los eventos posicionados por día y por hora. */
export function SemanaCalendario({
  ocurrencias,
  todos,
  inicioSemana,
  alTocarEvento,
}: Props) {
  // "Ahora": se lee en cada render. La línea roja de hoy se corre sola cada vez
  // que la pantalla se vuelve a dibujar (sin timers).
  const ahora = new Date();
  const hoy = claveFecha(ahora);
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  // Las horas que dibuja la grilla (de 07 a 24, o más si algún evento lo pide).
  // Se mira TODA la lista (no solo esta semana) para que la grilla no "salte".
  const { horaInicio, horaFin } = rangoHorario(todos);
  // `Array.from({ length: n }, (_, i) => ...)` arma una lista de n elementos
  // [JS 8]. Acá: [7, 8, 9, ..., 23].
  const horas = Array.from(
    { length: horaFin - horaInicio },
    (_, posicion) => horaInicio + posicion
  );
  const altoGrilla = horas.length * ALTO_HORA;

  // Los siete días, del lunes al domingo.
  const dias = Array.from({ length: 7 }, (_, posicion) =>
    sumarDias(inicioSemana, posicion)
  );


  // ¿La línea de "ahora" cae dentro de las horas que se dibujan?
  const ahoraVisible =
    minutosAhora >= horaInicio * 60 && minutosAhora < horaFin * 60;

  return (
    <View style={estilos.contenedor}>
      {/* ---------- Encabezado: un día por columna (queda fijo) ---------- */}
      <View style={estilos.filaDias}>
        {/* Hueco del ancho de la columna de horas, para alinear con la grilla. */}
        <View style={estilos.huecoHoras} />
        {dias.map((dia) => {
          const esHoy = claveFecha(dia) === hoy;
          return (
            <View key={claveFecha(dia)} style={estilos.celdaDia}>
              <Text style={[estilos.nombreDia, esHoy && estilos.nombreHoy]}>
                {etiquetaDiaCorto(dia)}
              </Text>
              {/* El número va en un círculo; el de hoy, relleno de azul. */}
              <View style={[estilos.circuloDia, esHoy && estilos.circuloHoy]}>
                <Text style={[estilos.numeroDia, esHoy && estilos.numeroHoy]}>
                  {dia.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ---------- Cuerpo: las horas y las siete columnas (con scroll) ---------- */}
      <ScrollView
        style={estilos.scroll}
        // Aire arriba (para que entre la primera hora) y lugar abajo para la barra
        // de tabs flotante, como en las otras pestañas.
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* Todo el cuerpo mide `altoGrilla`; adentro, las columnas van en fila. */}
        <View style={[estilos.cuerpo, { height: altoGrilla }]}>
          {/* Líneas horizontales, una por hora. Van PRIMERO: lo que se dibuja
              después (las columnas y los eventos) queda por encima. */}
          {horas.map((hora) => (
            <View
              key={`linea-${hora}`}
              style={[
                estilos.linea,
                { top: (hora - horaInicio) * ALTO_HORA },
              ]}
            />
          ))}

          {/* Columna de las horas: cada rótulo absoluto, centrado sobre su línea
              (el `top` negativo lo sube la mitad de su alto). */}
          <View style={estilos.columnaHoras}>
            {horas.map((hora) => (
              <Text
                key={`hora-${hora}`}
                style={[
                  estilos.rotuloHora,
                  { top: (hora - horaInicio) * ALTO_HORA - 6 },
                ]}
              >
                {etiquetaHora(hora)}
              </Text>
            ))}
          </View>

          {/* Una columna por día. Cada una es `flex: 1` (mismo ancho) y es el
              padre de los bloques: ellos se miden desde su borde de arriba. */}
          {dias.map((dia) => {
            const clave = claveFecha(dia);
            const esHoy = clave === hoy;
            // Los parciales y entregas que caen DENTRO de una clase de su materia
            // no llevan bloque: la clase los dibuja como círculos adentro suyo.
            const { sueltos, marcasPorClase } = separarMarcas(
              ocurrencias.filter((evento) => evento.fecha === clave)
            );
            // Los demás eventos de ESTE día, ya repartidos si se pisan.
            const delDia = distribuirSolapados(sueltos);

            return (
              <View
                key={clave}
                style={[estilos.columnaDia, esHoy && estilos.columnaHoy]}
              >
                {delDia.map(({ evento, columna, columnas }) => (
                  <BloqueEvento
                    // En un mismo día un evento aparece una sola vez: su id alcanza.
                    key={evento.id}
                    evento={evento}
                    columna={columna}
                    columnas={columnas}
                    horaInicio={horaInicio}
                    alTocar={() => alTocarEvento(evento.id, evento.fecha)}
                    // Si es una clase con parcial / entrega, los círculos (vacío si no).
                    marcas={marcasPorClase[evento.id] ?? []}
                    // Tocar un círculo abre el detalle del parcial o de la entrega.
                    alTocarMarca={(marca) => alTocarEvento(marca.id, marca.fecha)}
                  />
                ))}

                {/* La línea de "ahora", solo en la columna de hoy. */}
                {esHoy && ahoraVisible ? (
                  <View
                    style={[
                      estilos.ahora,
                      { top: distanciaDesdeArriba(minutosAhora, horaInicio) },
                    ]}
                  >
                    <View style={estilos.puntoAhora} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Ocupa el espacio que le deja la pantalla. El `paddingHorizontal` chico le
  // da más ancho a las columnas.
  contenedor: {
    flex: 1,
    paddingHorizontal: espaciado.xs,
  },

  // ----- Encabezado -----

  filaDias: {
    flexDirection: "row",
    paddingBottom: espaciado.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colores.bordeSuave,
  },

  huecoHoras: {
    width: ANCHO_HORAS,
  },

  // Cada día: `flex: 1` para repartir el ancho en partes iguales.
  celdaDia: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },

  nombreDia: {
    fontSize: 11,
    color: colores.textoTenue,
  },

  nombreHoy: {
    fontWeight: "700",
    color: colores.azulClaro,
  },

  // Círculo de 26 de diámetro (radio = mitad del lado) para el número del día.
  circuloDia: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  circuloHoy: {
    backgroundColor: colores.primario,
  },

  numeroDia: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  numeroHoy: {
    color: colores.blanco,
  },

  // ----- Cuerpo -----

  scroll: {
    flex: 1,
  },

  // Arriba: aire para el rótulo de la primera hora (que sobresale de su línea).
  // Abajo: el hueco de la barra de tabs flotante.
  contenido: {
    paddingTop: espaciado.sm,
    paddingBottom: espacioBajoTabs,
  },

  // Las columnas, una al lado de la otra. El alto lo pone el componente.
  cuerpo: {
    flexDirection: "row",
  },

  // Línea fina que cruza todas las columnas (deja libre la de las horas).
  linea: {
    position: "absolute",
    left: ANCHO_HORAS,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colores.bordeSuave,
  },

  columnaHoras: {
    width: ANCHO_HORAS,
  },

  rotuloHora: {
    position: "absolute",
    right: espaciado.xs,
    fontSize: 10,
    lineHeight: 12,
    color: colores.textoDebil,
  },

  // Una columna de día: línea vertical fina a la izquierda como separador.
  columnaDia: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colores.bordeSuave,
  },

  // La columna de hoy lleva un tinte azul suave.
  columnaHoy: {
    backgroundColor: colores.resaltadoHoy,
  },

  // La línea de "ahora": una raya fina que cruza la columna. El `top` va inline.
  ahora: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colores.alerta,
  },

  // Puntito a la izquierda de la raya; `top: -3` lo centra sobre ella (8 de alto).
  puntoAhora: {
    position: "absolute",
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colores.alerta,
  },
});

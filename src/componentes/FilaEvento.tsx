/**
 * ============================================================================
 * componentes/FilaEvento.tsx — Una fila de evento (clase, parcial, entrega)
 * ============================================================================
 *
 * QUÉ ES:
 *   Una fila con una barrita de color a la izquierda, el título del evento,
 *   horario y lugar, una etiqueta con el tipo (Clase / Parcial / Entrega) y una
 *   flechita. Al tocarla se ejecuta la función que le pasen (`alTocar`).
 *
 * POR QUÉ ES UN COMPONENTE APARTE:
 *   Se usa en Inicio, en "Hoy" y en "Próximas fechas". Es el mismo dibujo en
 *   los dos lugares, así que se escribe una sola vez. (La Agenda ya no la usa:
 *   dibuja cada evento como un bloque sobre la grilla, ver `BloqueEvento`.)
 *   [COMP] Reutilización.
 *
 * QUÉ NO HACE:
 *   No sabe navegar: recibe `alTocar` desde la pantalla, que es quien sabe
 *   adónde ir. Es una pieza de presentación pura ("los eventos suben": el
 *   componente avisa que lo tocaron, la pantalla decide qué hacer).
 *
 * TEORÍA:
 *   [COMP] Props, incluida una FUNCIÓN como prop (`alTocar`).
 *   [JS 19] Props con valor por defecto (`mostrarFecha = false`).
 *   [JS 22] Expresiones y condicionales dentro del JSX.
 *   [EST]  Estilos dinámicos por tipo de evento (`tema/eventos.ts`) y
 *          `alignSelf: "stretch"` para que la barrita ocupe todo el alto.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { etiquetasTipo, type Evento } from "@/datos/agenda";
import { colores, espaciado, radios } from "@/tema/colores";
import { estilosPorTipo } from "@/tema/eventos";
import { desdeClave, etiquetaRelativa } from "@/utilidades/fechas";

type Props = {
  evento: Evento;
  // Función que se ejecuta al tocar la fila (`() => void` = no recibe nada ni
  // devuelve nada).
  alTocar: () => void;
  /** Antepone "Hoy", "Mañana" o el día, para listas que mezclan fechas. */
  mostrarFecha?: boolean;
};

/** Fila de evento reutilizada en Inicio (Hoy y Próximas fechas). */
export function FilaEvento({ evento, alTocar, mostrarFecha = false }: Props) {
  // Los colores del tipo de este evento (acento, borde, fondo, ícono). Se busca
  // con el tipo como CLAVE del objeto: `estilosPorTipo["parcial"]`.
  const estilo = estilosPorTipo[evento.tipo];

  return (
    <Pressable
      onPress={alTocar}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
    >
      {/* Barrita vertical de color: azul para clases, otro color para parciales, etc. */}
      <View style={[estilos.barra, { backgroundColor: estilo.acento }]} />

      <View style={estilos.texto}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {evento.titulo}
        </Text>

        {/* Segunda línea: horario (o fecha + hora) y el lugar. */}
        <Text style={estilos.detalle} numberOfLines={1}>
          {/* Si `mostrarFecha` es true: "Mañana · 14:00". Si no: "14:00 - 16:00".
              `etiquetaRelativa` convierte la fecha en "Hoy", "Mañana" o el día
              (utilidades/fechas.ts). Ambos textos se arman con plantillas
              `${...}`. */}
          {mostrarFecha
            ? `${etiquetaRelativa(desdeClave(evento.fecha))} · ${evento.desde}`
            : `${evento.desde} - ${evento.hasta}`}
          {/* Si el evento tiene lugar (texto no vacío) se agrega " · Aula 302";
              si no, se agrega un texto vacío. */}
          {evento.lugar ? ` · ${evento.lugar}` : ""}
        </Text>
      </View>

      {/* Etiqueta con el tipo, con el borde y el texto del color del tipo. */}
      <View style={[estilos.etiquetaTipo, { borderColor: estilo.borde }]}>
        <Text style={[estilos.textoTipo, { color: estilo.acento }]}>
          {etiquetasTipo[evento.tipo]}
        </Text>
      </View>

      {/* Flechita que indica "se puede tocar para ver más". */}
      <Ionicons name="chevron-forward" size={16} color={colores.textoDebil} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // La fila: todos los elementos en horizontal y centrados verticalmente.
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.md,
  },

  presionada: {
    opacity: 0.7,
  },

  // La barrita de color. Ancho fijo de 3, pero `alignSelf: "stretch"` hace que
  // ocupe todo el alto de la fila (pisa el `alignItems: "center"` del padre).
  barra: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
  },

  // La columna de textos ocupa todo el ancho que sobra.
  texto: {
    flex: 1,
  },

  titulo: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.texto,
  },

  detalle: {
    marginTop: 3,
    fontSize: 12,
    color: colores.textoTenue,
  },

  // La pastillita con el tipo de evento (el color del borde va inline).
  etiquetaTipo: {
    borderRadius: radios.pastilla,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: espaciado.sm,
  },

  textoTipo: {
    fontSize: 10,
    fontWeight: "700",
  },
});

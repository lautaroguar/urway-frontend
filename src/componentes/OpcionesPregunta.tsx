/**
 * ============================================================================
 * componentes/OpcionesPregunta.tsx — Una pregunta con opciones para elegir una
 * ============================================================================
 *
 * QUÉ ES:
 *   Una pregunta con una lista de respuestas posibles, de las que se elige
 *   UNA (como los "radio buttons"). Arranca sin ninguna elegida y puede mostrar
 *   un mensaje de error debajo si no se respondió.
 *
 * POR QUÉ NO SE USA `ChipsFiltro`:
 *   Aquel siempre tiene una opción activa (sirve para filtrar). Una pregunta
 *   obligatoria necesita poder estar SIN responder.
 *
 * DÓNDE SE USA:
 *   `app/registro.tsx` ("¿A qué facultad vas?" y "¿Qué carrera cursás?") y
 *   `app/rendi.tsx` ("¿De qué materia?").
 *
 * TEORÍA:
 *   [JS 19] Props, incluida una prop función (`alElegir`) para avisar al padre.
 *   [JS 8]  `map` para dibujar una fila por opción, con `key` estable.
 *   [JS 22] Renderizado condicional (`cond ? <A /> : null`).
 *   [COMP]  `Pressable` con feedback vía `pressed`.
 *   [EST]   Un círculo hecho con `borderRadius` y un punto adentro.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

// Un `import type` trae solo el TIPO (no existe en la app ya compilada). Una
// `OpcionPregunta` es { clave, etiqueta }: lo que se guarda y lo que se lee.
import type { OpcionPregunta } from "@/datos/registro";
import { colores, espaciado, radios } from "@/tema/colores";

// Lo que recibe el componente. Cada campo se explica debajo.
type Props = {
  pregunta: string; // el enunciado ("¿A qué facultad vas?")
  opciones: OpcionPregunta[]; // las respuestas posibles
  /** La `clave` de la opción elegida, o `null` si todavía no se eligió ninguna. */
  valor: string | null;
  /** Se llama con la `clave` de la opción tocada. */
  alElegir: (clave: string) => void;
  /** Mensaje de error a mostrar debajo, o `null` si no hay. */
  // El `?` hace la prop OPCIONAL: se puede usar el componente sin pasarla.
  error?: string | null;
};

/** Pregunta con opciones de las que se elige una. */
// Las props se reciben desestructuradas: `{ pregunta, ... }: Props` saca cada
// campo del objeto de props y TypeScript verifica que coincidan con `Props`.
export function OpcionesPregunta({
  pregunta,
  opciones,
  valor,
  alElegir,
  error,
}: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.pregunta}>{pregunta}</Text>

      {/* Una fila por opción; `key` estable = su clave. */}
      {opciones.map((opcion) => {
        // `true` si ESTA es la opción elegida (la `clave` coincide con `valor`).
        const elegida = opcion.clave === valor;
        return (
          <Pressable
            key={opcion.clave}
            // Al tocar, se le avisa al padre CUÁL se eligió: él guarda la respuesta.
            onPress={() => alElegir(opcion.clave)}
            style={({ pressed }) => [
              estilos.opcion,
              elegida && estilos.opcionElegida, // resalta si es la elegida
              pressed && estilos.presionado, // y se atenúa mientras se aprieta
            ]}
          >
            {/* El círculo; si la opción está elegida, lleva un punto adentro. */}
            <View style={[estilos.circulo, elegida && estilos.circuloElegido]}>
              {elegida ? <View style={estilos.punto} /> : null}
            </View>
            <Text style={[estilos.etiqueta, elegida && estilos.etiquetaElegida]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}

      {/* El error solo se dibuja si hay uno (un texto no vacío cuenta como cierto). */}
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // La pregunta y sus opciones, una debajo de la otra con poco espacio.
  contenedor: {
    gap: espaciado.sm,
  },

  // El enunciado de la pregunta.
  pregunta: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.texto,
  },

  // Cada opción: círculo y texto en fila, dentro de una tarjeta con borde.
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
  },

  // La opción elegida resalta con borde y fondo azules.
  opcionElegida: {
    borderColor: colores.primario,
    backgroundColor: colores.primarioProfundo,
  },

  // El círculo de la izquierda (un cuadrado de 20×20 con `borderRadius` de pastilla es un círculo).
  circulo: {
    width: 20,
    height: 20,
    borderRadius: radios.pastilla,
    borderWidth: 2,
    borderColor: colores.textoDebil,
    alignItems: "center",
    justifyContent: "center",
  },

  // Se suma a `circulo` en la opción elegida: el borde se pinta de azul.
  circuloElegido: {
    borderColor: colores.azulClaro,
  },

  // El puntito de adentro, que aparece solo en la opción elegida.
  punto: {
    width: 10,
    height: 10,
    borderRadius: radios.pastilla,
    backgroundColor: colores.azulClaro,
  },

  // El texto de la opción; `flex: 1` lo deja ocupar el resto de la fila.
  etiqueta: {
    flex: 1,
    fontSize: 15,
    color: colores.textoSuave,
  },

  // Se suma a `etiqueta` en la opción elegida: más gruesa y de otro color.
  etiquetaElegida: {
    fontWeight: "600",
    color: colores.azulPalido,
  },

  // El mensaje de error ("Elegí una opción"), debajo de las opciones.
  error: {
    fontSize: 12,
    color: colores.alerta,
  },

  // Se suma a una opción mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.7,
  },
});

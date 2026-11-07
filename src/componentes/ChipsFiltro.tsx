/**
 * ============================================================================
 * componentes/ChipsFiltro.tsx — Fila de filtros tipo "chips"
 * ============================================================================
 *
 * QUÉ ES:
 *   Una fila de botones redondeados de los cuales UNO está seleccionado (por
 *   ejemplo "Todas · En curso · Aprobadas · Bloqueadas" en Plan).
 *
 * COMPONENTE "CONTROLADO":
 *   No guarda nada: recibe cuál está seleccionado (`valor`) y avisa cuando el
 *   usuario elige otro (`alCambiar`). El estado (`useState`) vive en la
 *   PANTALLA que lo usa. Así, la pantalla puede usar ese mismo valor para
 *   filtrar su lista.
 *
 * DÓNDE SE USA:
 *   Plan (filtro por estado), Conectar (Todos / Personas / Links oficiales), el
 *   detalle de una materia (solapas), los formularios de eventos y de "Rendí",
 *   la privacidad del perfil y el filtro de apuntes del perfil de un compañero.
 *
 * TEORÍA:
 *   [JS 23] Componentes controlados: el valor viene de arriba (props) y el
 *           cambio sube (callback). "Datos bajan, eventos suben."
 *   [COMP]  Props, `Pressable` con `pressed`.
 *   [EST]   `flexWrap: "wrap"` para que las opciones pasen a la línea de abajo
 *           cuando no entran.
 *   [JS 8]  `map` para dibujar una lista.
 *   TypeScript: componente GENÉRICO (`<T extends string>`), ver abajo.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, espaciado, radios } from "@/tema/colores";

// GENÉRICO: `T` es un "tipo a elegir". `T extends string` significa "T tiene
// que ser un texto (o una unión de textos literales)". Sirve para que quien use
// el componente indique sus propias opciones, por ejemplo
// `"todas" | "cursando"`, y TypeScript verifique que `valor` y `clave` sean
// SOLO de esas opciones.
export type OpcionChip<T extends string> = {
  clave: T; // el identificador de la opción (lo que se guarda en el estado)
  etiqueta: string; // el texto que se ve en el chip
};

type Props<T extends string> = {
  opciones: OpcionChip<T>[]; // todas las opciones, en orden
  valor: T; // la clave de la opción seleccionada
  alCambiar: (clave: T) => void; // función a llamar cuando se toca un chip
};

/**
 * Fila de filtros tipo "chips". Usa `flexWrap: "wrap"` para que, si las opciones
 * no entran en una línea, pasen a la siguiente en vez de salirse de la pantalla.
 */
export function ChipsFiltro<T extends string>({
  opciones,
  valor,
  alCambiar,
}: Props<T>) {
  return (
    <View style={estilos.fila}>
      {/* Un chip por cada opción [JS 8]. */}
      {opciones.map((opcion) => {
        // ¿Es esta la opción seleccionada? Compara la clave con el valor actual.
        const activo = opcion.clave === valor;

        return (
          <Pressable
            key={opcion.clave} // clave estable y única
            // Al tocar, se AVISA hacia arriba cuál se eligió. La flecha es
            // necesaria: `alCambiar(opcion.clave)` sin flecha se ejecutaría al
            // dibujar, no al tocar.
            onPress={() => alCambiar(opcion.clave)}
            // Estilos según el estado: base + (si está activo) + (si se aprieta).
            style={({ pressed }) => [
              estilos.chip,
              activo && estilos.chipActivo,
              pressed && estilos.chipPresionado,
            ]}
          >
            <Text style={[estilos.texto, activo && estilos.textoActivo]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  // La fila: chips uno al lado del otro (`row`), que pasan a la línea siguiente
  // si no entran (`wrap`). `gap` separa los chips tanto en horizontal como en
  // vertical.
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espaciado.sm,
  },

  // Chip sin seleccionar: fondo oscuro con borde suave.
  chip: {
    borderRadius: radios.pastilla,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficie,
    paddingVertical: 7,
    paddingHorizontal: espaciado.md,
  },

  // Chip seleccionado: azul relleno (pisa borde y fondo del `chip`).
  chipActivo: {
    borderColor: colores.primario,
    backgroundColor: colores.primario,
  },

  // Mientras se aprieta se ve un poco transparente.
  chipPresionado: {
    opacity: 0.65,
  },

  texto: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  // Texto del chip seleccionado: blanco y más grueso.
  textoActivo: {
    color: colores.blanco,
    fontWeight: "600",
  },
});

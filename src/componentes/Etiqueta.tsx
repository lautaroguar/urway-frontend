/**
 * ============================================================================
 * componentes/Etiqueta.tsx — Pastilla chica de estado
 * ============================================================================
 *
 * QUÉ ES:
 *   Una "pastilla" con texto en mayúsculas y, opcionalmente, un ícono. Ejemplos:
 *   "EN CURSO", "APROBADA", "BLOQUEADA", "EN COMÚN".
 *
 * DÓNDE SE USA:
 *   Plan (estado de cada materia), detalle de materia, perfiles y Conectar.
 *
 * TEORÍA:
 *   [JS 19] Props con valor por defecto (`color`, `fondo`) y props opcionales.
 *   [JS 22] Renderizado condicional: `condición ? <A /> : null`.
 *   [EST]   `alignSelf: "flex-start"` para que la pastilla ocupe solo el ancho
 *           de su contenido en lugar de estirarse.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  texto: string; // obligatorio
  color?: string; // color del texto y del ícono (opcional)
  fondo?: string; // color del fondo (opcional)
  icono?: keyof typeof Ionicons.glyphMap; // nombre de un ícono (opcional)
};

/** Pastilla chica de estado ("En curso", "Aprobada", "Activa"). */
export function Etiqueta({
  texto,
  // Si no se pasan, se usa la combinación azul de la marca.
  color = colores.azulClaro,
  fondo = colores.primarioProfundo,
  icono,
}: Props) {
  return (
    // El fondo es dinámico (viene por prop), por eso va como estilo inline junto
    // al estilo fijo.
    <View style={[estilos.etiqueta, { backgroundColor: fondo }]}>
      {/* Renderizado condicional [JS 22]: si se pasó un ícono, se dibuja; si no,
          `null` (nada). No se puede usar un `if` dentro del JSX, pero sí un
          ternario (`cond ? algo : otraCosa`). */}
      {icono ? <Ionicons name={icono} size={11} color={color} /> : null}
      <Text style={[estilos.texto, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Ícono y texto en fila. `alignSelf: "flex-start"` evita que la pastilla se
  // estire hasta ocupar todo el ancho del contenedor.
  etiqueta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: espaciado.xs,
    borderRadius: radios.pastilla, // extremos redondos
    paddingVertical: 4,
    paddingHorizontal: espaciado.sm,
  },

  // `textTransform: "uppercase"` muestra el texto en mayúsculas sin cambiar el
  // string original.
  texto: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});

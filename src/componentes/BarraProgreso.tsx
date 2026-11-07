/**
 * ============================================================================
 * componentes/BarraProgreso.tsx — Barra de progreso de 0 a 100 %
 * ============================================================================
 *
 * QUÉ ES:
 *   Una barra horizontal que se rellena según un valor entre 0 y 1.
 *
 * CÓMO ESTÁ ARMADA (dos View, uno dentro de otro):
 *   - el "riel": el fondo de la barra, siempre a lo ancho completo;
 *   - el "relleno": adentro del riel, con un ancho en PORCENTAJE.
 *
 * DÓNDE SE USA:
 *   Inicio y Plan (avance de la carrera: materias aprobadas sobre el total).
 *
 * TEORÍA:
 *   [COMP] Props tipadas y valores por defecto.
 *   [EST]  Los anchos pueden ser números (dp) o strings de porcentaje ("55%").
 *   [JS 25] Valor DERIVADO: `porcentaje` se calcula en el render a partir de la
 *           prop; no se guarda en un estado.
 */
import { StyleSheet, View } from "react-native";

import { colores, radios } from "@/tema/colores";

type Props = {
  /** Valor entre 0 y 1. Se recorta si viene fuera de rango. */
  valor: number;
  color?: string; // color del relleno (opcional)
  alto?: number; // grosor de la barra en dp (opcional)
};

// Los valores por defecto se escriben en la desestructuración:
// si no se pasa `color`, es el azul primario; si no se pasa `alto`, es 6.
export function BarraProgreso({
  valor,
  color = colores.primario,
  alto = 6,
}: Props) {
  // Convierte 0..1 en un entero de 0 a 100, "recortando" los valores raros:
  //   Math.max(valor, 0)  → nunca menos de 0
  //   Math.min(..., 1)    → nunca más de 1
  //   * 100               → pasa a porcentaje
  //   Math.round          → redondea al entero más cercano
  const porcentaje = Math.round(Math.min(Math.max(valor, 0), 1) * 100);

  return (
    // El riel: el alto y las esquinas dependen de la prop `alto` (por eso van
    // inline y no en el StyleSheet). Redondeado a la mitad del alto = extremos curvos.
    <View style={[estilos.riel, { height: alto, borderRadius: alto / 2 }]}>
      {/* El relleno. El ancho es un TEXTO con porcentaje, construido con una
          plantilla (template literal): 55 → "55%". Es un ancho relativo al riel. */}
      <View
        style={[
          estilos.relleno,
          {
            width: `${porcentaje}%`,
            backgroundColor: color,
            borderRadius: alto / 2,
          },
        ]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  // El fondo de la barra: ocupa todo el ancho disponible. `overflow: "hidden"`
  // hace que el relleno no se salga de las esquinas redondeadas.
  riel: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: colores.pizarra,
    borderRadius: radios.sm,
  },

  // El relleno ocupa todo el alto del riel; el ancho lo pone el componente.
  relleno: {
    height: "100%",
  },
});

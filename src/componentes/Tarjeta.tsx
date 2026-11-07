/**
 * ============================================================================
 * componentes/Tarjeta.tsx — La superficie base de todas las tarjetas
 * ============================================================================
 *
 * QUÉ ES:
 *   Un contenedor con fondo, borde redondeado, relleno y sombra. Todo lo que
 *   en la app se ve como una "tarjeta" (Inicio, Plan, detalles, perfiles...)
 *   es una `<Tarjeta>` con contenido adentro.
 *
 * POR QUÉ EXISTE:
 *   Para que todas las tarjetas se vean IGUAL sin repetir el estilo, y para que
 *   un cambio de diseño se haga en un solo lugar. Es un componente
 *   "contenedor": no muestra datos, envuelve a otros.
 *
 * TEORÍA:
 *   [JS 19] Props y `children`: lo que se escribe entre `<Tarjeta>` y
 *           `</Tarjeta>` llega en la prop `children`.
 *   [COMP]  Composición: un componente sencillo reutilizable.
 *   [EST]   Un estilo propio se puede ampliar desde afuera pasando un arreglo de
 *           estilos: `style={[base, extra]}` (el último gana).
 *   [EST]   Sombras: `...sombraTarjeta` copia las propiedades `shadow*` de iOS
 *           y `elevation` de Android [JS 7 spread].
 */
// `ReactNode` = "cualquier cosa que React pueda dibujar" (texto, componentes,
// listas...). Solo se importa el TIPO.
import type { ReactNode } from "react";
// `StyleProp<ViewStyle>` es el tipo de un estilo de `View` (puede ser un objeto,
// un arreglo de estilos, `false`, `undefined`...).
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colores, espaciado, radios, sombraTarjeta } from "@/tema/colores";

type Props = {
  children: ReactNode; // el contenido de la tarjeta
  style?: StyleProp<ViewStyle>; // estilo extra opcional que agrega quien la usa
};

/** Superficie base de todas las tarjetas del diseño. */
export function Tarjeta({ children, style }: Props) {
  // Primero el estilo de la tarjeta, después el que llegó por props: así, quien
  // usa la tarjeta puede agregar o pisar cosas (por ejemplo `alignItems: "center"`).
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    padding: espaciado.lg,
    // Copia acá todas las propiedades de la sombra (ver `tema/colores.ts`).
    ...sombraTarjeta,
  },
});

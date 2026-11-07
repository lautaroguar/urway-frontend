/**
 * ============================================================================
 * componentes/FilaDeslizable.tsx — Una fila que se desliza para mostrar acciones
 * ============================================================================
 *
 * QUÉ ES:
 *   Envuelve el contenido de una fila de una lista y le agrega un deslizamiento
 *   horizontal que descubre un botón de acción detrás, como en las listas de Mail
 *   o de Mensajes:
 *
 *        deslizar hacia la DERECHA  →  aparece `accionDerecha`  (a la izquierda)
 *        deslizar hacia la IZQUIERDA ← aparece `accionIzquierda` (a la derecha)
 *
 *     ┌────────────┬──────────────────────────┐
 *     │ ✓ Aceptar  │  Fila (se corrió a la →) │
 *     └────────────┴──────────────────────────┘
 *
 *   Cada acción es opcional: sin `accionDerecha` no se puede deslizar hacia la
 *   derecha, y sin ninguna de las dos la fila queda quieta.
 *
 * DESLIZAR NO EJECUTA NADA SOLO:
 *   Deslizar solo DESCUBRE el panel; la acción se ejecuta recién al TOCARLO
 *   (como en la ppt: el panel de «Borrar» es un botón). Así no se rechaza una
 *   solicitud por rozar la fila sin querer. Después de tocarlo la fila se cierra.
 *
 * UN GESTO NUNCA ES LA ÚNICA FORMA DE HACER ALGO:
 *   Quien use un lector de pantalla o un mouse no puede deslizar. Por eso lo que
 *   se hace deslizando tiene que poder hacerse también con un botón común dentro
 *   de la fila [GESTOS 24 y 26]. Quien usa este componente se encarga de eso.
 *
 * LO DIFÍCIL YA VIENE RESUELTO:
 *   `ReanimatedSwipeable` trae la física (rebote, umbral para abrir o cerrar) y
 *   resuelve el conflicto con el scroll vertical de la lista: no hace falta
 *   escribir `activeOffsetX` / `failOffsetY` a mano [GESTOS 21 y 24].
 *
 * TEORÍA:
 *   [GESTOS 24] `ReanimatedSwipeable`: `renderLeftActions` / `renderRightActions`,
 *               `friction` y `leftThreshold` / `rightThreshold`.
 *   [GESTOS 26] Accesibilidad: el gesto siempre tiene un equivalente tocable.
 *   [COMP]      Props, `children`, y una función como prop (`alActivar`): "los
 *               datos bajan, los eventos suben".
 *   [EST]       Un panel de ancho fijo, con el contenido centrado en columna.
 */
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { colores } from "@/tema/colores";

/** Lo que se muestra y lo que pasa en uno de los dos paneles. */
export type AccionDeslizable = {
  texto: string;
  icono: keyof typeof Ionicons.glyphMap;
  /** Color de fondo del panel. */
  fondo: string;
  /** Color del texto y del ícono. */
  color: string;
  /** Se ejecuta al TOCAR el panel. */
  alActivar: () => void;
};

type Props = {
  /** El panel que se descubre al deslizar hacia la DERECHA (queda a la izquierda). */
  accionDerecha?: AccionDeslizable;
  /** El panel que se descubre al deslizar hacia la IZQUIERDA (queda a la derecha). */
  accionIzquierda?: AccionDeslizable;
  /** La fila. Tiene que tener fondo propio: si no, se vería el panel detrás. */
  children: ReactNode;
};

/** Una fila que se desliza hacia los costados para mostrar una acción. */
export function FilaDeslizable({ accionDerecha, accionIzquierda, children }: Props) {
  return (
    <ReanimatedSwipeable
      // `friction`: cuánto "cuesta" arrastrar (2 = la fila avanza la mitad que el dedo).
      friction={2}
      // Hasta dónde hay que arrastrar para que se abra al soltar.
      leftThreshold={40}
      rightThreshold={40}
      // No dejar pasar el ancho del panel (sin "rebote" de más).
      overshootLeft={false}
      overshootRight={false}
      // Un lado sin acción no se abre: `undefined` = no hay panel de ese lado.
      renderLeftActions={
        accionDerecha
          ? (_progreso, _traslado, metodos) => <Panel accion={accionDerecha} metodos={metodos} />
          : undefined
      }
      renderRightActions={
        accionIzquierda
          ? (_progreso, _traslado, metodos) => <Panel accion={accionIzquierda} metodos={metodos} />
          : undefined
      }
      // El fondo de la fila: opaco, para tapar el panel mientras está cerrada.
      childrenContainerStyle={estilos.fondoFila}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): el panel que se descubre
// ---------------------------------------------------------------------------

function Panel({
  accion,
  metodos,
}: {
  accion: AccionDeslizable;
  metodos: SwipeableMethods;
}) {
  return (
    <Pressable
      onPress={() => {
        accion.alActivar();
        // Cierra la fila: si la acción falla, queda como estaba, lista para reintentar.
        metodos.close();
      }}
      accessibilityRole="button"
      accessibilityLabel={accion.texto}
      style={({ pressed }) => [
        estilos.panel,
        { backgroundColor: accion.fondo },
        pressed && estilos.presionado,
      ]}
    >
      <Ionicons name={accion.icono} size={20} color={accion.color} />
      <Text style={[estilos.textoPanel, { color: accion.color }]}>{accion.texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // Mismo fondo que las tarjetas de las listas (`Tarjeta`, el grupo de notificaciones).
  fondoFila: {
    backgroundColor: colores.superficieAlta,
  },

  // El panel: ancho fijo y alto igual al de la fila (el contenedor lo estira). Ícono
  // y texto centrados, uno debajo del otro.
  panel: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  textoPanel: {
    fontSize: 12,
    fontWeight: "700",
  },

  presionado: {
    opacity: 0.7,
  },
});

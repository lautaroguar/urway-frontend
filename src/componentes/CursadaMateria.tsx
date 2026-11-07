/**
 * ============================================================================
 * componentes/CursadaMateria.tsx — Arrancar y abandonar la cursada de una materia
 * ============================================================================
 *
 * QUÉ ES:
 *   Dos tarjetas del detalle de una materia:
 *
 *   `ArrancarCursada` — Para una materia DISPONIBLE (se desbloqueó al aprobar la
 *     cursada de sus correlativas y todavía no se arrancó). Es lo único que se puede
 *     hacer con ella: tocar «Arrancar la cursada». Recién ahí la materia pasa a
 *     «En curso» y se muestra la pantalla completa (estado, historial, reseña,
 *     apuntes).
 *
 *   `AbandonarCursada` — Al final de la pantalla de una materia que se está
 *     cursando, por si se tocó «Arrancar» sin querer o se decide dejarla. Pide
 *     confirmación en la misma pantalla. Al abandonar:
 *       - la reseña propia se borra: deja de contar en la dificultad que ven los demás;
 *       - se borra lo cargado en esta cursada (parciales, TP...);
 *       - la materia vuelve a estar DISPONIBLE para anotarse de nuevo.
 *     No se puede abandonar una cursada ya aprobada (pendiente de final o aprobada):
 *     en ese caso, en lugar del botón se explica por qué.
 *
 * POR QUÉ LA CONFIRMACIÓN ES EN LA PANTALLA Y NO UN `Alert`:
 *   `Alert.alert` con varios botones no funciona en la versión web de la app; un
 *   bloque que aparece en la misma pantalla anda igual en iOS, Android y web (es lo
 *   mismo que hace «Eliminar» en el detalle de un evento).
 *
 * TEORÍA:
 *   [JS 20] `useState` para mostrar la confirmación y el estado «guardando».
 *   [JS 14] `async/await` + `try/catch`; los errores del servidor se muestran.
 *   [CTX]   `arrancarCursada` y `abandonarCursada` vienen del Context de datos.
 *   [COMP]  `Tarjeta`, `Pressable` con `pressed`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { mensajeDe } from "@/api/cliente";
import { Tarjeta } from "@/componentes/Tarjeta";
import type { Materia } from "@/datos/carrera";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  materia: Materia;
};

// ---------------------------------------------------------------------------
// ARRANCAR
// ---------------------------------------------------------------------------

/** La tarjeta de una materia disponible, con el botón «Arrancar la cursada». */
export function ArrancarCursada({ materia }: Props) {
  const { arrancarCursada } = useDatos();
  const [arrancando, setArrancando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const arrancar = async () => {
    if (arrancando) return;
    setArrancando(true);
    setError(null);
    try {
      await arrancarCursada(materia.id);
      // La materia pasa a «En curso» y la pantalla se redibuja sola con todo.
    } catch (e) {
      setError(mensajeDe(e));
      setArrancando(false);
    }
  };

  return (
    <Tarjeta style={estilos.tarjeta}>
      <Text style={estilos.rotulo}>Podés cursarla</Text>
      <Text style={estilos.texto}>
        Esta materia está disponible: ya tenés aprobada la cursada de lo que pide. Cuando
        la arranques vas a poder cargar lo que rindas, dejar tu reseña de dificultad y
        subir apuntes.
      </Text>

      {/* Las correlativas que la desbloquearon, con su tilde. */}
      {materia.correlativas.length > 0 ? (
        <View style={estilos.correlativas}>
          {materia.correlativas.map((correlativa) => (
            <View key={correlativa.id} style={estilos.filaCorrelativa}>
              <Ionicons name="checkmark-circle" size={16} color={colores.azulClaro} />
              <Text style={estilos.textoCorrelativa}>{correlativa.nombre}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={estilos.error}>{error}</Text> : null}

      <Pressable
        onPress={arrancar}
        disabled={arrancando}
        style={({ pressed }) => [
          estilos.botonPrincipal,
          arrancando && estilos.apagado,
          pressed && estilos.presionado,
        ]}
      >
        <Ionicons name="play-circle-outline" size={20} color={colores.blanco} />
        <Text style={estilos.textoPrincipal}>
          {arrancando ? "Arrancando…" : "Arrancar la cursada"}
        </Text>
      </Pressable>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// ABANDONAR
// ---------------------------------------------------------------------------

/** El botón «Abandonar cursada» (con su confirmación) o, si ya aprobó, el motivo. */
export function AbandonarCursada({ materia }: Props) {
  const { abandonarCursada } = useDatos();
  const [confirmando, setConfirmando] = useState(false);
  const [abandonando, setAbandonando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Una cursada ya aprobada no se abandona: se explica en lugar de ofrecer el botón.
  if (materia.estado === "pendienteFinal" || materia.estado === "aprobada") {
    return (
      <View style={estilos.nota}>
        <Ionicons name="information-circle-outline" size={16} color={colores.textoTenue} />
        <Text style={estilos.textoNota}>
          Ya aprobaste la cursada de esta materia, así que no se puede abandonar.
        </Text>
      </View>
    );
  }
  // Solo se abandona lo que se está cursando.
  if (materia.estado !== "cursando") return null;

  const abandonar = async () => {
    if (abandonando) return;
    setAbandonando(true);
    setError(null);
    try {
      await abandonarCursada(materia.id);
      // La materia vuelve a «Disponible» y la pantalla se redibuja sola.
    } catch (e) {
      setError(mensajeDe(e));
      setAbandonando(false);
    }
  };

  // La confirmación, en la misma pantalla.
  if (confirmando) {
    return (
      <View style={estilos.confirmacion}>
        <Text style={estilos.textoConfirmacion}>¿Abandonar la cursada de {materia.nombre}?</Text>
        <Text style={estilos.detalleConfirmacion}>
          Se borra tu reseña (deja de contar para la dificultad) y lo que cargaste en esta
          cursada. La materia vuelve a quedar disponible para anotarte de nuevo.
        </Text>
        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Pressable
          onPress={abandonar}
          disabled={abandonando}
          style={({ pressed }) => [
            estilos.botonPeligro,
            abandonando && estilos.apagado,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons name="exit-outline" size={18} color={colores.alerta} />
          <Text style={estilos.textoPeligro}>
            {abandonando ? "Abandonando…" : "Sí, abandonar"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setConfirmando(false)}
          disabled={abandonando}
          style={({ pressed }) => [estilos.botonNeutro, pressed && estilos.presionado]}
        >
          <Ionicons name="arrow-back" size={18} color={colores.azulClaro} />
          <Text style={estilos.textoNeutro}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setConfirmando(true)}
      style={({ pressed }) => [estilos.botonPeligro, pressed && estilos.presionado]}
    >
      <Ionicons name="exit-outline" size={18} color={colores.alerta} />
      <Text style={estilos.textoPeligro}>Abandonar cursada</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: espaciado.md,
  },

  // El rótulo chico en mayúsculas.
  rotulo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  texto: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSecundario,
  },

  correlativas: {
    gap: espaciado.xs,
  },

  filaCorrelativa: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },

  textoCorrelativa: {
    fontSize: 13,
    color: colores.textoSuave,
  },

  // El botón azul y a todo el ancho de «Arrancar la cursada».
  botonPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    height: 46,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
  },

  textoPrincipal: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  // Botón de ancho completo con borde y texto rojizo («Abandonar»).
  botonPeligro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    paddingVertical: espaciado.md + 2,
  },

  textoPeligro: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.alerta,
  },

  botonNeutro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    paddingVertical: espaciado.md + 2,
  },

  textoNeutro: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // La confirmación: un recuadro rojizo con la pregunta, la explicación y los botones.
  confirmacion: {
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.alerta,
    padding: espaciado.md,
  },

  textoConfirmacion: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.alerta,
  },

  detalleConfirmacion: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSecundario,
  },

  // La aclaración de por qué no se puede abandonar una cursada aprobada.
  nota: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.sm,
  },

  textoNota: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },

  error: {
    fontSize: 12,
    color: colores.alerta,
  },

  apagado: {
    opacity: 0.5,
  },

  presionado: {
    opacity: 0.7,
  },
});

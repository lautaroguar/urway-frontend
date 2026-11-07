/**
 * ============================================================================
 * componentes/EstadoDeMateria.tsx — Cómo está la materia y cómo sigue
 * ============================================================================
 *
 * QUÉ ES:
 *   La tarjeta del detalle de una materia que explica en qué estado está y qué
 *   falta, con el botón "Cargar lo que rendí". Ya NO tiene un selector para
 *   cambiar el estado a mano: el estado se AUTOGESTIONA a partir de lo que el
 *   estudiante carga (parciales, recuperatorios, TP, exposiciones y finales).
 *
 *     En curso            → "Cargá cada cosa que rindas; en la última, marcá
 *                            «Terminé de cursar»."
 *     Pendiente de final  → "Terminaste de cursar el 15/06. Te queda el final."
 *     Aprobada            → la nota del final, en grande, y cuándo se aprobó.
 *     Bloqueada           → se explica por qué no se puede cursar: qué correlativas
 *                           faltan (hay que aprobar su CURSADA).
 *     Disponible          → no dibuja nada: esa tarjeta es `ArrancarCursada`.
 *
 * DÓNDE SE USA:
 *   `app/materia/[id].tsx`, arriba del historial (`HistorialMateria`).
 *
 * DE DÓNDE SALE EL ESTADO:
 *   De la materia que llega por props, que ya viene calculada a partir de su
 *   historial (el backend la calcula con `recorrerHistorial`, `backend/src/reglas.ts`).
 *
 * TEORÍA:
 *   [COMP]  Props, `Tarjeta`, `Pressable` con `pressed`.
 *   [JS 22] Renderizado condicional: retorno temprano y ternarios.
 *   [JS 25] Todo lo que se muestra se deriva de la materia (sin `useState`).
 *   [NAV]   `router.push` con parámetros para abrir el formulario "Rendí".
 */
// Íconos de Ionicons (el candado, el lápiz, el trofeo).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Tarjeta } from "@/componentes/Tarjeta";
import type { Materia } from "@/datos/carrera";
import { colores, espaciado, radios } from "@/tema/colores";
import { aTextoFecha } from "@/utilidades/fechas";
import { correlativasFaltantes } from "@/utilidades/materias";

// Lo que recibe el componente: la materia (con su estado y su historial actuales).
type Props = {
  materia: Materia;
};

/** Tarjeta con el estado de la materia, qué falta y el botón para cargar lo rendido. */
export function EstadoDeMateria({ materia }: Props) {
  const router = useRouter();

  // RETORNOS TEMPRANOS: una materia bloqueada no se puede cursar ni cargar nada, y
  // una disponible se muestra con su propia tarjeta (`ArrancarCursada`).
  if (materia.estado === "disponible") return null;
  if (materia.estado === "bloqueada") {
    // Las correlativas que todavía no se cumplen: "Cálculo Elemental, Informática General".
    const faltan = correlativasFaltantes(materia);
    return (
      <Tarjeta style={estilos.bloqueada}>
        <Ionicons name="lock-closed" size={18} color={colores.textoDebil} />
        <Text style={estilos.textoBloqueada}>
          Esta materia está bloqueada: todavía no la podés cursar.
          {faltan.length > 0
            ? ` Para desbloquearla tenés que aprobar la cursada de: ${faltan.join(", ")}.`
            : ""}
        </Text>
      </Tarjeta>
    );
  }

  // El día en que se aprobó: la fecha del paso del historial que la aprobó.
  // `find` devuelve el primero que cumple (o `undefined`); `?.` evita el error si no hay.
  const aprobadaEl = materia.historial.find((paso) => paso.efecto === "aprueba")
    ?.instancia.fecha;

  // Qué falta, según el estado. Es un valor DERIVADO: se calcula en cada render.
  const ayuda =
    materia.estado === "cursando"
      ? "Cargá cada parcial, recuperatorio, TP o exposición que rindas. En el último, marcá «Terminé de cursar» y la materia pasa sola a pendiente de final."
      : materia.estado === "pendienteFinal"
        ? `Terminaste de cursar${
            materia.finCursada ? ` el ${aTextoFecha(materia.finCursada)}` : ""
          }. Te queda el final: cuando lo rindas, cargá la nota y la materia se aprueba sola.`
        : "Aprobaste el final. La nota ya cuenta para tu promedio.";

  return (
    <Tarjeta style={estilos.tarjeta}>
      <Text style={estilos.rotulo}>Estado de la materia</Text>

      {/* Aprobada: la nota del final en grande y la fecha. */}
      {materia.estado === "aprobada" && materia.notaFinal !== undefined ? (
        <View style={estilos.filaNota}>
          <Ionicons name="ribbon-outline" size={26} color={colores.azulClaro} />
          <View style={estilos.textosNota}>
            <Text style={estilos.rotuloNota}>Nota del final</Text>
            <Text style={estilos.valorNota}>{materia.notaFinal}</Text>
          </View>
          {aprobadaEl ? (
            <Text style={estilos.fechaNota}>{aTextoFecha(aprobadaEl)}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Si está recursando, se avisa en qué intento va. */}
      {materia.estado === "cursando" && materia.intento > 1 ? (
        <Text style={estilos.intento}>
          Estás recursando la materia (cursada {materia.intento}).
        </Text>
      ) : null}

      <Text style={estilos.ayuda}>{ayuda}</Text>

      {/* El botón solo tiene sentido si todavía queda algo por rendir. */}
      {materia.estado !== "aprobada" ? (
        <Pressable
          // `params`: la materia viaja en la ruta y el formulario ya la trae elegida.
          onPress={() =>
            router.push({ pathname: "/rendi", params: { materiaId: materia.id } })
          }
          style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
        >
          <Ionicons name="create-outline" size={18} color={colores.blanco} />
          <Text style={estilos.textoBoton}>
            {materia.estado === "pendienteFinal"
              ? "Cargar el final"
              : "Cargar lo que rendí"}
          </Text>
        </Pressable>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  // La tarjeta: `gap` separa el rótulo, la nota, la ayuda y el botón.
  tarjeta: {
    gap: espaciado.md,
  },

  // El rótulo chico en mayúsculas ("Estado de la materia").
  // `textTransform` no cambia el texto escrito, solo cómo se ve.
  rotulo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  // La nota del final: ícono, textos y fecha en fila, sobre fondo azul oscuro.
  filaNota: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.md,
    backgroundColor: colores.primarioProfundo,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },

  // `flex: 1`: los textos ocupan lo que sobra y empujan la fecha a la derecha.
  textosNota: {
    flex: 1,
  },

  rotuloNota: {
    fontSize: 12,
    color: colores.azulPalido,
  },

  valorNota: {
    fontSize: 22,
    fontWeight: "700",
    color: colores.texto,
  },

  fechaNota: {
    fontSize: 12,
    color: colores.azulPalido,
  },

  // "Estás recursando la materia (cursada 2)".
  intento: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // El texto de ayuda. `lineHeight` es la altura de cada renglón.
  ayuda: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSecundario,
  },

  // El botón principal, azul y a todo el ancho.
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    height: 44,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
  },

  textoBoton: {
    fontSize: 14,
    fontWeight: "700",
    color: colores.blanco,
  },

  // Se suma al botón mientras se aprieta: queda un poco transparente.
  presionado: {
    opacity: 0.75,
  },

  // La tarjeta de una materia bloqueada: ícono y texto en fila.
  bloqueada: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
  },

  // `flex: 1` lo deja bajar de renglón sin empujar el candado.
  textoBloqueada: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colores.textoDebil,
  },
});

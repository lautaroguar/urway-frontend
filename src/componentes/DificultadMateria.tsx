/**
 * ============================================================================
 * componentes/DificultadMateria.tsx — Dificultad estimada y MI reseña
 * ============================================================================
 *
 * QUÉ ES:
 *   La tarjeta de dificultad del detalle de una materia. Arriba, la dificultad
 *   estimada: el promedio de las reseñas de los estudiantes, con estrellas y cuántas
 *   reseñas son. Si el estudiante está cursando la materia (`puedeResenar`), abajo
 *   hay cinco estrellas para dejar SU reseña.
 *
 * CÓMO FUNCIONA LA RESEÑA:
 *   1. Tocar una estrella elige cuántas (1 a 5). Todavía no se guardó nada.
 *   2. Mientras la elección sea distinta de la reseña guardada, aparece el botón
 *      «Guardar reseña».
 *   3. Al guardar, el servidor guarda o CAMBIA mi reseña (una sola por estudiante y
 *      materia) y la dificultad se recalcula con ella.
 *   4. Volver a elegir otra cantidad y guardar modifica la reseña original.
 *   La dificultad se vuelve a calcular cada vez que se entra a la materia (la
 *   pantalla pide las materias de nuevo al abrirse): ve las reseñas de ese momento.
 *
 * SI NO ESTÁ CURSANDO:
 *   (Materia disponible o bloqueada.) Solo se ve la dificultad estimada: no se
 *   puede reseñar una materia que no se cursa.
 *
 * TEORÍA:
 *   [JS 23] La elección de estrellas es un estado local (`eleccion`): «los datos
 *           bajan, los eventos suben».
 *   [JS 25] `hayCambio` se DERIVA de la elección y de la reseña guardada.
 *   [JS 26] `useEffect` para que la elección siga a la reseña guardada si cambia.
 *   [JS 14] `async/await` + `try/catch` al guardar.
 *   [COMP]  `Tarjeta`, `Ionicons` y `Pressable`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { mensajeDe } from "@/api/cliente";
import { Tarjeta } from "@/componentes/Tarjeta";
import type { Materia } from "@/datos/carrera";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  materia: Materia;
  /** `true` si está cursando la materia (o ya la cursó): puede dejar su reseña. */
  puedeResenar: boolean;
};

/** La tarjeta de dificultad estimada y, si corresponde, la reseña del estudiante. */
export function DificultadMateria({ materia, puedeResenar }: Props) {
  const { guardarResenia } = useDatos();
  // Las estrellas que el estudiante tiene elegidas (0 = ninguna). Arranca en su
  // reseña guardada, si ya dejó una.
  const [eleccion, setEleccion] = useState(materia.miResenia ?? 0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [JS 26] Si la reseña guardada cambia (por ejemplo, al volver a pedir la materia),
  // la elección la sigue.
  useEffect(() => {
    setEleccion(materia.miResenia ?? 0);
  }, [materia.miResenia]);

  // ESTADO DERIVADO [JS 25]: ¿lo elegido es distinto de lo guardado?
  const hayCambio = eleccion !== 0 && eleccion !== (materia.miResenia ?? 0);

  const guardar = async () => {
    if (!hayCambio || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      // `await` espera al servidor: al volver, la dificultad ya tiene mi reseña.
      await guardarResenia(materia.id, eleccion);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Tarjeta style={estilos.tarjeta}>
      <Text style={estilos.rotulo}>Dificultad estimada</Text>
      <Promedio valor={materia.dificultad} />
      <Text style={estilos.puntaje}>
        {/* `toFixed(1)`: un decimal ("4.5"; un 4 se ve "4.0"). */}
        {materia.dificultad.toFixed(1)} / 5.0
      </Text>
      <Text style={estilos.resenias}>
        {materia.resenias === 0
          ? "Estimación inicial · todavía no hay reseñas"
          : `Basado en ${materia.resenias} ${materia.resenias === 1 ? "reseña" : "reseñas"}`}
      </Text>

      {/* ---------- Mi reseña (solo si estoy cursando la materia) ---------- */}
      {puedeResenar ? (
        <View style={estilos.miResenia}>
          <Text style={estilos.tituloResenia}>
            {materia.miResenia ? "Tu reseña" : "¿Qué tan difícil te resulta?"}
          </Text>

          {/* Las cinco estrellas: tocar la N elige N. Las llenas llegan hasta la elegida. */}
          <View style={estilos.estrellasResenia}>
            {[1, 2, 3, 4, 5].map((numero) => (
              <Pressable
                key={numero}
                onPress={() => setEleccion(numero)}
                hitSlop={4}
                accessibilityLabel={`${numero} ${numero === 1 ? "estrella" : "estrellas"}`}
                style={({ pressed }) => pressed && estilos.presionado}
              >
                <Ionicons
                  name={numero <= eleccion ? "star" : "star-outline"}
                  size={34}
                  color={numero <= eleccion ? colores.alerta : colores.borde}
                />
              </Pressable>
            ))}
          </View>

          {/* Qué hacer, según el caso: guardar, o ya está guardada, o todavía no eligió. */}
          {hayCambio ? (
            <Pressable
              onPress={guardar}
              disabled={guardando}
              style={({ pressed }) => [
                estilos.botonGuardar,
                guardando && estilos.apagado,
                pressed && estilos.presionado,
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={colores.blanco} />
              <Text style={estilos.textoGuardar}>
                {guardando ? "Guardando…" : "Guardar reseña"}
              </Text>
            </Pressable>
          ) : (
            <Text style={estilos.ayuda}>
              {materia.miResenia
                ? `Tu reseña guardada: ${materia.miResenia} de 5. Tocá otra cantidad de estrellas para cambiarla.`
                : "Tocá las estrellas para calificar la dificultad y guardá tu reseña."}
            </Text>
          )}
          {error ? <Text style={estilos.error}>{error}</Text> : null}
        </View>
      ) : null}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): las cinco estrellas del PROMEDIO (con medias)
// ---------------------------------------------------------------------------

function Promedio({ valor }: { valor: number }) {
  // Las cinco posiciones: 1, 2, 3, 4, 5.
  const posiciones = [1, 2, 3, 4, 5];

  return (
    <View style={estilos.estrellas}>
      {posiciones.map((posicion) => {
        // Qué estrella dibujar en esta posición (con la dificultad 3.5):
        //   - valor >= posicion            → llena     (posiciones 1, 2, 3)
        //   - valor >= posicion - 0.5      → media     (posición 4)
        //   - si no                        → vacía     (posición 5)
        const nombre =
          valor >= posicion ? "star" : valor >= posicion - 0.5 ? "star-half" : "star-outline";

        return (
          <Ionicons
            key={posicion}
            name={nombre}
            size={18}
            // Amarillento (color `alerta`) si es llena o media; gris si es vacía.
            color={valor >= posicion - 0.5 ? colores.alerta : colores.borde}
          />
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  // La tarjeta de dificultad: todo centrado.
  tarjeta: {
    alignItems: "center",
    gap: espaciado.sm,
  },

  // Igual que otros rótulos chicos en mayúsculas ("Dificultad estimada").
  rotulo: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  // Las cinco estrellas del promedio, en fila.
  estrellas: {
    flexDirection: "row",
    gap: espaciado.xs,
  },

  // "4.5 / 5.0".
  puntaje: {
    fontSize: 20,
    fontWeight: "700",
    color: colores.texto,
  },

  // "Basado en 5 reseñas".
  resenias: {
    fontSize: 11,
    color: colores.textoTenue,
  },

  // Mi reseña: un bloque debajo, separado por una línea fina y a todo el ancho.
  miResenia: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: espaciado.md,
    marginTop: espaciado.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
    paddingTop: espaciado.lg,
  },

  tituloResenia: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  // Las cinco estrellas para elegir, más grandes que las del promedio.
  estrellasResenia: {
    flexDirection: "row",
    gap: espaciado.sm,
  },

  botonGuardar: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
    paddingVertical: espaciado.md,
  },

  textoGuardar: {
    fontSize: 14,
    fontWeight: "700",
    color: colores.blanco,
  },

  ayuda: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
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

/**
 * ============================================================================
 * componentes/SelectorAmigos.tsx — Elegir a qué amigos invitar (aunque sean cientos)
 * ============================================================================
 *
 * QUÉ ES:
 *   El selector de "Invitar amigos" del formulario de una juntada de estudio. Con
 *   pocos amigos, unos chips alcanzaban; con más de 100 serían una pared de botones
 *   imposible de recorrer. Por eso es una LISTA con scroll propio (de alto fijo, no
 *   empuja el resto del formulario) y un BUSCADOR por nombre arriba:
 *
 *     [ Buscar amigo por nombre…            ]
 *     3 elegidos de 120 amigos            Quitar todos
 *     ┌─────────────────────────────────────┐
 *     │ (FD)  Franco Díaz              (✓) │  ← tocar la fila elige o saca
 *     │ (MS)  Mariana Sosa             ( ) │
 *     │  ...  (se desplaza)                 │
 *     └─────────────────────────────────────┘
 *
 *   La elección SE CONSERVA mientras se busca: quien se eligió y después se filtró
 *   con otra búsqueda sigue elegido (el contador lo cuenta).
 *
 * NO GUARDA NADA:
 *   Recibe los ids elegidos y avisa cuál se tocó: «los datos bajan, los eventos
 *   suben». El formulario es el dueño del estado.
 *
 * TEORÍA:
 *   [JS 23] Buscador = INPUT CONTROLADO.
 *   [JS 25] Las filas visibles y los contadores se DERIVAN de la búsqueda.
 *   [COMP]  `ScrollView` con `maxHeight` y `nestedScrollEnabled` (Android necesita
 *           esa opción para desplazar una lista adentro de otro scroll).
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/componentes/Avatar";
import type { Estudiante } from "@/datos/comunidad";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  /** Todos mis amigos. */
  amigos: Estudiante[];
  /** Los ids de los elegidos. */
  elegidos: string[];
  /** Se llama con el id del amigo tocado (para elegirlo o sacarlo). */
  alAlternar: (id: string) => void;
  /** Se llama para dejar de elegir a todos. */
  alLimpiar: () => void;
};

/** Lista con buscador para elegir amigos. */
export function SelectorAmigos({ amigos, elegidos, alAlternar, alLimpiar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const texto = busqueda.trim().toLowerCase();
  // Los que coinciden con lo escrito (sin texto, todos).
  const visibles = amigos.filter((amigo) => amigo.nombre.toLowerCase().includes(texto));

  return (
    <View style={estilos.contenedor}>
      {/* ---------- Buscador por nombre ---------- */}
      <View style={estilos.buscador}>
        <Ionicons name="search" size={16} color={colores.textoDebil} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar amigo por nombre"
          placeholderTextColor={colores.textoDebil}
          style={estilos.input}
          autoCorrect={false}
        />
        {/* Una cruz para borrar lo escrito, solo si hay algo. */}
        {busqueda.length > 0 ? (
          <Pressable onPress={() => setBusqueda("")} hitSlop={8} accessibilityLabel="Borrar búsqueda">
            <Ionicons name="close-circle" size={16} color={colores.textoDebil} />
          </Pressable>
        ) : null}
      </View>

      {/* ---------- Cuántos hay elegidos ---------- */}
      <View style={estilos.filaResumen}>
        <Text style={estilos.resumen}>
          {elegidos.length} {elegidos.length === 1 ? "elegido" : "elegidos"} de {amigos.length}{" "}
          {amigos.length === 1 ? "amigo" : "amigos"}
        </Text>
        {elegidos.length > 0 ? (
          <Pressable onPress={alLimpiar} hitSlop={8}>
            <Text style={estilos.quitar}>Quitar todos</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ---------- La lista, con scroll propio ---------- */}
      <ScrollView
        style={estilos.lista}
        nestedScrollEnabled // en Android, para desplazar la lista dentro del formulario
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {visibles.length === 0 ? (
          <Text style={estilos.vacio}>Ningún amigo coincide con «{busqueda.trim()}».</Text>
        ) : (
          visibles.map((amigo, indice) => {
            const elegido = elegidos.includes(amigo.id);
            return (
              <Pressable
                key={amigo.id}
                onPress={() => alAlternar(amigo.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: elegido }}
                style={({ pressed }) => [
                  estilos.fila,
                  indice > 0 && estilos.separador,
                  pressed && estilos.presionado,
                ]}
              >
                <Avatar nombre={amigo.nombre} foto={amigo.foto} tamanio={34} />
                <Text style={estilos.nombre} numberOfLines={1}>
                  {amigo.nombre}
                </Text>
                {/* El círculo de elección: lleno y con tilde si está elegido. */}
                <Ionicons
                  name={elegido ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={elegido ? colores.azulClaro : colores.borde}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.sm,
  },

  // Caja del buscador: lupa + campo (+ cruz) en fila.
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    height: 42,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficie,
    paddingHorizontal: espaciado.md,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: colores.textoSuave,
    padding: 0,
  },

  filaResumen: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  resumen: {
    fontSize: 12,
    color: colores.textoTenue,
  },

  quitar: {
    fontSize: 12,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // El alto máximo hace que la lista tenga su propio scroll y no estire el formulario.
  lista: {
    maxHeight: 260,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },

  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  nombre: {
    flex: 1,
    fontSize: 14,
    color: colores.textoSuave,
  },

  presionado: {
    opacity: 0.7,
  },

  vacio: {
    padding: espaciado.lg,
    fontSize: 13,
    textAlign: "center",
    color: colores.textoDebil,
  },
});

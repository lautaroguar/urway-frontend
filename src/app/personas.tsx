/**
 * ============================================================================
 * app/personas.tsx — La lista completa de amigos o de compañeros («Ver más»)
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla a la que lleva el botón «Ver más» cuando hay muchas personas para
 *   mostrar en una lista corta. Es UNA sola pantalla para dos listas, según el
 *   parámetro `tipo` de la ruta:
 *     - `/personas?tipo=amigos`       → todos MIS AMIGOS.
 *     - `/personas?tipo=companieros`  → todos los compañeros para ENCONTRAR (los que
 *                                       todavía no son mis amigos).
 *   Arriba tiene un buscador por nombre. Cada fila es la misma de Conectar
 *   (`FilaCompaniero`): tocarla abre el perfil de esa persona.
 *
 * DESDE DÓNDE SE ABRE:
 *   Desde Conectar («Mis amigos» y «Encontrá compañeros») y desde la sección Amigos
 *   de «Mi perfil». Vive en el Stack raíz: se apila encima y tiene flecha para volver.
 *
 * POR QUÉ UNA `FlatList`:
 *   Con cientos de amigos, dibujar todas las filas de golpe sería lento. La
 *   `FlatList` solo dibuja las que se ven en pantalla y va sumando las demás al
 *   desplazarse. [PRÁCTICA 10: "FlatList no consulta la base: lee el estado".]
 *
 * TEORÍA:
 *   [NAV]   `useLocalSearchParams` para el tipo; `Stack.Screen` para poner el título
 *           de la pantalla según la lista.
 *   [JS 23] Buscador = INPUT CONTROLADO (`value` + `onChangeText`).
 *   [JS 25] Las personas visibles y el título se DERIVAN del tipo y de la búsqueda.
 *   [JS 8]  `filter` y `includes` para buscar por nombre.
 *   [COMP]  `FlatList` con `data`, `renderItem` y `keyExtractor`.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import { FilaCompaniero } from "@/componentes/FilaCompaniero";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { codigosEnCurso } from "@/utilidades/materias";
import { cruzarMaterias, recomendar } from "@/utilidades/recomendaciones";

/** La lista completa de mis amigos o de compañeros para agregar, con buscador. */
export default function PantallaPersonas() {
  // Qué lista se pide. Cualquier valor que no sea "amigos" se toma como compañeros.
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const esAmigos = tipo === "amigos";
  const { materias, estudiantes } = useDatos();
  const [busqueda, setBusqueda] = useState("");

  // Todo lo de abajo se calcula en el render [JS 25].
  const enCurso = codigosEnCurso(materias);
  const texto = busqueda.trim().toLowerCase();

  // La lista de la que se trata: mis amigos o los que todavía no lo son, cruzados con
  // mis materias (para ordenarlos por cuántas comparten conmigo).
  const todas = esAmigos
    ? cruzarMaterias(
        estudiantes.filter((persona) => persona.relacion === "amigos"),
        enCurso
      )
    : recomendar(estudiantes, enCurso);
  // Las que coinciden con el buscador (por nombre).
  const visibles = todas.filter((persona) => persona.nombre.toLowerCase().includes(texto));

  const titulo = esAmigos ? "Mis amigos" : "Encontrá compañeros";

  return (
    <View style={estilos.pantalla}>
      {/* El título del header del Stack depende de la lista. */}
      <Stack.Screen options={{ title: titulo }} />

      {/* ---------- Buscador por nombre ---------- */}
      <View style={estilos.buscador}>
        <Ionicons name="search" size={16} color={colores.textoDebil} />
        {/* INPUT CONTROLADO: el estado es la única fuente de verdad. */}
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={esAmigos ? "Buscar entre mis amigos" : "Buscar compañeros"}
          placeholderTextColor={colores.textoDebil}
          style={estilos.input}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      <Text style={estilos.cantidad}>
        {visibles.length} {visibles.length === 1 ? "persona" : "personas"}
        {texto.length > 0 ? ` de ${todas.length}` : ""}
      </Text>

      {/* ---------- La lista ---------- */}
      <FlatList
        data={visibles}
        keyExtractor={(persona) => persona.id}
        renderItem={({ item }) => <FilaCompaniero companiero={item} />}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        // Permite tocar una fila (o el botón de amistad) con el teclado abierto.
        keyboardShouldPersistTaps="handled"
        // Si no hay nadie que coincida, un aviso en lugar de una lista en blanco.
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <Ionicons name="people-outline" size={28} color={colores.textoDebil} />
            <Text style={estilos.textoVacio}>
              {texto.length > 0
                ? "Nadie coincide con la búsqueda."
                : esAmigos
                  ? "Todavía no tenés amigos."
                  : "No hay compañeros para agregar."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.sm,
  },

  // Caja del buscador: lupa + campo en fila.
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

  // "12 personas" (o "3 personas de 12" al buscar).
  cantidad: {
    marginVertical: espaciado.md,
    fontSize: 12,
    color: colores.textoTenue,
  },

  // `gap` separa las filas; el padding de abajo deja aire al final.
  lista: {
    gap: espaciado.md,
    paddingBottom: espaciado.xxl,
  },

  vacio: {
    alignItems: "center",
    gap: espaciado.sm,
    paddingVertical: espaciado.xxl,
  },

  textoVacio: {
    fontSize: 13,
    color: colores.textoDebil,
  },
});

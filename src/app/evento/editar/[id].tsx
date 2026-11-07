/**
 * ============================================================================
 * app/evento/editar/[id].tsx — Editar un evento
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla para cambiar un evento que ya existe. Se abre con "Editar" desde
 *   el detalle del evento (`/evento/editar/ev-3`). Usa el MISMO formulario que la
 *   pantalla de crear (`FormularioEvento`), pero arranca con los datos del evento.
 *
 * SI EL EVENTO SE REPITE:
 *   Los cambios se aplican a TODA la serie (todas las semanas de una clase, por
 *   ejemplo): el evento se guarda una sola vez con su regla de repetición. Los
 *   días que se habían borrado sueltos ("Solo este día") siguen borrados.
 *
 * RUTA DINÁMICA DENTRO DE UNA CARPETA:
 *   `editar/[id].tsx` define `/evento/editar/:id`. El segmento fijo "editar"
 *   evita que se confunda con el detalle (`/evento/[id]`).
 *
 * TEORÍA:
 *   [NAV]   `useLocalSearchParams` (el id) y `router.back()` al terminar.
 *   [COMP]  Reutilización del formulario con otros valores iniciales.
 *   [JS 22] Retorno temprano si el evento no existe (o no es mío).
 *   [JS 29] `eventos` y `editarEvento` vienen del Context.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FormularioEvento } from "@/componentes/FormularioEvento";
import type { BorradorEvento } from "@/datos/agenda";
import { useDatos } from "@/estado/datos";
import { colores, espaciado } from "@/tema/colores";

/** Pantalla para editar un evento de la agenda. */
export default function PantallaEditarEvento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { eventos, editarEvento } = useDatos();

  const evento = eventos.find((candidato) => candidato.id === id);

  // RETORNO TEMPRANO: no existe, o lo organiza otro estudiante (solo él lo edita).
  if (!evento || evento.organizador) {
    return (
      <View style={[estilos.pantalla, estilos.vacio]}>
        <Ionicons name="calendar-outline" size={32} color={colores.textoDebil} />
        <Text style={estilos.textoVacio}>
          {evento
            ? "Este evento lo organiza otro estudiante: solo él puede editarlo."
            : "Este evento ya no existe."}
        </Text>
      </View>
    );
  }

  // Los valores iniciales: el evento tal cual, con los ids de sus invitados.
  // "Rest" [JS 7]: se separa lo que el formulario no usa (id, excepciones...).
  const { id: _id, excepciones: _excepciones, invitados, organizador: _org, ...campos } =
    evento;
  const inicial: BorradorEvento = {
    ...campos,
    invitadosIds: (invitados ?? []).map((invitado) => invitado.id),
  };

  const guardar = async (borrador: BorradorEvento) => {
    await editarEvento(evento.id, borrador);
    router.back(); // vuelve al detalle, que ya muestra los cambios
  };

  return (
    <View style={estilos.pantalla}>
      <FormularioEvento
        inicial={inicial}
        textoBoton="Guardar cambios"
        alGuardar={guardar}
        editando // el «Horario» de un parcial o entrega arranca como estaba guardado
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  vacio: {
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.md,
    padding: espaciado.xl,
  },

  textoVacio: {
    fontSize: 13,
    textAlign: "center",
    color: colores.textoDebil,
  },
});

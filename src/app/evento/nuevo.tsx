/**
 * ============================================================================
 * app/evento/nuevo.tsx — Crear un evento
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla para crear un evento. Se abre con el botón "+" de la Agenda y con
 *   "Invitar a estudiar" del perfil de un amigo. Los campos están en
 *   `FormularioEvento` (el mismo que usa la pantalla de editar): esta pantalla
 *   solo decide con qué valores arranca y qué hacer al guardar.
 *
 * PARÁMETROS (opcionales, por la ruta):
 *   `?tipo=estudio&materiaId=MAT-201&amigoId=est-1` → arranca como una juntada de
 *   estudio de esa materia, con ese amigo ya invitado.
 *
 * POR QUÉ VIVE EN `evento/nuevo.tsx`:
 *   Ese archivo define la ruta `/evento/nuevo`. Existe además `evento/[id].tsx`
 *   para `/evento/ev-3`: la ruta ESTÁTICA "nuevo" tiene prioridad sobre la
 *   dinámica `[id]`, así que no se confunden.
 *
 * TEORÍA:
 *   [COMP]  Reutilización: el mismo formulario para crear y editar.
 *   [NAV]   `useLocalSearchParams` para los parámetros y `router.back()` al terminar.
 *   [JS 29] `agregarEvento` viene del Context.
 *   [JS 14] `async/await`: se espera a que se guarde antes de volver.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { FormularioEvento } from "@/componentes/FormularioEvento";
import type { BorradorEvento } from "@/datos/agenda";
import { useDatos } from "@/estado/datos";
import { colores } from "@/tema/colores";
import { claveFecha } from "@/utilidades/fechas";

/** Pantalla para crear un evento de la agenda. */
export default function PantallaNuevoEvento() {
  const router = useRouter();
  const { agregarEvento, materias } = useDatos();
  // Los parámetros llegan como texto y pueden faltar.
  const { tipo, materiaId, amigoId } = useLocalSearchParams<{
    tipo?: string;
    materiaId?: string;
    amigoId?: string;
  }>();
  // ¿Se abrió desde "Invitar a estudiar"? Entonces el título ya dice qué materia.
  const esEstudio = tipo === "estudio";
  const materia = materias.find((m) => m.id === materiaId);

  // Los valores con los que arranca el formulario (los "valores por defecto").
  const inicial: BorradorEvento = {
    titulo: esEstudio && materia ? `Estudiar ${materia.nombre}` : "",
    tipo: esEstudio ? "estudio" : "clase",
    // Una juntada de estudio no lleva materia: la materia solo se usó para el título.
    materiaId: esEstudio ? undefined : materiaId,
    fecha: claveFecha(new Date()), // hoy
    desde: esEstudio ? "18:00" : "08:00",
    hasta: esEstudio ? "20:00" : "10:00",
    lugar: "",
    frecuencia: "nunca",
    invitadosIds: amigoId ? [amigoId] : [],
  };

  // Guarda en el Context y vuelve a la pantalla anterior, que ya lo muestra.
  // Si `agregarEvento` falla, el error lo atrapa y lo muestra el formulario.
  const crear = async (borrador: BorradorEvento) => {
    await agregarEvento(borrador);
    router.back();
  };

  return (
    <View style={estilos.pantalla}>
      <FormularioEvento inicial={inicial} textoBoton="Crear evento" alGuardar={crear} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
});

/**
 * ============================================================================
 * app/(tabs)/agenda.tsx — Pestaña "Agenda"
 * ============================================================================
 *
 * QUÉ MUESTRA:
 *   Una vista SEMANAL: los siete días (lunes a domingo) con sus horas y los
 *   eventos colocados según su horario. Arriba están el título, el botón "+"
 *   (abre el formulario para crear un evento) y el selector de semana: flechas
 *   para ir a la anterior o a la siguiente y un botón "Hoy" para volver a la
 *   actual. Tocar un evento abre su detalle.
 *
 * LA IDEA CENTRAL — UN SOLO ESTADO:
 *   Lo único que guarda esta pantalla es `semana`: cuántas semanas se alejó de la
 *   actual (0 = esta, -1 = la anterior, 1 = la próxima). Todo lo demás se DERIVA
 *   en el render: el lunes de la semana, los días, los eventos de cada día y la
 *   posición de cada bloque (eso último lo hace `SemanaCalendario`).
 *
 * DE DÓNDE SALEN LOS DATOS:
 *   De `useDatos()` (Context). Al crear, editar o borrar un evento, la grilla se
 *   actualiza sola. Los eventos que se repiten (las clases, todas las semanas) se
 *   convierten en las fechas de ESTA semana con `ocurrenciasEntre`; las clases de
 *   una materia cuya cursada ya terminó dejan de aparecer (`cortesDeClases`).
 *
 * TEORÍA:
 *   [JS 20] `useState` con actualización funcional: `setSemana((s) => s - 1)`,
 *           porque el valor nuevo depende del anterior.
 *   [JS 25] Estado derivado: `inicioSemana` se calcula, no se guarda.
 *   [COMP]  Componentes propios (`SemanaCalendario`) y un auxiliar privado
 *           (`BotonFlecha`); el estado vive acá y baja por props.
 *   [NAV]   `router.push` a `/evento/[id]` (con la fecha del día tocado) y a
 *           `/evento/nuevo`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SemanaCalendario } from "@/componentes/SemanaCalendario";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import {
  claveFecha,
  etiquetaSemana,
  inicioDeSemana,
  sumarDias,
} from "@/utilidades/fechas";
import { cortesDeClases, ocurrenciasEntre } from "@/utilidades/repeticion";

/**
 * Agenda: la semana elegida con sus eventos sobre una grilla de días y horas.
 */
export default function PantallaAgenda() {
  const router = useRouter();
  const { eventos, materias } = useDatos();

  // Cuántas semanas se alejó de la actual. Es el único estado de la pantalla.
  const [semana, setSemana] = useState(0);

  // Se arma en el render: hoy más `semana` × 7 días cae dentro de la semana
  // elegida, y `inicioDeSemana` lo lleva al lunes.
  const inicioSemana = inicioDeSemana(sumarDias(new Date(), semana * 7));

  // Las fechas concretas de los eventos en esta semana (de lunes a domingo).
  const ocurrencias = ocurrenciasEntre(
    eventos,
    claveFecha(inicioSemana),
    claveFecha(sumarDias(inicioSemana, 6)),
    cortesDeClases(materias)
  );

  return (
    <View style={estilos.pantalla}>
      {/* ---------- Título y botón "+" ---------- */}
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>Agenda</Text>
        <Pressable
          onPress={() => router.push("/evento/nuevo")}
          hitSlop={8}
          accessibilityLabel="Crear evento"
          style={estilos.botonMas}
        >
          <Ionicons name="add" size={20} color={colores.blanco} />
        </Pressable>
      </View>

      {/* ---------- Selector de semana ---------- */}
      <View style={estilos.navegador}>
        <Text style={estilos.semana}>{etiquetaSemana(inicioSemana)}</Text>

        <View style={estilos.controles}>
          <BotonFlecha
            icono="chevron-back"
            descripcion="Semana anterior"
            alTocar={() => setSemana((actual) => actual - 1)}
          />
          {/* "Hoy" vuelve a la semana actual; si ya se está en ella, no hace nada
              y se ve apagado. */}
          <Pressable
            onPress={() => setSemana(0)}
            disabled={semana === 0}
            style={({ pressed }) => [
              estilos.botonHoy,
              semana === 0 && estilos.apagado,
              pressed && estilos.presionado,
            ]}
          >
            <Text style={estilos.textoHoy}>Hoy</Text>
          </Pressable>
          <BotonFlecha
            icono="chevron-forward"
            descripcion="Semana siguiente"
            alTocar={() => setSemana((actual) => actual + 1)}
          />
        </View>
      </View>

      {/* ---------- La grilla de la semana ---------- */}
      <SemanaCalendario
        ocurrencias={ocurrencias}
        todos={eventos}
        inicioSemana={inicioSemana}
        // Se abre el detalle del evento en ESE día (importa si se repite).
        alTocarEvento={(id, fecha) =>
          router.push({ pathname: "/evento/[id]", params: { id, fecha } })
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): el botón circular con una flecha
// ---------------------------------------------------------------------------

type PropsFlecha = {
  icono: "chevron-back" | "chevron-forward";
  descripcion: string; // lo que lee un lector de pantalla
  alTocar: () => void;
};

function BotonFlecha({ icono, descripcion, alTocar }: PropsFlecha) {
  return (
    <Pressable
      onPress={alTocar}
      hitSlop={6}
      accessibilityLabel={descripcion}
      style={({ pressed }) => [estilos.flecha, pressed && estilos.presionado]}
    >
      <Ionicons name={icono} size={18} color={colores.textoSuave} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  // Título a la izquierda y botón "+" a la derecha.
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.lg,
  },

  titulo: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colores.texto,
  },

  // Botón "+" circular (32 de lado y radio 16).
  botonMas: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.primario,
  },

  // La semana ("28 sep – 4 oct") a la izquierda y los controles a la derecha.
  navegador: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.sm,
    paddingBottom: espaciado.md,
  },

  semana: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: colores.textoSuave,
  },

  controles: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },

  // Botón circular con una flecha adentro.
  flecha: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
  },

  // Pastilla "Hoy": mismo alto que las flechas.
  botonHoy: {
    height: 32,
    justifyContent: "center",
    paddingHorizontal: espaciado.md,
    borderRadius: radios.pastilla,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
  },

  textoHoy: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // "Hoy" cuando ya se está en la semana actual.
  apagado: {
    opacity: 0.4,
  },

  presionado: {
    opacity: 0.7,
  },
});

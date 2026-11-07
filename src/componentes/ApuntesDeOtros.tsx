/**
 * ============================================================================
 * componentes/ApuntesDeOtros.tsx — Solapas "Comunidad" y "De mis amigos"
 * ============================================================================
 *
 * QUÉ ES:
 *   La lista de apuntes de OTROS estudiantes de una materia, en dos versiones:
 *     - «Comunidad»: los apuntes públicos, de cualquier estudiante que comparte
 *       sus apuntes con todos (la privacidad que cada uno elige en su perfil).
 *     - «De mis amigos»: los apuntes de mis amigos de esa materia (los veo aunque
 *       los compartan solo con amigos).
 *   Cada uno se muestra con la misma celda que «Mis apuntes» (`TarjetaApunte`), con
 *   el nombre de quien lo subió. Tocarlo abre la vista previa.
 *
 * DE DÓNDE SALEN:
 *   De `GET /api/materias/:id/apuntes` (por el Context, `cargarApuntesDeMateria`). El
 *   servidor ya separa las dos listas y aplica la privacidad; acá solo se elige cuál
 *   mostrar (`origen`).
 *
 * CUÁNDO SE PIDEN:
 *   Al abrir la solapa (un `useEffect` por materia). Cada vez que se vuelve a entrar
 *   a la solapa se piden de nuevo: así se ven los apuntes que se subieron hace poco.
 *
 * TEORÍA:
 *   [JS 26] `useEffect` para pedir datos al servidor, con LIMPIEZA (`activo`): si
 *           se sale de la pantalla antes de que llegue la respuesta, no se guarda.
 *   [JS 22] Renderizado condicional: cargando, error, vacío o grilla.
 *   [COMP]  Reutiliza `TarjetaApunte` y `Tarjeta`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { mensajeDe } from "@/api/cliente";
import { Tarjeta } from "@/componentes/Tarjeta";
import { TarjetaApunte } from "@/componentes/TarjetaApunte";
import type { ApuntesDeMateria } from "@/datos/comunidad";
import { useDatos } from "@/estado/datos";
import { colores, espaciado } from "@/tema/colores";
import { abrirApunte } from "@/utilidades/apuntes";

type Props = {
  materiaId: string;
  /** Cuál de las dos listas mostrar. */
  origen: "comunidad" | "amigos";
};

// El texto del estado vacío de cada lista.
const VACIO: Record<Props["origen"], string> = {
  comunidad: "Todavía nadie compartió apuntes de esta materia con todos.",
  amigos: "Ninguno de tus amigos subió apuntes de esta materia todavía.",
};

/** Apuntes de otros estudiantes de la materia: los públicos o los de mis amigos. */
export function ApuntesDeOtros({ materiaId, origen }: Props) {
  const router = useRouter();
  const { cargarApuntesDeMateria } = useDatos();
  // `null` = todavía no llegó la respuesta.
  const [apuntes, setApuntes] = useState<ApuntesDeMateria | null>(null);
  const [error, setError] = useState<string | null>(null);

  // [JS 26] Pedir los apuntes es sincronizar con algo externo (el servidor).
  useEffect(() => {
    let activo = true; // si se sale antes de la respuesta, no se guarda
    setApuntes(null);
    setError(null);
    cargarApuntesDeMateria(materiaId)
      .then((respuesta) => {
        if (activo) setApuntes(respuesta);
      })
      .catch((e) => {
        if (activo) setError(mensajeDe(e));
      });
    return () => {
      activo = false;
    };
  }, [materiaId]);

  if (error) return <Text style={estilos.error}>{error}</Text>;
  if (!apuntes) return <ActivityIndicator color={colores.azulClaro} style={estilos.cargando} />;

  const lista = apuntes[origen];
  if (lista.length === 0) {
    return (
      <Tarjeta style={estilos.vacia}>
        <Ionicons
          name={origen === "amigos" ? "people-outline" : "earth-outline"}
          size={24}
          color={colores.textoTenue}
        />
        <Text style={estilos.textoVacio}>{VACIO[origen]}</Text>
      </Tarjeta>
    );
  }

  return (
    <View style={estilos.grilla}>
      {lista.map((apunte) => (
        <TarjetaApunte
          key={apunte.id}
          apunte={apunte}
          mostrarAutor
          alAbrir={() => abrirApunte(router, apunte)}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  cargando: {
    marginVertical: espaciado.lg,
  },

  error: {
    fontSize: 13,
    color: colores.alerta,
  },

  // La tarjeta del estado vacío: ícono y texto centrados en columna.
  vacia: {
    alignItems: "center",
    gap: espaciado.sm,
  },

  textoVacio: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: colores.textoDebil,
  },

  // Dos columnas: igual que en «Mis apuntes».
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: espaciado.md,
  },
});

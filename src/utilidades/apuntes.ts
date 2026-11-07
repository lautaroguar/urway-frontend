/**
 * ============================================================================
 * utilidades/apuntes.ts — Abrir la vista previa de un apunte
 * ============================================================================
 *
 * QUÉ ES:
 *   Una sola función, `abrirApunte`, que lleva a la pantalla de vista previa
 *   (`app/apunte/ver.tsx`) con los datos del apunte. La usan todas las listas de
 *   apuntes: mis apuntes, los de la comunidad, los de mis amigos y los del perfil
 *   de otro estudiante.
 *
 * POR QUÉ LOS DATOS VIAJAN POR LA RUTA:
 *   El apunte ya está en memoria en la lista que se tocó. Pasarlo como parámetros
 *   evita pedir un apunte suelto al servidor solo para mostrarlo.
 *
 * TEORÍA:
 *   [NAV] `router.push` con `params` (todos viajan como texto).
 */
import type { useRouter } from "expo-router";

import type { Apunte } from "@/datos/comunidad";

// El tipo del `router` que devuelve el hook `useRouter()`.
type Navegador = ReturnType<typeof useRouter>;

/** Abre la vista previa del apunte. Si el apunte no tiene archivo, no hace nada. */
export function abrirApunte(router: Navegador, apunte: Apunte) {
  if (!apunte.uri) return;
  router.push({
    pathname: "/apunte/ver",
    params: {
      uri: apunte.uri,
      titulo: apunte.titulo,
      // Los que pueden faltar viajan vacíos ("") y la pantalla los trata como ausentes.
      descripcion: apunte.descripcion ?? "",
      autor: apunte.autorNombre ?? "",
      materiaId: apunte.materiaId,
      fecha: apunte.fecha,
      formato: apunte.formato ?? "imagen",
    },
  });
}

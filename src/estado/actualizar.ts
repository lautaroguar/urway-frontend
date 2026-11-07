/**
 * ============================================================================
 * estado/actualizar.ts — "Tirar para actualizar" (un custom hook)
 * ============================================================================
 *
 * QUÉ ES:
 *   Un hook propio que conecta el gesto de deslizar hacia abajo (`RefreshControl`
 *   de un `ScrollView`) con `recargar()` del Context de datos: vuelve a pedir
 *   todo al servidor. Sirve para ver enseguida lo que hicieron otros (un amigo
 *   que subió un apunte, una invitación nueva).
 *
 * CÓMO SE USA (en Inicio, Conectar y Notificaciones):
 *     const { actualizando, actualizar } = useTirarParaActualizar();
 *     <ScrollView refreshControl={
 *       <RefreshControl refreshing={actualizando} onRefresh={actualizar} />
 *     }>
 *
 * TEORÍA:
 *   [JS 30] Custom hook: el nombre empieza con `use`, llama a otros hooks
 *           (`useState`, `useDatos`) y expone una API chica.
 *   [JS 14] `async/await` con `finally` (la ruedita se apaga siempre).
 */
import { useState } from "react";

import { useDatos } from "@/estado/datos";

export function useTirarParaActualizar() {
  const { recargar } = useDatos();
  // ¿Se está actualizando? Es lo que muestra (o esconde) la ruedita.
  const [actualizando, setActualizando] = useState(false);

  const actualizar = async () => {
    setActualizando(true);
    try {
      await recargar();
    } finally {
      setActualizando(false); // pase lo que pase, la ruedita se apaga
    }
  };

  return { actualizando, actualizar };
}

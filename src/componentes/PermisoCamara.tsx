/**
 * ============================================================================
 * componentes/PermisoCamara.tsx — Pide el permiso de la cámara y recién ahí la muestra
 * ============================================================================
 *
 * QUÉ ES:
 *   Un contenedor que se ocupa del PERMISO de cámara. Mientras no haya permiso
 *   muestra un cartel (con el botón para pedirlo o, si el usuario lo negó para
 *   siempre, para ir a Ajustes); cuando lo hay, dibuja lo que tenga adentro.
 *
 * POR QUÉ EXISTE:
 *   Las dos pantallas que usan la cámara (el escáner del registro y la foto de
 *   apuntes) necesitan exactamente el mismo manejo del permiso. Así se escribe
 *   una sola vez.
 *
 * DÓNDE SE USA:
 *   `EscanerDni.tsx` (registro) y `app/apunte/camara.tsx` (apuntes).
 *
 * TEORÍA:
 *   [SENS 26] `useCameraPermissions()`: devuelve [estado del permiso, función
 *             para pedirlo]. El estado es `null` mientras se consulta.
 *   [SENS 11] Patrón de permisos: si el sistema ya no puede volver a preguntar
 *             (`canAskAgain === false`) la única salida es `Linking.openSettings()`.
 *   [SENS 12] El texto del permiso se declara en el plugin de `app.json`.
 *   [JS 19]   Props y `children`: lo que se escribe entre las etiquetas llega
 *             en `children`.
 *   [JS 22]   Renderizado condicional con retornos tempranos.
 */
import { Ionicons } from "@expo/vector-icons";
// El hook de expo-camera para consultar y pedir el permiso de la cámara.
import { useCameraPermissions } from "expo-camera";
// `ReactNode` es el tipo de "cualquier cosa que React puede dibujar" (los `children`).
import type { ReactNode } from "react";
// `Linking.openSettings()` abre los ajustes del teléfono en la app.
import { Linking, Pressable, StyleSheet, Text } from "react-native";

import { Tarjeta } from "@/componentes/Tarjeta";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  /** Para qué se necesita la cámara; se muestra si todavía no hay permiso. */
  mensaje: string;
  /** Lo que se dibuja cuando el permiso está concedido (la cámara). */
  children: ReactNode;
};

/** Muestra `children` solo cuando hay permiso de cámara; si no, explica y lo pide. */
export function PermisoCamara({ mensaje, children }: Props) {
  // [estado del permiso (null mientras se consulta), función para pedirlo]
  // (Desestructuración de un array: se nombra cada posición, como con `useState`.)
  const [permiso, pedirPermiso] = useCameraPermissions();

  // CASO 1 — Todavía no se sabe si hay permiso.
  if (!permiso) {
    return (
      <Tarjeta style={estilos.aviso}>
        <Text style={estilos.texto}>Consultando permisos de la cámara…</Text>
      </Tarjeta>
    );
  }

  // CASO 2 — No hay permiso. Si el sistema todavía puede preguntar, se ofrece
  // pedirlo; si el usuario lo negó "para siempre", solo queda ir a los Ajustes.
  if (!permiso.granted) {
    return (
      <Tarjeta style={estilos.aviso}>
        <Ionicons name="camera-outline" size={28} color={colores.azulClaro} />
        <Text style={estilos.texto}>{mensaje}</Text>
        {/* `canAskAgain`: ¿el sistema todavía deja volver a preguntar? */}
        {permiso.canAskAgain ? (
          <Pressable
            onPress={pedirPermiso}
            style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
          >
            <Text style={estilos.textoBoton}>Dar permiso</Text>
          </Pressable>
        ) : (
          // Los `<> ... </>` agrupan el texto y el botón sin sumar una vista de más.
          <>
            <Text style={estilos.textoTenue}>
              El permiso fue denegado. Habilitalo desde los ajustes del teléfono.
            </Text>
            <Pressable
              onPress={() => Linking.openSettings()} // abre Ajustes para habilitarlo a mano
              style={({ pressed }) => [
                estilos.botonSecundario,
                pressed && estilos.presionado,
              ]}
            >
              <Text style={estilos.textoBotonSecundario}>Abrir ajustes</Text>
            </Pressable>
          </>
        )}
      </Tarjeta>
    );
  }

  // CASO 3 — Hay permiso: se dibuja lo que va adentro. El Fragment `<> </>`
  // devuelve los hijos sin agregar una vista extra.
  return <>{children}</>;
}

const estilos = StyleSheet.create({
  // La tarjeta del aviso: todo centrado en columna.
  aviso: {
    alignItems: "center",
    gap: espaciado.md,
  },

  // El mensaje principal del aviso, centrado.
  texto: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colores.textoSuave,
  },

  // El texto secundario ("El permiso fue denegado..."), más apagado.
  textoTenue: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: colores.textoTenue,
  },

  // El botón principal ("Dar permiso"): azul y de ancho según su texto.
  boton: {
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    paddingHorizontal: espaciado.xl,
    borderRadius: radios.lg,
    backgroundColor: colores.primario,
  },

  // El texto blanco del botón principal.
  textoBoton: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  // El botón "Abrir ajustes": solo con borde, sin relleno.
  botonSecundario: {
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    paddingHorizontal: espaciado.xl,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  // El texto del botón secundario.
  textoBotonSecundario: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // Se suma a un botón mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.75,
  },
});

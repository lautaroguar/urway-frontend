/**
 * ============================================================================
 * componentes/BarraDeTabs.tsx — La barra de pestañas flotante de abajo
 * ============================================================================
 *
 * QUÉ ES:
 *   La barra con las 4 pestañas (Inicio · Plan · Agenda · Conectar). Es una
 *   cápsula que flota sobre el contenido, con desenfoque de lo que hay detrás
 *   (`expo-blur`).
 *
 * CÓMO SE CONECTA:
 *   En app/(tabs)/_layout.tsx se le pasa a `<Tabs>` con la prop
 *   `tabBar={(props) => <BarraDeTabs {...props} />}`. El navegador se ocupa de
 *   las pantallas y este componente dibuja la barra de abajo. El navegador le
 *   entrega:
 *     - `state`:         en qué pestaña estamos y cuáles hay;
 *     - `emitter`:       para avisar que se tocó una pestaña (`tabPress`);
 *     - `navigateToTab`: para cambiar de pestaña;
 *     - `insets`:        las zonas seguras (la barra de gestos del iPhone, por ejemplo).
 *
 * NOTA DE VERSIÓN (Expo SDK 58):
 *   Hasta SDK 57 la barra recibía `navigation` (`navigation.emit` y
 *   `navigation.navigate`) y medía las zonas seguras con `useSafeAreaInsets`.
 *   En SDK 58 expo-router reescribió su navegación: ahora entrega `emitter` y
 *   `navigateToTab`, y las zonas seguras llegan en `insets` (en la web, SDK 58
 *   ya no las mide con `react-native-safe-area-context`).
 *
 * TEORÍA:
 *   [NAV] Bottom Tab Navigator con barra personalizada: la teoría muestra la
 *         prop `tabBarComponent` de React Navigation; en expo-router se llama
 *         `tabBar`.
 *   [EST] `position: "absolute"` y sombras (`shadow*` en iOS + `elevation` en
 *         Android). `flex`, `flexDirection`, `alignItems`.
 *   [COMP] Componentes de la librería: `Pressable`, `Text`, `View`.
 *   [JS 8] `map` para dibujar una lista y `find` para buscar en ella.
 *
 * IMPORTANTE:
 *   Como la barra flota con `position: "absolute"`, NO ocupa lugar en el
 *   layout. Por eso cada pantalla con scroll termina con
 *   `paddingBottom: espacioBajoTabs` (si no, la barra tapa lo último).
 */

// `Ionicons`: los íconos (cada ícono se pide por su nombre).
import { Ionicons } from "@expo/vector-icons";
// `BlurView`: una vista que desenfoca lo que hay detrás (efecto "vidrio").
import { BlurView } from "expo-blur";
// Solo el TIPO de las props que entrega el navegador de tabs (`import type`:
// no se incluye en el código final, solo lo usa TypeScript).
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  barraTabs,
  colores,
  espaciado,
  radios,
  sombraFlotante,
} from "@/tema/colores";

// Un "nombre de ícono válido de Ionicons". `keyof typeof X` toma las CLAVES del
// objeto `Ionicons.glyphMap` (todos los nombres de íconos) y las convierte en un
// tipo: si se escribe un nombre que no existe, TypeScript avisa.
type NombreIcono = keyof typeof Ionicons.glyphMap;

// Los datos de cada pestaña.
type DefinicionTab = {
  /** Tiene que coincidir con la carpeta dentro de app/(tabs). */
  // (En esta versión es el nombre del ARCHIVO: inicio.tsx, plan.tsx...)
  nombre: string;
  etiqueta: string; // el texto que se ve debajo del ícono
  icono: NombreIcono; // ícono cuando la pestaña NO está activa (contorno)
  iconoActivo: NombreIcono; // ícono cuando está activa (relleno)
};

// La lista de pestañas, en el orden en que se dibujan. Se ve cada una con un
// ícono de contorno ("home-outline") y su versión rellena ("home") para la activa.
const TABS: DefinicionTab[] = [
  {
    nombre: "inicio",
    etiqueta: "Inicio",
    icono: "home-outline",
    iconoActivo: "home",
  },
  {
    nombre: "plan",
    etiqueta: "Plan",
    icono: "book-outline",
    iconoActivo: "book",
  },
  {
    nombre: "agenda",
    etiqueta: "Agenda",
    icono: "calendar-outline",
    iconoActivo: "calendar",
  },
  {
    nombre: "conectar",
    etiqueta: "Conectar",
    icono: "people-outline",
    iconoActivo: "people",
  },
];

/**
 * Barra de tabs flotante, al estilo iOS: una cápsula despegada de los bordes,
 * con desenfoque de lo que pasa por detrás.
 *
 * Va en `position: absolute`, así que **no ocupa lugar en el layout**. Cada
 * pantalla tiene que dejar `espacioBajoTabs` al final de su scroll.
 */
// Las props las entrega el navegador (ver el encabezado del archivo):
//   - state.routes:  la lista de pestañas que existen
//   - state.index:   la posición de la pestaña que está abierta
//   - emitter:       para avisar el toque de una pestaña
//   - navigateToTab: para cambiar de pestaña (recibe la clave de la ruta)
//   - insets:        cuánto espacio "prohibido" hay en cada borde (por ejemplo,
//                    la barra de gestos de un iPhone abajo). Se renombra a
//                    `margenes` al desestructurar (`insets: margenes`).
export function BarraDeTabs({
  state,
  emitter,
  navigateToTab,
  insets: margenes,
}: BottomTabBarProps) {

  return (
    <View
      style={[
        estilos.contenedor,
        {
          // Distancia al borde de abajo: apoya la barra justo sobre el área
          // segura, pero nunca menos que `margenMinimo` (para teléfonos sin
          // zona segura abajo). `Math.max` se queda con el mayor de los dos.
          bottom: Math.max(
            margenes.bottom + barraTabs.margenInferior,
            barraTabs.margenMinimo
          ),
        },
      ]}
    >
      {/* Capa 1: el desenfoque. `absoluteFill` la estira para que ocupe toda la cápsula. */}
      <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
      {/* Capa 2: un velo semitransparente encima, para dar color al vidrio. */}
      <View style={[StyleSheet.absoluteFill, estilos.velo]} />

      {/* Capa 3: las pestañas. `map` dibuja un botón por cada ruta [JS 8]. */}
      {state.routes.map((ruta, indice) => {
        // Se busca en `TABS` la definición cuyo nombre coincide con la ruta
        // (para obtener etiqueta e íconos).
        const definicion = TABS.find((tab) => tab.nombre === ruta.name);
        // Si la ruta no está en la lista, no se dibuja nada (`null`).
        if (!definicion) {
          return null;
        }

        // ¿Es esta la pestaña abierta? `state.index` es la posición de la activa.
        const activa = state.index === indice;

        // Qué pasa al tocar la pestaña.
        const alPresionar = () => {
          // Primero se AVISA al navegador que hubo un toque (`tabPress`). Con
          // `canPreventDefault` cualquiera puede impedir el cambio.
          const evento = emitter.emit({
            type: "tabPress",
            target: ruta.key,
            canPreventDefault: true,
          });

          // Solo se navega si no era ya la pestaña activa y nadie lo impidió.
          // `navigateToTab` recibe la CLAVE de la ruta (no su nombre).
          if (!activa && !evento.defaultPrevented) {
            navigateToTab(ruta.key);
          }
        };

        return (
          // `key` estable y única por elemento de la lista [JS 22]: se usa la
          // clave de la ruta, no el índice.
          <Pressable
            key={ruta.key}
            onPress={alPresionar}
            style={estilos.celda}
          >
            {/* La "pastilla": el rectángulo redondeado que se pinta de azul
                cuando la pestaña está activa. `activa && estilos.pastillaActiva`
                agrega ese estilo solo si `activa` es true. */}
            <View style={[estilos.pastilla, activa && estilos.pastillaActiva]}>
              <Ionicons
                // Ternario: ícono relleno si está activa, de contorno si no.
                name={activa ? definicion.iconoActivo : definicion.icono}
                size={19}
                color={activa ? colores.blanco : colores.textoTenue}
              />
              <Text
                style={[estilos.etiqueta, activa && estilos.etiquetaActiva]}
                numberOfLines={1} // que no pase a una segunda línea
              >
                {definicion.etiqueta}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  // La cápsula completa. Flota sobre el contenido (`absolute`), separada de los
  // bordes laterales, con las cuatro pestañas en fila.
  contenedor: {
    position: "absolute",
    left: barraTabs.margenLateral,
    right: barraTabs.margenLateral,
    height: barraTabs.alto,
    flexDirection: "row", // pestañas una al lado de la otra (por defecto sería columna)
    alignItems: "center",
    paddingHorizontal: espaciado.xs,
    borderRadius: barraTabs.alto / 2, // la mitad del alto → extremos totalmente redondeados
    borderWidth: 1,
    borderColor: colores.bordeVidrio,
    // Recorta el desenfoque a la cápsula; sin esto, en Android se ve cuadrado.
    overflow: "hidden",
    // Copia acá todas las propiedades de sombra (shadow* + elevation) [EST].
    ...sombraFlotante,
  },

  // Capa de color semitransparente sobre el desenfoque.
  velo: {
    backgroundColor: colores.velo,
  },

  // Cada pestaña ocupa el mismo ancho (`flex: 1` reparte el espacio por igual
  // entre los 4 hijos) y su contenido queda centrado.
  celda: {
    flex: 1,
    alignItems: "center",
  },

  // El rectángulo con ícono + texto (columna: ícono arriba, texto abajo).
  pastilla: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1, // separación entre ícono y texto
    minWidth: 68,
    borderRadius: radios.xl,
    paddingVertical: espaciado.sm,
  },

  // Fondo azul cuando la pestaña está activa.
  pastillaActiva: {
    backgroundColor: colores.primario,
  },

  etiqueta: {
    fontSize: 10,
    fontWeight: "600",
    color: colores.textoTenue,
  },

  // Texto blanco cuando la pestaña está activa (pisa al color de `etiqueta`).
  etiquetaActiva: {
    color: colores.blanco,
  },
});

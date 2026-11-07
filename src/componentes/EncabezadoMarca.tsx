/**
 * ============================================================================
 * componentes/EncabezadoMarca.tsx — Las dos mitades del header de las pestañas
 * ============================================================================
 *
 * QUÉ ES:
 *   Dos componentes chicos que se ponen en el header (la barra de arriba) de
 *   las cuatro pestañas:
 *     - `MarcaHeader`    → izquierda: ícono de birrete + la palabra "urway".
 *     - `AccionesHeader` → derecha: campana (abre Notificaciones, con un globito
 *                          que cuenta las que no se leyeron) y avatar (abre el Perfil).
 *
 * CÓMO SE CONECTAN:
 *   En app/(tabs)/_layout.tsx se pasan a las opciones `headerLeft` y
 *   `headerRight` del navegador de tabs. Así el header es el NATIVO del
 *   navegador (con título, altura y zona segura resueltos por él) y se declara
 *   UNA sola vez para las cuatro pestañas, en lugar de repetir un encabezado
 *   propio dentro de cada pantalla.
 *
 * TEORÍA:
 *   [NAV]  Opciones del header (`headerLeft`, `headerRight`) y navegación:
 *          `navigation.navigate(...)` en React Navigation ≈ `router.push(...)`
 *          en expo-router (`useRouter`).
 *   [COMP] `Pressable` con `pressed` y `hitSlop`.
 *   [EST]  `flexDirection: "row"` para poner elementos en fila.
 */
import { Ionicons } from "@expo/vector-icons";
// `useRouter` da acceso al "router": el objeto con el que se navega desde el código.
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/componentes/Avatar";
// `useDatos` da las notificaciones (para contar las que no se leyeron).
import { useDatos } from "@/estado/datos";
// `useSesion` da el usuario que inició sesión (el Context de la sesión).
import { useSesion } from "@/estado/sesion";
import { colores, espaciado } from "@/tema/colores";
// `nombreCompleto(usuario)`: "Nombre Apellido" (o "" si no hay usuario).
import { nombreCompleto } from "@/utilidades/usuario";

/**
 * Las dos mitades del header de las pestañas. Se pasan a las opciones
 * `headerLeft` y `headerRight` de las Tabs (ver `app/(tabs)/_layout.tsx`), así
 * el header es el nativo y se declara una sola vez para las cuatro pestañas.
 */

/** Logo y nombre, a la izquierda. */
export function MarcaHeader() {
  return (
    <View style={estilos.marca}>
      <Ionicons name="school" size={24} color={colores.azulTenue} />
      <Text style={estilos.nombre}>urway</Text>
    </View>
  );
}

/** Campana y avatar, a la derecha: abren las notificaciones y el perfil. */
export function AccionesHeader() {
  // El router se pide con un hook, así que se llama al empezar el componente.
  const router = useRouter();
  // El usuario que inició sesión: de él salen las iniciales del avatar.
  // (Desestructuración: del objeto de la sesión se saca solo el `usuario`.)
  const { usuario } = useSesion();
  // Cuántas notificaciones no se leyeron: un valor DERIVADO [JS 25].
  const { notificaciones } = useDatos();
  const sinLeer = notificaciones.filter((aviso) => !aviso.leida).length;

  return (
    <View style={estilos.acciones}>
      {/* Campana → pantalla Notificaciones. `router.push` APILA la pantalla
          encima de la actual: el botón "volver" regresa a donde estábamos. */}
      <Pressable
        onPress={() => router.push("/notificaciones")}
        hitSlop={8} // agranda el área táctil 8 dp por lado
        // Cuando NO está apretado, `pressed && ...` vale `false` (y React
        // Native lo ignora); cuando sí, aplica la opacidad.
        style={({ pressed }) => pressed && estilos.presionado}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={colores.azulTenue}
        />
        {/* El globito: solo si hay sin leer ("9+" si son muchas). Va en
            `position: "absolute"`, encima de la esquina de la campana. */}
        {sinLeer > 0 ? (
          <View style={estilos.globito}>
            <Text style={estilos.textoGlobito}>{sinLeer > 9 ? "9+" : sinLeer}</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Avatar → pantalla Perfil. El "anillo" es el borde redondo alrededor. */}
      <Pressable
        onPress={() => router.push("/perfil")}
        hitSlop={8}
        style={({ pressed }) => [estilos.anillo, pressed && estilos.presionado]}
      >
        {/* Las iniciales salen del nombre completo del usuario de la sesión
            ("María Pérez" → "MP"; "Franco Díaz" → "FD"). */}
        <Avatar nombre={nombreCompleto(usuario)} foto={usuario?.foto} tamanio={34} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Ícono + nombre en fila, con un margen a la izquierda para no pegarse al borde.
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    paddingLeft: espaciado.lg,
  },

  nombre: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3, // letras apenas más juntas
    color: colores.azulTenue,
  },

  // Campana y avatar en fila, con margen a la derecha.
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    paddingRight: espaciado.lg,
  },

  // Aro fino alrededor del avatar. `padding: 2` deja un espacio entre el avatar y el aro.
  anillo: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  presionado: {
    opacity: 0.6,
  },

  // El globito rojo con el número, arriba a la derecha de la campana.
  globito: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colores.fondo, // un aro negro lo despega de la campana
    backgroundColor: colores.primario,
    paddingHorizontal: 3,
  },

  textoGlobito: {
    fontSize: 9,
    fontWeight: "700",
    color: colores.blanco,
  },
});

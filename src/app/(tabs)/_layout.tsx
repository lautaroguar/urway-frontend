/**
 * ============================================================================
 * app/(tabs)/_layout.tsx — El navegador de pestañas (Bottom Tabs)
 * ============================================================================
 *
 * QUÉ ES:
 *   El contenedor de las 4 pestañas: Inicio · Plan · Agenda · Conectar. Cada
 *   pestaña es un ARCHIVO de esta carpeta (`inicio.tsx`, `plan.tsx`,
 *   `agenda.tsx`, `conectar.tsx`).
 *
 * POR QUÉ LA CARPETA SE LLAMA `(tabs)` (con paréntesis):
 *   Los paréntesis definen un "grupo": sirven para agrupar archivos sin agregar
 *   nada a la URL. La pestaña de Inicio es `/inicio`, no `/(tabs)/inicio`.
 *
 * QUÉ HACE:
 *   1. Declara los cuatro `Tabs.Screen`, uno por archivo.
 *   2. Reemplaza la barra de abajo por la propia (`BarraDeTabs`) mediante la
 *      prop `tabBar`.
 *   3. Declara el header UNA sola vez: el logo a la izquierda (`MarcaHeader`) y
 *      la campana + avatar a la derecha (`AccionesHeader`).
 *
 * TEORÍA:
 *   [NAV] Bottom Tab Navigator: "las rutas se montan lazy, al enfocarse".
 *   [NAV] Barra personalizada: la teoría usa `tabBarComponent`; en expo-router
 *         la prop se llama `tabBar` y recibe una función que devuelve el
 *         componente.
 *   [NAV] Opciones del header (`headerLeft`, `headerRight`, `headerStyle`,
 *         `headerTitle`) declaradas en `screenOptions` para todas las pestañas.
 *   [JS 7] `{...props}`: SPREAD de las props (pasa todas las props que el
 *          navegador entrega a `BarraDeTabs`).
 *
 * ANTES DE MOSTRAR LAS PESTAÑAS (los datos vienen del backend):
 *   - Sin sesión (por ejemplo, venció): `<Redirect>` al login.
 *   - Mientras llega la primera carga: un indicador de "cargando".
 *   - Si el servidor no responde: el mensaje y un botón "Reintentar".
 *
 * NOTA DE VERSIÓN:
 *   Desde Expo SDK 57 (y sigue igual en SDK 58), `Tabs` se importa de
 *   `"expo-router/js-tabs"`; importarlo de `"expo-router"` está deprecado.
 *   En SDK 58 cambió lo que recibe la barra personalizada (ver `BarraDeTabs`).
 */
import { Ionicons } from "@expo/vector-icons";
// `Redirect`: un componente que, al dibujarse, navega a otra ruta.
import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { BarraDeTabs } from "@/componentes/BarraDeTabs";
import { AccionesHeader, MarcaHeader } from "@/componentes/EncabezadoMarca";
import { useDatos } from "@/estado/datos";
import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";

/**
 * `expo-router/js-tabs` en vez de `expo-router`: desde el SDK 57 (y en el 58)
 * importar `Tabs` desde la raíz del paquete está deprecado.
 *
 * Cada pestaña es un archivo de esta carpeta (`inicio.tsx`, `plan.tsx`,
 * `agenda.tsx` y `conectar.tsx`). El header es el de las Tabs y se declara una
 * sola vez: el logo a la izquierda y la campana y el avatar a la derecha.
 */
export default function LayoutTabs() {
  const { usuario } = useSesion();
  const { listo, error, recargar } = useDatos();

  // Sin sesión no hay nada que mostrar acá: al login.
  if (!usuario) return <Redirect href="/login" />;
  // La primera carga todavía no terminó: "cargando" o, si falló, el error.
  if (!listo) return <PantallaCarga error={error} alReintentar={recargar} />;

  return (
    <Tabs
      // Opciones comunes a las cuatro pestañas.
      screenOptions={{
        headerTitle: "", // sin título: en su lugar va el logo
        // `headerLeft`/`headerRight` reciben una FUNCIÓN que devuelve el
        // componente a dibujar en cada extremo del header.
        headerLeft: () => <MarcaHeader />,
        headerRight: () => <AccionesHeader />,
        headerStyle: { backgroundColor: colores.fondo },
        headerShadowVisible: false, // sin línea debajo del header
      }}
      // Reemplaza la barra de abajo por la propia. El navegador entrega `props`
      // (con `state`, `navigation`...) y se las reenvía todas a `BarraDeTabs`
      // con el spread `{...props}`.
      tabBar={(props) => <BarraDeTabs {...props} />}
    >
      {/* Una pestaña por archivo. El `name` es el nombre del archivo sin la
          extensión y tiene que coincidir con la lista `TABS` de `BarraDeTabs`. */}
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="conectar" />
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): mientras llegan los datos (o si no llegan)
// ---------------------------------------------------------------------------

function PantallaCarga({
  error,
  alReintentar,
}: {
  error: string | null;
  alReintentar: () => void;
}) {
  return (
    <View style={estilos.pantalla}>
      {error ? (
        <>
          <Ionicons name="cloud-offline-outline" size={36} color={colores.textoTenue} />
          <Text style={estilos.texto}>{error}</Text>
          <Pressable
            onPress={alReintentar}
            style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
          >
            <Text style={estilos.textoBoton}>Reintentar</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colores.azulClaro} />
          <Text style={estilos.texto}>Cargando tu carrera…</Text>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Todo centrado sobre el fondo negro.
  pantalla: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.md,
    padding: espaciado.xl,
    backgroundColor: colores.fondo,
  },

  texto: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colores.textoSecundario,
  },

  boton: {
    borderRadius: radios.md,
    backgroundColor: colores.primario,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.xl,
  },

  textoBoton: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  presionado: {
    opacity: 0.7,
  },
});

/**
 * ============================================================================
 * app/_layout.tsx — El Stack raíz: el "esqueleto" de toda la navegación
 * ============================================================================
 *
 * QUÉ ES:
 *   Es el PRIMER archivo que ejecuta la app. En expo-router, un archivo
 *   `_layout.tsx` es un "contenedor" que envuelve a las pantallas de su
 *   carpeta. Este es el de la carpeta `app/` (la raíz), así que envuelve a
 *   TODAS las pantallas.
 *
 * QUÉ HACE, EN CUATRO PUNTOS:
 *   1. Monta los dos proveedores de Context, así todas las pantallas pueden
 *      usar `useSesion()` (quién inició sesión, guardado en el teléfono) y
 *      `useDatos()` (materias e historial, eventos, compañeros, apuntes y
 *      notificaciones).
 *   2. Crea el Stack: un navegador donde cada pantalla se APILA sobre la
 *      anterior y se vuelve con el botón "atrás" o con el gesto.
 *   3. Configura el aspecto del header nativo UNA sola vez para todas.
 *   4. Envuelve todo en `GestureHandlerRootView`, que hace falta para que
 *      respondan los gestos (el zoom de las fotos y las filas que se deslizan).
 *
 * MAPA DE PANTALLAS (nombre de la pantalla = ruta del archivo dentro de app/):
 *
 *      Stack raíz
 *      ├── index            → bienvenida animada (primera pantalla; sin header)
 *      ├── login            → ingreso (sin header; aparece con un fundido)
 *      ├── (tabs)           → las 4 pestañas (dibujan su propio header)
 *      ├── materia/[id]     → detalle de materia
 *      ├── evento/[id]      → detalle de un evento
 *      ├── evento/nuevo     → formulario para crear un evento
 *      ├── evento/editar/[id] → el mismo formulario, para editar un evento
 *      ├── rendi            → "Rendí": cargar un parcial, TP, exposición o final
 *      ├── estudiante/[id]  → perfil de otro estudiante
 *      ├── personas         → lista completa de amigos o compañeros («Ver más»)
 *      ├── perfil           → mi perfil
 *      ├── editar-perfil    → cambiar mis datos y mi foto (pide la contraseña)
 *      ├── notificaciones   → historial de avisos
 *      ├── registro         → crear cuenta (se apila sobre el login)
 *      ├── apunte/camara    → cámara para sacarle una foto a un apunte
 *      ├── apunte/nuevo     → título y descripción de un apunte, y confirmar que se sube
 *      └── apunte/ver       → vista previa de un apunte (foto o PDF) y guardarlo
 *
 * TEORÍA:
 *   [NAV]  "Stack + Tabs": el Stack raíz contiene al navegador de tabs como una
 *          pantalla más. Las pantallas de detalle van en el Stack (no en las
 *          tabs) para que se abran a pantalla completa y con botón de volver.
 *          `Stack` de expo-router = `createNativeStackNavigator` de la teoría.
 *   [NAV]  `screenOptions`: opciones que se aplican a todas las pantallas;
 *          `options` de cada `Stack.Screen`: solo para esa pantalla.
 *   [JS 29] El Context se monta en el nivel más alto para que lo lean todas.
 *   [CTX]   Dos Context separados, no uno gigante: la sesión casi no cambia y los
 *           datos sí. `ProveedorSesion` va afuera y no dibuja nada hasta leer el
 *           disco (AsyncStorage), así la bienvenida ya sabe si hay sesión.
 *   [GESTOS 6] `GestureHandlerRootView` envolviendo la app: es "el olvido más
 *          común". Si falta, los gestos no responden y no aparece ningún error.
 *
 * NOTA DE VERSIÓN:
 *   En la teoría aparece `headerBackTitleVisible: false`. Desde Expo SDK 57 esa
 *   opción se reemplazó por `headerBackButtonDisplayMode: "minimal"` (igual en SDK 58).
 *   En SDK 58, en iOS 26 o más nuevo, el header del Stack pasa a ser transparente
 *   ("Liquid Glass") salvo que tenga color de fondo propio: como acá se le da
 *   `headerStyle.backgroundColor`, se mantiene opaco y negro como siempre.
 */

// `Stack`: el navegador de tipo pila.
import { Stack } from "expo-router";
// `StatusBar`: la barra de estado del teléfono (hora, batería, señal).
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
// `GestureHandlerRootView`: la vista raíz que necesita Gesture Handler [GESTOS 6].
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ProveedorDatos } from "@/estado/datos";
import { ProveedorSesion } from "@/estado/sesion";
import { colores } from "@/tema/colores";

/**
 * Stack raíz: es la estructura de la clase de navegadores, un Stack con las
 * Tabs adentro. Sobre él viven, además de las tabs, las pantallas que se
 * apilan a pantalla completa: bienvenida, login, detalles, formulario, perfiles
 * y notificaciones.
 *
 * El header es el nativo del Stack y se configura una sola vez acá: fondo
 * negro, íconos azules y el título de cada pantalla. La bienvenida (`index`,
 * la primera pantalla de la app), el login y el grupo `(tabs)`, que dibuja su
 * propio header, lo apagan.
 */
// `export default`: expo-router toma el export por defecto del archivo como el
// componente de la pantalla/contenedor.
export default function LayoutRaiz() {
  return (
    // Lo más de afuera: envuelve a TODA la app para que los gestos funcionen en
    // cualquier pantalla. Con `flex: 1` ocupa toda la pantalla (sin eso mediría
    // 0 de alto y no se vería nada).
    <GestureHandlerRootView style={estilos.raiz}>
      {/* Los proveedores del Context envuelven a TODO: así cualquier pantalla puede
          llamar a `useSesion()` y `useDatos()`. Se anidan; el orden solo importa si
          uno necesita leer al otro (acá no). */}
      <ProveedorSesion>
        <ProveedorDatos>
          {/* Texto claro en la barra de estado porque el fondo es negro. */}
          <StatusBar style="light" />
          <Stack
            // OPCIONES COMUNES a todas las pantallas del Stack. Las llaves dobles
            // son: una para "acá va JavaScript" y otra para el objeto.
            screenOptions={{
              headerStyle: { backgroundColor: colores.fondo }, // fondo del header
              headerTintColor: colores.azulClaro, // color de la flecha "volver"
              headerTitleStyle: { color: colores.texto }, // color del título
              headerShadowVisible: false, // sin línea/sombra debajo del header
              // Solo la flecha, sin el texto del título anterior al lado
              // (en la teoría: `headerBackTitleVisible: false`).
              headerBackButtonDisplayMode: "minimal",
              contentStyle: { backgroundColor: colores.fondo }, // fondo detrás de cada pantalla
            }}
          >
            {/* Cada `Stack.Screen` declara una pantalla. El `name` es la ruta del
                archivo dentro de `app/`, sin la extensión. */}

            {/* `index.tsx` = la bienvenida animada. Sin header (es pantalla completa
                y se va sola). */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            {/* `login.tsx` = el ingreso. Sin header (tiene su propia marca grande).
                `animation: "fade"` hace que aparezca con un fundido: así la
                bienvenida se funde en el login en vez de empujarlo desde un
                costado. */}
            <Stack.Screen
              name="login"
              options={{ headerShown: false, animation: "fade" }}
            />
            {/* `(tabs)` = la carpeta con las 4 pestañas. Sin header del Stack
                porque el de las pestañas lo dibuja el navegador de tabs. */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Las demás muestran el header del Stack, con este título. Los
                corchetes `[id]` indican una ruta DINÁMICA: el valor cambia
                (`/materia/MAT-201`, `/materia/CS-302`...). */}
            <Stack.Screen name="materia/[id]" options={{ title: "Materia" }} />
            <Stack.Screen name="evento/[id]" options={{ title: "Evento" }} />
            <Stack.Screen name="evento/nuevo" options={{ title: "Nuevo evento" }} />
            <Stack.Screen name="evento/editar/[id]" options={{ title: "Editar evento" }} />
            {/* "Rendí": se abre desde Inicio y desde el detalle de una materia. */}
            <Stack.Screen name="rendi" options={{ title: "Cargar lo que rendí" }} />
            <Stack.Screen name="estudiante/[id]" options={{ title: "Perfil" }} />
            {/* «Ver más» de amigos y compañeros. El título lo pone la propia pantalla
                según la lista (`Stack.Screen` dentro de `personas.tsx`). */}
            <Stack.Screen name="personas" options={{ title: "Personas" }} />
            <Stack.Screen name="perfil" options={{ title: "Perfil" }} />
            <Stack.Screen name="editar-perfil" options={{ title: "Editar perfil" }} />
            <Stack.Screen
              name="notificaciones"
              options={{ title: "Notificaciones" }}
            />
            {/* El registro se abre desde "Crear cuenta" del login y se apila
                encima de él (con flecha para volver). */}
            <Stack.Screen name="registro" options={{ title: "Crear cuenta" }} />
            {/* La cámara de apuntes se abre desde "Sacar foto" de una materia. */}
            <Stack.Screen name="apunte/camara" options={{ title: "Foto del apunte" }} />
            {/* Después de elegir o sacar el apunte: título, descripción y confirmar. */}
            <Stack.Screen name="apunte/nuevo" options={{ title: "Nuevo apunte" }} />
            {/* La vista previa de un apunte (foto o PDF), para mirarlo y guardarlo. */}
            <Stack.Screen name="apunte/ver" options={{ title: "Apunte" }} />
          </Stack>
        </ProveedorDatos>
      </ProveedorSesion>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  // Ocupa toda la pantalla. El fondo negro evita un destello claro si la raíz se
  // dibuja un instante antes que las pantallas.
  raiz: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
});

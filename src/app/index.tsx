/**
 * ============================================================================
 * app/index.tsx — Pantalla de bienvenida (la primera de la app)
 * ============================================================================
 *
 * QUÉ ES:
 *   La animación de arranque: el logo entra con un rebote, después aparece
 *   "urway" subiendo un poco y por último el lema. Con la marca completa en
 *   pantalla una pausa corta, la app pasa sola al login, o directo a Inicio si
 *   la sesión quedó iniciada la última vez que se usó la app (la sesión se
 *   guarda en el teléfono: ver `estado/sesion.tsx`). Tocar en cualquier lado
 *   saltea la animación.
 *
 * POR QUÉ SE LLAMA `index.tsx`:
 *   En expo-router el nombre del archivo es la RUTA. `index` es la ruta raíz
 *   ("/"), o sea la que se abre al iniciar la app. El login quedó en `/login`.
 *
 * CÓMO FUNCIONA (en una frase):
 *   Tres números (`Animated.Value`) van de 0 a 1 en el tiempo; cada elemento
 *   de la pantalla "lee" su número en el estilo (opacidad, tamaño, posición) y
 *   por eso se mueve solo mientras el número cambia.
 *
 * LÍNEA DE TIEMPO (aproximada):
 *     0 ms   logo ......... rebota hasta su tamaño final   (spring)
 *   300 ms   "urway" ...... aparece y sube                  (timing)
 *   600 ms   lema ......... aparece                         (timing)
 *   ~1,3 s   pausa de 900 ms con todo a la vista            (delay)
 *   ~2,2 s   router.replace("/login" o "/inicio")  → fundido del Stack
 *
 * TEORÍA ([ANIM d.N] = ANIMACIONES.pptx, Clase 6):
 *   [ANIM d.4]     Animated API: `Animated.View` / `Animated.Text`, y los
 *                  métodos `start()` y `stop()` para controlar la ejecución.
 *   [ANIM d.8-9]   `Animated.Value`: el valor que se conecta al estilo.
 *   [ANIM d.6-7]   `Animated.timing` (toValue, duration, useNativeDriver) e
 *                  `interpolate` (inputRange → outputRange).
 *   [ANIM d.10-11] `Animated.spring` (friction, tension): el rebote del logo.
 *   [ANIM d.18-19] `Animated.stagger`: arranques escalonados.
 *   [ANIM d.14-15] `Animated.sequence`: una animación después de la otra.
 *   [ANIM d.5]     "Delay Animations": la pausa final.
 *   [JS 26]        `useEffect` sincroniza React con sistemas externos: acá el
 *                  sistema externo es el motor de animaciones, que se arranca
 *                  una vez al aparecer la pantalla y se frena al salir.
 *   [JS 27]        `useRef` conserva valores que no participan del render: los
 *                  `Animated.Value` y la animación en marcha.
 *   [NAV]          `router.replace`: el login (o Inicio) reemplaza a la
 *                  bienvenida, así el gesto de volver no regresa a ella.
 *   [CTX]          `useSesion()`: el Provider de la sesión no dibuja nada hasta
 *                  leer AsyncStorage, así que cuando esta pantalla aparece
 *                  `usuario` ya es el definitivo.
 *
 * DECISIÓN DE ALCANCE:
 *   Solo `Animated` de React Native, nada de librerías extra (ni shaders ni
 *   SVG): todo lo que se ve se explica con la clase de animaciones.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";

// Cuánto queda la marca completa en pantalla antes de pasar a la pantalla
// siguiente, en milisegundos.
const PAUSA_FINAL_MS = 900;

/**
 * Bienvenida animada. Al terminar (o al tocar la pantalla) reemplaza esta
 * ruta por el login, o por Inicio si ya hay una sesión iniciada.
 */
export default function PantallaBienvenida() {
  const router = useRouter();
  // Hay sesión si `usuario` no es `null`. Es el valor que se leyó del teléfono.
  const { usuario } = useSesion();
  // A dónde ir al terminar: con sesión, a Inicio; sin sesión, al login.
  const destino = usuario ? "/inicio" : "/login";

  // VALORES ANIMADOS [ANIM d.8-9]. Cada uno va de 0 ("todavía no apareció") a
  // 1 ("ya está"). `useRef(...).current` [JS 27] hace que sea SIEMPRE el mismo
  // objeto aunque la pantalla se vuelva a dibujar; con un `new` suelto en el
  // cuerpo del componente se crearía uno nuevo en cada render y la animación
  // se perdería.
  const logo = useRef(new Animated.Value(0)).current;
  const nombre = useRef(new Animated.Value(0)).current;
  const lema = useRef(new Animated.Value(0)).current;

  // La animación en marcha, guardada para poder frenarla con `stop()` [ANIM d.4]
  // si el usuario toca la pantalla antes de que termine.
  const entrada = useRef<Animated.CompositeAnimation | null>(null);

  // Toque en cualquier lado: se frena la animación (así su aviso de "terminé"
  // no navega por segunda vez) y se reemplaza la pantalla por el destino.
  const continuar = () => {
    entrada.current?.stop();
    router.replace(destino);
  };

  // Arranca la animación UNA vez, cuando la pantalla aparece [JS 26]. El `[]`
  // del final significa "no depende de nada, no se vuelve a ejecutar".
  useEffect(() => {
    // `sequence` [ANIM d.14-15]: primero la entrada de la marca y, cuando
    // termina, la pausa final.
    entrada.current = Animated.sequence([
      // `stagger` [ANIM d.18-19]: las tres animaciones arrancan con 300 ms de
      // diferencia entre una y la siguiente (se pisan un poco, no esperan a
      // que termine la anterior).
      Animated.stagger(300, [
        // `spring` [ANIM d.10-11]: movimiento de resorte. `friction` baja =
        // más rebote; `tension` alta = más rígido y rápido.
        Animated.spring(logo, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        // `timing` [ANIM d.6]: va de 0 a `toValue` en `duration` milisegundos.
        // `useNativeDriver: true` hace que la animación corra en el hilo
        // nativo (más fluida); sirve para opacidad y `transform`.
        Animated.timing(nombre, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(lema, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // La pausa con todo a la vista [ANIM d.5].
      Animated.delay(PAUSA_FINAL_MS),
    ]);

    // `start` recibe una función que se llama al terminar. `finished` es
    // `true` si la animación llegó hasta el final y `false` si se la frenó con
    // `stop()`; solo en el primer caso se pasa a la pantalla siguiente.
    entrada.current.start(({ finished }) => {
      if (finished) router.replace(destino);
    });

    // Si la pantalla se va antes de tiempo, se frena la animación.
    return () => entrada.current?.stop();
  }, []);

  return (
    // Toda la pantalla es un `Pressable`: tocar en cualquier lado la saltea.
    <Pressable style={estilos.pantalla} onPress={continuar}>
      {/* LOGO. El MISMO valor (`logo`) mueve dos propiedades; `interpolate`
          [ANIM d.7] convierte el 0..1 del valor en lo que cada propiedad
          necesita. La escala sale de 0,5 y llega a 1; como `spring` pasa un
          poco de 1 antes de asentarse, el logo "rebota" y se agranda de más un
          instante. La opacidad llega a 1 a mitad de camino y se queda ahí. */}
      <Animated.View
        style={[
          estilos.logo,
          {
            opacity: logo.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1, 1],
            }),
            transform: [
              {
                scale: logo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="school" size={48} color={colores.azulTenue} />
      </Animated.View>

      {/* NOMBRE. La opacidad es el valor tal cual (0 → 1); la posición vertical
          se interpola: arranca 16 puntos más abajo y sube hasta su lugar. */}
      <Animated.Text
        style={[
          estilos.nombre,
          {
            opacity: nombre,
            transform: [
              {
                translateY: nombre.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        urway
      </Animated.Text>

      {/* LEMA. Solo aparece (opacidad 0 → 1). */}
      <Animated.Text style={[estilos.lema, { opacity: lema }]}>
        For students, By students.
      </Animated.Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // Fondo negro y todo centrado en la pantalla; `gap` separa los tres hijos.
  pantalla: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.lg,
    backgroundColor: colores.fondo,
  },

  // El mismo logo que el login, más grande: al pasar de una pantalla a la otra
  // se lee como la misma marca.
  logo: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radios.xl + 4,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
  },

  nombre: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1,
    color: colores.azulTenue,
  },

  lema: {
    fontSize: 15,
    color: colores.textoTenue,
  },
});

/**
 * ============================================================================
 * componentes/FotoConZoom.tsx — Una foto que se acerca y se mueve con los dedos
 * ============================================================================
 *
 * QUÉ ES:
 *   La foto de un apunte dentro de un recuadro. Se puede:
 *     - ACERCAR Y ALEJAR pellizcando con dos dedos (de 1× a 5×); el zoom ocurre
 *       donde están los dedos, no en el centro.
 *     - MOVER con un dedo cuando está acercada, con un poco de inercia al soltar.
 *     - ACERCAR O VOLVER a su tamaño con un DOBLE TOQUE.
 *     - Lo mismo con los botones «+» y «−» de la esquina, para quien no puede o no
 *       quiere hacer gestos.
 *
 * CÓMO FUNCIONA:
 *   Hay cuatro números que describen cómo se ve la foto, guardados en "shared
 *   values" de Reanimated: `escala`, `x` e `y` (cuánto se corrió). Cada gesto los
 *   modifica y un estilo animado (`useAnimatedStyle`) los convierte en
 *   `transform`. Todo eso pasa en el HILO DE UI, sin pasar por `useState`: por eso
 *   la foto sigue al dedo sin trabarse [GESTOS 4-5].
 *   Al hilo de JavaScript se vuelve UNA sola vez, con `runOnJS`, y solo cuando la
 *   foto pasa de «normal» a «acercada» (o al revés): para avisarle a la pantalla
 *   que apague o prenda su scroll (`alCambiarZoom`). Las cuentas están en
 *   `utilidades/zoom.ts`.
 *
 * LOS TRES GESTOS Y CÓMO SE COMBINAN:
 *   `Gesture.Simultaneous(arrastre, pellizco, dobleToque)`: los tres pueden estar
 *   activos a la vez [GESTOS 20]. El que arrastra solo acepta UN dedo
 *   (`maxPointers(1)`), así cuando entran dos dedos manda el pellizco.
 *
 * EL CONFLICTO CON EL SCROLL:
 *   La pantalla que muestra la foto se desplaza hacia abajo. Si arrastrar la foto
 *   siempre se quedara con el dedo, no se podría seguir bajando por la página
 *   tocando la foto. Por eso el arrastre usa activación MANUAL: mira el dedo mientras
 *   se mueve y se activa solo si la foto está acercada; si no, "falla" y el dedo
 *   sigue siendo del scroll [GESTOS 21]. Además, mientras está acercada la
 *   pantalla apaga su scroll para que no se mueva a la vez.
 *
 * POR QUÉ HAY DOS `Animated.View`:
 *   El `GestureDetector` envuelve a una vista FIJA que no se mueve; la foto, que sí
 *   se agranda y se corre, va adentro. Si el detector estuviera sobre la vista que
 *   se transforma, las posiciones de los dedos se medirían en una vista que cambia
 *   de tamaño y la cuenta del zoom saldría mal.
 *
 * TEORÍA:
 *   [GESTOS 4-5]  Detectar y animar en el hilo de UI; `useSharedValue` y
 *                 `useAnimatedStyle` en lugar de `useState`.
 *   [GESTOS 7]    `GestureDetector` + `Animated.View`; la configuración del gesto
 *                 va en `useMemo` para que la librería trabaje menos en cada render.
 *   [GESTOS 8]    Ciclo de vida: `onBegin` guarda de dónde se parte, `onUpdate`
 *                 mueve, `onEnd` recibe si terminó bien o se canceló.
 *   [GESTOS 10]   Worklets y `runOnJS` para volver a JavaScript al terminar.
 *   [GESTOS 12]   Tap: `numberOfTaps(2)` y `maxDuration`.
 *   [GESTOS 13]   Pan: guardar dónde estaba la foto antes de mover.
 *   [GESTOS 15]   Pinch: guardar la escala y MULTIPLICAR, con límites; `focalX` y
 *                 `focalY` como origen del zoom.
 *   [GESTOS 20]   `Gesture.Simultaneous`.
 *   [GESTOS 21]   Pan dentro de un scroll.
 *   [GESTOS 23]   `withDecay` con `clamp`: inercia con freno en los bordes.
 *   [GESTOS 26]   Accesibilidad: un gesto nunca es la única forma de hacer algo
 *                 (los botones «+» y «−»), y `hitSlop` para agrandar la zona táctil.
 *   [EST]         `overflow: "hidden"`, `position: "absolute"`, círculo con `borderRadius`.
 *
 * NOTA DE VERSIÓN:
 *   Se usa la forma `Gesture.Pan()`, `Gesture.Pinch()`... y `runOnJS` de la teoría.
 *   Con las versiones de Expo SDK 58 (Gesture Handler 3 y Worklets 0.13) siguen
 *   funcionando pero la librería las marca como "deprecated": en el futuro se
 *   reemplazan por los hooks `usePanGesture`... y por `scheduleOnRN`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from "react-native-reanimated";

import { colores, espaciado } from "@/tema/colores";
import {
  ESCALA_DOBLE_TOQUE,
  ESCALA_MAXIMA,
  ESCALA_MINIMA,
  PASO_BOTONES,
  estaAcercada,
  limitar,
  limiteDeTraslado,
  trasladoAlHacerZoom,
} from "@/utilidades/zoom";

type Props = {
  /** La dirección de la foto. */
  uri: string;
  /** Lo que lee un lector de pantalla (el título del apunte). */
  descripcion?: string;
  /** Se ejecuta si la foto no se pudo cargar. */
  alFallar: () => void;
  /** Se ejecuta cuando la foto pasa a estar acercada (`true`) o vuelve a lo normal. */
  alCambiarZoom: (acercada: boolean) => void;
};

/** La foto de un apunte, con zoom y movimiento con los dedos. */
export function FotoConZoom({ uri, descripcion, alFallar, alCambiarZoom }: Props) {
  // ----- Lo que se VE: cuánto se agrandó la foto y cuánto se corrió -----
  const escala = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // ----- Lo que se GUARDA al empezar cada gesto [GESTOS 13 y 15] -----
  // El arrastre y el pellizco guardan por separado, así no se pisan.
  const xAlArrastrar = useSharedValue(0);
  const yAlArrastrar = useSharedValue(0);
  const escalaAlPellizcar = useSharedValue(1);
  const xAlPellizcar = useSharedValue(0);
  const yAlPellizcar = useSharedValue(0);
  const focoXAlPellizcar = useSharedValue(0);
  const focoYAlPellizcar = useSharedValue(0);

  // El tamaño del recuadro (se mide al dibujarlo) y si ya se avisó que está acercada.
  const ancho = useSharedValue(0);
  const alto = useSharedValue(0);
  const avisada = useSharedValue(false);

  // Los gestos se arman UNA vez (y de nuevo solo si cambia `alCambiarZoom`) [GESTOS 7].
  const gestos = useMemo(() => {
    /** Le avisa a la pantalla, pero solo si cambió (no en cada movimiento). */
    const avisar = (acercada: boolean) => {
      'worklet';
      if (acercada === avisada.value) return;
      avisada.value = acercada;
      runOnJS(alCambiarZoom)(acercada); // [GESTOS 10]: volver a JavaScript UNA vez
    };

    // 1) ARRASTRAR con un dedo, solo si está acercada [GESTOS 13, 21, 23].
    const arrastre = Gesture.Pan()
      .maxPointers(1)
      .manualActivation(true)
      .onTouchesMove((_evento, gestor) => {
        // ¿Está acercada? Entonces el dedo es de la foto. Si no, es del scroll.
        if (estaAcercada(escala.value)) gestor.activate();
        else gestor.fail();
      })
      .onBegin(() => {
        // Dónde estaba la foto antes de mover.
        xAlArrastrar.value = x.value;
        yAlArrastrar.value = y.value;
      })
      .onUpdate((evento) => {
        const limiteX = limiteDeTraslado(ancho.value, escala.value);
        const limiteY = limiteDeTraslado(alto.value, escala.value);
        x.value = limitar(xAlArrastrar.value + evento.translationX, -limiteX, limiteX);
        y.value = limitar(yAlArrastrar.value + evento.translationY, -limiteY, limiteY);
      })
      .onEnd((evento, exito) => {
        if (!exito) return; // se canceló (entró un segundo dedo): no hay inercia
        const limiteX = limiteDeTraslado(ancho.value, escala.value);
        const limiteY = limiteDeTraslado(alto.value, escala.value);
        // Sigue un poco con la velocidad que traía el dedo y frena en los bordes.
        x.value = withDecay({ velocity: evento.velocityX, clamp: [-limiteX, limiteX] });
        y.value = withDecay({ velocity: evento.velocityY, clamp: [-limiteY, limiteY] });
      });

    // 2) PELLIZCAR con dos dedos [GESTOS 15].
    const pellizco = Gesture.Pinch()
      .onStart((evento) => {
        // De dónde se parte: la escala, el corrimiento y dónde están los dedos
        // (medidos desde el centro del recuadro).
        escalaAlPellizcar.value = escala.value;
        xAlPellizcar.value = x.value;
        yAlPellizcar.value = y.value;
        focoXAlPellizcar.value = evento.focalX - ancho.value / 2;
        focoYAlPellizcar.value = evento.focalY - alto.value / 2;
      })
      .onUpdate((evento) => {
        // MULTIPLICAR sobre la escala guardada (asignar haría saltar la foto), con límites.
        const nueva = limitar(
          escalaAlPellizcar.value * evento.scale,
          ESCALA_MINIMA,
          ESCALA_MAXIMA
        );
        const limiteX = limiteDeTraslado(ancho.value, nueva);
        const limiteY = limiteDeTraslado(alto.value, nueva);
        escala.value = nueva;
        // Que el punto bajo los dedos siga bajo los dedos.
        x.value = limitar(
          trasladoAlHacerZoom(
            focoXAlPellizcar.value,
            evento.focalX - ancho.value / 2,
            xAlPellizcar.value,
            escalaAlPellizcar.value,
            nueva
          ),
          -limiteX,
          limiteX
        );
        y.value = limitar(
          trasladoAlHacerZoom(
            focoYAlPellizcar.value,
            evento.focalY - alto.value / 2,
            yAlPellizcar.value,
            escalaAlPellizcar.value,
            nueva
          ),
          -limiteY,
          limiteY
        );
      })
      .onEnd(() => {
        avisar(estaAcercada(escala.value));
      });

    // 3) DOBLE TOQUE: acerca donde se tocó, o vuelve a lo normal [GESTOS 12].
    // `maxDistance`: cuánto puede moverse el dedo durante cada toque. Sin este límite,
    // dos arrastres rápidos seguidos contarían como un doble toque y la foto se
    // acercaría o volvería a lo normal sola en medio de un arrastre.
    const dobleToque = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .maxDistance(20)
      .onEnd((evento, exito) => {
        if (!exito) return;
        if (estaAcercada(escala.value)) {
          escala.value = withTiming(ESCALA_MINIMA);
          x.value = withTiming(0);
          y.value = withTiming(0);
          avisar(false);
        } else {
          const limiteX = limiteDeTraslado(ancho.value, ESCALA_DOBLE_TOQUE);
          const limiteY = limiteDeTraslado(alto.value, ESCALA_DOBLE_TOQUE);
          const focoX = evento.x - ancho.value / 2;
          const focoY = evento.y - alto.value / 2;
          escala.value = withTiming(ESCALA_DOBLE_TOQUE);
          x.value = withTiming(
            limitar(trasladoAlHacerZoom(focoX, focoX, 0, 1, ESCALA_DOBLE_TOQUE), -limiteX, limiteX)
          );
          y.value = withTiming(
            limitar(trasladoAlHacerZoom(focoY, focoY, 0, 1, ESCALA_DOBLE_TOQUE), -limiteY, limiteY)
          );
          avisar(true);
        }
      });

    // Los tres a la vez [GESTOS 20].
    return Gesture.Simultaneous(arrastre, pellizco, dobleToque);
  }, [alCambiarZoom]);

  // Cómo se dibuja la foto: el corrimiento y la escala, leídos en el hilo de UI.
  const estiloFoto = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: escala.value }],
  }));

  /** Mide el recuadro (lo necesitan las cuentas para saber hasta dónde se puede mover). */
  const medir = (evento: LayoutChangeEvent) => {
    ancho.value = evento.nativeEvent.layout.width;
    alto.value = evento.nativeEvent.layout.height;
  };

  /**
   * Los botones «+» y «−»: la misma cuenta que el pellizco, pero desde el centro y
   * escrita desde JavaScript. Son la alternativa a los gestos [GESTOS 26].
   */
  const cambiarEscala = (factor: number) => {
    const actual = escala.value;
    const nueva = limitar(actual * factor, ESCALA_MINIMA, ESCALA_MAXIMA);
    const limiteX = limiteDeTraslado(ancho.value, nueva);
    const limiteY = limiteDeTraslado(alto.value, nueva);
    escala.value = withTiming(nueva);
    x.value = withTiming(limitar(trasladoAlHacerZoom(0, 0, x.value, actual, nueva), -limiteX, limiteX));
    y.value = withTiming(limitar(trasladoAlHacerZoom(0, 0, y.value, actual, nueva), -limiteY, limiteY));
    if (estaAcercada(nueva) !== avisada.value) {
      avisada.value = estaAcercada(nueva);
      alCambiarZoom(avisada.value);
    }
  };

  return (
    <View style={estilos.raiz} onLayout={medir}>
      {/* La vista FIJA con el detector; la foto que se mueve va adentro. */}
      <GestureDetector gesture={gestos}>
        <Animated.View style={estilos.fija}>
          <Animated.Image
            source={{ uri }}
            style={[estilos.foto, estiloFoto]}
            resizeMode="contain"
            onError={alFallar}
            accessibilityLabel={descripcion}
          />
        </Animated.View>
      </GestureDetector>

      {/* Los botones están FUERA del detector: tocarlos rápido dos veces no cuenta
          como doble toque sobre la foto. */}
      <View style={estilos.botones}>
        <Pressable
          onPress={() => cambiarEscala(1 / PASO_BOTONES)}
          hitSlop={6}
          accessibilityLabel="Alejar la foto"
          style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
        >
          <Ionicons name="remove" size={20} color={colores.texto} />
        </Pressable>
        <Pressable
          onPress={() => cambiarEscala(PASO_BOTONES)}
          hitSlop={6}
          accessibilityLabel="Acercar la foto"
          style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
        >
          <Ionicons name="add" size={20} color={colores.texto} />
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Llena el recuadro que le da la pantalla. `overflow: "hidden"` recorta la foto
  // agrandada para que no se salga del recuadro.
  raiz: {
    flex: 1,
    overflow: "hidden",
  },

  // La vista que no se mueve: del tamaño del recuadro.
  fija: {
    flex: 1,
  },

  // La foto llena la vista fija; `contain` la muestra entera, sin recortar.
  foto: {
    width: "100%",
    height: "100%",
  },

  // Los botones, pegados abajo a la derecha. Como es `absolute`, esta vista mide
  // solo lo que miden los botones: el resto de la foto sigue recibiendo los gestos.
  botones: {
    position: "absolute",
    right: espaciado.sm,
    bottom: espaciado.sm,
    flexDirection: "row",
    gap: espaciado.sm,
  },

  // Círculo de 36 de lado (radio 18) sobre un fondo translúcido para que se lea
  // sobre cualquier foto.
  boton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colores.bordeVidrio,
    backgroundColor: colores.velo,
  },

  presionado: {
    opacity: 0.7,
  },
});

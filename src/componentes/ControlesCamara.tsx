/**
 * ============================================================================
 * componentes/ControlesCamara.tsx — Linterna y zoom para la cámara
 * ============================================================================
 *
 * QUÉ ES:
 *   Dos ayudas para sacar o leer mejor con la cámara, y el hook que guarda su
 *   estado:
 *     - LINTERNA: enciende la luz del teléfono (poca luz).
 *     - ZOOM: acerca la imagen, así se puede ALEJAR el celular del papel o del
 *       DNI. De muy cerca la cámara no llega a enfocar.
 *
 * CÓMO SE USA (en la pantalla que tiene la cámara):
 *     const ayudas = useAyudasCamara();
 *     <CameraView enableTorch={ayudas.linterna} zoom={ayudas.zoom} ... />
 *     <ControlesCamara ayudas={ayudas} />
 *
 * SOBRE EL ZOOM:
 *   `zoom` va de 0 a 1 y es un PORCENTAJE del zoom máximo de cada teléfono, no
 *   un aumento fijo. Android lo multiplica por el máximo (con un 10 % un teléfono
 *   de 8× queda sin zoom, porque el mínimo es 1×) e iOS lo usa como exponente.
 *   Por eso hay 5 pasos (sin zoom y 4 niveles, desde 0,2) y se muestran como
 *   "Zoom 1…4", no como porcentaje: el aumento real depende del equipo.
 *
 * DÓNDE SE USA:
 *   `EscanerDni.tsx` (registro) y `app/apunte/camara.tsx` (apuntes).
 *
 * TEORÍA:
 *   [MÁS 6]  `enableTorch`: la luz de la cámara es un emisor que se controla desde
 *            `CameraView` (la teoría muestra la linterna así).
 *   [JS 30]  CUSTOM HOOK: `useAyudasCamara` empieza con `use`, llama a otro hook
 *            (`useState`) y expone una API chica.
 *   [JS 20]  `useState` con actualización funcional (`(actual) => ...`).
 *   [COMP]   `Pressable` con `disabled`.
 */
// Íconos de Ionicons (el rayo de la linterna, el más y el menos del zoom).
import { Ionicons } from "@expo/vector-icons";
// `useState` guarda la linterna y el nivel de zoom.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, espaciado, radios } from "@/tema/colores";

// Los pasos de zoom, de "sin zoom" (0) al máximo permitido (0.5). El paso de 0.1
// se salteó a propósito: en muchos Android no produce ningún zoom (ver arriba).
const ZOOMS = [0, 0.2, 0.3, 0.4, 0.5];

/** Guarda la linterna y el nivel de zoom, y ofrece cómo cambiarlos. */
export function useAyudasCamara() {
  // ¿Está prendida la linterna? Arranca apagada.
  const [linterna, setLinterna] = useState(false);
  // No se guarda el zoom (0 a 1) sino su POSICIÓN en la lista `ZOOMS`.
  const [nivelZoom, setNivelZoom] = useState(0);

  // El hook devuelve un OBJETO con los valores y las funciones; quien lo usa
  // elige qué tomar (`ayudas.linterna`, `ayudas.subirZoom`...).
  return {
    linterna, // true = prendida (va a `enableTorch`)
    nivelZoom, // 0 = sin zoom ... 4 = el máximo
    zoom: ZOOMS[nivelZoom], // el valor de 0 a 1 que va a `zoom` (se lee la lista por posición)
    // Dos booleanos (verdadero/falso) para apagar el botón en cada tope:
    esZoomMinimo: nivelZoom === 0,
    esZoomMaximo: nivelZoom === ZOOMS.length - 1, // la última posición de la lista
    // `(actual) => !actual`: actualización FUNCIONAL [JS 20]; devuelve lo opuesto.
    alternarLinterna: () => setLinterna((actual) => !actual),
    // `Math.min`/`Math.max` impiden salirse de la lista.
    subirZoom: () =>
      setNivelZoom((actual) => Math.min(actual + 1, ZOOMS.length - 1)),
    bajarZoom: () => setNivelZoom((actual) => Math.max(actual - 1, 0)),
  };
}

// El TIPO de lo que devuelve el hook, sin escribirlo a mano.
// (`ReturnType<typeof f>` es "lo que devuelve la función f".)
export type AyudasCamara = ReturnType<typeof useAyudasCamara>;

type Props = {
  ayudas: AyudasCamara; // lo que devolvió `useAyudasCamara()` en la pantalla
};

/** La fila de controles: linterna a la izquierda y zoom a la derecha. */
export function ControlesCamara({ ayudas }: Props) {
  // Desestructuración: se sacan del objeto `ayudas` solo los valores que se leen.
  const { linterna, nivelZoom, esZoomMinimo, esZoomMaximo } = ayudas;

  return (
    <View style={estilos.fila}>
      {/* Linterna: se pinta de azul pleno cuando está prendida. Cada botón es
          hermano del otro (nunca uno dentro de otro `Pressable`). */}
      <Pressable
        onPress={ayudas.alternarLinterna}
        style={({ pressed }) => [
          estilos.linterna,
          // `cond && estilo`: el estilo se suma solo si `cond` es cierta.
          linterna && estilos.linternaPrendida,
          pressed && estilos.presionado,
        ]}
      >
        <Ionicons
          name={linterna ? "flash" : "flash-outline"} // rayo lleno si está prendida
          size={18}
          color={linterna ? colores.blanco : colores.azulClaro}
        />
        <Text style={[estilos.texto, linterna && estilos.textoPrendida]}>
          Linterna
        </Text>
      </Pressable>

      {/* Zoom: menos, el nivel actual y más. En los extremos el botón se apaga. */}
      <View style={estilos.zoom}>
        <Pressable
          onPress={ayudas.bajarZoom}
          disabled={esZoomMinimo} // en "Sin zoom" no hay nada más que bajar
          hitSlop={8} // agranda el área táctil 8 dp por lado (el ícono es chico)
          style={({ pressed }) => [
            esZoomMinimo && estilos.apagado,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons
            name="remove-circle-outline"
            size={30}
            color={colores.azulClaro}
          />
        </Pressable>

        {/* El nivel actual: "Sin zoom", "Zoom 1"... "Zoom 4". */}
        <Text style={estilos.texto}>
          {nivelZoom === 0 ? "Sin zoom" : `Zoom ${nivelZoom}`}
        </Text>

        <Pressable
          onPress={ayudas.subirZoom}
          disabled={esZoomMaximo} // en el nivel máximo no se puede subir más
          hitSlop={8}
          style={({ pressed }) => [
            esZoomMaximo && estilos.apagado,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons
            name="add-circle-outline"
            size={30}
            color={colores.azulClaro}
          />
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Linterna a la izquierda y zoom a la derecha (`space-between` los manda a los
  // extremos).
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaciado.md,
  },

  // Botón de la linterna: una pastilla con ícono y texto.
  linterna: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.pastilla,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
  },

  // La linterna prendida: fondo azul pleno.
  linternaPrendida: {
    borderColor: colores.primario,
    backgroundColor: colores.primario,
  },

  // El texto de los controles ("Linterna", "Zoom 2").
  texto: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulPalido,
  },

  // Se suma a `texto` con la linterna prendida: blanco, para que se lea sobre el azul.
  textoPrendida: {
    color: colores.blanco,
  },

  // El grupo del zoom: menos, texto y más, en fila.
  zoom: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },

  // Botón del zoom en su tope (mínimo o máximo): se ve apagado.
  apagado: {
    opacity: 0.3,
  },

  // Se suma a un botón mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.75,
  },
});

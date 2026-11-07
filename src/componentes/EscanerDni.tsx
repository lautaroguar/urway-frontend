/**
 * ============================================================================
 * componentes/EscanerDni.tsx — La cámara que lee el código de barras del DNI
 * ============================================================================
 *
 * QUÉ ES:
 *   El panel de escaneo del registro: pide el permiso de cámara, muestra la cámara
 *   dentro de un marco, con linterna y zoom, y avisa a quien lo usa el TEXTO que
 *   leyó del código de barras. No interpreta nada: eso lo hace `utilidades/dni.ts`.
 *
 * DÓNDE SE USA:
 *   `app/registro.tsx`, cuando se toca "Escanear mi DNI".
 *
 * QUÉ BUSCA:
 *   Solo el PDF417, que es el código de barras del DNI. El DNI nuevo suma además
 *   un QR, que no se lee a propósito para no confundirlos.
 *
 * TEORÍA:
 *   [SENS 26] `<CameraView />` con `barcodeScannerSettings` y `onBarcodeScanned`.
 *   [SENS 31] La cámara se libera cuando el componente deja de estar en pantalla
 *             (quien lo usa lo quita apenas se lee un código).
 *   [JS 19]   Props que son FUNCIONES (`alLeer`, `alCancelar`): el hijo avisa al
 *             padre qué pasó.
 *   [COMP]    `Pressable`, composición de `PermisoCamara` y `ControlesCamara`.
 */
// `CameraView`: la vista de la cámara. `BarcodeType`: solo un tipo (qué códigos se buscan).
import { CameraView, type BarcodeType } from "expo-camera";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Linterna y zoom: el hook con su estado y la fila de botones.
import { ControlesCamara, useAyudasCamara } from "@/componentes/ControlesCamara";
// Pide el permiso de la cámara y recién con permiso dibuja lo que tiene adentro.
import { PermisoCamara } from "@/componentes/PermisoCamara";
import { colores, espaciado, radios } from "@/tema/colores";

// Constante fuera del componente: no cambia, no hace falta recrearla en cada render.
const tiposDni: BarcodeType[] = ["pdf417"];

type Props = {
  /** Se llama con el texto leído del código de barras. */
  alLeer: (texto: string) => void;
  /** Se llama al tocar "Cancelar". */
  alCancelar: () => void;
};

/** Panel con la cámara, linterna y zoom para leer el código de barras del DNI. */
export function EscanerDni({ alLeer, alCancelar }: Props) {
  // Linterna y zoom de esta cámara (un custom hook: devuelve valores y funciones).
  const ayudas = useAyudasCamara();
  // Mensaje de error si la cámara no pudo arrancar (por ejemplo, sin cámara).
  const [errorCamara, setErrorCamara] = useState<string | null>(null);

  return (
    <View style={estilos.contenedor}>
      <PermisoCamara mensaje="Necesitamos la cámara para leer el código de barras de tu DNI.">
        <Text style={estilos.texto}>
          Apuntá al código de barras del DNI. Si no enfoca, alejá un poco el
          celular y subí el zoom; si hay poca luz, prendé la linterna.
        </Text>

        {/* El marco recorta la cámara con bordes redondeados. */}
        <View style={estilos.marco}>
          <CameraView
            // `absoluteFill` = pegada a los cuatro bordes del marco.
            style={StyleSheet.absoluteFill}
            facing="back" // la cámara trasera
            enableTorch={ayudas.linterna} // la luz, según el botón Linterna
            zoom={ayudas.zoom} // el zoom elegido (0 a 1)
            // Solo busca PDF417; las llaves dobles son: llaves de JSX + un objeto.
            barcodeScannerSettings={{ barcodeTypes: tiposDni }}
            // `data` es el texto que trae el código de barras.
            onBarcodeScanned={(lectura) => alLeer(lectura.data)}
            // Si la cámara no arranca, se guarda el mensaje para mostrarlo.
            onMountError={(evento) => setErrorCamara(evento.message)}
          />
        </View>

        {/* Los botones de linterna y zoom; comparten el estado con la cámara. */}
        <ControlesCamara ayudas={ayudas} />

        {/* El error de la cámara, solo si lo hay. */}
        {errorCamara ? (
          <Text style={estilos.textoError}>
            No se pudo abrir la cámara: {errorCamara}
          </Text>
        ) : null}
      </PermisoCamara>

      {/* Siempre disponible, incluso si no hay permiso de cámara. */}
      <Pressable
        onPress={alCancelar}
        style={({ pressed }) => [estilos.cancelar, pressed && estilos.presionado]}
      >
        <Text style={estilos.textoCancelar}>Cancelar y completar a mano</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  // El panel entero: la cámara y el botón de cancelar, con espacio entre ellos.
  contenedor: {
    gap: espaciado.md,
  },

  // Las instrucciones de arriba de la cámara.
  texto: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSecundario,
  },

  // El mensaje si la cámara no se pudo abrir: en rojo.
  textoError: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.alerta,
  },

  // El marco de la cámara: cuadrado (`aspectRatio: 1` = alto igual al ancho), con
  // esquinas redondeadas. `overflow: "hidden"` recorta la cámara en ellas.
  marco: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.superficie,
    overflow: "hidden",
  },

  // El botón "Cancelar y completar a mano": solo con borde, sin relleno.
  cancelar: {
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  // El texto del botón de cancelar.
  textoCancelar: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // Se suma al botón mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.75,
  },
});

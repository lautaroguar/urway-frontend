/**
 * ============================================================================
 * app/apunte/camara.tsx — Sacarle una foto a un apunte
 * ============================================================================
 *
 * QUÉ ES:
 *   La cámara para cargar apuntes propios. Se abre desde "Sacar foto" de la
 *   solapa "Mis apuntes" de una materia. Muestra la cámara con linterna y zoom
 *   (para fotografiar una hoja con poca luz o sin acercar tanto el celular) y un
 *   botón redondo para sacar la foto. Al sacarla se pasa a «Nuevo apunte»
 *   (`app/apunte/nuevo.tsx`), donde se le pone título y se confirma.
 *
 * DE QUÉ MATERIA ES:
 *   Llega por parámetro de la ruta: `/apunte/camara?materiaId=MAT-201`.
 *
 * A DÓNDE VA LA FOTO:
 *   Queda como BORRADOR en memoria (`prepararApunte` del Context): todavía no se
 *   sube. Recién cuando se confirma en «Nuevo apunte» viaja al backend (en base64,
 *   dentro del JSON), que la guarda como archivo y avisa a los amigos. Ver
 *   `backend/src/rutas/apuntes.ts`. `router.replace` cambia la cámara por esa
 *   pantalla: si se vuelve atrás, se llega a la materia y no a la cámara.
 *
 * ÚNICO `useRef` FUERA DE LA BIENVENIDA:
 *   La teoría de sensores (diapositiva 26) saca la foto llamando a
 *   `takePictureAsync()` sobre una REFERENCIA al componente `CameraView`. Un
 *   `useRef` guarda esa referencia sin volver a dibujar la pantalla.
 *
 * TEORÍA:
 *   [SENS 26] `<CameraView ref />` y `ref.takePictureAsync()`; `onCameraReady`
 *             avisa cuándo ya se puede sacar la foto.
 *   [SENS 31] La cámara se libera al salir de la pantalla.
 *   [MÁS 6]   `enableTorch` (linterna), dentro de `ControlesCamara`.
 *   [JS 14]   `async/await` y `try/catch` para una operación que TARDA.
 *   [JS 29]   `prepararApunte` viene del Context.
 *   [NAV]     Parámetros con `useLocalSearchParams` y `router.replace`.
 */
// `CameraView` es la vista de la cámara; también es el TIPO de la referencia (`useRef<CameraView>`).
import { CameraView } from "expo-camera";
// `useLocalSearchParams` lee `materiaId` de la ruta; `useRouter` navega (`back`).
import { useLocalSearchParams, useRouter } from "expo-router";
// `useRef` guarda la referencia a la cámara; `useState`, los estados de la pantalla.
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Linterna y zoom: el hook con su estado y la fila de botones.
import { ControlesCamara, useAyudasCamara } from "@/componentes/ControlesCamara";
// Pide el permiso de la cámara y recién con permiso dibuja lo que tiene adentro.
import { PermisoCamara } from "@/componentes/PermisoCamara";
// `useDatos` da `prepararApunte`: deja la foto como borrador en el Context.
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { leerComoBase64 } from "@/utilidades/archivos";

/** Cámara para sacarle una foto a un apunte de una materia. */
export default function PantallaCamaraApunte() {
  const router = useRouter();
  // `materiaId` llega por la ruta; puede faltar si alguien abre la pantalla a mano.
  const { materiaId } = useLocalSearchParams<{ materiaId?: string }>();
  // Desestructuración: del Context solo se toma la acción que deja el borrador.
  const { prepararApunte } = useDatos();

  // La REFERENCIA a la cámara. Arranca en `null` y React la completa cuando
  // `CameraView` se dibuja (`ref={camara}`); se lee con `camara.current`.
  const camara = useRef<CameraView>(null);
  // Linterna y zoom de esta cámara (un custom hook: devuelve valores y funciones).
  const ayudas = useAyudasCamara();

  // ¿La cámara ya está lista para sacar la foto? ¿Se está sacando una ahora?
  const [lista, setLista] = useState(false);
  const [sacando, setSacando] = useState(false);
  // El mensaje de error (o `null` si no hay): `useState<string | null>(null)`.
  const [error, setError] = useState<string | null>(null);

  // `async`: la función devuelve una promesa y puede usar `await` adentro.
  const sacarFoto = async () => {
    // No se saca la foto si falta algo o si ya hay una en curso (doble toque).
    // (`!x` = "no x"; `||` = "o": basta con que una condición sea cierta.)
    if (!materiaId || !lista || sacando || !camara.current) return;
    setSacando(true);
    setError(null);
    // `try/catch`: si algo falla en el `try`, se salta al `catch` en vez de romper la app.
    try {
      // `await` PAUSA hasta que la cámara termina. `quality: 0.5` = compresión
      // al 50 % (la foto viaja al servidor: más liviana, sube más rápido) y
      // `base64: true` = además de la ruta, el contenido como texto para mandarlo.
      const foto = await camara.current.takePictureAsync({ quality: 0.5, base64: true });
      // Si la cámara no dio el texto base64 (puede pasar en la web), se lee de la ruta.
      const base64 = foto.base64 ?? (await leerComoBase64(foto.uri));
      // La foto NO se sube todavía: queda de borrador y se pasa a «Nuevo apunte»,
      // donde se le pone título y se confirma.
      prepararApunte({
        materiaId,
        uri: foto.uri,
        base64,
        nombre: "Foto del apunte.jpg",
        esPdf: false,
      });
      router.replace("/apunte/nuevo");
    } catch {
      // No se usa el error, así que se omite su nombre. Se avisa en pantalla y se
      // libera el botón para poder reintentar.
      setError("No se pudo sacar la foto. Probá de nuevo.");
      setSacando(false);
    }
  };

  // El botón se ve apagado mientras la cámara no esté lista o se esté sacando.
  const apagado = !lista || sacando;

  return (
    <View style={estilos.pantalla}>
      <PermisoCamara mensaje="Necesitamos la cámara para sacarle fotos a tus apuntes.">
        {/* La cámara ocupa todo el alto que sobra; abajo, controles y obturador. */}
        <View style={estilos.marco}>
          <CameraView
            ref={camara} // acá React deja la referencia (queda en `camara.current`)
            // `absoluteFill` = pegada a los cuatro bordes del marco.
            style={StyleSheet.absoluteFill}
            facing="back" // la cámara trasera
            enableTorch={ayudas.linterna} // la luz, según el botón Linterna
            zoom={ayudas.zoom} // el zoom elegido (0 a 1)
            // Recién ahí se habilita el botón de sacar la foto.
            onCameraReady={() => setLista(true)}
            // Si la cámara no arranca, se muestra el mensaje.
            onMountError={(evento) => setError(evento.message)}
          />
        </View>

        {/* Los botones de linterna y zoom; comparten el estado con la cámara. */}
        <ControlesCamara ayudas={ayudas} />

        {/* El error, solo si lo hay. */}
        {error ? <Text style={estilos.textoError}>{error}</Text> : null}

        {/* El obturador: un círculo blanco dentro de un aro. */}
        <Pressable
          onPress={sacarFoto}
          disabled={apagado} // sin respuesta al toque mientras no se pueda sacar
          style={({ pressed }) => [
            estilos.aro,
            apagado && estilos.aroApagado, // se ve apagado si no se puede
            pressed && estilos.presionado,
          ]}
        >
          <View style={estilos.disparador} />
        </Pressable>
      </PermisoCamara>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Contenedor raíz. `gap` separa la cámara, los controles y el obturador, y
  // `alignItems: "stretch"` (el valor por defecto) estira todo al ancho.
  pantalla: {
    flex: 1,
    padding: espaciado.lg,
    gap: espaciado.md,
    backgroundColor: colores.fondo,
  },

  // El marco de la cámara: `flex: 1` = ocupa todo el alto que sobra.
  marco: {
    flex: 1,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.superficie,
    overflow: "hidden",
  },

  // El mensaje de error: chico, centrado y en rojo.
  textoError: {
    fontSize: 13,
    textAlign: "center",
    color: colores.alerta,
  },

  // El aro del obturador, centrado (`alignSelf` pisa el estirado del padre).
  aro: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    width: 74,
    height: 74,
    borderRadius: radios.pastilla,
    borderWidth: 4,
    borderColor: colores.blanco,
  },

  // Se suma al aro mientras la cámara no esté lista o se esté sacando la foto.
  aroApagado: {
    opacity: 0.4,
  },

  // El círculo blanco de adentro.
  disparador: {
    width: 56,
    height: 56,
    borderRadius: radios.pastilla,
    backgroundColor: colores.blanco,
  },

  // Se suma al obturador mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.7,
  },
});

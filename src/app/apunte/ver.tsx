/**
 * ============================================================================
 * app/apunte/ver.tsx — Vista previa de un apunte (foto o PDF)
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla para MIRAR un apunte: el título, quién lo subió, de qué materia es,
 *   su descripción y el archivo en grande. Abajo, el botón «Guardar en el
 *   dispositivo». Se abre al tocar un apunte en cualquier lista (mis apuntes, la
 *   comunidad, mis amigos o el perfil de un compañero), ver `utilidades/apuntes.ts`.
 *
 * CÓMO SE VE CADA TIPO:
 *   - FOTO: en grande y con ZOOM (`FotoConZoom`): se acerca pellizcando con dos
 *     dedos o con doble toque, se mueve con un dedo y tiene botones «+» y «−».
 *     Funciona igual en iOS y Android (antes solo andaba en iOS). Mientras está
 *     acercada, esta pantalla apaga su scroll para que no se mueva a la vez.
 *   - PDF en la WEB: el navegador lo muestra adentro de la pantalla (un `iframe`).
 *   - PDF en el CELULAR: React Native no trae un lector de PDF. Se abre con el
 *     navegador del sistema (`expo-web-browser`: en iOS lo muestra el visor de
 *     Safari y en Android lo abre Chrome o la app de PDF que tenga el teléfono).
 *
 * CÓMO SE GUARDA EN EL DISPOSITIVO:
 *   El servidor entrega el archivo con `?descargar=1` y el header
 *   `Content-Disposition: attachment`, que le dice al navegador «descargalo, no lo
 *   muestres». En el celular se abre esa dirección con `Linking.openURL` y el
 *   navegador del sistema lo guarda en Descargas / Archivos; en la web se hace un
 *   clic en un enlace oculto.
 *
 * QUÉ LLEGA POR LA RUTA:
 *   Los datos del apunte (`uri`, `titulo`, `descripcion`, `autor`, `materiaId`,
 *   `fecha`, `formato`) como parámetros. Los que faltan llegan vacíos ("").
 *
 * TEORÍA:
 *   [NAV]   `useLocalSearchParams` para leer los parámetros.
 *   [COMP]  `ScrollView`, `Pressable`; `Linking` y `Platform`. Un componente propio
 *           (`FotoConZoom`) que AVISA con una función (`alCambiarZoom`) cuando la
 *           foto se acerca: los datos bajan, los eventos suben.
 *   [JS 20] `useState` para saber si la foto está acercada (y apagar el scroll).
 *   [GESTOS] El zoom de la foto está en `componentes/FotoConZoom.tsx`.
 *   [JS 22] Renderizado condicional según el tipo de archivo y la plataforma.
 *   [JS 14] `async/await` + `try/catch` al abrir el navegador.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createElement, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { FotoConZoom } from "@/componentes/FotoConZoom";
import { colores, espaciado, radios } from "@/tema/colores";
import { aTextoFecha } from "@/utilidades/fechas";

type Parametros = {
  uri?: string;
  titulo?: string;
  descripcion?: string;
  autor?: string;
  materiaId?: string;
  fecha?: string;
  formato?: string;
};

/** Vista previa de un apunte, con la opción de guardarlo en el dispositivo. */
export default function PantallaVerApunte() {
  const { uri, titulo, descripcion, autor, materiaId, fecha, formato } =
    useLocalSearchParams<Parametros>();
  // El alto de la pantalla: la vista previa ocupa el 60 % para que se vea el resto.
  const { height } = useWindowDimensions();
  const [errorImagen, setErrorImagen] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  // ¿La foto está acercada? Mientras sí, el scroll de esta pantalla se apaga: si no,
  // al mover la foto con el dedo la página se movería a la vez.
  const [fotoAcercada, setFotoAcercada] = useState(false);

  // Retorno temprano: sin dirección del archivo no hay nada que mostrar.
  if (!uri) {
    return (
      <View style={[estilos.pantalla, estilos.vacio]}>
        <Ionicons name="document-outline" size={32} color={colores.textoDebil} />
        <Text style={estilos.textoVacio}>Este apunte no tiene un archivo para mostrar.</Text>
      </View>
    );
  }

  const esPdf = formato === "pdf";
  const alto = Math.round(height * 0.6);
  // El mismo archivo, pero entregado como descarga (ver el comentario de arriba).
  const urlDescarga = `${uri}?descargar=1`;

  /** Guarda el archivo en el dispositivo (descarga). */
  const guardar = async () => {
    setErrorAccion(null);
    try {
      if (Platform.OS === "web") {
        // En la web: un enlace oculto al que se le hace clic. El header `attachment`
        // del servidor hace que el navegador descargue en lugar de navegar.
        const enlace = document.createElement("a");
        enlace.href = urlDescarga;
        enlace.download = titulo ?? "apunte";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      } else {
        await Linking.openURL(urlDescarga);
      }
    } catch {
      setErrorAccion("No se pudo guardar el archivo. Probá de nuevo.");
    }
  };

  /** Abre el PDF con el navegador del sistema (solo en el celular). */
  const abrirPdf = async () => {
    setErrorAccion(null);
    try {
      await WebBrowser.openBrowserAsync(uri);
    } catch {
      setErrorAccion("No se pudo abrir el PDF. Probá guardarlo en el dispositivo.");
    }
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        // Se apaga mientras la foto está acercada (ver `fotoAcercada`).
        scrollEnabled={!fotoAcercada}
      >
        {/* ---------- Encabezado ---------- */}
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.meta}>
          {[
            autor ? `Subido por ${autor}` : "Subido por vos",
            materiaId,
            fecha ? aTextoFecha(fecha) : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {descripcion ? <Text style={estilos.descripcion}>{descripcion}</Text> : null}

        {/* ---------- La vista previa ---------- */}
        {esPdf ? (
          Platform.OS === "web" ? (
            // En la web, el navegador muestra el PDF adentro de un `iframe`. Un
            // `iframe` no existe en React Native: `createElement` crea ese
            // elemento HTML directamente (solo corre en la web).
            <View style={[estilos.marco, { height: alto }]}>
              {createElement("iframe", {
                src: uri,
                title: titulo,
                style: { width: "100%", height: "100%", border: 0 },
              })}
            </View>
          ) : (
            // En el celular: una tarjeta que lo abre con el navegador del sistema.
            <Pressable
              onPress={abrirPdf}
              style={({ pressed }) => [estilos.marco, estilos.tarjetaPdf, pressed && estilos.presionado]}
              accessibilityLabel="Abrir el PDF"
            >
              <Ionicons name="document-text" size={56} color={colores.azulClaro} />
              <Text style={estilos.nombrePdf} numberOfLines={2}>
                {titulo}
              </Text>
              <View style={estilos.botonAbrir}>
                <Ionicons name="open-outline" size={18} color={colores.blanco} />
                <Text style={estilos.textoBotonAbrir}>Abrir PDF</Text>
              </View>
            </Pressable>
          )
        ) : errorImagen ? (
          <View style={[estilos.marco, estilos.tarjetaPdf]}>
            <Ionicons name="image-outline" size={40} color={colores.textoDebil} />
            <Text style={estilos.textoVacio}>No se pudo cargar la imagen.</Text>
          </View>
        ) : (
          // La foto en grande, con zoom con los dedos. El recuadro (`marco`) recorta lo
          // que se sale al acercar. Debajo, una línea que cuenta cómo se usa.
          <>
            <View style={[estilos.marco, { height: alto }]}>
              <FotoConZoom
                uri={uri}
                descripcion={titulo}
                alFallar={() => setErrorImagen(true)}
                alCambiarZoom={setFotoAcercada}
              />
            </View>
            <Text style={estilos.pistaZoom}>
              Pellizcá o tocá dos veces la foto para acercarla.
            </Text>
          </>
        )}

        {errorAccion ? <Text style={estilos.error}>{errorAccion}</Text> : null}

        {/* ---------- Guardar en el dispositivo ---------- */}
        <Pressable
          onPress={guardar}
          style={({ pressed }) => [estilos.botonGuardar, pressed && estilos.presionado]}
        >
          <Ionicons name="download-outline" size={20} color={colores.blanco} />
          <Text style={estilos.textoGuardar}>Guardar en el dispositivo</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    padding: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.md,
  },

  titulo: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colores.texto,
  },

  // Margen negativo: acerca la línea de datos al título (compensa el `gap`).
  meta: {
    marginTop: -espaciado.sm,
    fontSize: 13,
    color: colores.textoTenue,
  },

  descripcion: {
    fontSize: 14,
    lineHeight: 21,
    color: colores.textoSecundario,
  },

  // El recuadro de la vista previa (foto, PDF o aviso).
  marco: {
    overflow: "hidden",
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficie,
  },

  // La tarjeta del PDF en el celular (y el aviso de imagen que no carga).
  tarjetaPdf: {
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.md,
    padding: espaciado.xl,
    minHeight: 220,
  },

  nombrePdf: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: colores.textoSuave,
  },

  botonAbrir: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
    paddingVertical: espaciado.sm + 2,
    paddingHorizontal: espaciado.lg,
  },

  textoBotonAbrir: {
    fontSize: 14,
    fontWeight: "700",
    color: colores.blanco,
  },

  botonGuardar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
    paddingVertical: espaciado.md + 2,
  },

  textoGuardar: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  error: {
    fontSize: 13,
    color: colores.alerta,
  },

  // La línea que explica el zoom, chica y tenue, pegada a la foto (el `marginTop`
  // negativo compensa el `gap` del contenido).
  pistaZoom: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    textAlign: "center",
    color: colores.textoDebil,
  },

  presionado: {
    opacity: 0.7,
  },

  vacio: {
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.md,
    padding: espaciado.xl,
  },

  textoVacio: {
    fontSize: 13,
    textAlign: "center",
    color: colores.textoDebil,
  },
});

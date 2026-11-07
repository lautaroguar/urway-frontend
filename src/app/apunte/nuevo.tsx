/**
 * ============================================================================
 * app/apunte/nuevo.tsx — Ponerle título a un apunte y confirmar que se sube
 * ============================================================================
 *
 * QUÉ ES:
 *   El segundo paso de subir un apunte. Al elegir un archivo, una foto de la galería
 *   o sacar una foto con la cámara, el apunte NO se sube todavía: queda como borrador
 *   en memoria (`borradorApunte` del Context) y se llega acá. Se ve una vista previa,
 *   se le escribe un TÍTULO (obligatorio) y una DESCRIPCIÓN (opcional) y recién al
 *   tocar «Confirmar y subir» viaja al servidor.
 *
 * POR QUÉ EN DOS PASOS:
 *   - El servidor guarda los archivos en la carpeta `uploads/` solo cuando ya están
 *     confirmados: no se llena de fotos que se eligieron sin querer.
 *   - Quien se equivoca de archivo toca «Descartar» y no hay nada que borrar ni
 *     amigos que avisar: a los amigos les llega la notificación recién al confirmar.
 *
 * CONTROLES:
 *   - El título arranca con el nombre del archivo (o «Apunte del 25/10» si es una
 *     foto) para que alcance con tocar «Confirmar».
 *   - Se avisa si el archivo pesa más de 8 MB (el máximo del servidor).
 *
 * TEORÍA:
 *   [JS 23] Formulario controlado (`value` + `onChangeText`).
 *   [JS 25] Los errores y el peso se CALCULAN en el render; no se guardan.
 *   [JS 20] `useState` con valor inicial calculado (una función).
 *   [JS 14] `async/await` + `try/catch` al subir.
 *   [CTX]   `borradorApunte`, `confirmarApunte` y `descartarApunte` vienen del Context.
 *   [NAV]   `router.back()` al terminar.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { mensajeDe } from "@/api/cliente";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { bytesDeBase64, MAXIMO_BYTES, tamanioLegible } from "@/utilidades/archivos";

/** Pantalla para ponerle título y descripción a un apunte y confirmar que se sube. */
export default function PantallaNuevoApunte() {
  const router = useRouter();
  const { borradorApunte, confirmarApunte, descartarApunte } = useDatos();

  // El título arranca con el nombre del archivo sin la extensión ("Resumen.pdf" →
  // "Resumen") o, para una foto, con «Apunte del 25/10». Una FUNCIÓN como valor
  // inicial: se calcula una sola vez, al abrir la pantalla.
  const [titulo, setTitulo] = useState(() => {
    if (!borradorApunte) return "";
    if (borradorApunte.esPdf) return borradorApunte.nombre.replace(/\.[^.]+$/, "").slice(0, 60);
    const hoy = new Date();
    return `Apunte del ${hoy.getDate()}/${hoy.getMonth() + 1}`;
  });
  const [descripcion, setDescripcion] = useState("");
  const [intento, setIntento] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);

  // RETORNO TEMPRANO: se abrió la pantalla sin haber elegido nada (por ejemplo, tras
  // recargar la app). Los hooks ya se llamaron ARRIBA.
  if (!borradorApunte) {
    return (
      <View style={[estilos.pantalla, estilos.vacio]}>
        <Ionicons name="document-outline" size={32} color={colores.textoDebil} />
        <Text style={estilos.textoVacio}>No hay ningún apunte para subir.</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={estilos.enlace}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Lo derivado [JS 25] ----------
  const bytes = bytesDeBase64(borradorApunte.base64);
  const errorTitulo = titulo.trim().length === 0 ? "Poné un título para el apunte." : null;
  const errorPeso =
    bytes > MAXIMO_BYTES
      ? `El archivo pesa ${tamanioLegible(bytes)} y el máximo es ${tamanioLegible(MAXIMO_BYTES)}.`
      : null;

  const confirmar = async () => {
    setIntento(true);
    setErrorSubida(null);
    if (errorTitulo || errorPeso || subiendo) return;
    setSubiendo(true);
    try {
      // `await` espera a que el servidor guarde el archivo y avise a los amigos.
      await confirmarApunte(titulo, descripcion);
      router.back(); // vuelve a la materia, que ya muestra el apunte nuevo
    } catch (error) {
      setErrorSubida(mensajeDe(error));
      setSubiendo(false);
    }
  };

  const descartar = () => {
    descartarApunte();
    router.back();
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // En iOS, sube el contenido cuando aparece el teclado para no taparlo.
        automaticallyAdjustKeyboardInsets
      >
        {/* ---------- Vista previa ---------- */}
        {borradorApunte.esPdf ? (
          <View style={[estilos.vistaPrevia, estilos.vistaPdf]}>
            <Ionicons name="document-text" size={48} color={colores.azulClaro} />
            <Text style={estilos.nombreArchivo} numberOfLines={2}>
              {borradorApunte.nombre}
            </Text>
            <Text style={estilos.pesoArchivo}>PDF · {tamanioLegible(bytes)}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: borradorApunte.uri }}
            style={[estilos.vistaPrevia, estilos.vistaFoto]}
            resizeMode="contain"
          />
        )}

        {/* ---------- Título ---------- */}
        <View style={estilos.campo}>
          <Text style={estilos.etiquetaCampo}>Título</Text>
          <TextInput
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Resumen de matrices"
            placeholderTextColor={colores.textoDebil}
            maxLength={60}
            style={estilos.input}
          />
        </View>
        {intento && errorTitulo ? <Text style={estilos.error}>{errorTitulo}</Text> : null}

        {/* ---------- Descripción (opcional) ---------- */}
        <View style={estilos.campo}>
          <Text style={estilos.etiquetaCampo}>Descripción (opcional)</Text>
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="De qué trata, qué temas cubre…"
            placeholderTextColor={colores.textoDebil}
            maxLength={300}
            multiline // permite varias líneas
            textAlignVertical="top" // en Android, el texto arranca arriba
            style={[estilos.input, estilos.inputLargo]}
          />
          <Text style={estilos.contador}>{descripcion.length}/300</Text>
        </View>

        {/* Qué va a pasar, antes de tocar el botón. */}
        <View style={estilos.aviso}>
          <Ionicons name="information-circle-outline" size={18} color={colores.azulClaro} />
          <Text style={estilos.textoAviso}>
            El archivo se sube recién cuando confirmás, y ahí les avisamos a tus amigos.
          </Text>
        </View>

        {errorPeso ? <Text style={estilos.error}>{errorPeso}</Text> : null}
        {errorSubida ? <Text style={estilos.error}>{errorSubida}</Text> : null}

        {/* ---------- Botones ---------- */}
        <Pressable
          onPress={confirmar}
          disabled={subiendo || Boolean(errorPeso)}
          style={({ pressed }) => [
            estilos.botonConfirmar,
            (subiendo || errorPeso) && estilos.apagado,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colores.blanco} />
          <Text style={estilos.textoConfirmar}>
            {subiendo ? "Subiendo…" : "Confirmar y subir"}
          </Text>
        </Pressable>
        <Pressable
          onPress={descartar}
          disabled={subiendo}
          style={({ pressed }) => [estilos.botonDescartar, pressed && estilos.presionado]}
        >
          <Ionicons name="trash-outline" size={18} color={colores.alerta} />
          <Text style={estilos.textoDescartar}>Descartar</Text>
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

  // El recuadro de la vista previa (foto o PDF).
  vistaPrevia: {
    overflow: "hidden",
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficie,
  },

  vistaFoto: {
    width: "100%",
    height: 260,
  },

  vistaPdf: {
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    padding: espaciado.xl,
  },

  nombreArchivo: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: colores.textoSuave,
  },

  pesoArchivo: {
    fontSize: 12,
    color: colores.textoTenue,
  },

  campo: {
    gap: espaciado.sm,
  },

  etiquetaCampo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  input: {
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.md,
    fontSize: 15,
    color: colores.textoSuave,
  },

  inputLargo: {
    minHeight: 96,
  },

  // "42/300", alineado a la derecha debajo de la descripción.
  contador: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: colores.textoDebil,
  },

  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primarioProfundo,
    padding: espaciado.md,
  },

  textoAviso: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colores.azulPalido,
  },

  error: {
    fontSize: 12,
    color: colores.alerta,
  },

  botonConfirmar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
    paddingVertical: espaciado.md + 2,
  },

  textoConfirmar: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  botonDescartar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    paddingVertical: espaciado.md,
  },

  textoDescartar: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.alerta,
  },

  apagado: {
    opacity: 0.5,
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

  enlace: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulClaro,
  },
});

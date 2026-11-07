/**
 * ============================================================================
 * componentes/TarjetaApunte.tsx — Un apunte en la grilla (foto o PDF)
 * ============================================================================
 *
 * QUÉ ES:
 *   Una celda de la grilla de apuntes: arriba la miniatura (la foto o, si es un
 *   PDF, una hoja rayada con la etiqueta "PDF") y abajo el título y, según dónde
 *   se use, la materia y la fecha o el autor. Tocarla abre la VISTA PREVIA
 *   (`app/apunte/ver.tsx`). Si se le pasa `alBorrar`, muestra el tachito.
 *
 * DÓNDE SE USA:
 *   - `MisApuntes` (solapa "Mis apuntes" de una materia), con tachito.
 *   - `ApuntesDeOtros` (solapas "Comunidad" y "De mis amigos"), con el autor.
 *   - El perfil de otro estudiante (sus apuntes), sin tachito.
 *
 * POR QUÉ UNA "HOJA" DIBUJADA:
 *   Un PDF no tiene una imagen que mostrar sin abrirlo. En lugar de un recuadro
 *   vacío se dibuja una hoja con líneas, hecha solo con `View` (sin imágenes).
 *
 * POR QUÉ EL TACHITO NO ESTÁ DENTRO DEL BOTÓN:
 *   Un botón dentro de otro no es válido (en la web rompe el HTML). Por eso la
 *   miniatura, el texto y el tachito son hermanos, no hijos unos de otros.
 *
 * TEORÍA:
 *   [COMP]  `Image` con `source={{ uri }}` y `resizeMode`; props opcionales.
 *   [EST]   `aspectRatio`, `position: "absolute"`, porcentajes y `overflow`.
 *   [JS 8]  `map` para dibujar las líneas de la hoja.
 */
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { Apunte } from "@/datos/comunidad";
import { colores, espaciado, radios } from "@/tema/colores";
import { aTextoFecha } from "@/utilidades/fechas";

// Cuánto mide cada línea de la hoja dibujada (en % del ancho): parecen renglones.
const RENGLONES = [86, 92, 70, 88, 60, 80, 45];

type Props = {
  apunte: Apunte;
  /** Si se pasa, aparece el tachito y se llama al tocarlo. */
  alBorrar?: () => void;
  /** Si se pasa, tocar la miniatura o el título abre la vista previa. */
  alAbrir?: () => void;
  /** Muestra quién lo subió en lugar de la materia (apuntes de otros). */
  mostrarAutor?: boolean;
};

/** Una celda de la grilla de apuntes. */
export function TarjetaApunte({ apunte, alBorrar, alAbrir, mostrarAutor = false }: Props) {
  const esPdf = apunte.formato === "pdf";
  // Con foto: la imagen recortada para llenar el recuadro. Si no, la hoja dibujada.
  const conImagen = apunte.uri && apunte.formato === "imagen";
  // Solo se puede abrir si hay una pantalla a la que ir Y un archivo que mostrar (los
  // apuntes de ejemplo viejos no tienen archivo).
  const sePuedeAbrir = Boolean(alAbrir && apunte.uri);

  return (
    <View style={estilos.celda}>
      <Pressable
        onPress={alAbrir}
        disabled={!sePuedeAbrir}
        accessibilityLabel={`Abrir ${apunte.titulo}`}
        style={({ pressed }) => pressed && estilos.presionado}
      >
        {conImagen ? (
          <Image source={{ uri: apunte.uri }} style={estilos.miniatura} resizeMode="cover" />
        ) : (
          <View style={[estilos.miniatura, estilos.hoja]}>
            <Ionicons name="document-text" size={18} color={colores.azulClaro} />
            <Text style={estilos.tituloHoja} numberOfLines={2}>
              {apunte.titulo}
            </Text>
            {/* Los renglones: un `View` finito por línea, de distintos anchos. */}
            {RENGLONES.map((ancho, indice) => (
              <View key={indice} style={[estilos.renglon, { width: `${ancho}%` }]} />
            ))}
          </View>
        )}
        {/* La etiqueta "PDF" en la esquina, para distinguirlo de una foto. */}
        {esPdf ? (
          <View style={estilos.etiquetaPdf}>
            <Text style={estilos.textoPdf}>PDF</Text>
          </View>
        ) : null}
      </Pressable>

      <View style={estilos.pie}>
        <Pressable
          onPress={alAbrir}
          disabled={!sePuedeAbrir}
          style={({ pressed }) => [estilos.textos, pressed && estilos.presionado]}
        >
          <Text style={estilos.titulo} numberOfLines={1}>
            {apunte.titulo}
          </Text>
          <Text style={estilos.meta} numberOfLines={1}>
            {mostrarAutor && apunte.autorNombre
              ? `${apunte.autorNombre} · ${aTextoFecha(apunte.fecha)}`
              : `${apunte.materiaId} · ${aTextoFecha(apunte.fecha)}`}
          </Text>
        </Pressable>
        {/* El tachito, solo si se puede borrar (mis apuntes). */}
        {alBorrar ? (
          <Pressable
            onPress={alBorrar}
            hitSlop={8}
            accessibilityLabel="Borrar apunte"
            style={({ pressed }) => pressed && estilos.presionado}
          >
            <Ionicons name="trash-outline" size={16} color={colores.alerta} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // 48.5 % + 48.5 % = 97 %; el 3 % restante queda como separación entre columnas.
  celda: {
    width: "48.5%",
    overflow: "hidden",
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
  },

  // La foto (o la hoja) ocupa todo el ancho, con proporción 3:4 (vertical, como una hoja).
  miniatura: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: colores.superficieSuave,
  },

  // La hoja dibujada: contenido en columna con un poco de aire.
  hoja: {
    gap: 9,
    padding: espaciado.md,
  },

  tituloHoja: {
    fontSize: 12,
    fontWeight: "700",
    color: colores.azulPalido,
  },

  // Un renglón: una línea finita y tenue.
  renglon: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colores.bordeSuave,
  },

  // La etiqueta "PDF", pegada arriba a la derecha de la miniatura.
  etiquetaPdf: {
    position: "absolute",
    top: espaciado.sm,
    right: espaciado.sm,
    borderRadius: radios.sm - 4,
    backgroundColor: colores.primario,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  textoPdf: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colores.blanco,
  },

  // Fila inferior: textos a la izquierda y tachito a la derecha.
  pie: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    padding: espaciado.sm,
  },

  textos: {
    flex: 1,
  },

  titulo: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  meta: {
    marginTop: 1,
    fontSize: 11,
    color: colores.textoTenue,
  },

  presionado: {
    opacity: 0.7,
  },
});

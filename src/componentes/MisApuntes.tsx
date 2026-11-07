/**
 * ============================================================================
 * componentes/MisApuntes.tsx — Solapa "Mis apuntes" del detalle de materia
 * ============================================================================
 *
 * QUÉ ES:
 *   Dos botones para sumar un apunte y una grilla con los que ya sumaste a ESA
 *   materia. Cada apunte se puede abrir (vista previa) y borrar con el tachito.
 *     - «Sacar foto»: abre la cámara.
 *     - «Subir apunte»: abre dos opciones: elegir un ARCHIVO (PDF o imagen) del
 *       explorador de archivos del teléfono —«Archivos» en iOS, el explorador en
 *       Android— o una FOTO de la galería.
 *
 * LO QUE PASA DESPUÉS DE ELEGIR:
 *   Nada se sube todavía. El apunte queda de borrador y se abre «Nuevo apunte»
 *   (`app/apunte/nuevo.tsx`), donde se le pone título y descripción. Recién al
 *   confirmar viaja al servidor.
 *
 * QUÉ USA:
 *   - La CÁMARA: «Sacar foto» abre `app/apunte/camara.tsx` (`expo-camera`).
 *   - `expo-document-picker`: el explorador de archivos del sistema.
 *   - `expo-image-picker`: la galería del teléfono. No hace falta pedir permiso.
 *   - El Context (`useDatos`): guarda el borrador y la lista de mis apuntes.
 *   - La sesión (`useSesion`): para decir quién ve los apuntes según la
 *     privacidad elegida en "Mi perfil" (todos los estudiantes o solo los amigos).
 *
 * DÓNDE SE USA:
 *   app/materia/[id].tsx, cuando se elige la solapa "Mis apuntes".
 *
 * TEORÍA:
 *   [JS 14] `async/await` y `try/catch` para una operación que TARDA (abrir el
 *           explorador y esperar a que el usuario elija).
 *   [JS 8]  `filter` para quedarse con los apuntes de la materia y `map` para
 *           dibujarlos.
 *   [JS 25] Estado derivado: `deLaMateria` se calcula en el render.
 *   [JS 29] La lista vive en el Context, no en un `useState` local.
 *   [JS 22] Renderizado condicional (opciones desplegadas, lista vacía o grilla).
 *   [EST]   Grilla de dos columnas con `flexWrap` + `space-between`; los dos
 *           botones, en fila y con el mismo ancho (`flex: 1`).
 *   [NAV]   `router.push` con parámetros para abrir la cámara de ESTA materia.
 */
import { Ionicons } from "@expo/vector-icons";
// `* as X` importa TODO el módulo bajo un nombre (se usa como `ImagePicker.launch...`).
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { mensajeDe } from "@/api/cliente";
import { Tarjeta } from "@/componentes/Tarjeta";
import { TarjetaApunte } from "@/componentes/TarjetaApunte";
import { useDatos } from "@/estado/datos";
import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";
import { abrirApunte } from "@/utilidades/apuntes";
import { leerComoBase64, MAXIMO_BYTES, tamanioLegible } from "@/utilidades/archivos";

type Props = {
  materiaId: string; // a qué materia pertenecen los apuntes que se muestran
};

/**
 * Solapa "Mis apuntes" del detalle de una materia: botones para sumar un apunte
 * (con la cámara, un archivo o una foto de la galería) y la grilla de lo que ya
 * sumaste. Se suben al servidor, con título, cuando los confirmás.
 */
export function MisApuntes({ materiaId }: Props) {
  // El `router` abre la cámara y la pantalla «Nuevo apunte».
  const router = useRouter();
  // Del Context: todos los apuntes (de todas las materias), el borrador y las acciones.
  const { apuntes, prepararApunte, eliminarApunte } = useDatos();
  const { usuario } = useSesion();
  // ¿Quién ve mis apuntes? Sale de la privacidad de la cuenta.
  const soloAmigos = usuario?.privacidad.apuntes === "amigos";
  // ¿Están desplegadas las dos opciones de «Subir apunte»? Y si algo salió mal.
  const [eligiendo, setEligiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ESTADO DERIVADO [JS 25]: los apuntes de ESTA materia se calculan en cada
  // render filtrando la lista completa. No se guardan aparte.
  const deLaMateria = apuntes.filter((apunte) => apunte.materiaId === materiaId);

  /**
   * Deja el apunte de borrador y abre «Nuevo apunte». Si el archivo pesa más de lo
   * que acepta el servidor, avisa acá mismo y no sigue.
   */
  const continuar = (borrador: {
    uri: string;
    base64: string;
    nombre: string;
    esPdf: boolean;
    bytes: number;
  }) => {
    if (borrador.bytes > MAXIMO_BYTES) {
      setError(
        `El archivo pesa ${tamanioLegible(borrador.bytes)} y el máximo es ${tamanioLegible(MAXIMO_BYTES)}.`
      );
      return;
    }
    const { bytes: _bytes, ...resto } = borrador; // `bytes` solo servía para el control
    prepararApunte({ materiaId, ...resto });
    setEligiendo(false);
    router.push("/apunte/nuevo");
  };

  /** El explorador de archivos del sistema: PDF o imagen. */
  const elegirArchivo = async () => {
    setError(null);
    // `try/catch`: si algo falla dentro del `try`, se salta al `catch` en lugar de romper la app.
    try {
      // `await` PAUSA esta función hasta que el usuario elige (o cancela).
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"], // solo PDF e imágenes
        copyToCacheDirectory: true, // una copia que la app puede leer
      });
      if (resultado.canceled) return; // tocó "Cancelar": no hay nada que hacer

      const archivo = resultado.assets[0];
      const esPdf = archivo.mimeType === "application/pdf" || /\.pdf$/i.test(archivo.name);
      const base64 = await leerComoBase64(archivo.uri);
      continuar({
        uri: archivo.uri,
        base64,
        nombre: archivo.name,
        esPdf,
        bytes: archivo.size ?? Math.floor((base64.length * 3) / 4),
      });
    } catch (e) {
      setError(mensajeDe(e) || "No se pudo abrir el archivo.");
    }
  };

  /** La galería de fotos del sistema. No pide permiso: el usuario elige qué compartir. */
  const elegirDeGaleria = async () => {
    setError(null);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], // solo fotos (no videos)
        quality: 0.5, // compresión: 50 % de calidad (la foto viaja al servidor)
        base64: true, // el contenido como texto, para mandarlo en el JSON
      });
      if (resultado.canceled) return;

      const foto = resultado.assets[0];
      // Si el selector no dio el texto base64 (puede pasar en la web), se lee de la ruta.
      const base64 = foto.base64 ?? (await leerComoBase64(foto.uri));
      continuar({
        uri: foto.uri,
        base64,
        nombre: foto.fileName ?? "Foto de la galería.jpg",
        esPdf: false,
        bytes: Math.floor((base64.length * 3) / 4),
      });
    } catch {
      setError("No se pudo abrir la galería.");
    }
  };

  // Abre la pantalla de la cámara, pasándole de qué materia es el apunte. `push`
  // la apila encima. `params: { materiaId }` es la forma corta de
  // `{ materiaId: materiaId }`; viaja en la ruta y la cámara lo lee con
  // `useLocalSearchParams`.
  const sacarFoto = () => {
    setEligiendo(false);
    router.push({ pathname: "/apunte/camara", params: { materiaId } });
  };

  const borrar = async (id: string) => {
    setError(null);
    try {
      await eliminarApunte(id);
    } catch (e) {
      setError(mensajeDe(e));
    }
  };

  return (
    <View style={estilos.contenedor}>
      {/* Los dos botones en fila, cada uno con la mitad del ancho. Son
          hermanos: ningún botón va dentro de otro `Pressable`. */}
      <View style={estilos.botones}>
        {/* Botón 1: abre la cámara de esta materia. */}
        <Pressable
          onPress={sacarFoto}
          style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
        >
          <Ionicons name="camera-outline" size={20} color={colores.azulClaro} />
          <Text style={estilos.textoBoton}>Sacar foto</Text>
        </Pressable>

        {/* Botón 2: despliega las opciones para subir un archivo o una foto. */}
        <Pressable
          onPress={() => setEligiendo((actual) => !actual)}
          style={({ pressed }) => [
            estilos.boton,
            eligiendo && estilos.botonActivo,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colores.azulClaro} />
          <Text style={estilos.textoBoton}>Subir apunte</Text>
        </Pressable>
      </View>

      {/* Las dos opciones de «Subir apunte», solo si se tocó el botón. */}
      {eligiendo ? (
        <View style={estilos.opciones}>
          <Pressable
            onPress={elegirArchivo}
            style={({ pressed }) => [estilos.opcion, pressed && estilos.presionado]}
          >
            <Ionicons name="folder-open-outline" size={20} color={colores.azulClaro} />
            <View style={estilos.textosOpcion}>
              <Text style={estilos.tituloOpcion}>Elegir un archivo</Text>
              <Text style={estilos.detalleOpcion}>
                PDF o imagen, desde el explorador de archivos
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={elegirDeGaleria}
            style={({ pressed }) => [estilos.opcion, estilos.separador, pressed && estilos.presionado]}
          >
            <Ionicons name="images-outline" size={20} color={colores.azulClaro} />
            <View style={estilos.textosOpcion}>
              <Text style={estilos.tituloOpcion}>Foto de la galería</Text>
              <Text style={estilos.detalleOpcion}>Una foto que ya tengas guardada</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={estilos.error}>{error}</Text> : null}

      {/* Quién los ve y a quién se avisa (depende de la privacidad del perfil). */}
      <View style={estilos.privacidad}>
        <Ionicons
          name={soloAmigos ? "lock-closed-outline" : "earth-outline"}
          size={14}
          color={colores.textoTenue}
        />
        <Text style={estilos.textoPrivacidad}>
          Tus apuntes los ven {soloAmigos ? "solo tus amigos" : "todos los estudiantes"}{" "}
          (lo cambiás en tu perfil). Cuando subís uno, les avisamos a tus amigos.
        </Text>
      </View>

      {/* Renderizado condicional [JS 22]: si no hay apuntes se muestra un cartel
          explicativo; si hay, la grilla. `cond ? A : B`. */}
      {deLaMateria.length === 0 ? (
        // ESTADO VACÍO: en lugar de dejar la solapa en blanco se explica qué hacer.
        <Tarjeta style={estilos.vacia}>
          <Ionicons
            name="document-text-outline"
            size={24}
            color={colores.textoTenue}
          />
          <Text style={estilos.textoVacio}>
            Todavía no sumaste apuntes de esta materia. Sacale una foto a la
            hoja o subí un PDF o una imagen.
          </Text>
        </Tarjeta>
      ) : (
        <View style={estilos.grilla}>
          {/* Una celda por apunte (la misma que en las demás listas), con el
              tachito para borrarlo. `key` estable = el id del apunte. */}
          {deLaMateria.map((apunte) => (
            <TarjetaApunte
              key={apunte.id}
              apunte={apunte}
              alAbrir={() => abrirApunte(router, apunte)}
              alBorrar={() => borrar(apunte.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Separa el botón de lo que va debajo.
  contenedor: {
    gap: espaciado.md,
  },

  // Los dos botones, uno al lado del otro.
  botones: {
    flexDirection: "row",
    gap: espaciado.md,
  },

  boton: {
    // `flex: 1`: cada botón ocupa la mitad del ancho.
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
    paddingVertical: espaciado.md,
  },

  // «Subir apunte» mientras sus opciones están abiertas: el borde se resalta.
  botonActivo: {
    borderColor: colores.azulClaro,
  },

  // El texto de los botones ("Sacar foto", "Subir apunte").
  textoBoton: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.azulPalido,
  },

  // Las dos opciones de «Subir apunte»: una tarjeta con dos filas.
  opciones: {
    overflow: "hidden",
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
  },

  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    padding: espaciado.md,
  },

  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  textosOpcion: {
    flex: 1,
  },

  tituloOpcion: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  detalleOpcion: {
    marginTop: 2,
    fontSize: 12,
    color: colores.textoTenue,
  },

  error: {
    fontSize: 12,
    color: colores.alerta,
  },

  // La línea de privacidad: ícono y texto chico en fila.
  privacidad: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.xs,
  },

  textoPrivacidad: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },

  // Se suma a un botón mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.7,
  },

  // La tarjeta del estado vacío: ícono y texto centrados en columna.
  vacia: {
    alignItems: "center",
    gap: espaciado.sm,
  },

  // El texto explicativo del estado vacío, centrado.
  textoVacio: {
    fontSize: 13,
    lineHeight: 19, // altura de cada renglón
    textAlign: "center",
    color: colores.textoDebil,
  },

  // Dos columnas: cada celda ocupa un poco menos de la mitad y el hueco del
  // medio lo reparte space-between.
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: espaciado.md,
  },
});

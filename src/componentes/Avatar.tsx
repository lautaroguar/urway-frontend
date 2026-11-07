/**
 * ============================================================================
 * componentes/Avatar.tsx — Círculo con las iniciales de una persona
 * ============================================================================
 *
 * QUÉ ES:
 *   Un círculo con la FOTO de perfil de la persona o, si no tiene (o todavía no
 *   cargó), con sus iniciales sobre fondo azul ("Franco Díaz" → "FD"). Con más
 *   de dos palabras usa la primera y la última, así quien tiene dos nombres
 *   conserva la inicial del apellido ("María José Pérez" → "MP").
 *
 * DÓNDE SE USA:
 *   EncabezadoMarca (arriba a la derecha), CabeceraPerfil (grande, 96),
 *   FilaCompaniero y la lista de amigos del perfil.
 *
 * TEORÍA:
 *   [COMP] Un componente es una función que recibe PROPS y devuelve JSX.
 *   [EST]  Estilos con StyleSheet.create; un círculo se logra con
 *          `borderRadius = mitad del lado`.
 *   [JS 7]  Desestructuración de las props y [JS 19] props con valor por
 *           defecto (`tamanio = 44`).
 *   [JS 22] Renderizado condicional: foto o iniciales.
 */
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colores } from "@/tema/colores";

// Las props que recibe el componente. `tamanio?` con `?` es OPCIONAL: si quien
// lo usa no lo pasa, se usa el valor por defecto (44, ver abajo).
type Props = {
  nombre: string;
  /** La dirección completa de la foto de perfil. Si falta, se ven las iniciales. */
  foto?: string;
  tamanio?: number;
};

/** Saca hasta dos iniciales de un nombre: "Franco Díaz" → "FD". */
// Función auxiliar (no es un componente: no devuelve JSX, devuelve un texto).
// Encadena métodos de string y de array, uno detrás de otro:
function iniciales(nombre: string): string {
  const palabras = nombre
    .trim() // saca los espacios de los extremos: "  Franco Díaz " → "Franco Díaz"
    .split(/\s+/); // parte el texto por espacios (`\s+` = uno o más) → ["Franco", "Díaz"]
  // Con una sola palabra se usa esa; con más, la PRIMERA y la ÚLTIMA (por si hay
  // tres: "María José Pérez" → "María" y "Pérez", no "María" y "José").
  const elegidas =
    palabras.length === 1
      ? palabras
      : [palabras[0], palabras[palabras.length - 1]];
  return elegidas
    .map((parte) => parte.charAt(0).toUpperCase()) // primera letra en mayúscula: ["F", "D"]
    .join(""); // une todo sin separador → "FD"
}

/** Círculo con las iniciales del estudiante. */
// `{ nombre, tamanio = 44 }` es DESESTRUCTURACIÓN de las props [JS 7]: en vez de
// escribir `props.nombre` se toma directo `nombre`. El `= 44` es el valor por
// defecto cuando no se pasa `tamanio`.
export function Avatar({ nombre, foto, tamanio = 44 }: Props) {
  // Si la foto no se puede cargar (se borró, el servidor está apagado), se vuelve a
  // las iniciales en vez de dejar un círculo vacío. Se guarda CUÁL falló: si después
  // llega otra foto distinta, se intenta con esa.
  const [fotoFallida, setFotoFallida] = useState<string | undefined>();

  // Estilo DINÁMICO: depende del tamaño recibido, así que no puede ir en
  // StyleSheet.create (que tiene valores fijos). Para que sea un círculo perfecto,
  // el radio del borde es la mitad del lado.
  const marco = {
    width: tamanio,
    height: tamanio,
    borderRadius: tamanio / 2,
  };

  return (
    // `style={[a, b]}`: una lista de estilos. Se aplican en orden, y los últimos
    // pisan a los primeros. Acá: los estilos fijos + el marco calculado.
    <View style={[estilos.base, marco]}>
      {foto && foto !== fotoFallida ? (
        // `overflow: "hidden"` en el marco recorta la foto cuadrada en círculo.
        <Image
          source={{ uri: foto }}
          style={estilos.foto}
          resizeMode="cover"
          onError={() => setFotoFallida(foto)}
          accessibilityLabel={`Foto de ${nombre}`}
        />
      ) : (
        // El tamaño de la letra es 36 % del tamaño del círculo, así se ve
        // proporcional tanto en el avatar chico como en el grande.
        <Text style={[estilos.texto, { fontSize: tamanio * 0.36 }]}>
          {iniciales(nombre)}
        </Text>
      )}
    </View>
  );
}

// Estilos fijos, abajo del componente y en el mismo archivo [EST]. Los números
// son dp (píxeles independientes de la densidad), sin unidad.
const estilos = StyleSheet.create({
  base: {
    // Centra las iniciales en el medio del círculo: `alignItems` centra en el eje
    // cruzado (horizontal, porque el eje principal es vertical) y
    // `justifyContent` en el eje principal (vertical).
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // recorta la foto en forma de círculo
    borderWidth: 1,
    borderColor: colores.bordeVidrio, // borde apenas visible
    backgroundColor: colores.primarioProfundo, // azul muy oscuro de fondo
  },

  // La foto llena el círculo.
  foto: {
    width: "100%",
    height: "100%",
  },

  texto: {
    fontWeight: "700", // negrita
    color: colores.azulClaro,
  },
});

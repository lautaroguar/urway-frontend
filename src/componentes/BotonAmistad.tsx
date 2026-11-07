/**
 * ============================================================================
 * componentes/BotonAmistad.tsx — Botón Agregar / Enviada / Amigos
 * ============================================================================
 *
 * QUÉ ES:
 *   Un botón que CAMBIA de aspecto según la relación con otro estudiante:
 *
 *     - ya somos amigos                → "Amigos"   (no hace nada al tocarlo)
 *     - le mandé una solicitud         → "Enviada"  (al tocarlo, la retira)
 *     - ME mandó una solicitud         → "Aceptar"  (al tocarlo, somos amigos)
 *     - no hay relación                → "Agregar"  (al tocarlo, envía la solicitud)
 *
 * DÓNDE SE USA:
 *   FilaCompaniero (tamaño chico) y el perfil de un estudiante (tamaño grande).
 *
 * CÓMO SE CONECTA CON EL CONTEXT:
 *   La relación viene en el estudiante (`estudiante.relacion`) y las acciones
 *   (`alternarSolicitud`, `responderSolicitud`) son de `useDatos()`
 *   (estado/datos.tsx). Como ese dato es compartido, al tocar el botón en Conectar
 *   también cambia en el perfil de esa persona.
 *
 * TEORÍA:
 *   [COMP]  Un componente que usa a otro (`Boton`) y le pasa PROPS.
 *   [JS 20] La solicitud enviada NO se guarda acá: el estado vive en el Context
 *           porque lo comparten varias pantallas.
 *   [JS 22] JSX y condicionales: el componente decide qué dibujar según los
 *           datos (amigo / enviada / sin relación).
 *   [COMP]  `Pressable` con feedback: `style` recibe una función que sabe si el
 *           botón está `pressed`.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import type { Estudiante } from "@/datos/comunidad";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  estudiante: Estudiante;
  /** "chico" para las filas de las listas, "grande" para el perfil. */
  tamanio?: "chico" | "grande";
};

/**
 * Botón que cambia según la relación con el otro estudiante:
 * Agregar → Enviada (tocarlo de nuevo retira la solicitud); Aceptar si me la
 * mandó. Si ya son amigos, muestra "Amigos" y no hace nada.
 */
export function BotonAmistad({ estudiante, tamanio = "chico" }: Props) {
  // Del Context salen las acciones: enviar/retirar una solicitud y aceptar una recibida.
  const { alternarSolicitud, responderSolicitud } = useDatos();
  // Un booleano cómodo para no repetir la comparación.
  const grande = tamanio === "grande";

  // CASO 1 — Ya son amigos: botón sin `alTocar`, o sea solo una etiqueta.
  // Devolver algo con `return` acá corta la función: no se sigue con los otros casos.
  if (estudiante.relacion === "amigos") {
    return <Boton texto="Amigos" icono="people" grande={grande} />;
  }

  // CASO 2 — Ya le mandé una solicitud.
  if (estudiante.relacion === "enviada") {
    return (
      <Boton
        texto="Enviada"
        icono="time-outline"
        grande={grande}
        // Al tocarlo la retira (alternarSolicitud invierte el estado).
        alTocar={() => alternarSolicitud(estudiante.id)}
      />
    );
  }

  // CASO 3 — Me mandó una solicitud: botón azul para aceptarla.
  if (estudiante.relacion === "recibida") {
    return (
      <Boton
        texto="Aceptar"
        icono="checkmark"
        primario
        grande={grande}
        alTocar={() => responderSolicitud(estudiante.id, true)}
      />
    );
  }

  // CASO 4 — Sin relación: botón azul relleno (`primario`) para enviar la solicitud.
  return (
    <Boton
      texto="Agregar"
      icono="person-add-outline"
      primario
      grande={grande}
      alTocar={() => alternarSolicitud(estudiante.id)}
    />
  );
}

// El botón en sí. Es un componente PRIVADO de este archivo (sin `export`):
// solo lo usa `BotonAmistad`. Sus props se tipan "en línea" (a continuación de la
// desestructuración) en vez de con un `type Props` aparte, porque son pocas.
function Boton({
  texto,
  icono,
  primario = false,
  grande,
  alTocar,
}: {
  texto: string;
  icono: keyof typeof Ionicons.glyphMap; // solo nombres de íconos que existan
  primario?: boolean;
  grande: boolean;
  /** Sin esto el botón es solo una etiqueta: no se puede tocar. */
  alTocar?: () => void;
}) {
  // El color del texto y del ícono: blanco sobre el fondo azul; azul claro si no.
  const color = primario ? colores.blanco : colores.azulClaro;

  return (
    <Pressable
      onPress={alTocar}
      // `!alTocar` es true cuando NO hay función → el botón queda deshabilitado
      // (es lo que pasa con "Amigos").
      disabled={!alTocar}
      // Agranda el área táctil 6 dp en cada lado sin cambiar el tamaño visual.
      hitSlop={6}
      // `style` como FUNCIÓN: recibe `{ pressed }` (true mientras se mantiene
      // apretado) y devuelve la lista de estilos. Cada `condición && estilo`
      // suma ese estilo solo cuando la condición es verdadera.
      style={({ pressed }) => [
        estilos.boton,
        grande && estilos.botonGrande,
        primario && estilos.primario,
        pressed && estilos.presionado,
      ]}
    >
      <Ionicons name={icono} size={grande ? 16 : 14} color={color} />
      {/* `{ color }` es un estilo inline dinámico: el color depende de `primario`. */}
      <Text style={[estilos.texto, grande && estilos.textoGrande, { color }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // Botón base: ícono y texto en fila, centrados, con borde de pastilla.
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.xs,
    minWidth: 84,
    minHeight: 30,
    borderRadius: radios.pastilla, // 999: extremos completamente redondeados
    borderWidth: 1,
    borderColor: colores.borde,
    paddingVertical: 6,
    paddingHorizontal: espaciado.md,
  },

  // Versión grande (para el perfil): pisa las medidas del base.
  botonGrande: {
    minWidth: 128,
    minHeight: 40,
    paddingHorizontal: espaciado.lg,
  },

  // Versión destacada (azul relleno) para "Agregar".
  primario: {
    borderColor: colores.primario,
    backgroundColor: colores.primario,
  },

  // Feedback visual: el botón se ve un poco transparente mientras se aprieta.
  presionado: {
    opacity: 0.6,
  },

  texto: {
    fontSize: 12,
    fontWeight: "600",
  },

  textoGrande: {
    fontSize: 15,
  },
});

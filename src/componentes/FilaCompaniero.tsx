/**
 * ============================================================================
 * componentes/FilaCompaniero.tsx — Una fila de la lista de compañeros
 * ============================================================================
 *
 * QUÉ ES:
 *   Una fila con avatar, nombre, cantidad de amigos, cuatrimestre y las materias
 *   que cursa esa persona (las que comparte conmigo, resaltadas en azul), más el
 *   botón de amistad a la derecha. Tocar la fila abre su perfil.
 *
 * DE DÓNDE SALEN LOS DATOS:
 *   `companiero` es una `Recomendacion` (utilidades/recomendaciones.ts): un
 *   Estudiante + el campo `enComun` (las materias compartidas), que se calcula
 *   en Conectar.
 *
 * DÓNDE SE USA:
 *   Conectar ("Encontrá compañeros", en la lista de personas).
 *
 * TEORÍA:
 *   [NAV]  Navegación con parámetros: `router.push(`/estudiante/${id}`)` lleva a
 *          la ruta dinámica `estudiante/[id]`; la pantalla de destino lee el id
 *          con `useLocalSearchParams`.
 *   [COMP] Composición: la fila usa a `Avatar` y a `BotonAmistad`.
 *   [JS 8] `map` y `includes` para marcar las materias en común.
 *   [JS 22] `key` estable (el código de la materia).
 */
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/componentes/Avatar";
import { BotonAmistad } from "@/componentes/BotonAmistad";
import type { Recomendacion } from "@/utilidades/recomendaciones";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  companiero: Recomendacion;
};

/**
 * Fila de un compañero: cuántos amigos tiene, qué está cursando (las materias
 * en común, resaltadas) y el botón de amistad. Tocarla abre su perfil.
 */
export function FilaCompaniero({ companiero }: Props) {
  const router = useRouter();
  // Desestructuración: toma la propiedad `amigos` del compañero como variable.
  const { amigos } = companiero;

  return (
    // El botón de amistad va al lado del área tocable y no adentro: un botón
    // dentro de otro no es válido (en web rompe el HTML).
    <View style={estilos.fila}>
      {/* Zona tocable: avatar + textos. Ocupa todo el espacio que deja el botón. */}
      <Pressable
        // Se arma la ruta con una plantilla de texto: "/estudiante/est-2".
        onPress={() => router.push(`/estudiante/${companiero.id}`)}
        style={({ pressed }) => [
          estilos.tocable,
          pressed && estilos.presionado,
        ]}
      >
        <Avatar nombre={companiero.nombre} foto={companiero.foto} tamanio={42} />

        <View style={estilos.texto}>
          {/* `numberOfLines={1}`: si el texto es largo, se corta con "..." en
              lugar de pasar a otra línea. */}
          <Text style={estilos.nombre} numberOfLines={1}>
            {companiero.nombre}
          </Text>
          <Text style={estilos.detalle} numberOfLines={1}>
            {/* Ternario para el plural: "1 amigo" pero "8 amigos".
                `{" "}` fuerza un espacio en el JSX (si no, el salto de línea lo
                borraría). */}
            {amigos} {amigos === 1 ? "amigo" : "amigos"} ·{" "}
            {companiero.cuatrimestre}º cuatrimestre
          </Text>

          {/* Las materias que cursa, cada una como un texto en forma de chip. */}
          <View style={estilos.materias}>
            {companiero.materias.map((materia) => {
              // ¿Esta materia también la curso yo? `includes` responde sí/no.
              const comun = companiero.enComun.includes(materia);
              return (
                <Text
                  key={materia}
                  // Si es en común, se le suma el estilo azul que la resalta.
                  style={[estilos.materia, comun && estilos.materiaComun]}
                >
                  {materia}
                </Text>
              );
            })}
          </View>
        </View>
      </Pressable>

      {/* Botón hermano de la zona tocable (no hijo), a la derecha de la fila. */}
      <BotonAmistad estudiante={companiero} />
    </View>
  );
}

const estilos = StyleSheet.create({
  // La tarjeta de la fila: contenido en fila, centrado verticalmente.
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    padding: espaciado.md,
  },

  // `flex: 1` = que ocupe todo el ancho que sobra, empujando el botón a la derecha.
  tocable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
  },

  presionado: {
    opacity: 0.7,
  },

  // Columna de textos. También `flex: 1` para que el texto largo se corte con
  // "..." en vez de empujar el botón fuera de la pantalla.
  texto: {
    flex: 1,
    gap: 2,
  },

  nombre: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.texto,
  },

  detalle: {
    fontSize: 12,
    color: colores.textoTenue,
  },

  // Las materias: en fila y con `flexWrap` para que pasen a la línea de abajo
  // si no entran.
  materias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espaciado.xs,
    marginTop: espaciado.xs,
  },

  // Cada materia como una mini pastilla gris. `overflow: "hidden"` es necesario
  // para que el `borderRadius` se aplique a un `Text` también en iOS.
  materia: {
    overflow: "hidden",
    borderRadius: radios.sm,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colores.textoTenue,
  },

  // Versión resaltada (materia en común): azul, pisa borde, fondo y color.
  materiaComun: {
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
    color: colores.azulClaro,
  },
});

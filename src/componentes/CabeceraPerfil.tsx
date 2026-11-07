/**
 * ============================================================================
 * componentes/CabeceraPerfil.tsx — Parte de arriba de un perfil
 * ============================================================================
 *
 * QUÉ ES:
 *   Avatar grande, nombre, carrera y una fila de "contadores" (por ejemplo
 *   Amigos / Materias / En común).
 *
 * POR QUÉ ES UN COMPONENTE APARTE:
 *   Lo usan dos pantallas: el perfil propio (app/perfil.tsx) y el de otro
 *   estudiante (app/estudiante/[id].tsx). Con un solo componente, los dos se
 *   ven exactamente igual, y un cambio de diseño se hace una sola vez.
 *   [COMP] Reutilización: un componente = una pieza de UI con props.
 *
 * TEORÍA:
 *   [COMP]  Props y composición (usa a `Avatar`).
 *   [JS 22] Fragment (`<> </>`) y listas en JSX con `key` estable (el rótulo),
 *           nunca el índice.
 *   [JS 8]  `map` para dibujar la lista de contadores.
 */
import { StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/componentes/Avatar";
import { carrera } from "@/datos/carrera";
import { colores, espaciado, radios } from "@/tema/colores";

type Props = {
  nombre: string;
  /** La dirección completa de la foto de perfil (si no hay, se ven las iniciales). */
  foto?: string;
  cuatrimestre: number;
  /** Carrera a mostrar. Si no se pasa, se usa la del plan de estudios. */
  carreraTexto?: string;
  /** Universidad o facultad a mostrar. Si no se pasa, se usa la del plan. */
  universidadTexto?: string;
  // Un array de objetos `{ valor, rotulo }`. Ejemplo: [{ valor: 12, rotulo: "Amigos" }].
  contadores: { valor: number; rotulo: string }[];
};

/**
 * Parte de arriba de un perfil: avatar, nombre, carrera y la fila de
 * contadores. La usan el perfil propio y el de cualquier otro estudiante,
 * así los dos se leen igual.
 */
// `carreraTexto = carrera.nombre` es un valor POR DEFECTO [JS 19]: si quien usa el
// componente no lo pasa (el perfil de otro estudiante), se muestra la carrera del
// plan de estudios; el perfil propio pasa la que la persona eligió al registrarse.
export function CabeceraPerfil({
  nombre,
  foto,
  cuatrimestre,
  carreraTexto = carrera.nombre,
  universidadTexto = carrera.universidad,
  contadores,
}: Props) {
  return (
    // `<> ... </>` es un FRAGMENT: permite devolver dos bloques hermanos (la
    // cabecera y los contadores) sin agregar un `View` extra.
    <>
      {/* Bloque 1: avatar y textos, centrados en una columna. */}
      <View style={estilos.cabecera}>
        <Avatar nombre={nombre} foto={foto} tamanio={96} />
        <Text style={estilos.nombre}>{nombre}</Text>
        {/* Las llaves `{ }` insertan valores JavaScript dentro del texto. */}
        <Text style={estilos.carrera}>
          {carreraTexto} · {cuatrimestre}º cuatrimestre
        </Text>
        <Text style={estilos.universidad}>{universidadTexto}</Text>
      </View>

      {/* Bloque 2: la tarjeta con los contadores, en una fila. */}
      <View style={estilos.contadores}>
        {/* `map` recorre el array y devuelve un `View` por cada contador
            [JS 8]. `indice` es la posición (0, 1, 2...). */}
        {contadores.map((contador, indice) => (
          <View
            // `key` estable y única entre hermanos: el rótulo ("Amigos", ...).
            key={contador.rotulo}
            // `indice > 0 && estilos.divisor`: a todos menos al primero se les
            // agrega la línea vertical a la izquierda (el separador).
            style={[estilos.contador, indice > 0 && estilos.divisor]}
          >
            <Text style={estilos.valor}>{contador.valor}</Text>
            <Text style={estilos.rotulo}>{contador.rotulo}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  // Columna centrada (`alignItems` centra en horizontal, porque el eje
  // principal es vertical); `gap` separa los textos.
  cabecera: {
    alignItems: "center",
    gap: espaciado.xs,
    paddingTop: espaciado.sm,
    paddingBottom: espaciado.md,
  },

  // El nombre: grande y con las letras un poco juntas (`letterSpacing` negativo).
  nombre: {
    marginTop: espaciado.md,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    textAlign: "center",
    color: colores.texto,
  },

  carrera: {
    fontSize: 14,
    color: colores.textoSecundario,
  },

  universidad: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  // La tarjeta de contadores: `flexDirection: "row"` los pone uno al lado del
  // otro; `overflow: "hidden"` respeta las esquinas redondeadas.
  contadores: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.md,
  },

  // Cada contador ocupa el mismo ancho (`flex: 1`) y centra su contenido.
  contador: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },

  // Separador vertical entre contadores. `hairlineWidth` es la línea más fina
  // que puede dibujar el dispositivo.
  divisor: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colores.bordeSuave,
  },

  // El número grande.
  valor: {
    fontSize: 22,
    fontWeight: "700",
    color: colores.texto,
  },

  // El texto chico debajo del número ("Amigos", "Materias"...).
  rotulo: {
    fontSize: 12,
    color: colores.textoTenue,
  },
});

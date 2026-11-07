/**
 * ============================================================================
 * componentes/CirculoProgreso.tsx — Un círculo que se va llenando (de 0 a 100 %)
 * ============================================================================
 *
 * QUÉ ES:
 *   Un aro de progreso: una corona de rayitas, de las que se pintan de azul las
 *   que corresponden al valor (arrancando desde arriba y siguiendo el sentido del
 *   reloj), y lo que se escriba adentro queda en el centro. Es lo que muestra el
 *   avance del cuatrimestre en Inicio (en su versión chica, dentro de un tile).
 *
 * POR QUÉ RAYITAS Y NO UN ARCO:
 *   Un arco suave necesita SVG, y el proyecto usa solo componentes básicos y
 *   estilos. Con `View` y `transform` se arma el mismo efecto: cada rayita es un
 *   `View` chico que se GIRA un ángulo y se corre hacia afuera del centro.
 *
 * CÓMO SE COLOCA CADA RAYITA:
 *   1. Nace en el centro del círculo.
 *   2. `rotate` la gira N grados (igual que el ángulo de una aguja del reloj).
 *   3. `translateY` negativo la manda hacia "arriba" de ese giro, es decir hacia
 *      afuera, a una distancia del centro igual al `radio`.
 *   El orden importa: primero se escribe `rotate` y después `translateY`.
 *
 * TEORÍA:
 *   [EST]   `transform` (`rotate`, `translateY`) y `position: "absolute"`.
 *   [JS 8]  `Array.from({ length })` + `map` para generar las rayitas.
 *   [JS 25] `encendidas` se DERIVA del valor en cada render; no se guarda.
 *   [COMP]  Props y `children` (lo que va en el centro).
 */
// `ReactNode` es el tipo de "cualquier cosa que React puede dibujar" (los `children`).
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colores } from "@/tema/colores";

// Cuántas rayitas forman el círculo completo. 48 → una cada 7,5 grados.
const RAYITAS = 48;

type Props = {
  /** Valor entre 0 y 1. Se recorta si viene fuera de rango. */
  valor: number;
  /** Diámetro del círculo en dp. */
  tamanio?: number;
  /** Largo de cada rayita hacia afuera, en dp. Un círculo chico pide rayitas cortas. */
  largo?: number;
  /** Grosor de cada rayita, en dp. */
  grosor?: number;
  /** Lo que se escribe en el centro (por ejemplo el porcentaje). */
  children?: ReactNode;
};

/** Aro de progreso hecho con rayitas. */
// `largo = 9` y `grosor = 3` son valores POR DEFECTO [JS 19]: sirven para un
// círculo grande; el tile de Inicio los pasa más chicos.
export function CirculoProgreso({
  valor,
  tamanio = 88,
  largo = 9,
  grosor = 3,
  children,
}: Props) {
  // Distancia del centro del círculo al centro de cada rayita: la rayita tiene
  // que quedar con su punta de afuera justo en el borde (`tamanio / 2`).
  const radio = tamanio / 2 - largo / 2;

  // Cuántas rayitas se pintan: el valor (recortado a 0..1) por el total, redondeado.
  // `Math.max(valor, 0)` evita que baje de 0 y `Math.min(..., 1)` que pase de 1.
  // Ejemplo: valor 0,625 → 0,625 × 48 = 30 rayitas azules.
  const encendidas = Math.round(Math.min(Math.max(valor, 0), 1) * RAYITAS);

  return (
    // El contenedor tiene el tamaño del círculo. Las rayitas son absolutas
    // sobre él y el centro es un `View` aparte, también centrado.
    <View style={{ width: tamanio, height: tamanio }}>
      {/* `Array.from({ length: 48 }, (_, posicion) => ...)` arma una lista de 48
          elementos; `_` es el valor, que no se usa, y `posicion` va de 0 a 47. */}
      {Array.from({ length: RAYITAS }, (_, posicion) => (
        <View
          // Clave estable: la posición de la rayita no cambia nunca (siempre son
          // 48, siempre en el mismo orden).
          key={`rayita-${posicion}`}
          style={[
            estilos.rayita,
            {
              width: grosor,
              height: largo,
              borderRadius: grosor / 2,
              // La rayita arranca en el centro del círculo.
              left: tamanio / 2 - grosor / 2,
              top: tamanio / 2 - largo / 2,
              // Las primeras `encendidas` en azul y el resto en el gris del "riel".
              backgroundColor:
                posicion < encendidas ? colores.primario : colores.pizarra,
              // Gira `posicion × 7,5°` y se manda hacia afuera `radio` dp.
              transform: [
                { rotate: `${(360 / RAYITAS) * posicion}deg` },
                { translateY: -radio },
              ],
            },
          ]}
        />
      ))}

      {/* El centro: ocupa todo el círculo y centra lo que tenga adentro. */}
      <View style={estilos.centro}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Cada rayita se posiciona de forma absoluta; el ancho, el alto, el color y el giro se ponen inline en cada una (dependen del valor).
  rayita: {
    position: "absolute",
  },

  // `StyleSheet.absoluteFill` = pegado a los cuatro bordes del contenedor.
  centro: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});

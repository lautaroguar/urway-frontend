/**
 * ============================================================================
 * componentes/BloqueEvento.tsx — Un evento dibujado sobre la grilla semanal
 * ============================================================================
 *
 * QUÉ ES:
 *   El rectángulo de color que representa un evento dentro de la columna de su
 *   día: una barrita del color del tipo a la izquierda y el título adentro. Su
 *   posición y su tamaño dependen de la hora del evento.
 *
 * CÓMO SE POSICIONA (todo en el render, sin estado):
 *   - `top`    → a cuántas horas está de la primera hora de la grilla.
 *   - `height` → cuánto dura (mínimo `ALTO_MINIMO_BLOQUE`).
 *   - `left` y `width` → en PORCENTAJE de la columna: si dos eventos se pisan,
 *     cada uno ocupa la mitad (`50%`); si son tres, un tercio.
 *   Con `position: "absolute"` esos valores se miden desde la columna que lo
 *   contiene, que es su padre.
 *   Si comparte la columna con otros eventos queda demasiado angosto para el
 *   título: ahí se muestra solo el color.
 *
 * LOS CÍRCULOS (parcial y entrega adentro de una clase):
 *   Si en la clase hay un parcial y/o una entrega (`separarMarcas`), no tienen
 *   bloque propio: la clase los dibuja abajo, como círculos del color de su tipo
 *   con su ícono adentro (uno para el parcial, otro para la entrega). Cada círculo
 *   se toca por separado y abre el detalle de ESE evento; el resto del bloque abre
 *   el de la clase. Los círculos ocupan lugar, así que el título tiene menos líneas.
 *
 * POR QUÉ DOS VIEW (el Pressable y otro adentro):
 *   El `Pressable` de afuera es el que se posiciona y deja 1 dp de aire a cada
 *   lado, así dos eventos pegados no se ven como un solo bloque. El `View` de
 *   adentro es el que se pinta.
 *
 * TEORÍA:
 *   [EST]  `position: "absolute"`, `top`, `height`, `left` y `width` en
 *          porcentaje (string), `borderLeftWidth`, `overflow`, un círculo con
 *          `width` = `height` y `borderRadius` = la mitad, `marginTop: "auto"`.
 *   [COMP] Props, y funciones como prop (`alTocar`, `alTocarMarca`): "los eventos
 *          suben". Un `Pressable` adentro de otro: el de adentro se queda con el toque.
 *   [JS 25] `alto`, `lineas`, etc. se DERIVAN en cada render.
 */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { etiquetasTipo, type Evento } from "@/datos/agenda";
import { colores, radios } from "@/tema/colores";
import { estilosPorTipo } from "@/tema/eventos";
import {
  ALTO_MINIMO_BLOQUE,
  distanciaDesdeArriba,
} from "@/utilidades/calendario";
import { aMinutos } from "@/utilidades/fechas";

// Alto de una línea del título (`lineHeight` de `estilos.titulo`) y lo que ocupan
// el relleno de arriba y de abajo. Sirven para saber cuántas líneas entran.
const ALTO_LINEA = 12;
const RELLENO_VERTICAL = 3;

// Diámetro de cada círculo y aire entre ellos. Con 16 dp entran DOS lado a lado en
// una columna de un celular de 360 dp de ancho (la más angosta que se usa).
const DIAMETRO_MARCA = 16;
const AIRE_MARCAS = 2;

type Props = {
  evento: Evento;
  /** Cuál de las columnas de su grupo ocupa (0 = la primera). */
  columna: number;
  /** En cuántas columnas se reparte su grupo (1 = no se pisa con nadie). */
  columnas: number;
  /** La hora que está arriba de todo en la grilla (para medir desde ahí). */
  horaInicio: number;
  /** Se ejecuta al tocar el bloque (la pantalla decide adónde ir). */
  alTocar: () => void;
  /** El parcial y/o la entrega que quedan adentro de esta clase (vacío: ninguno). */
  marcas: Evento[];
  /** Se ejecuta al tocar el círculo de uno de ellos. */
  alTocarMarca: (marca: Evento) => void;
};

/** Bloque de un evento, posicionado según su hora sobre la columna de su día. */
export function BloqueEvento({
  evento,
  columna,
  columnas,
  horaInicio,
  alTocar,
  marcas,
  alTocarMarca,
}: Props) {
  // Los colores del tipo (el mismo criterio que `FilaEvento`).
  const estilo = estilosPorTipo[evento.tipo];

  // Posición vertical: del inicio al fin del evento, medidos desde arriba.
  const top = distanciaDesdeArriba(aMinutos(evento.desde), horaInicio);
  const fin = distanciaDesdeArriba(aMinutos(evento.hasta), horaInicio);
  // `Math.max` evita que un evento de 15 minutos quede imposible de tocar.
  const alto = Math.max(fin - top, ALTO_MINIMO_BLOQUE);

  // El alto que se llevan los círculos (con un poco de aire arriba), si los hay.
  const altoMarcas = marcas.length > 0 ? DIAMETRO_MARCA + AIRE_MARCAS : 0;

  // Cuántas líneas de título entran en lo que sobra del alto. Si el título es más
  // largo, `numberOfLines` lo corta con "…".
  const lineasQueEntran = Math.floor(
    (alto - RELLENO_VERTICAL * 2 - altoMarcas) / ALTO_LINEA
  );
  // Como mínimo una (así era antes de los círculos).
  const lineas = Math.max(1, lineasQueEntran);

  // Si el evento comparte la columna con otros, le queda un ancho de unos 20 dp:
  // el título se partiría letra por letra y no se podría leer. En ese caso el
  // bloque muestra solo su color, y al tocarlo se abre el detalle. Y si hay
  // círculos pero el bloque es tan corto que no queda lugar para ninguna línea,
  // también se muestran solo los círculos.
  const mostrarTitulo =
    columnas === 1 && (marcas.length === 0 || lineasQueEntran >= 1);

  return (
    <Pressable
      onPress={alTocar}
      style={({ pressed }) => [
        estilos.posicion,
        {
          top,
          height: alto,
          // Ejemplo con 2 columnas: la primera va en left 0 % / width 50 % y la
          // segunda en left 50 % / width 50 %.
          left: `${(columna / columnas) * 100}%`,
          width: `${100 / columnas}%`,
        },
        pressed && estilos.presionado,
      ]}
    >
      {/* Barrita de color a la izquierda y fondo oscuro del mismo tono: igual
          que la barrita de `FilaEvento`. El color depende del tipo, por eso va
          inline. */}
      <View
        style={[
          estilos.bloque,
          { backgroundColor: estilo.fondo, borderLeftColor: estilo.acento },
        ]}
      >
        {mostrarTitulo ? (
          <Text style={estilos.titulo} numberOfLines={lineas}>
            {evento.titulo}
          </Text>
        ) : null}

        {/* Los círculos, pegados abajo (`marginTop: "auto"` se come todo el espacio
            libre de arriba). Cada uno lleva el color de SU tipo y su ícono. */}
        {marcas.length > 0 ? (
          <View style={estilos.marcas}>
            {marcas.map((marca) => {
              const estiloMarca = estilosPorTipo[marca.tipo];
              return (
                <Pressable
                  key={marca.id}
                  onPress={() => alTocarMarca(marca)}
                  // El círculo es chico: `hitSlop` agranda la zona que responde al dedo.
                  hitSlop={4}
                  accessibilityLabel={`${etiquetasTipo[marca.tipo]}: ${marca.titulo}`}
                  style={({ pressed }) => [
                    estilos.marca,
                    { backgroundColor: estiloMarca.acento },
                    pressed && estilos.presionado,
                  ]}
                >
                  <Ionicons
                    name={estiloMarca.iconoMarca}
                    size={10}
                    color={estiloMarca.fondo}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // `absolute`: se coloca respecto de la columna del día. El `top`, el alto, el
  // `left` y el ancho dependen del evento y van inline. El `padding` de 1 deja
  // aire entre bloques vecinos.
  posicion: {
    position: "absolute",
    padding: 1,
  },

  presionado: {
    opacity: 0.7,
  },

  // El rectángulo pintado: llena a su padre, con la barrita del tipo a la izquierda.
  bloque: {
    flex: 1,
    overflow: "hidden",
    borderRadius: radios.sm - 2,
    borderLeftWidth: 2,
    paddingVertical: RELLENO_VERTICAL,
    paddingHorizontal: 3,
  },

  titulo: {
    fontSize: 10,
    lineHeight: ALTO_LINEA,
    fontWeight: "600",
    color: colores.texto,
  },

  // La fila de círculos: abajo del bloque, uno al lado del otro (y si no entran, se
  // parten en dos filas con `flexWrap`).
  marcas: {
    marginTop: "auto",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AIRE_MARCAS,
  },

  // Un círculo: lado = diámetro y radio = la mitad. El color de fondo va inline.
  marca: {
    width: DIAMETRO_MARCA,
    height: DIAMETRO_MARCA,
    borderRadius: DIAMETRO_MARCA / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

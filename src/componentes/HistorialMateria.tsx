/**
 * ============================================================================
 * componentes/HistorialMateria.tsx — Todo lo rendido de una materia
 * ============================================================================
 *
 * QUÉ ES:
 *   La lista de lo que el estudiante rindió, presentó o expuso en una materia:
 *   cada fila tiene qué fue (parcial, TP...), la fecha, la nota (en azul si
 *   aprobó, en rojo si no) y, si cambió el estado de la materia, qué provocó
 *   ("Terminaste de cursar", "Aprobaste la materia", "Decidiste recursar").
 *   Lo más nuevo va arriba. Si la materia se recursó, se separa por cursada.
 *
 *   Abajo, "Deshacer lo último": borra lo último que se cargó (para corregir un
 *   error de tipeo). Pide confirmación en la misma tarjeta, sin ventanas.
 *
 * DÓNDE SE USA:
 *   `app/materia/[id].tsx`, debajo de `EstadoDeMateria`.
 *
 * TEORÍA:
 *   [COMP]  Props, `Tarjeta`, `Pressable` y un componente auxiliar privado (`Fila`).
 *   [JS 8]  `map`, `filter`, `reverse` (sobre una COPIA) y `Set`.
 *   [JS 20] `useState` para la confirmación de "Deshacer".
 *   [JS 14] `async/await` + `try/catch` al deshacer.
 *   [JS 22] Listas con `key` estable (el id de cada instancia).
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Tarjeta } from "@/componentes/Tarjeta";
import {
  etiquetasInstancia,
  type EfectoInstancia,
  type Materia,
  type PasoHistorial,
  type TipoInstancia,
} from "@/datos/carrera";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { aTextoFecha } from "@/utilidades/fechas";
import { aprobo } from "@/utilidades/materias";

// El ícono de cada cosa que se puede rendir. `Record` obliga a tener uno por tipo.
const ICONOS: Record<TipoInstancia, keyof typeof Ionicons.glyphMap> = {
  parcial: "document-text-outline",
  recuperatorio: "refresh-outline",
  tp: "construct-outline",
  exposicion: "mic-outline",
  final: "ribbon-outline",
};

// Lo que provocó una instancia, en palabras. `Exclude<..., null>`: todos menos `null`.
const EFECTOS: Record<Exclude<EfectoInstancia, null>, string> = {
  cierraCursada: "Terminaste de cursar",
  aprueba: "Aprobaste la materia",
  recursa: "Decidiste recursar",
};

type Props = {
  materia: Materia;
};

/** El historial de una materia, con la opción de deshacer lo último. */
export function HistorialMateria({ materia }: Props) {
  const { deshacerUltimaInstancia } = useDatos();
  // ¿Se está pidiendo confirmación para deshacer? ¿Y falló algo?
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pasos = materia.historial;
  // Lo más nuevo primero: `[...pasos]` COPIA el array antes de dar vuelta el orden,
  // porque `reverse` modifica el array sobre el que se llama [JS 9].
  const delMasNuevo = [...pasos].reverse();
  // Las cursadas que hubo, de la más nueva a la más vieja: [2, 1] si se recursó.
  const intentos = [...new Set(delMasNuevo.map((paso) => paso.intento))];
  const ultimo = pasos.at(-1); // lo último que se cargó (o `undefined` si no hay nada)

  const deshacer = async () => {
    setError(null);
    try {
      await deshacerUltimaInstancia(materia.id);
      setConfirmando(false);
    } catch {
      setError("No se pudo deshacer. Probá de nuevo.");
    }
  };

  return (
    <Tarjeta style={estilos.tarjeta}>
      <View style={estilos.cabecera}>
        <Text style={estilos.rotulo}>Historial</Text>
        {/* Ternario para el plural: "1 cosa rendida" / "3 cosas rendidas". */}
        <Text style={estilos.cantidad}>
          {pasos.length} {pasos.length === 1 ? "cosa rendida" : "cosas rendidas"}
        </Text>
      </View>

      {pasos.length === 0 ? (
        // ESTADO VACÍO: se explica qué va a aparecer acá.
        <Text style={estilos.vacio}>
          Todavía no cargaste nada de esta materia. Lo que rindas, presentes o
          expongas va a quedar acá.
        </Text>
      ) : (
        // Un bloque por cursada. Si hubo una sola, no se muestra el título del bloque.
        intentos.map((intento) => (
          <View key={intento} style={estilos.bloque}>
            {intentos.length > 1 ? (
              <Text style={estilos.tituloBloque}>
                Cursada {intento}
                {intento > 1 ? " (recursada)" : ""}
              </Text>
            ) : null}
            {delMasNuevo
              .filter((paso) => paso.intento === intento)
              .map((paso, indice) => (
                <Fila key={paso.instancia.id} paso={paso} primera={indice === 0} />
              ))}
          </View>
        ))
      )}

      {/* "Deshacer lo último", con la confirmación en la misma tarjeta. */}
      {ultimo && !confirmando ? (
        <Pressable
          onPress={() => setConfirmando(true)}
          hitSlop={6}
          style={({ pressed }) => [estilos.deshacer, pressed && estilos.presionado]}
        >
          <Ionicons name="arrow-undo-outline" size={16} color={colores.azulClaro} />
          <Text style={estilos.textoDeshacer}>Deshacer lo último</Text>
        </Pressable>
      ) : null}

      {ultimo && confirmando ? (
        <View style={estilos.confirmacion}>
          <Text style={estilos.textoConfirmacion}>
            ¿Borrar «{etiquetasInstancia[ultimo.instancia.tipo]} del{" "}
            {aTextoFecha(ultimo.instancia.fecha)} · {ultimo.instancia.nota}»? El
            estado de la materia se vuelve a calcular sin eso.
          </Text>
          <View style={estilos.botones}>
            <Pressable
              onPress={deshacer}
              style={({ pressed }) => [estilos.botonBorrar, pressed && estilos.presionado]}
            >
              <Text style={estilos.textoBotonBorrar}>Sí, borrar</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmando(false)}
              style={({ pressed }) => [estilos.botonCancelar, pressed && estilos.presionado]}
            >
              <Text style={estilos.textoCancelar}>Cancelar</Text>
            </Pressable>
          </View>
          {error ? <Text style={estilos.error}>{error}</Text> : null}
        </View>
      ) : null}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): una fila del historial
// ---------------------------------------------------------------------------

function Fila({ paso, primera }: { paso: PasoHistorial; primera: boolean }) {
  const { instancia, efecto } = paso;
  const bien = aprobo(instancia.nota);

  return (
    <View style={[estilos.fila, !primera && estilos.separador]}>
      <View style={estilos.icono}>
        <Ionicons name={ICONOS[instancia.tipo]} size={16} color={colores.azulClaro} />
      </View>
      <View style={estilos.textos}>
        <Text style={estilos.tipo}>{etiquetasInstancia[instancia.tipo]}</Text>
        <Text style={estilos.detalle}>
          {aTextoFecha(instancia.fecha)}
          {/* Si cambió el estado de la materia, se dice qué provocó. */}
          {efecto ? ` · ${EFECTOS[efecto]}` : ""}
        </Text>
      </View>
      {/* La nota en una pastilla: azul si aprobó, roja si no. */}
      <View style={[estilos.nota, bien ? estilos.notaBien : estilos.notaMal]}>
        <Text style={[estilos.textoNota, { color: bien ? colores.azulClaro : colores.alerta }]}>
          {instancia.nota}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: espaciado.md,
  },

  // "HISTORIAL" a la izquierda y la cantidad a la derecha.
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rotulo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  cantidad: {
    fontSize: 12,
    color: colores.textoTenue,
  },

  vacio: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoDebil,
  },

  // Un bloque por cursada.
  bloque: {
    gap: espaciado.xs,
  },

  tituloBloque: {
    fontSize: 12,
    fontWeight: "700",
    color: colores.azulClaro,
  },

  // Una fila: ícono + textos + nota.
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
  },

  // La línea fina arriba de cada fila menos la primera.
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  // Círculo de 30 (radio 15) con el ícono del tipo.
  icono: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.primarioProfundo,
  },

  textos: {
    flex: 1,
  },

  tipo: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  detalle: {
    marginTop: 2,
    fontSize: 12,
    color: colores.textoTenue,
  },

  // La pastilla de la nota: el color de fondo lo agregan `notaBien` / `notaMal`.
  nota: {
    minWidth: 34,
    alignItems: "center",
    borderRadius: radios.pastilla,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: espaciado.sm,
  },

  notaBien: {
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
  },

  // Los mismos tonos que los parciales de la agenda (`tema/eventos.ts`).
  notaMal: {
    borderColor: "#5A2A2E",
    backgroundColor: "#2A1416",
  },

  textoNota: {
    fontSize: 14,
    fontWeight: "700",
  },

  // "Deshacer lo último": un enlace chico alineado a la izquierda.
  deshacer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: espaciado.xs,
  },

  textoDeshacer: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // La confirmación: un recuadro con borde rojizo.
  confirmacion: {
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.alerta,
    padding: espaciado.md,
  },

  textoConfirmacion: {
    fontSize: 13,
    lineHeight: 18,
    color: colores.alerta,
  },

  botones: {
    flexDirection: "row",
    gap: espaciado.sm,
  },

  botonBorrar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: radios.md,
    backgroundColor: colores.alerta,
  },

  textoBotonBorrar: {
    fontSize: 14,
    fontWeight: "700",
    color: colores.fondo,
  },

  botonCancelar: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  textoCancelar: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  error: {
    fontSize: 12,
    color: colores.alerta,
  },

  presionado: {
    opacity: 0.7,
  },
});

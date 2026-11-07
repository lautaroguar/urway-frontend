/**
 * ============================================================================
 * app/evento/[id].tsx — Detalle de un evento
 * ============================================================================
 *
 * QUÉ ES:
 *   La ficha de un evento: ícono y color según el tipo, título, fecha, horario y
 *   duración, cómo se repite, lugar, materia, con quién (si es una juntada de
 *   estudio) y notas. Abajo, los botones "Editar evento" y "Eliminar".
 *
 * RUTA DINÁMICA Y LA FECHA:
 *   `[id]` es el evento (`/evento/ev-1`) y, como un evento que se repite cae en
 *   muchos días, la ruta también lleva CUÁL se tocó: `/evento/ev-1?fecha=2026-10-26`.
 *   Si no viene la fecha, se muestra la primera.
 *
 * ELIMINAR UN EVENTO QUE SE REPITE:
 *   Se pregunta en la misma pantalla (sin ventanas): "Solo este día" (se agrega a
 *   las excepciones de la serie) o "Todas las fechas" (se borra el evento).
 *
 * SI LO ORGANIZA OTRO ESTUDIANTE:
 *   (Una invitación a estudiar que acepté.) No se puede editar ni borrar: se
 *   muestra quién lo organiza y el botón "Ya no voy".
 *
 * TEORÍA:
 *   [NAV]   `useLocalSearchParams` (parámetros de ruta), `router.push` y `router.back()`.
 *   [JS 29] Se lee y se modifica el Context.
 *   [JS 22] Renderizado condicional: retorno temprano si no existe, y bloques
 *           que aparecen solo si hay dato (lugar, materia, invitados, notas).
 *   [JS 20] `useState` para la confirmación de "Eliminar".
 *   [JS 24] Regla de los hooks: todos se llaman antes del `return` condicional.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Tarjeta } from "@/componentes/Tarjeta";
import { etiquetasTipo, type Invitado } from "@/datos/agenda";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { estilosPorTipo } from "@/tema/eventos";
import {
  aTextoFecha,
  desdeClave,
  duracion,
  etiquetaDiaLargo,
} from "@/utilidades/fechas";
import { describirRepeticion, seRepite } from "@/utilidades/repeticion";

// Cómo se escribe la respuesta de cada invitado.
const RESPUESTAS: Record<Invitado["respuesta"], string> = {
  pendiente: "todavía no respondió",
  aceptada: "va",
  rechazada: "no va",
};

/** Ficha de un evento, con las opciones de editarlo y eliminarlo. */
export default function PantallaEvento() {
  // El `id` del evento y la `fecha` del día tocado ("/evento/ev-1?fecha=2026-10-26").
  const { id, fecha } = useLocalSearchParams<{ id: string; fecha?: string }>();
  const router = useRouter();
  const { eventos, materias, eliminarEvento, omitirFecha, responderInvitacion } =
    useDatos();
  // ¿Se está preguntando cómo eliminar? Y si algo falló.
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evento = eventos.find((candidato) => candidato.id === id);

  // Si no existe (por ejemplo, ya se eliminó), se muestra un aviso y se corta.
  // Todos los hooks se llamaron ARRIBA de este `return`.
  if (!evento) {
    return (
      <View style={[estilos.pantalla, estilos.vacio]}>
        <Ionicons name="calendar-outline" size={32} color={colores.textoDebil} />
        <Text style={estilos.textoVacio}>
          Este evento ya no existe. Puede que lo hayas eliminado.
        </Text>
      </View>
    );
  }

  // El día que se muestra: el tocado o, si no vino, la primera fecha del evento.
  const dia = fecha ?? evento.fecha;
  const estilo = estilosPorTipo[evento.tipo];
  const materia = evento.materiaId
    ? materias.find((m) => m.id === evento.materiaId)
    : undefined;
  const repeticion = describirRepeticion(evento); // texto, o `null` si no se repite
  // Si es una clase de una materia que ya se terminó de cursar, se avisa desde cuándo.
  const cortada =
    evento.tipo === "clase" && materia && materia.estado !== "cursando"
      ? materia.finCursada
      : undefined;
  const esMio = !evento.organizador;

  // Las tres maneras de terminar: cada una espera al Context y vuelve atrás. Si
  // falla, se muestra el mensaje (`try/catch` [JS 14]).
  const ejecutar = async (accion: () => Promise<void>) => {
    setError(null);
    try {
      await accion();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
    }
  };
  const borrarTodo = () => ejecutar(() => eliminarEvento(evento.id));
  const borrarEsteDia = () => ejecutar(() => omitirFecha(evento.id, dia));
  // Se guarda en una constante para que TypeScript sepa, dentro de la función,
  // que el organizador existe.
  const organizador = evento.organizador;
  const noVoy = () => {
    if (organizador) ejecutar(() => responderInvitacion(organizador.invitacionId, false));
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* Insignia: cuadrado con el ícono del tipo y su color de fondo. */}
        <View style={[estilos.insignia, { backgroundColor: estilo.fondo }]}>
          <Ionicons name={estilo.icono} size={22} color={estilo.acento} />
        </View>

        <Text style={estilos.titulo}>{evento.titulo}</Text>
        <Text style={[estilos.tipo, { color: estilo.acento }]}>
          {etiquetasTipo[evento.tipo]}
        </Text>

        {/* ---------- Tarjeta con los datos ---------- */}
        <Tarjeta style={estilos.tarjeta}>
          <Dato
            icono="calendar-outline"
            rotulo="Fecha"
            // "AAAA-MM-DD" → Date → "jueves 2 de octubre".
            valor={etiquetaDiaLargo(desdeClave(dia))}
          />
          <View style={estilos.separador} />
          <Dato
            icono="time-outline"
            rotulo="Horario"
            valor={`${evento.desde} - ${evento.hasta} · ${duracion(evento.desde, evento.hasta)}`}
          />
          {/* Cómo se repite (solo si se repite). */}
          {repeticion ? (
            <>
              <View style={estilos.separador} />
              <Dato
                icono="repeat"
                rotulo="Se repite"
                valor={
                  cortada
                    ? `${repeticion}. Terminó con la cursada el ${aTextoFecha(cortada)}.`
                    : repeticion
                }
              />
            </>
          ) : null}
          {evento.lugar ? (
            <>
              <View style={estilos.separador} />
              <Dato icono="location-outline" rotulo="Lugar" valor={evento.lugar} />
            </>
          ) : null}
          {materia ? (
            <>
              <View style={estilos.separador} />
              <Dato
                icono="book-outline"
                rotulo="Materia"
                valor={`${materia.id} · ${materia.nombre}`}
              />
            </>
          ) : null}
          {/* Juntada de estudio: quién la organiza o a quiénes invité. */}
          {evento.organizador ? (
            <>
              <View style={estilos.separador} />
              <Dato
                icono="person-outline"
                rotulo="Te invitó"
                valor={evento.organizador.nombre}
              />
            </>
          ) : null}
          {evento.invitados && evento.invitados.length > 0 ? (
            <>
              <View style={estilos.separador} />
              <Dato
                icono="people-outline"
                rotulo="Invitaste a"
                // "Mariana Sosa (va), David López (todavía no respondió)".
                valor={evento.invitados
                  .map((invitado) => `${invitado.nombre} (${RESPUESTAS[invitado.respuesta]})`)
                  .join(", ")}
              />
            </>
          ) : null}
        </Tarjeta>

        {/* Las notas solo aparecen si el evento tiene. */}
        {evento.notas ? (
          <>
            <Text style={estilos.tituloSeccion}>Notas</Text>
            <Tarjeta>
              <Text style={estilos.notas}>{evento.notas}</Text>
            </Tarjeta>
          </>
        ) : null}

        {error ? <Text style={estilos.error}>{error}</Text> : null}

        {/* ---------- Acciones ---------- */}
        {!esMio ? (
          // Lo organiza otro: solo se puede dejar de ir.
          <Boton icono="close-circle-outline" texto="Ya no voy" peligro alTocar={noVoy} />
        ) : confirmando ? (
          // La confirmación, en la misma pantalla.
          <View style={estilos.confirmacion}>
            <Text style={estilos.textoConfirmacion}>
              {seRepite(evento)
                ? "Este evento se repite. ¿Qué querés eliminar?"
                : "¿Seguro que querés eliminar este evento?"}
            </Text>
            {seRepite(evento) ? (
              <>
                <Boton
                  icono="remove-circle-outline"
                  texto={`Solo el ${aTextoFecha(dia)}`}
                  peligro
                  alTocar={borrarEsteDia}
                />
                <Boton
                  icono="trash-outline"
                  texto="Todas las fechas"
                  peligro
                  alTocar={borrarTodo}
                />
              </>
            ) : (
              <Boton icono="trash-outline" texto="Sí, eliminar" peligro alTocar={borrarTodo} />
            )}
            <Boton icono="arrow-back" texto="Cancelar" alTocar={() => setConfirmando(false)} />
          </View>
        ) : (
          <>
            <Boton
              icono="create-outline"
              texto="Editar evento"
              principal
              alTocar={() => router.push(`/evento/editar/${evento.id}`)}
            />
            <Boton
              icono="trash-outline"
              texto="Eliminar"
              peligro
              alTocar={() => setConfirmando(true)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTES AUXILIARES (privados)
// ---------------------------------------------------------------------------

type PropsDato = {
  icono: keyof typeof Ionicons.glyphMap;
  rotulo: string; // la etiqueta chica ("Fecha")
  valor: string; // el dato ("jueves 2 de octubre")
};

// Una fila "ícono + rótulo + valor".
function Dato({ icono, rotulo, valor }: PropsDato) {
  return (
    <View style={estilos.dato}>
      <Ionicons name={icono} size={18} color={colores.textoTenue} />
      <View style={estilos.textoDato}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor}>{valor}</Text>
      </View>
    </View>
  );
}

// Un botón de ancho completo: azul (principal), con texto rojizo (peligro) o común.
function Boton({
  icono,
  texto,
  principal = false,
  peligro = false,
  alTocar,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  principal?: boolean;
  peligro?: boolean;
  alTocar: () => void;
}) {
  const color = principal ? colores.blanco : peligro ? colores.alerta : colores.azulClaro;
  return (
    <Pressable
      onPress={alTocar}
      style={({ pressed }) => [
        estilos.boton,
        principal && estilos.botonPrincipal,
        pressed && estilos.presionado,
      ]}
    >
      <Ionicons name={icono} size={18} color={color} />
      <Text style={[estilos.textoBoton, { color }]}>{texto}</Text>
    </Pressable>
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

  // Cuadrado redondeado de 52 con el ícono centrado.
  insignia: {
    width: 52,
    height: 52,
    borderRadius: radios.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  titulo: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colores.texto,
  },

  // Margen negativo para acercarlo al título (compensa el `gap`).
  tipo: {
    marginTop: -espaciado.sm,
    fontSize: 13,
    fontWeight: "600",
  },

  tarjeta: {
    gap: espaciado.md,
  },

  // Línea horizontal fina entre datos.
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colores.bordeSuave,
  },

  dato: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
  },

  textoDato: {
    flex: 1,
  },

  rotulo: {
    fontSize: 11,
    color: colores.textoTenue,
  },

  valor: {
    marginTop: 2,
    fontSize: 15,
    color: colores.textoSuave,
  },

  tituloSeccion: {
    marginTop: espaciado.sm,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colores.texto,
  },

  notas: {
    fontSize: 14,
    lineHeight: 21,
    color: colores.textoSecundario,
  },

  error: {
    fontSize: 13,
    color: colores.alerta,
  },

  // Botón de ancho completo con borde; el principal además va relleno de azul.
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    paddingVertical: espaciado.md + 2,
  },

  botonPrincipal: {
    marginTop: espaciado.sm,
    borderColor: colores.primario,
    backgroundColor: colores.primario,
  },

  textoBoton: {
    fontSize: 15,
    fontWeight: "600",
  },

  // La confirmación de "Eliminar": la pregunta y los botones, en un recuadro rojizo.
  confirmacion: {
    gap: espaciado.sm,
    marginTop: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.alerta,
    padding: espaciado.md,
  },

  textoConfirmacion: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.alerta,
  },

  presionado: {
    opacity: 0.7,
  },

  // Pantalla centrada para el caso "el evento no existe".
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
});

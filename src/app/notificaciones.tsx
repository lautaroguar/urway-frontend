/**
 * ============================================================================
 * app/notificaciones.tsx — Las notificaciones
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla que se abre con la campana del header. Tiene tres grupos:
 *     1. "Próximos días": RECORDATORIOS de los parciales, entregas y juntadas de
 *        estudio de hoy a 3 días. No se guardan: se calculan con la agenda.
 *     2. "Nuevas": las que llegaron sin leer (con un puntito azul).
 *     3. "Anteriores": las ya leídas.
 *
 * QUÉ SE PUEDE HACER:
 *   - Tocar una notificación lleva a lo que avisa: el perfil de quien subió un
 *     apunte (filtrado por esa materia), el de quien mandó una solicitud, o el
 *     evento de un recordatorio.
 *   - Las solicitudes de amistad y las invitaciones a estudiar se responden ahí
 *     mismo, con "Aceptar" o "Rechazar". Esas filas además se DESLIZAN: hacia la
 *     derecha descubren «Aceptar» y hacia la izquierda «Rechazar» (se toca el
 *     panel para confirmar). Hace lo mismo que los botones, que siguen ahí.
 *   - Al abrir la pantalla todas quedan marcadas como leídas (el globito de la
 *     campana desaparece), pero las que eran nuevas se siguen mostrando en
 *     "Nuevas" hasta salir, para que se vea qué llegó.
 *
 * TEORÍA:
 *   [JS 26] `useEffect` con `[]`: marcar como leídas UNA vez, al abrir.
 *   [JS 20] `useState` con valor inicial calculado: qué era nuevo al abrir.
 *   [JS 8]  `filter`, `sort` y `map`; [JS 25] los grupos se derivan de la lista.
 *   [JS 22] Renderizado condicional y listas con `key`.
 *   [NAV]   `router.push` con parámetros según la notificación.
 *   [COMP]  Componente auxiliar (`FilaNotificacion`).
 *   [EST]   Colores por tipo de evento (`tema/eventos.ts`), compartidos con la agenda.
 *   [GESTOS 24] Deslizar para revelar acciones: `FilaDeslizable` (envuelve a
 *           `ReanimatedSwipeable`) en las filas que esperan respuesta.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl, // la ruedita de "tirar para actualizar"
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FilaDeslizable } from "@/componentes/FilaDeslizable";
import type { Notificacion } from "@/datos/notificaciones";
import { useDatos } from "@/estado/datos";
import { useTirarParaActualizar } from "@/estado/actualizar";
import { colores, espaciado, radios } from "@/tema/colores";
import { estilosPorTipo } from "@/tema/eventos";
import {
  claveFecha,
  desdeClave,
  etiquetaRelativa,
  haceCuanto,
  sumarDias,
} from "@/utilidades/fechas";
import { cortesDeClases, ocurrenciasEntre, type Ocurrencia } from "@/utilidades/repeticion";

// El ícono de cada tipo de notificación (las de calendario usan el de su evento).
const ICONOS: Record<Exclude<Notificacion["tipo"], "calendario">, keyof typeof Ionicons.glyphMap> = {
  apunte: "document-text",
  amistad: "person-add",
  estudio: "people",
};

/** Las notificaciones y los recordatorios de los próximos días. */
export default function PantallaNotificaciones() {
  const router = useRouter();
  const {
    notificaciones,
    marcarLeidas,
    eventos,
    materias,
    responderSolicitud,
    responderInvitacion,
  } = useDatos();
  const { actualizando, actualizar } = useTirarParaActualizar();

  // Qué notificaciones eran NUEVAS al abrir la pantalla. El valor inicial se
  // calcula con una función UNA sola vez: aunque después se marquen como leídas,
  // esta lista no cambia y siguen apareciendo en "Nuevas" hasta salir.
  const [nuevasAlAbrir] = useState(
    () => new Set(notificaciones.filter((aviso) => !aviso.leida).map((aviso) => aviso.id))
  );

  // [JS 26] Al abrir, se marcan todas como leídas (una sola vez: `[]`).
  useEffect(() => {
    marcarLeidas().catch(() => {}); // si falla, se reintenta la próxima vez
  }, []);

  // Los recordatorios: parciales, entregas y juntadas de hoy a 3 días, en orden.
  const hoy = claveFecha(new Date());
  const recordatorios = ocurrenciasEntre(
    eventos,
    hoy,
    claveFecha(sumarDias(new Date(), 3)),
    cortesDeClases(materias)
  )
    .filter((evento) => evento.tipo !== "clase")
    .sort((a, b) => `${a.fecha}${a.desde}`.localeCompare(`${b.fecha}${b.desde}`));

  // Las notificaciones de la más nueva a la más vieja (copia antes de ordenar),
  // separadas según si eran nuevas al abrir.
  const ordenadas = [...notificaciones].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  const nuevas = ordenadas.filter((aviso) => nuevasAlAbrir.has(aviso.id));
  const anteriores = ordenadas.filter((aviso) => !nuevasAlAbrir.has(aviso.id));

  // Adónde lleva tocar una notificación (si lleva a algún lado).
  const abrir = (aviso: Notificacion) => {
    if (aviso.estudianteId) {
      router.push({
        pathname: "/estudiante/[id]",
        // Si es de un apunte, el perfil abre filtrado por esa materia.
        params:
          aviso.tipo === "apunte" && aviso.materiaId
            ? { id: aviso.estudianteId, materiaId: aviso.materiaId }
            : { id: aviso.estudianteId },
      });
    }
  };

  // Responder una solicitud o una invitación desde la lista.
  const responder = (aviso: Notificacion, acepta: boolean) => {
    if (!aviso.pendiente) return;
    const accion =
      aviso.pendiente.clase === "solicitud"
        ? responderSolicitud(aviso.pendiente.id, acepta)
        : responderInvitacion(aviso.pendiente.id, acepta);
    accion.catch(() => {}); // si falla, los botones siguen ahí para reintentar
  };

  const sinNada =
    recordatorios.length === 0 && nuevas.length === 0 && anteriores.length === 0;

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        // Deslizar hacia abajo vuelve a pedir todo al servidor.
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            tintColor={colores.azulClaro}
          />
        }
      >
        {sinNada ? (
          <View style={estilos.vacio}>
            <Ionicons name="notifications-off-outline" size={30} color={colores.textoDebil} />
            <Text style={estilos.textoVacio}>No tenés notificaciones.</Text>
          </View>
        ) : null}

        {/* ---------- 1. Recordatorios (calculados con la agenda) ---------- */}
        {recordatorios.length > 0 ? (
          <>
            <Text style={estilos.tituloSeccion}>Próximos días</Text>
            <View style={estilos.grupo}>
              {recordatorios.map((evento, indice) => (
                <FilaRecordatorio
                  key={evento.idOcurrencia}
                  evento={evento}
                  primera={indice === 0}
                  alTocar={() =>
                    router.push({
                      pathname: "/evento/[id]",
                      params: { id: evento.id, fecha: evento.fecha },
                    })
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ---------- 2. Nuevas ---------- */}
        {nuevas.length > 0 ? (
          <>
            <Text style={estilos.tituloSeccion}>Nuevas</Text>
            <View style={estilos.grupo}>
              {nuevas.map((aviso, indice) => (
                <FilaNotificacion
                  key={aviso.id}
                  aviso={aviso}
                  nueva
                  primera={indice === 0}
                  alTocar={() => abrir(aviso)}
                  alResponder={(acepta) => responder(aviso, acepta)}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ---------- 3. Anteriores ---------- */}
        {anteriores.length > 0 ? (
          <>
            <Text style={estilos.tituloSeccion}>Anteriores</Text>
            <View style={estilos.grupo}>
              {anteriores.map((aviso, indice) => (
                <FilaNotificacion
                  key={aviso.id}
                  aviso={aviso}
                  nueva={false}
                  primera={indice === 0}
                  alTocar={() => abrir(aviso)}
                  alResponder={(acepta) => responder(aviso, acepta)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTES AUXILIARES (privados de este archivo)
// ---------------------------------------------------------------------------

// Un recordatorio de la agenda: "Mañana · 14:00 · Parcial de Álgebra".
function FilaRecordatorio({
  evento,
  primera,
  alTocar,
}: {
  evento: Ocurrencia;
  primera: boolean;
  alTocar: () => void;
}) {
  const estilo = estilosPorTipo[evento.tipo];
  return (
    <Pressable
      onPress={alTocar}
      style={({ pressed }) => [estilos.fila, !primera && estilos.separador, pressed && estilos.presionado]}
    >
      <View style={[estilos.icono, { backgroundColor: estilo.fondo }]}>
        <Ionicons name={estilo.icono} size={18} color={estilo.acento} />
      </View>
      <View style={estilos.cuerpo}>
        <Text style={[estilos.titulo, estilos.tituloNuevo]}>{evento.titulo}</Text>
        <Text style={estilos.detalle}>
          {/* "Mañana · 14:00 a 16:00 · Aula 302" */}
          {etiquetaRelativa(desdeClave(evento.fecha))} · {evento.desde} a {evento.hasta}
          {evento.lugar ? ` · ${evento.lugar}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colores.textoDebil} />
    </Pressable>
  );
}

// Una notificación. Si trae algo pendiente (solicitud o invitación), muestra
// "Aceptar" y "Rechazar"; si ya se respondió, cómo.
function FilaNotificacion({
  aviso,
  nueva,
  primera,
  alTocar,
  alResponder,
}: {
  aviso: Notificacion;
  nueva: boolean;
  primera: boolean;
  alTocar: () => void;
  alResponder: (acepta: boolean) => void;
}) {
  // Las de calendario usan el color y el ícono de su tipo de evento.
  const estiloEvento =
    aviso.tipo === "calendario" && aviso.tipoEvento ? estilosPorTipo[aviso.tipoEvento] : null;
  const icono = estiloEvento
    ? estiloEvento.icono
    : aviso.tipo === "calendario"
      ? "calendar"
      : ICONOS[aviso.tipo];

  // La fila en sí. Se guarda en una variable porque, según haya o no algo pendiente,
  // se devuelve tal cual o envuelta en una `FilaDeslizable`.
  const fila = (
    <Pressable
      onPress={alTocar}
      // Solo responde al toque si lleva a algún lado (un perfil).
      disabled={!aviso.estudianteId}
      style={({ pressed }) => [estilos.fila, !primera && estilos.separador, pressed && estilos.presionado]}
    >
      {/* Círculo con el ícono. Si es de calendario, el fondo toma el color del evento. */}
      <View style={[estilos.icono, estiloEvento && { backgroundColor: estiloEvento.fondo }]}>
        <Ionicons
          name={icono}
          size={18}
          color={estiloEvento ? estiloEvento.acento : colores.azulClaro}
        />
      </View>
      <View style={estilos.cuerpo}>
        <Text style={[estilos.titulo, nueva && estilos.tituloNuevo]}>{aviso.titulo}</Text>
        <Text style={estilos.detalle}>{aviso.detalle}</Text>
        <Text style={estilos.cuando}>{haceCuanto(aviso.creadaEn)}</Text>

        {/* Pendiente de respuesta: los dos botones. */}
        {aviso.pendiente ? (
          <View style={estilos.botones}>
            <Pressable
              onPress={() => alResponder(true)}
              style={({ pressed }) => [estilos.botonAceptar, pressed && estilos.presionado]}
            >
              <Text style={estilos.textoAceptar}>Aceptar</Text>
            </Pressable>
            <Pressable
              onPress={() => alResponder(false)}
              style={({ pressed }) => [estilos.botonRechazar, pressed && estilos.presionado]}
            >
              <Text style={estilos.textoRechazar}>Rechazar</Text>
            </Pressable>
          </View>
        ) : aviso.respuesta ? (
          <Text style={estilos.respuesta}>
            {aviso.respuesta === "aceptada" ? "Aceptaste" : "Rechazaste"}
            {aviso.respuesta === "aceptada" && aviso.tipo === "estudio"
              ? ": ya está en tu agenda."
              : "."}
          </Text>
        ) : null}
      </View>
      {/* El puntito azul: solo en las que eran nuevas. */}
      {nueva ? <View style={estilos.punto} /> : null}
    </Pressable>
  );

  // Sin nada pendiente no hay a qué responder: la fila queda quieta.
  if (!aviso.pendiente) return fila;

  // Esperando respuesta: se desliza. A la derecha (como "me gusta") acepta; a la
  // izquierda rechaza. Hacen lo mismo que los botones de la fila, que siguen ahí.
  return (
    <FilaDeslizable
      accionDerecha={{
        texto: "Aceptar",
        icono: "checkmark",
        fondo: colores.primario,
        color: colores.blanco,
        alActivar: () => alResponder(true),
      }}
      accionIzquierda={{
        texto: "Rechazar",
        icono: "close",
        // El mismo rojo oscuro que el parcial en la agenda (`tema/eventos.ts`).
        fondo: "#2A1416",
        color: colores.alerta,
        alActivar: () => alResponder(false),
      }}
    >
      {fila}
    </FilaDeslizable>
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
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.md,
  },

  tituloSeccion: {
    marginTop: espaciado.sm,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colores.texto,
  },

  // Tarjeta redondeada que agrupa las filas (estilo lista de Ajustes de iOS).
  grupo: {
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    overflow: "hidden",
  },

  // Fila: ícono + textos + punto, alineados ARRIBA (`flex-start`) porque el
  // texto puede ocupar varias líneas.
  fila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.md,
    padding: espaciado.md,
  },

  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  // Círculo del ícono: 38 de lado y radio 19 (la mitad) = círculo perfecto.
  icono: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colores.primarioProfundo,
  },

  cuerpo: {
    flex: 1,
    gap: 2,
  },

  titulo: {
    fontSize: 14,
    fontWeight: "500",
    color: colores.textoSecundario,
  },

  // Se suma al `titulo` en las nuevas: pisa peso y color.
  tituloNuevo: {
    fontWeight: "700",
    color: colores.texto,
  },

  detalle: {
    fontSize: 12,
    color: colores.textoTenue,
  },

  cuando: {
    marginTop: 2,
    fontSize: 11,
    color: colores.textoDebil,
  },

  // "Aceptar" y "Rechazar", en fila.
  botones: {
    flexDirection: "row",
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },

  botonAceptar: {
    borderRadius: radios.pastilla,
    backgroundColor: colores.primario,
    paddingVertical: 6,
    paddingHorizontal: espaciado.lg,
  },

  textoAceptar: {
    fontSize: 13,
    fontWeight: "700",
    color: colores.blanco,
  },

  botonRechazar: {
    borderRadius: radios.pastilla,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingVertical: 6,
    paddingHorizontal: espaciado.lg,
  },

  textoRechazar: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  respuesta: {
    marginTop: espaciado.xs,
    fontSize: 12,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // Puntito de "sin leer": 9 de lado con radio 5 = círculo.
  punto: {
    width: 9,
    height: 9,
    marginTop: 6,
    borderRadius: 5,
    backgroundColor: colores.primario,
  },

  presionado: {
    opacity: 0.7,
  },

  vacio: {
    alignItems: "center",
    gap: espaciado.md,
    paddingVertical: espaciado.xxl,
  },

  textoVacio: {
    fontSize: 13,
    color: colores.textoDebil,
  },
});

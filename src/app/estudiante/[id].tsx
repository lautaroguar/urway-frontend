/**
 * ============================================================================
 * app/estudiante/[id].tsx — Perfil de otro estudiante
 * ============================================================================
 *
 * QUÉ ES:
 *   El perfil de un compañero, con la misma forma que el propio:
 *     1. Cabecera con contadores (Amigos / Materias / En común).
 *     2. La relación y el botón de amistad (Agregar, Enviada, Aceptar, Amigos).
 *     3. "Invitar a estudiar" (si es amigo y compartimos alguna materia).
 *     4. Las materias que cursa (con "En común" en las que también curso yo).
 *     5. Sus NOTAS (promedio y finales aprobados) y sus APUNTES, que se pueden
 *        FILTRAR POR MATERIA. Cada sección se ve solo si su privacidad lo
 *        permite: cada estudiante elige si las ve "todos" o "solo sus amigos".
 *        Si no se puede, aparece un candado que lo explica.
 *
 * DESDE DÓNDE SE ABRE:
 *   Desde Conectar, desde la lista de amigos del perfil propio y desde una
 *   notificación ("Mariana subió un apunte"). Esta última lleva además la
 *   materia del apunte (`?materiaId=MAT-201`) y el filtro arranca en esa materia.
 *
 * DE DÓNDE SALEN SUS APUNTES Y SUS NOTAS:
 *   De `cargarPerfil(id)` del Context (`GET /api/estudiantes/:id`). La privacidad
 *   la aplica el SERVIDOR: lo que no se puede ver viene vacío. Se pide en un `useEffect` al abrir la pantalla y otra
 *   vez si cambia la relación (al hacerse amigos, se puede ver más).
 *
 * TEORÍA:
 *   [NAV]   `useLocalSearchParams` para el id y la materia; `router.push` con params.
 *   [JS 26] `useEffect` para pedir datos (sincronizar con algo externo), con
 *           limpieza: si se sale de la pantalla antes de que llegue la respuesta,
 *           no se guarda.
 *   [JS 25] `enComun`, `relacion`, los filtros y los apuntes visibles son DERIVADOS.
 *   [JS 22] Renderizado condicional (retorno temprano, ternarios, `null`).
 *   [COMP]  Reutilización de `CabeceraPerfil`, `BotonAmistad`, `ChipsFiltro` y
 *           `TarjetaApunte`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BotonAmistad } from "@/componentes/BotonAmistad";
import { CabeceraPerfil } from "@/componentes/CabeceraPerfil";
import { ChipsFiltro } from "@/componentes/ChipsFiltro";
import { TarjetaApunte } from "@/componentes/TarjetaApunte";
import type { PerfilEstudiante } from "@/datos/comunidad";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { abrirApunte } from "@/utilidades/apuntes";
import { codigosEnCurso, etiquetaPeriodo } from "@/utilidades/materias";

/** Perfil de otro estudiante: qué cursa, sus notas y sus apuntes (según su privacidad). */
export default function PantallaEstudiante() {
  // El id de la ruta ("/estudiante/est-2" → "est-2") y, si vino, una materia.
  const { id, materiaId } = useLocalSearchParams<{ id: string; materiaId?: string }>();
  const router = useRouter();
  const { estudiantes, materias, cargarPerfil, responderSolicitud } = useDatos();

  // El perfil completo (notas y apuntes) llega con `cargarPerfil`: mientras tanto, `null`.
  const [perfil, setPerfil] = useState<PerfilEstudiante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El filtro de apuntes: "todas" o un código de materia. Arranca en la que vino.
  const [filtro, setFiltro] = useState(materiaId ?? "todas");

  // Se busca al estudiante en la lista del Context: de ahí sale la relación ACTUAL.
  const persona = estudiantes.find((candidato) => candidato.id === id);

  // [JS 26] Pedir el perfil es sincronizar con algo externo (el servidor): va en
  // un efecto. Se repite si cambia la relación (al hacerse amigos se ve más).
  useEffect(() => {
    // Si el usuario se va antes de que llegue la respuesta, no se guarda (`activo`).
    let activo = true;
    setCargando(true);
    setError(null);
    cargarPerfil(id)
      .then((resultado) => {
        if (activo) setPerfil(resultado);
      })
      .catch(() => {
        if (activo) setError("No se pudo cargar el perfil. Probá de nuevo.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    // La función que devuelve el efecto es la LIMPIEZA: corre al salir.
    return () => {
      activo = false;
    };
    // Solo se vuelve a pedir si cambia el estudiante o la relación con él.
  }, [id, persona?.relacion]);

  // Retorno temprano si el id no corresponde a nadie. Los hooks ya se llamaron.
  if (!persona) {
    return (
      <View style={[estilos.pantalla, estilos.vacio]}>
        <Ionicons name="person-outline" size={32} color={colores.textoDebil} />
        <Text style={estilos.textoVacio}>No encontramos a este estudiante.</Text>
      </View>
    );
  }

  // Materias que cursa esa persona Y que también curso yo (la intersección).
  const misMaterias = codigosEnCurso(materias);
  const enComun = persona.materias.filter((materia) => misMaterias.includes(materia));
  // El nombre de una materia a partir de su código (o el código, si no está).
  const nombreDe = (codigo: string) =>
    materias.find((m) => m.id === codigo)?.nombre ?? codigo;
  // Su primer nombre, para los textos ("Mariana comparte...").
  const primerNombre = persona.nombre.split(" ")[0];

  // Texto que describe la relación (o `null` si no hay ninguna).
  const relacion =
    persona.relacion === "amigos"
      ? "Son amigos"
      : persona.relacion === "enviada"
        ? "Le mandaste una solicitud"
        : persona.relacion === "recibida"
          ? "Te mandó una solicitud de amistad"
          : null;

  // Los filtros de apuntes: "Todas" y una opción por materia de la que subió algo.
  const listaApuntes = perfil?.apuntes.lista ?? [];
  const opcionesFiltro = [
    { clave: "todas", etiqueta: "Todas" },
    ...[...new Set(listaApuntes.map((apunte) => apunte.materiaId))].map((codigo) => ({
      clave: codigo,
      etiqueta: codigo,
    })),
  ];
  // Si el filtro elegido no está entre las opciones (por ejemplo, no subió de esa
  // materia), se usa "todas".
  const filtroEfectivo = opcionesFiltro.some((opcion) => opcion.clave === filtro)
    ? filtro
    : "todas";
  const apuntesVisibles = listaApuntes.filter(
    (apunte) => filtroEfectivo === "todas" || apunte.materiaId === filtroEfectivo
  );

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* La misma cabecera que el perfil propio, con contadores distintos. */}
        <CabeceraPerfil
          nombre={persona.nombre}
          foto={persona.foto}
          cuatrimestre={persona.cuatrimestre}
          contadores={[
            { valor: persona.amigos, rotulo: "Amigos" },
            { valor: persona.materias.length, rotulo: "Materias" },
            { valor: enComun.length, rotulo: "En común" },
          ]}
        />

        {/* Texto de relación (si hay) y botón de amistad en su versión grande. */}
        <View style={estilos.acciones}>
          {relacion ? <Text style={estilos.relacion}>{relacion}</Text> : null}
          <BotonAmistad estudiante={persona} tamanio="grande" />
          {/* Una solicitud recibida también se puede rechazar. */}
          {persona.relacion === "recibida" ? (
            <Pressable onPress={() => responderSolicitud(persona.id, false)} hitSlop={8}>
              <Text style={estilos.rechazar}>Rechazar solicitud</Text>
            </Pressable>
          ) : null}
        </View>

        {/* "Estudiar juntos": abre el formulario de evento como juntada de estudio,
            con este amigo invitado y la primera materia que compartimos. */}
        {persona.relacion === "amigos" && enComun.length > 0 ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/evento/nuevo",
                params: { tipo: "estudio", amigoId: persona.id, materiaId: enComun[0] },
              })
            }
            style={({ pressed }) => [estilos.botonEstudiar, pressed && estilos.presionado]}
          >
            <Ionicons name="people" size={18} color={colores.fondo} />
            <Text style={estilos.textoEstudiar}>Invitar a estudiar</Text>
          </Pressable>
        ) : null}

        {/* ---------- Materias que está cursando ---------- */}
        <Text style={estilos.tituloSeccion}>Materias que está cursando</Text>
        <View style={estilos.grupo}>
          {persona.materias.map((codigo, indice) => {
            const materia = materias.find((m) => m.id === codigo);
            const comun = enComun.includes(codigo);
            return (
              <View key={codigo} style={[estilos.fila, indice > 0 && estilos.separador]}>
                <View style={estilos.textoFila}>
                  <Text style={estilos.tituloFila}>{nombreDe(codigo)}</Text>
                  <Text style={estilos.subtituloFila}>
                    {codigo}
                    {materia ? ` · ${etiquetaPeriodo(materia)}` : ""}
                  </Text>
                </View>
                {comun ? (
                  <View style={estilos.insignia}>
                    <Ionicons name="link" size={12} color={colores.azulClaro} />
                    <Text style={estilos.textoInsignia}>En común</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ---------- Notas y apuntes (según su privacidad) ---------- */}
        {cargando ? (
          <ActivityIndicator color={colores.azulClaro} style={estilos.cargando} />
        ) : error || !perfil ? (
          <Text style={estilos.textoError}>{error ?? "No se pudo cargar el perfil."}</Text>
        ) : (
          <>
            <Text style={estilos.tituloSeccion}>Notas</Text>
            {perfil.notas.visible ? (
              <View style={estilos.grupo}>
                {/* El promedio arriba y, debajo, cada final aprobado con su nota. */}
                <View style={[estilos.fila, estilos.filaPromedio]}>
                  <Text style={estilos.tituloFila}>Promedio</Text>
                  <Text style={estilos.promedio}>
                    {perfil.notas.promedio === null ? "—" : perfil.notas.promedio.toFixed(1)}
                  </Text>
                </View>
                {perfil.notas.aprobadas.map((aprobada) => (
                  <View key={aprobada.materiaId} style={[estilos.fila, estilos.separador]}>
                    <View style={estilos.textoFila}>
                      <Text style={estilos.tituloFila}>{nombreDe(aprobada.materiaId)}</Text>
                      <Text style={estilos.subtituloFila}>{aprobada.materiaId} · Final aprobado</Text>
                    </View>
                    <Text style={estilos.nota}>{aprobada.nota}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Candado>
                {primerNombre} comparte sus notas solo con sus amigos.
              </Candado>
            )}

            <Text style={estilos.tituloSeccion}>Apuntes</Text>
            {perfil.apuntes.visible ? (
              listaApuntes.length === 0 ? (
                <Text style={estilos.textoTenue}>Todavía no subió apuntes.</Text>
              ) : (
                <>
                  {/* El filtro por materia [JS 23]: el chip elegido sale del estado. */}
                  <ChipsFiltro
                    opciones={opcionesFiltro}
                    valor={filtroEfectivo}
                    alCambiar={setFiltro}
                  />
                  <View style={estilos.grilla}>
                    {/* Tocar un apunte abre su vista previa (foto o PDF). */}
                    {apuntesVisibles.map((apunte) => (
                      <TarjetaApunte
                        key={apunte.id}
                        apunte={apunte}
                        alAbrir={() => abrirApunte(router, apunte)}
                      />
                    ))}
                  </View>
                </>
              )
            ) : (
              <Candado>
                {primerNombre} subió {perfil.apuntes.cantidad}{" "}
                {perfil.apuntes.cantidad === 1 ? "apunte" : "apuntes"}, pero los comparte
                solo con sus amigos.
                {persona.relacion === "ninguna" ? " Mandale una solicitud para verlos." : ""}
              </Candado>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): el aviso con candado de lo que no se puede ver
// ---------------------------------------------------------------------------

function Candado({ children }: { children: ReactNode }) {
  return (
    <View style={estilos.candado}>
      <Ionicons name="lock-closed-outline" size={18} color={colores.textoTenue} />
      <Text style={estilos.textoCandado}>{children}</Text>
    </View>
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

  // Texto de relación y botón, centrados en columna.
  acciones: {
    alignItems: "center",
    gap: espaciado.sm,
    paddingVertical: espaciado.sm,
  },

  relacion: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  rechazar: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.alerta,
  },

  // "Invitar a estudiar": verde, como los eventos de estudio de la agenda.
  botonEstudiar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: "#4ADE80",
    paddingVertical: espaciado.md,
  },

  textoEstudiar: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.fondo,
  },

  tituloSeccion: {
    marginTop: espaciado.md,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colores.texto,
  },

  // Tarjeta redondeada que agrupa las filas (estilo Ajustes de iOS).
  grupo: {
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    overflow: "hidden",
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
  },

  // La fila del promedio: el texto a la izquierda y el número a la derecha.
  filaPromedio: {
    justifyContent: "space-between",
    backgroundColor: colores.primarioProfundo,
  },

  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  textoFila: {
    flex: 1,
  },

  tituloFila: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.texto,
  },

  subtituloFila: {
    marginTop: 2,
    fontSize: 12,
    color: colores.textoTenue,
  },

  promedio: {
    fontSize: 22,
    fontWeight: "700",
    color: colores.texto,
  },

  nota: {
    fontSize: 17,
    fontWeight: "700",
    color: colores.azulClaro,
  },

  insignia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.xs,
    borderRadius: radios.pastilla,
    backgroundColor: colores.primarioProfundo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 3,
  },

  textoInsignia: {
    fontSize: 11,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // Dos columnas de apuntes (cada `TarjetaApunte` mide el 48,5 %).
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: espaciado.md,
  },

  // El aviso con candado: ícono y texto en fila, con borde punteado.
  candado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colores.borde,
    padding: espaciado.md,
  },

  textoCandado: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoTenue,
  },

  textoTenue: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  textoError: {
    fontSize: 13,
    color: colores.alerta,
  },

  cargando: {
    marginTop: espaciado.lg,
  },

  presionado: {
    opacity: 0.7,
  },

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

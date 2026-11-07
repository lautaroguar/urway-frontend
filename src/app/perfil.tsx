/**
 * ============================================================================
 * app/perfil.tsx — Mi perfil
 * ============================================================================
 *
 * QUÉ ES:
 *   El perfil de quien inició sesión (sus datos vienen del backend). Se abre
 *   tocando el avatar del header de cualquiera de las pestañas.
 *
 * QUÉ MUESTRA:
 *   1. La cabecera (`CabeceraPerfil`) con la foto de perfil (o las iniciales), el
 *      nombre, la carrera y los contadores Amigos / Materias / Apuntes. Debajo, el
 *      botón «Editar perfil» (`app/editar-perfil.tsx`: datos y foto).
 *   2. "Mis datos": los datos de la cuenta (correo, DNI, fecha de nacimiento,
 *      facultad y carrera). Cada fila aparece solo si ese dato existe (el DNI y
 *      la fecha de nacimiento son opcionales).
 *   3. "Privacidad": quién ve mis APUNTES y quién ve mis NOTAS (por separado):
 *      todos los estudiantes o solo mis amigos. Se guarda en la cuenta.
 *   4. La lista de amigos (cada uno abre su perfil). Se muestran los primeros
 *      (`CANTIDAD_VISIBLE`) y, si hay más, «Ver todos» abre la lista completa
 *      (`app/personas.tsx`).
 *   5. Las materias que estoy cursando (cada una abre el detalle de la materia,
 *      donde se cambia su estado). Son las del Context de datos, así que cambian
 *      si se pasa una a "pendiente de final". Arrancan igual para todos los
 *      usuarios: el registro no pregunta por la historia académica.
 *   6. El botón "Cerrar sesión", que además borra la sesión guardada en el
 *      teléfono.
 *
 * DÓNDE VIVE:
 *   En el Stack raíz (no dentro de las pestañas): por eso ocupa toda la
 *   pantalla y tiene botón de volver.
 *
 * TEORÍA:
 *   [NAV]   `router.push` (apila y permite volver), `router.dismissAll` y
 *           `router.replace`; navegación con parámetros (`/estudiante/${id}`).
 *   [JS 8]  `filter` para quedarse con las materias en curso y con los amigos.
 *   [JS 25] ESTADO DERIVADO: `enCurso` y `amigos` se CALCULAN en cada render a
 *           partir de los datos; no se guardan en un `useState`.
 *   [JS 22] Renderizado condicional (`cond ? A : B`) y listas con `map` + `key`.
 *   [COMP]  Reutilización: `CabeceraPerfil` y `Avatar`.
 *   [CTX]   `useSesion()` da el usuario, `cambiarPrivacidad` y `cerrarSesion`.
 *   [JS 23] La privacidad son dos `ChipsFiltro` controlados por el valor de la cuenta.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/componentes/Avatar";
import { CabeceraPerfil } from "@/componentes/CabeceraPerfil";
import { ChipsFiltro } from "@/componentes/ChipsFiltro";
// Las opciones del registro (`facultades`, `carreras`) y `etiquetaDe`, que pasa
// una clave guardada ("uca") al texto que se lee ("UCA").
import { carreras, etiquetaDe, facultades } from "@/datos/registro";
// Los dos Context: `useDatos` (materias y apuntes) y `useSesion` (la cuenta).
import { useDatos } from "@/estado/datos";
import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";
// Las dos opciones de privacidad ("Todos los estudiantes" / "Solo mis amigos").
import { OPCIONES_VISIBILIDAD } from "@/utilidades/comunidad";
// `codigosEnCurso(materias)`: los códigos de las materias que se están cursando.
import { codigosEnCurso } from "@/utilidades/materias";
import { cruzarMaterias } from "@/utilidades/recomendaciones";
// `nombreCompleto(usuario)`: "María José Pérez" (con un valor por defecto si no hay).
import { nombreCompleto } from "@/utilidades/usuario";

// Cuántos amigos se muestran antes del botón «Ver todos» (el resto, en `app/personas.tsx`).
const CANTIDAD_VISIBLE = 3;

/**
 * Perfil del estudiante. Se abre desde el avatar del header de cualquier
 * pestaña y vive en el Stack raíz, a pantalla completa.
 */
export default function PantallaPerfil() {
  const router = useRouter();
  // Los apuntes (para el contador) y las materias ACTUALES (con su estado).
  // (Desestructuración: se sacan del objeto solo los campos que se nombran.)
  const { apuntes, materias, estudiantes } = useDatos();
  // Quién inició sesión (`usuario`) y las funciones para cambiar la privacidad y
  // cerrar la sesión.
  const { usuario, cerrarSesion, cambiarPrivacidad } = useSesion();

  // "MIS DATOS": las filas se arman a partir del usuario (estado derivado).
  // `etiquetaDe` pasa la clave guardada ("uca") a lo que se lee ("UCA"). El
  // `filter` saca las filas cuyo dato no existe (`valor` es `undefined`); el
  // `dato is ...` le avisa a TypeScript que después del filtro `valor` ya es
  // texto.
  // `usuario ? [ ... ] : []`: si no hay usuario (no debería pasar en esta
  // pantalla), la lista queda vacía en lugar de fallar al leer sus campos.
  const datosDelUsuario = usuario
    ? [
        { rotulo: "Correo", valor: usuario.email },
        { rotulo: "DNI", valor: usuario.dni },
        { rotulo: "Nacimiento", valor: usuario.fechaNacimiento },
        { rotulo: "Facultad", valor: etiquetaDe(facultades, usuario.facultad) },
        { rotulo: "Carrera", valor: etiquetaDe(carreras, usuario.carrera) },
      ].filter(
        // `dato is {...}` es un "type guard": le asegura a TypeScript que lo que
        // pasó el filtro tiene `valor` de tipo texto (ya no `undefined`).
        (dato): dato is { rotulo: string; valor: string } =>
          dato.valor !== undefined // el DNI y la fecha de nacimiento pueden faltar
      )
    : [];

  // VALORES DERIVADOS (se recalculan en cada render, no se guardan):
  // 1) las materias que estoy cursando;
  const enCurso = materias.filter((materia) => materia.estado === "cursando");
  // 2) mis amigos: se filtran los estudiantes con relación "amigos" y
  //    `cruzarMaterias` agrega a cada uno cuántas materias comparte conmigo (`enComun`).
  const amigos = cruzarMaterias(
    estudiantes.filter((persona) => persona.relacion === "amigos"), // solo los amigos
    codigosEnCurso(materias) // mis materias de AHORA: cambian al cambiar su estado
  );

  /**
   * Primero borra la sesión (también la guardada en el teléfono: así, al
   * reabrir la app, se pide el ingreso). Después vuelve al fondo del Stack raíz
   * (las tabs) y lo reemplaza por el login. Así no queda ninguna pantalla de la
   * app detrás a la que se pueda volver con el gesto de atrás.
   */
  const alCerrarSesion = () => {
    cerrarSesion(); // del Context de la sesión (avisa al servidor y borra el token)
    router.dismissAll(); // cierra todas las pantallas apiladas encima de la base
    router.replace("/login"); // reemplaza esa base (las tabs) por el login
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar grande, nombre y contadores. Los contadores son un array de
            objetos { valor, rotulo } que se calcula acá mismo. */}
        <CabeceraPerfil
          nombre={nombreCompleto(usuario)} // el nombre y el apellido de la cuenta
          foto={usuario?.foto} // mi foto de perfil (si no hay, mis iniciales)
          cuatrimestre={usuario?.cuatrimestre ?? 1}
          // La carrera y la facultad que la persona eligió al registrarse.
          // `undefined` = no se pasa el dato y `CabeceraPerfil` usa el suyo de siempre.
          carreraTexto={usuario ? etiquetaDe(carreras, usuario.carrera) : undefined}
          universidadTexto={usuario ? etiquetaDe(facultades, usuario.facultad) : undefined}
          contadores={[
            { valor: amigos.length, rotulo: "Amigos" },
            { valor: enCurso.length, rotulo: "Materias" },
            { valor: apuntes.length, rotulo: "Apuntes" },
          ]}
        />

        {/* Abre la pantalla para cambiar mis datos y mi foto (pide la contraseña). */}
        <Pressable
          onPress={() => router.push("/editar-perfil")}
          style={({ pressed }) => [estilos.botonEditar, pressed && estilos.presionado]}
        >
          <Ionicons name="create-outline" size={18} color={colores.azulClaro} />
          <Text style={estilos.textoEditar}>Editar perfil</Text>
        </Pressable>

        {/* ---------- Sección: mis datos ---------- */}
        <Text style={estilos.tituloSeccion}>Mis datos</Text>

        <View style={estilos.grupo}>
          {/* Una fila por cada dato que existe; `indice` sirve para poner el separador
              en todas menos la primera. */}
          {datosDelUsuario.map((dato, indice) => (
            // `key` estable: el rótulo ("Correo", "DNI"...).
            <View
              key={dato.rotulo}
              style={[estilos.filaDato, indice > 0 && estilos.separador]}
            >
              {/* A la izquierda el nombre del dato y a la derecha su valor. */}
              <Text style={estilos.rotuloDato}>{dato.rotulo}</Text>
              <Text style={estilos.valorDato}>{dato.valor}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Sección: privacidad ---------- */}
        {/* Cada chip guarda el cambio enseguida (en la cuenta). `usuario` siempre
            existe en esta pantalla; el `?` es solo por el tipo. */}
        <Text style={estilos.tituloSeccion}>Privacidad</Text>
        {usuario ? (
          <View style={[estilos.grupo, estilos.grupoPrivacidad]}>
            <Text style={estilos.preguntaPrivacidad}>¿Quién ve mis apuntes?</Text>
            <ChipsFiltro
              opciones={OPCIONES_VISIBILIDAD}
              valor={usuario.privacidad.apuntes}
              // Spread [JS 7]: la privacidad actual con UN campo cambiado.
              alCambiar={(apuntesVisibles) =>
                cambiarPrivacidad({ ...usuario.privacidad, apuntes: apuntesVisibles })
              }
            />
            <Text style={estilos.preguntaPrivacidad}>¿Quién ve mis notas?</Text>
            <ChipsFiltro
              opciones={OPCIONES_VISIBILIDAD}
              valor={usuario.privacidad.notas}
              alCambiar={(notasVisibles) =>
                cambiarPrivacidad({ ...usuario.privacidad, notas: notasVisibles })
              }
            />
            <Text style={estilos.ayudaPrivacidad}>
              «Solo mis amigos» deja tu perfil en privado: los demás ven un candado.
              Tus amigos siempre reciben un aviso cuando subís un apunte.
            </Text>
          </View>
        ) : null}

        {/* ---------- Sección: Amigos ---------- */}
        <Text style={estilos.tituloSeccion}>Amigos</Text>

        <View style={estilos.grupo}>
          {/* Si no hay amigos se muestra un mensaje; si hay, la lista. */}
          {amigos.length === 0 ? (
            <Text style={estilos.textoVacio}>
              Todavía no agregaste a nadie. Buscá compañeros en Conectar.
            </Text>
          ) : (
            // `slice(0, N)` deja los primeros N; `map` recibe también el índice, que
            // se usa para poner el separador en todas las filas menos la primera.
            amigos.slice(0, CANTIDAD_VISIBLE).map((persona, indice) => (
              <Pressable
                key={persona.id} // key estable: el id de la persona
                // Abre el perfil de esa persona (ruta dinámica estudiante/[id]).
                onPress={() => router.push(`/estudiante/${persona.id}`)}
                style={({ pressed }) => [
                  estilos.fila,
                  indice > 0 && estilos.separador,
                  pressed && estilos.presionado,
                ]}
              >
                <Avatar nombre={persona.nombre} foto={persona.foto} tamanio={38} />
                <View style={estilos.textoFila}>
                  <Text style={estilos.tituloFila}>{persona.nombre}</Text>
                  {/* Segunda línea: "12 amigos · 2 materias en común". Tiene dos
                      ternarios: el plural de "amigo", y qué mostrar después del
                      "·" (las materias en común si las hay, o si no el
                      cuatrimestre). */}
                  <Text style={estilos.subtituloFila}>
                    {persona.amigos} {persona.amigos === 1 ? "amigo" : "amigos"}
                    {" · "}
                    {persona.enComun.length > 0
                      ? `${persona.enComun.length} ${
                          persona.enComun.length === 1 ? "materia" : "materias"
                        } en común`
                      : `${persona.cuatrimestre}º cuatrimestre`}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colores.textoDebil}
                />
              </Pressable>
            ))
          )}
          {/* Con más amigos de los que se muestran, un botón abre la lista completa. */}
          {amigos.length > CANTIDAD_VISIBLE ? (
            <Pressable
              onPress={() => router.push({ pathname: "/personas", params: { tipo: "amigos" } })}
              style={({ pressed }) => [
                estilos.fila,
                estilos.filaVerMas,
                estilos.separador,
                pressed && estilos.presionado,
              ]}
            >
              <Text style={estilos.textoVerMas}>Ver todos mis amigos ({amigos.length})</Text>
              <Ionicons name="chevron-forward" size={18} color={colores.azulClaro} />
            </Pressable>
          ) : null}
        </View>

        {/* ---------- Sección: materias en curso ---------- */}
        <Text style={estilos.tituloSeccion}>Materias que estoy cursando</Text>

        <View style={estilos.grupo}>
          {/* `enCurso` sale del Context: si se pasa una materia a "pendiente de
              final", deja de aparecer acá. */}
          {enCurso.map((materia, indice) => (
            <Pressable
              key={materia.id}
              // Abre el detalle de esa materia (ruta dinámica materia/[id]).
              onPress={() => router.push(`/materia/${materia.id}`)}
              style={({ pressed }) => [
                estilos.filaMateria,
                indice > 0 && estilos.separador,
                pressed && estilos.presionado,
              ]}
            >
              <View style={estilos.encabezadoMateria}>
                <View style={estilos.textoFila}>
                  <Text style={estilos.tituloFila}>{materia.nombre}</Text>
                  <Text style={estilos.subtituloFila}>
                    {materia.id} · {materia.creditos} créditos
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colores.textoDebil}
                />
              </View>
            </Pressable>
          ))}
          {/* Si no se está cursando ninguna, un mensaje en lugar de una tarjeta
              vacía. */}
          {enCurso.length === 0 ? (
            <Text style={estilos.textoVacio}>
              No estás cursando ninguna materia.
            </Text>
          ) : null}
        </View>

        {/* ---------- Botón "Cerrar sesión" ---------- */}
        {/* Reutiliza el estilo `grupo` (tarjeta) y le suma el suyo. */}
        <Pressable
          onPress={alCerrarSesion}
          style={({ pressed }) => [
            estilos.grupo,
            estilos.botonSalir,
            pressed && estilos.presionado,
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colores.alerta} />
          <Text style={estilos.textoSalir}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Raíz de la pantalla: `flex: 1` ocupa todo el alto.
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  // El `ScrollView` ocupa todo el alto disponible.
  scroll: {
    flex: 1,
  },

  // Estilo del contenido DENTRO del scroll (por eso se pasa a
  // `contentContainerStyle` y no a `style`). `gap` separa cada bloque.
  contenido: {
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.md,
  },

  // Lista agrupada al estilo de Ajustes en iOS: una sola tarjeta redondeada
  // con las filas separadas por líneas finas.
  grupo: {
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    overflow: "hidden",
  },

  // El título de cada sección ("Mis datos", "Amigos"...).
  tituloSeccion: {
    marginTop: espaciado.md,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colores.texto,
  },

  // La tarjeta de privacidad: preguntas y chips en columna, con relleno.
  grupoPrivacidad: {
    gap: espaciado.sm,
    padding: espaciado.lg,
  },

  preguntaPrivacidad: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  ayudaPrivacidad: {
    marginTop: espaciado.xs,
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },

  // Fila de un amigo: avatar, texto y flechita en horizontal.
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
  },

  // El botón «Editar perfil»: centrado, debajo de los contadores.
  botonEditar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
    paddingVertical: espaciado.md,
  },

  textoEditar: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulPalido,
  },

  // La fila «Ver todos mis amigos»: el texto a la izquierda y la flechita a la derecha.
  filaVerMas: {
    justifyContent: "space-between",
  },

  textoVerMas: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // Fila de "Mis datos": el rótulo a la izquierda y el valor a la derecha.
  filaDato: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
  },

  // El nombre del dato ("Correo", "DNI"), apagado.
  rotuloDato: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  // `flex: 1` + alineado a la derecha: si el valor es largo (un correo), baja de
  // renglón en vez de empujar al rótulo.
  valorDato: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    color: colores.texto,
  },

  // Línea fina ARRIBA de cada fila salvo la primera.
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  // `flex: 1`: el texto ocupa todo lo que sobra y empuja la flechita al borde.
  textoFila: {
    flex: 1,
  },

  // El texto principal de una fila (el nombre del amigo o de la materia).
  tituloFila: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.texto,
  },

  // La línea de abajo, más chica y apagada.
  subtituloFila: {
    marginTop: 2,
    fontSize: 12,
    color: colores.textoTenue,
  },

  // El mensaje cuando una lista está vacía (con relleno propio, porque no hay filas).
  textoVacio: {
    padding: espaciado.lg,
    fontSize: 13,
    color: colores.textoDebil,
  },

  // Fila de una materia: relleno propio.
  filaMateria: {
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
  },

  // El contenido de la fila de materia: textos a la izquierda, flechita a la derecha.
  encabezadoMateria: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
  },

  // El botón de salir además usa el estilo `grupo` (tarjeta).
  botonSalir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    marginTop: espaciado.xl,
    paddingVertical: espaciado.md + 2,
  },

  // Se suma a una fila o botón mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.6,
  },

  // "Cerrar sesión", en rojo (el color de las acciones delicadas).
  textoSalir: {
    fontSize: 16,
    fontWeight: "600",
    color: colores.alerta,
  },
});

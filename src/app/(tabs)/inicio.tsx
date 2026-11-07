/**
 * ============================================================================
 * app/(tabs)/inicio.tsx — Pestaña "Inicio" (el panel principal)
 * ============================================================================
 *
 * QUÉ MUESTRA (de arriba hacia abajo):
 *   1. Saludo con el nombre de quien inició sesión ("Hola, María") y el
 *      cuatrimestre actual.
 *   2. "¿Rendiste algo?": abre el formulario para cargar un parcial, TP,
 *      exposición o final (el estado de la materia se actualiza solo).
 *   3. Cuatro "tiles" en una fila: promedio (de las notas de los finales), créditos,
 *      finales aprobados y el CUATRIMESTRE, que lleva un circulito con el
 *      porcentaje de avance según las fechas (semana 8 de 16 = 50 %), calculado
 *      con el día de hoy.
 *   4. Tarjeta "Avance de la carrera" con barra de progreso.
 *   5. "Hoy": los eventos de hoy (incluidas las clases que se repiten).
 *   6. "Materias en curso": una tarjeta por materia que se está cursando.
 *   7. "Finales pendientes": las materias con la cursada aprobada que esperan el
 *      final (solo si hay alguna). Tocar una abre "Rendí" con el final elegido.
 *   8. "Próximas fechas": los próximos 3 parciales o entregas.
 *   9. "Novedades": los avisos institucionales.
 *
 * LA IDEA CENTRAL — TODO SE CALCULA EN EL RENDER:
 *   Esta pantalla no guarda datos propios (solo la ruedita de "tirar para
 *   actualizar", que vive en el hook `useTirarParaActualizar`) ni usa `useEffect`. Lo único que lee de los
 *   Context son los eventos, las materias y el usuario de la sesión; todo lo demás
 *   (eventos de hoy, próximas fechas, materias en curso, promedio, totales, avance
 *   del cuatrimestre) se DERIVA de los datos cada vez que se dibuja. Si se cambia
 *   el estado de una materia o se carga una nota, esta pantalla se actualiza sola
 *   (el promedio incluido), porque las materias vienen del Context. Solo el nombre
 *   del saludo cambia según quién inició sesión. Los eventos que se repiten se
 *   convierten en fechas concretas con `ocurrenciasEntre` (`utilidades/repeticion.ts`).
 *
 * TEORÍA:
 *   [JS 25] "No dupliques estado derivable": `eventosDeHoy`, `fechasProximas`,
 *           `materiasEnCurso`, `promedio` y `avanceCarrera` son valores derivados.
 *   [JS 26] Sin `useEffect`: calcular valores para renderizar no es un efecto.
 *   [JS 8]  `filter`, `sort`, `slice` y `map`.
 *   [JS 29] `useDatos()` y `useSesion()` leen los Context.
 *   [NAV]   `router.push` con rutas dinámicas y `<Link>` para ir a otra pestaña.
 *   [COMP]  Componentes propios reutilizables (`Tarjeta`, `FilaEvento`,
 *           `BarraProgreso`, `CirculoProgreso`) y auxiliares privados de este
 *           archivo (`Tile`, `TileCuatrimestre`, `Seccion`).
 *   [EST]   `espacioBajoTabs` para que la barra flotante no tape el final.
 */
import { Ionicons } from "@expo/vector-icons";
// `Link`: un enlace de navegación (componente). `useRouter`: navegar desde código.
import { Link, useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl, // la ruedita de "tirar para actualizar"
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BarraProgreso } from "@/componentes/BarraProgreso";
// El circulito de porcentaje del tile del cuatrimestre (sin librerías de gráficos).
import { CirculoProgreso } from "@/componentes/CirculoProgreso";
import { FilaEvento } from "@/componentes/FilaEvento";
import { Tarjeta } from "@/componentes/Tarjeta";
// Los dos Context: `useDatos` (eventos y materias) y `useSesion` (quién inició sesión).
import { useDatos } from "@/estado/datos";
import { useSesion } from "@/estado/sesion";
import { useTirarParaActualizar } from "@/estado/actualizar";
import {
  colores,
  espaciado,
  espacioBajoTabs,
  radios,
} from "@/tema/colores";
import {
  avanceCuatrimestre, // función: en qué semana del cuatrimestre estamos hoy
  type AvanceCuatrimestre, // el tipo de lo que devuelve (`type` = solo existe al compilar)
} from "@/utilidades/cuatrimestre";
import { claveFecha, sumarDias } from "@/utilidades/fechas";
import {
  promedioDe, // promedio de las notas de las materias aprobadas (o null)
  resumenCarrera, // totales: materias, créditos y finales aprobados
} from "@/utilidades/materias";
// Las fechas concretas de los eventos que se repiten, y dónde cortan las clases.
import { cortesDeClases, ocurrenciasEntre } from "@/utilidades/repeticion";
// `primerNombre(usuario)`: "María José Pérez" → "María".
import { primerNombre } from "@/utilidades/usuario";

export default function PantallaInicio() {
  const router = useRouter();
  // Se necesitan los eventos y las materias del Context de datos, y el usuario de
  // la sesión. La sintaxis `{ a, b } = objeto` (desestructuración) saca de cada
  // objeto solo los campos que se nombran.
  const { eventos, materias, novedades } = useDatos();
  const { usuario } = useSesion();
  // "Tirar para actualizar": el único estado que usa la pantalla (vive en el hook).
  const { actualizando, actualizar } = useTirarParaActualizar();

  // Todo lo de abajo se calcula en el render a partir de los datos y del
  // contexto. No hay estado duplicado ni efectos.
  // La fecha de hoy como texto "AAAA-MM-DD" (mismo formato que `evento.fecha`).
  const hoy = claveFecha(new Date());

  // Las clases de una materia que ya se terminó de cursar no siguen apareciendo.
  const cortes = cortesDeClases(materias);

  // Eventos de hoy, ordenados por hora de inicio.
  //   - `ocurrenciasEntre(eventos, hoy, hoy)` da las ocurrencias de HOY (una clase
  //     que se repite los lunes aparece si hoy es lunes).
  //   - `sort` ordena ese array nuevo (por eso no modifica la lista original
  //     del Context). `localeCompare` compara textos: "08:00" < "11:30".
  const eventosDeHoy = ocurrenciasEntre(eventos, hoy, hoy, cortes).sort((a, b) =>
    a.desde.localeCompare(b.desde)
  );

  // Próximas fechas: parciales o entregas del próximo año, ordenados por fecha y
  // hora, y solo los tres primeros. (Un año alcanza: también hay eventos que se
  // repiten para siempre, y sin un límite la lista no terminaría nunca.)
  const enUnAnio = claveFecha(sumarDias(new Date(), 365));
  const fechasProximas = ocurrenciasEntre(eventos, hoy, enUnAnio, cortes)
    .filter((evento) => evento.tipo === "parcial" || evento.tipo === "entrega")
    // Se concatena fecha + hora en un solo texto y se compara ("2026-09-3014:00").
    .sort((a, b) =>
      `${a.fecha}${a.desde}`.localeCompare(`${b.fecha}${b.desde}`)
    )
    .slice(0, 3); // `slice(0, 3)` = los elementos en las posiciones 0, 1 y 2

  // Las materias que estoy cursando (para las tarjetas del medio) y las que ya
  // tienen la cursada aprobada y esperan el final. Ahora salen de `materias` (la
  // lista del Context, que cambia cuando se cambia el estado de una materia) y no
  // de una lista fija: `filter` se queda con las que cumplen la condición.
  const materiasEnCurso = materias.filter(
    (materia) => materia.estado === "cursando"
  );
  const finalesPendientes = materias.filter(
    (materia) => materia.estado === "pendienteFinal"
  );
  // Las que se desbloquearon al aprobar la cursada de sus correlativas y todavía no
  // se arrancaron: acá se avisa que ya se pueden empezar.
  const materiasDisponibles = materias.filter(
    (materia) => materia.estado === "disponible"
  );

  // Los totales de la carrera y el promedio se CALCULAN con las materias actuales:
  // al aprobar una (con su nota) cambian solos. El promedio es `null` si todavía
  // no hay ninguna materia aprobada.
  // `resumen` es un objeto: { materiasAprobadas, materiasTotales,
  // creditosObtenidos, creditosTotales, finalesAprobados }.
  const resumen = resumenCarrera(materias);
  const promedio = promedioDe(materias);

  // Fracción entre 0 y 1 (por ejemplo 2 / 10 = 0.2). La barra la usa directo y
  // el texto la multiplica por 100.
  const avanceCarrera = resumen.materiasAprobadas / resumen.materiasTotales;

  // El avance del cuatrimestre según la fecha de HOY (semana / 16). Es un objeto
  // { enCurso, semana, porcentaje }: se calcula en cada render, sin estado.
  const cuatrimestre = avanceCuatrimestre();

  return (
    // Contenedor raíz de la pantalla con `flex: 1`.
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
        {/* ---------- 1. Saludo ---------- */}
        <View style={estilos.hero}>
          {/* El nombre sale del usuario que inició sesión (de su cuenta). */}
          <Text style={estilos.saludo}>Hola, {primerNombre(usuario)}</Text>
          <Text style={estilos.contexto}>
            {/* El cuatrimestre de la carrera en el que va (dato de la cuenta). */}
            {usuario?.cuatrimestre ?? 1}º cuatrimestre · En curso
          </Text>
        </View>

        {/* ---------- 2. ¿Rendiste algo? ---------- */}
        {/* Abre el formulario "Rendí" sin nada elegido: ahí se elige qué, de qué
            materia, la nota y la fecha. Es la forma de AUTOGESTIONAR las materias. */}
        <Pressable
          onPress={() => router.push("/rendi")}
          style={({ pressed }) => [estilos.tarjetaRendi, pressed && estilos.presionado]}
        >
          <View style={estilos.iconoRendi}>
            <Ionicons name="create-outline" size={20} color={colores.blanco} />
          </View>
          <View style={estilos.textoRendi}>
            <Text style={estilos.tituloRendi}>¿Rendiste algo?</Text>
            <Text style={estilos.detalleRendi}>
              Cargá la nota de un parcial, TP, exposición o final y tus materias se
              actualizan solas.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colores.azulClaro} />
        </Pressable>

        {/* ---------- 3. Tiles: cuatro cajitas en fila ---------- */}
        <View style={estilos.tiles}>
          <Tile
            // El promedio sale de las NOTAS de los finales de las materias
            // aprobadas. `toFixed(1)` deja un decimal y devuelve texto (8.5 →
            // "8.5"); sin ninguna materia aprobada no hay promedio y se ve "—".
            valor={promedio === null ? "—" : promedio.toFixed(1)}
            rotulo="Promedio"
            icono="star-outline"
          />
          <Tile
            // La plantilla `${...}` convierte el número en texto ("14").
            valor={`${resumen.creditosObtenidos}`}
            sufijo={`/${resumen.creditosTotales}`} // "/76"
            rotulo="Créditos"
            icono="trending-up"
          />
          <Tile
            valor={`${resumen.finalesAprobados}`}
            rotulo="Finales"
            icono="checkmark-circle-outline"
          />
          {/* El cuarto tile: el avance del cuatrimestre según la fecha de hoy. */}
          <TileCuatrimestre avance={cuatrimestre} />
        </View>

        {/* ---------- 4. Avance de la carrera ---------- */}
        <Tarjeta style={estilos.tarjetaAvance}>
          <View style={estilos.filaAvance}>
            <Text style={estilos.rotuloAvance}>Avance de la carrera</Text>
            <Text style={estilos.porcentaje}>
              {Math.round(avanceCarrera * 100)}%
            </Text>
          </View>
          <BarraProgreso valor={avanceCarrera} alto={6} />
          <Text style={estilos.detalleAvance}>
            {resumen.materiasAprobadas} de {resumen.materiasTotales} materias
            aprobadas
          </Text>
        </Tarjeta>

        {/* ---------- 5. Hoy ---------- */}
        <Seccion titulo="Hoy" enlace="/agenda" textoEnlace="Ver agenda" />

        {/* Si no hay eventos hoy, se muestra un mensaje amable (ESTADO VACÍO);
            si hay, una `FilaEvento` por cada uno. */}
        {eventosDeHoy.length === 0 ? (
          <Tarjeta style={estilos.tarjetaVacia}>
            <Ionicons name="sunny-outline" size={22} color={colores.textoTenue} />
            <Text style={estilos.textoVacio}>No tenés clases hoy.</Text>
          </Tarjeta>
        ) : (
          eventosDeHoy.map((evento) => (
            <FilaEvento
              // `idOcurrencia`: único por día ("ev-1@2026-10-24"), sirve de `key`.
              key={evento.idOcurrencia}
              evento={evento}
              // Al tocar, se abre el detalle de ese evento (ruta dinámica) en ESE día.
              alTocar={() =>
                router.push({
                  pathname: "/evento/[id]",
                  params: { id: evento.id, fecha: evento.fecha },
                })
              }
            />
          ))
        )}

        {/* ---------- 6. Materias en curso ---------- */}
        <Seccion
          titulo="Materias en curso"
          enlace="/plan"
          textoEnlace="Ver plan"
        />

        {/* Si no se está cursando ninguna, un mensaje (ESTADO VACÍO); si no, las
            tarjetas van en fila, una al lado de la otra. */}
        {materiasEnCurso.length === 0 ? (
          <Tarjeta style={estilos.tarjetaVacia}>
            <Ionicons name="book-outline" size={22} color={colores.textoTenue} />
            <Text style={estilos.textoVacio}>
              No estás cursando ninguna materia.
            </Text>
          </Tarjeta>
        ) : (
          <View style={estilos.filaMaterias}>
            {materiasEnCurso.map((materia) => (
              <Pressable
                key={materia.id}
                onPress={() => router.push(`/materia/${materia.id}`)}
                style={({ pressed }) => [
                  estilos.tarjetaMateria,
                  pressed && estilos.presionado,
                ]}
              >
                <View style={estilos.filaMateria}>
                  <Text style={estilos.codigoMateria}>{materia.id}</Text>
                  <Ionicons name="sync" size={14} color={colores.azulClaro} />
                </View>

                {/* Hasta dos líneas; si el nombre es más largo, se corta con "...". */}
                <Text style={estilos.nombreMateria} numberOfLines={2}>
                  {materia.nombre}
                </Text>

                <Text style={estilos.creditosMateria}>
                  {materia.creditos} créditos
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ---------- 6 bis. Materias que se pueden arrancar (solo si hay alguna) ---------- */}
        {/* Aprobar la cursada de una materia desbloquea las que la piden como
            correlativa. Acá se ven, con un toque para abrirlas y «Arrancar la
            cursada». Usa los mismos estilos que «Finales pendientes». */}
        {materiasDisponibles.length > 0 ? (
          <>
            <Seccion titulo="Podés arrancar" enlace="/plan" textoEnlace="Ver plan" />
            <Tarjeta style={estilos.tarjetaNovedades}>
              {materiasDisponibles.map((materia, indice) => (
                <Pressable
                  key={materia.id}
                  onPress={() => router.push(`/materia/${materia.id}`)}
                  style={({ pressed }) => [
                    estilos.filaNovedad,
                    indice > 0 && estilos.separador,
                    pressed && estilos.presionado,
                  ]}
                >
                  <Ionicons name="lock-open-outline" size={18} color={colores.azulClaro} />
                  <View style={estilos.textoNovedad}>
                    <Text style={estilos.tituloNovedad}>{materia.nombre}</Text>
                    <Text style={estilos.detalleNovedad}>
                      Se desbloqueó · tocá para arrancar la cursada
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colores.textoDebil} />
                </Pressable>
              ))}
            </Tarjeta>
          </>
        ) : null}

        {/* ---------- 7. Finales pendientes (solo si hay alguno) ---------- */}
        {/* Una materia con la cursada aprobada ya no está "en curso", pero todavía
            no está aprobada: acá se ve qué finales faltan rendir. Tocarla abre
            "Rendí" con el final y esa materia ya elegidos. */}
        {/* `cantidad > 0 ? ( ... ) : null`: si no hay ninguno, no se dibuja nada
            (ni siquiera el título). Los `<> ... </>` son un "fragmento": agrupan
            dos elementos (el título y la tarjeta) sin crear una `View` de más. */}
        {finalesPendientes.length > 0 ? (
          <>
            <Seccion titulo="Finales pendientes" />
            <Tarjeta style={estilos.tarjetaNovedades}>
              {/* `map` recibe cada materia y también su posición (`indice`). La
                  `key` es el código de la materia, no la posición. */}
              {finalesPendientes.map((materia, indice) => (
                <Pressable
                  key={materia.id}
                  // Al tocar, se abre "Rendí" con el final de esta materia elegido.
                  onPress={() =>
                    router.push({
                      pathname: "/rendi",
                      params: { tipo: "final", materiaId: materia.id },
                    })
                  }
                  style={({ pressed }) => [
                    // Se reusan los estilos de las filas de "Novedades".
                    estilos.filaNovedad,
                    // `indice > 0 && estilo`: la línea de arriba va en todas menos
                    // en la primera (si es `false`, React Native lo ignora).
                    indice > 0 && estilos.separador,
                    // Mientras se aprieta, queda un poco transparente.
                    pressed && estilos.presionado,
                  ]}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={colores.azulClaro}
                  />
                  <View style={estilos.textoNovedad}>
                    <Text style={estilos.tituloNovedad}>{materia.nombre}</Text>
                    <Text style={estilos.detalleNovedad}>
                      Tocá para cargar la nota del final
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colores.textoDebil}
                  />
                </Pressable>
              ))}
            </Tarjeta>
          </>
        ) : null}

        {/* ---------- 8. Próximas fechas (sin enlace) ---------- */}
        <Seccion titulo="Próximas fechas" />

        {fechasProximas.length === 0 ? (
          <Tarjeta style={estilos.tarjetaVacia}>
            <Ionicons
              name="checkmark-done-outline"
              size={22}
              color={colores.textoTenue}
            />
            <Text style={estilos.textoVacio}>
              No hay parciales ni entregas cargadas.
            </Text>
          </Tarjeta>
        ) : (
          fechasProximas.map((evento) => (
            <FilaEvento
              key={evento.idOcurrencia}
              evento={evento}
              // Prop booleana: escribirla sin valor equivale a `mostrarFecha={true}`.
              // Hace que la fila diga "Mañana · 14:00" en lugar de solo la hora.
              mostrarFecha
              alTocar={() =>
                router.push({
                  pathname: "/evento/[id]",
                  params: { id: evento.id, fecha: evento.fecha },
                })
              }
            />
          ))
        )}

        {/* ---------- 9. Novedades ---------- */}
        <Seccion titulo="Novedades" />

        {/* Una sola tarjeta con los avisos adentro, separados por líneas finas. */}
        <Tarjeta style={estilos.tarjetaNovedades}>
          {novedades.map((novedad, indice) => (
            <View
              key={novedad.id}
              // La línea separadora se agrega a todos menos al primero.
              style={[estilos.filaNovedad, indice > 0 && estilos.separador]}
            >
              <Ionicons
                // Traduce el valor del dato ("megafono" | "calendario") al
                // nombre real del ícono de Ionicons.
                name={
                  novedad.icono === "megafono"
                    ? "megaphone-outline"
                    : "calendar-clear-outline"
                }
                size={18}
                color={colores.azulClaro}
              />
              <View style={estilos.textoNovedad}>
                <Text style={estilos.tituloNovedad}>{novedad.titulo}</Text>
                <Text style={estilos.detalleNovedad}>{novedad.detalle}</Text>
              </View>
            </View>
          ))}
        </Tarjeta>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTES AUXILIARES (privados: solo se usan en esta pantalla, por eso
// viven en este archivo y no en `componentes/`)
// ---------------------------------------------------------------------------

type PropsTile = {
  valor: string;
  sufijo?: string; // opcional: el "/38" chico al lado de "14"
  rotulo: string;
  icono: keyof typeof Ionicons.glyphMap;
};

// Una cajita con ícono, un valor grande y un rótulo (Promedio / Créditos / Finales).
// El cuarto tile (el cuatrimestre) tiene su propio componente, más abajo.
function Tile({ valor, sufijo, rotulo, icono }: PropsTile) {
  return (
    <View style={estilos.tile}>
      <Ionicons name={icono} size={15} color={colores.textoTenue} />
      <View style={estilos.filaValor}>
        <Text style={estilos.valorTile}>{valor}</Text>
        {/* El sufijo se dibuja solo si existe (ternario con `null`). */}
        {sufijo ? <Text style={estilos.sufijoTile}>{sufijo}</Text> : null}
      </View>
      <Text style={estilos.rotuloTile}>{rotulo}</Text>
    </View>
  );
}

// El tile del cuatrimestre: en lugar de ícono y número lleva un circulito que se
// llena según la semana en la que estamos (semana / 16), con el porcentaje
// adentro y "Semana 10" abajo. Fuera del cuatrimestre (en el receso) el círculo
// queda vacío con una lunita y dice "Receso". `avance` es una unión de tipos:
// `enCurso` dice qué campos hay, y TypeScript lo verifica en cada rama.
function TileCuatrimestre({ avance }: { avance: AvanceCuatrimestre }) {
  return (
    // Dos estilos en un array: el de cualquier tile y el que centra el contenido
    // (el segundo pisa al primero donde coinciden).
    <View style={[estilos.tile, estilos.tileCentrado]}>
      {/* El círculo: `valor` (0 a 1) es cuánto se pinta; `tamanio`, `largo` y
          `grosor` son sus medidas en dp (más chicas que las de fábrica, para que
          entre en el tile). Lo que va ENTRE las etiquetas (`children`) se dibuja
          en el centro. */}
      <CirculoProgreso valor={avance.porcentaje} tamanio={48} largo={6} grosor={2}>
        {/* Dentro del cuatrimestre: el porcentaje. En el receso: una lunita. */}
        {avance.enCurso ? (
          <Text style={estilos.porcentajeTile}>
            {/* 0.625 × 100 = 62.5 → `Math.round` lo redondea a 63. */}
            {Math.round(avance.porcentaje * 100)}%
          </Text>
        ) : (
          <Ionicons name="moon-outline" size={16} color={colores.textoTenue} />
        )}
      </CirculoProgreso>
      {/* El rótulo de abajo. Como `avance` es una unión de tipos, `semana` solo
          existe cuando `enCurso` es `true`: TypeScript lo verifica en el ternario. */}
      <Text style={estilos.rotuloTile}>
        {avance.enCurso ? `Semana ${avance.semana}` : "Receso"}
      </Text>
    </View>
  );
}

// El encabezado de cada sección: un título y, opcionalmente, un enlace a la
// derecha ("Ver agenda", "Ver plan").
function Seccion({
  titulo,
  enlace,
  textoEnlace,
}: {
  titulo: string;
  // El enlace solo puede ser una de estas dos rutas (TypeScript lo verifica).
  enlace?: "/plan" | "/agenda";
  textoEnlace?: string;
}) {
  return (
    <View style={estilos.cabeceraSeccion}>
      <Text style={estilos.tituloSeccion}>{titulo}</Text>
      {/* `enlace && textoEnlace`: solo si se pasaron las dos cosas se dibuja el
          enlace. `<Link>` navega a otra pestaña al tocarlo. */}
      {enlace && textoEnlace ? (
        <Link href={enlace} style={estilos.enlace}>
          {textoEnlace}
        </Link>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // El contenedor raíz: ocupa toda la pantalla (`flex: 1`) con el fondo negro del tema.
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  // El `ScrollView` también ocupa todo el alto disponible.
  scroll: {
    flex: 1,
  },

  // OJO: `paddingBottom: espacioBajoTabs` deja lugar abajo para la barra de
  // tabs flotante (que no ocupa lugar en el layout). Sin esto, la barra
  // taparía lo último de la pantalla.
  contenido: {
    padding: espaciado.lg,
    paddingBottom: espacioBajoTabs,
    gap: espaciado.md,
  },

  // El bloque del saludo, con un poco de aire arriba y abajo.
  hero: {
    paddingTop: espaciado.xs,
    paddingBottom: espaciado.xs,
  },

  // "Hola, María": el texto grande de la pantalla. `letterSpacing` negativo junta un poco las letras.
  saludo: {
    marginTop: espaciado.xs,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colores.texto,
  },

  // "2º cuatrimestre · En curso", más chico y apagado.
  contexto: {
    marginTop: 2,
    fontSize: 14,
    color: colores.textoTenue,
  },

  // "¿Rendiste algo?": una fila azul oscura con ícono, textos y flechita.
  tarjetaRendi: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
    padding: espaciado.md,
  },

  // El círculo azul del ícono (40 de lado, radio 20 = círculo).
  iconoRendi: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.primario,
  },

  textoRendi: {
    flex: 1,
    gap: 2,
  },

  tituloRendi: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.texto,
  },

  detalleRendi: {
    fontSize: 12,
    lineHeight: 17,
    color: colores.azulPalido,
  },

  // Los cuatro tiles en fila; cada uno tiene `flex: 1` y por eso miden lo mismo.
  tiles: {
    flexDirection: "row",
    gap: espaciado.sm,
  },

  // `paddingHorizontal` chico: con cuatro tiles en una fila cada uno es angosto y
  // "14/76" tiene que entrar. `minWidth: 0` deja que el tile se achique.
  tile: {
    flex: 1,
    minWidth: 0,
    gap: espaciado.xs,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.sm + 2,
  },

  // Valor y sufijo en fila, alineados por abajo (`flex-end`).
  filaValor: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },

  // El número grande del tile ("8.5", "14", "2").
  valorTile: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colores.texto,
  },

  // El "/76" chico al lado del valor; `marginBottom` lo sube para alinearlo con la base del número.
  sufijoTile: {
    marginBottom: 3,
    fontSize: 12,
    color: colores.textoDebil,
  },

  // El nombre del tile ("Promedio", "Créditos", "Finales", "Semana 10").
  rotuloTile: {
    fontSize: 11,
    color: colores.textoTenue,
  },

  // Sobrescribe el `gap` y el `padding` base de `Tarjeta` (el estilo que se
  // pasa por props va después y gana).
  tarjetaAvance: {
    gap: espaciado.sm,
    padding: espaciado.md,
  },

  // "Avance de la carrera" a la izquierda y el porcentaje a la derecha
  // (`space-between` los manda a los extremos).
  filaAvance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // "Avance de la carrera", a la izquierda.
  rotuloAvance: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  // El porcentaje de la carrera ("20%"), en azul y a la derecha.
  porcentaje: {
    fontSize: 13,
    fontWeight: "700",
    color: colores.azulClaro,
  },

  // "2 de 10 materias aprobadas", debajo de la barra.
  detalleAvance: {
    fontSize: 12,
    color: colores.textoTenue,
  },

  // Encabezado de sección: título a la izquierda y enlace a la derecha, alineados por abajo.
  cabeceraSeccion: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: espaciado.md,
  },

  // El título de cada sección ("Hoy", "Próximas fechas"...).
  tituloSeccion: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colores.texto,
  },

  // El enlace de la derecha ("Ver agenda", "Ver plan").
  enlace: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // Las tarjetas de materia en fila.
  filaMaterias: {
    flexDirection: "row",
    gap: espaciado.md,
  },

  // Cada tarjeta: mismo ancho (`flex: 1`), alto fijo y contenido repartido
  // arriba/medio/abajo con `space-between`.
  tarjetaMateria: {
    flex: 1,
    height: 138,
    justifyContent: "space-between",
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
    padding: espaciado.md,
  },

  // Se suma a una fila o tarjeta mientras se aprieta: queda un poco transparente.
  presionado: {
    opacity: 0.7,
  },

  // Fila superior de la tarjeta: código a la izquierda, ícono de "en curso" a la derecha.
  filaMateria: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // El código de la materia ("MAT-201"), chico y en mayúsculas.
  codigoMateria: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colores.azulTenue,
  },

  // El nombre de la materia (hasta dos renglones: `numberOfLines={2}`).
  nombreMateria: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: colores.texto,
  },

  // "6 créditos", abajo de la tarjeta.
  creditosMateria: {
    fontSize: 11,
    color: colores.textoTenue,
  },

  // El tile del cuatrimestre centra su contenido (el círculo y el texto de abajo).
  tileCentrado: {
    alignItems: "center",
  },

  // El porcentaje DENTRO del circulito.
  porcentajeTile: {
    fontSize: 11,
    fontWeight: "700",
    color: colores.texto,
  },

  // Tarjeta del estado vacío: ícono y texto en fila.
  tarjetaVacia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    padding: espaciado.md,
  },

  // El mensaje de los estados vacíos ("No tenés clases hoy.").
  textoVacio: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  // La tarjeta que junta varias filas (novedades y finales pendientes): poco relleno vertical, porque cada fila ya tiene el suyo.
  tarjetaNovedades: {
    paddingVertical: espaciado.xs,
  },

  // Una fila de la lista: ícono a la izquierda y el texto a la derecha.
  filaNovedad: {
    flexDirection: "row",
    gap: espaciado.md,
    paddingVertical: espaciado.md,
  },

  // La línea fina que va arriba de cada fila menos la primera. `hairlineWidth` es el grosor más fino que dibuja el dispositivo.
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.bordeSuave,
  },

  // El bloque del texto: `flex: 1` ocupa lo que deja el ícono y baja de renglón si es largo.
  textoNovedad: {
    flex: 1,
  },

  // El título del aviso o de la materia.
  tituloNovedad: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  // La descripción, más chica y apagada.
  detalleNovedad: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },
});

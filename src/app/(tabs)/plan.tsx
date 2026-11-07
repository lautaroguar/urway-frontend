/**
 * ============================================================================
 * app/(tabs)/plan.tsx — Pestaña "Plan de estudios"
 * ============================================================================
 *
 * QUÉ MUESTRA:
 *   1. Título y carrera.
 *   2. Cuántas materias se aprobaron y un porcentaje con barra de progreso.
 *   3. Un buscador de texto.
 *   4. Chips de filtro: Todas · Disponibles · En curso · Pendientes de final ·
 *      Aprobadas · Bloqueadas.
 *   5. Las materias, divididas por AÑO. Cada año es un DESPLEGABLE (para no tener
 *      una lista enorme) y adentro se separa en 1º y 2º cuatrimestre. Tocar una
 *      materia abre su detalle (salvo las bloqueadas, que no se pueden abrir y
 *      muestran qué correlativas faltan). Las DISPONIBLES son las que se
 *      desbloquearon al aprobar la cursada de sus correlativas: desde su detalle se
 *      puede «Arrancar la cursada».
 *
 * ESTADO (tres `useState`, todos LOCALES a esta pantalla):
 *   - `busqueda`:      el texto escrito en el buscador.
 *   - `filtro`:        el chip seleccionado.
 *   - `aniosAbiertos`: qué años están desplegados. Arranca con el año en el que
 *                      está el estudiante.
 *   Nadie más necesita saberlo, por eso NO van al Context. Las MATERIAS, en
 *   cambio, sí vienen del Context, porque su estado cambia desde el detalle.
 *
 * LO DERIVADO (se calcula en cada render, no se guarda):
 *   - `visibles` → las materias que pasan el filtro y la búsqueda.
 *   - `anios`    → la lista de años presentes en `visibles`.
 *   - `resumen`  → totales de la carrera (aprobadas, créditos...).
 *   - `abierto`  → si un año se ve desplegado: lo está si se lo abrió, o si hay
 *                  búsqueda o filtro (así no se esconde un resultado).
 *
 * TEORÍA:
 *   [JS 23] Buscador = INPUT CONTROLADO (`value` + `onChangeText`).
 *   [JS 25] "No dupliques estado derivable": `busqueda`, `filtro` y
 *           `aniosAbiertos` son estado; lo demás se calcula a partir de ellos.
 *   [JS 20] `useState` con tipo genérico (`useState<Filtro>`) y actualización
 *           funcional para abrir y cerrar un año.
 *   [JS 8]  `filter` y `map`; [JS 7] spread `[...new Set(...)]`.
 *   [JS 29] `useDatos()` lee las materias del Context.
 *   [COMP]  `TextInput`, `ChipsFiltro` (componente controlado), `Pressable`
 *           con `disabled`.
 *   [NAV]   `router.push` a la ruta dinámica `/materia/[id]`.
 */
// Ionicons: los íconos (la lupa, las flechitas de los desplegables, el check).
import { Ionicons } from "@expo/vector-icons";
// `useRouter` permite navegar desde el código (abrir el detalle de una materia).
import { useRouter } from "expo-router";
// `useState` guarda valores que, al cambiar, vuelven a dibujar la pantalla.
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BarraProgreso } from "@/componentes/BarraProgreso";
import { ChipsFiltro } from "@/componentes/ChipsFiltro";
import {
  carrera, // nombre de la carrera y la universidad
  type EstadoMateria,
  type Materia,
} from "@/datos/carrera";
// Las materias ACTUALES (con su estado y nota) viven en el Context de datos.
import { useDatos } from "@/estado/datos";
// De la sesión sale en qué cuatrimestre va el estudiante.
import { useSesion } from "@/estado/sesion";
import {
  colores,
  espaciado,
  espacioBajoTabs,
  radios,
} from "@/tema/colores";
// Colores e ícono de cada estado de materia (fondo, borde, acento, ícono).
import { estilosPorEstado } from "@/tema/materias";
import {
  anioDe, // cuatrimestre de la carrera → número de año (3º y 4º → año 2)
  nombreDelAnio, // 2 → "Segundo año"
  resumenCarrera, // totales de la carrera, calculados con las materias actuales
} from "@/utilidades/materias";

// Los valores posibles del filtro: "todas" o uno de los estados de materia. Se
// arma con una UNIÓN de tipos.
type Filtro = "todas" | EstadoMateria;

// Las opciones que se le pasan a `ChipsFiltro`: la `clave` es lo que se guarda
// en el estado y la `etiqueta` lo que se ve en pantalla.
const FILTROS: { clave: Filtro; etiqueta: string }[] = [
  { clave: "todas", etiqueta: "Todas" },
  { clave: "disponible", etiqueta: "Disponibles" },
  { clave: "cursando", etiqueta: "En curso" },
  { clave: "pendienteFinal", etiqueta: "Pendientes de final" },
  { clave: "aprobada", etiqueta: "Aprobadas" },
  { clave: "bloqueada", etiqueta: "Bloqueadas" },
];

export default function PantallaPlan() {
  const router = useRouter();
  // Las materias ACTUALES (con su estado y nota) vienen del Context. `{ materias }`
  // es desestructuración: de todo lo que ofrece `useDatos()` se saca solo ese campo.
  const { materias } = useDatos();
  const { usuario } = useSesion();

  // El estado de esta pantalla. `useState<Filtro>("todas")`: el tipo entre
  // `< >` limita el valor a las opciones de `Filtro`; arranca en "todas".
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  // Los años desplegados, como una lista de números ([1] = solo el primero).
  // Arranca con el año del cuatrimestre actual del estudiante abierto: si va por
  // el 2º cuatrimestre, `anioDe(2)` es 1 y arranca `[1]`.
  const [aniosAbiertos, setAniosAbiertos] = useState<number[]>([
    anioDe(usuario?.cuatrimestre ?? 1),
  ]);

  // Abre el año si estaba cerrado y lo cierra si estaba abierto. Es una
  // actualización FUNCIONAL [JS 20] porque el valor nuevo depende del anterior, y
  // siempre devuelve una lista NUEVA (`filter` o spread), nunca `push`.
  const alternarAnio = (anio: number) => {
    setAniosAbiertos((actuales) =>
      actuales.includes(anio)
        ? actuales.filter((abierto) => abierto !== anio) // estaba abierto → cerrarlo
        : [...actuales, anio] // estaba cerrado → abrirlo (`...` copia la lista y suma uno)
    );
  };

  // Todo lo de abajo se calcula en el render. Nada de esto va a `useState`.
  // El texto de búsqueda normalizado: sin espacios en los extremos y en
  // minúsculas, para que "álgebra" y "ÁLGEBRA " den lo mismo.
  const texto = busqueda.trim().toLowerCase();

  // Las materias que se ven: deben cumplir el filtro Y el texto.
  const visibles = materias.filter((materia) => {
    // ¿Pasa el filtro? Con "todas" pasan todas; si no, el estado debe coincidir.
    const coincideFiltro = filtro === "todas" || materia.estado === filtro;
    // ¿Pasa el texto? Sin texto pasan todas; si hay, el nombre o el código deben contenerlo.
    const coincideTexto =
      texto.length === 0 ||
      materia.nombre.toLowerCase().includes(texto) ||
      materia.id.toLowerCase().includes(texto);

    // `&&` = "y": tienen que ser ciertas las dos.
    return coincideFiltro && coincideTexto;
  });

  // ¿Hay una búsqueda o un filtro activo? Entonces todos los años con resultados
  // se muestran abiertos: si no, un resultado podría quedar escondido en un año
  // cerrado.
  const hayFiltro = texto.length > 0 || filtro !== "todas";

  // Los años que aparecen entre las materias visibles, sin repetir y ordenados.
  // Paso a paso:
  //   1. `visibles.map(...)`       → [1, 1, 1, 1, 1, 1, 2, 2, 2, 2]
  //   2. `new Set(...)`            → {1, 2}           (un Set descarta repetidos)
  //   3. `[...set]` (spread)       → [1, 2]           (de Set a array)
  //   4. `.sort((a, b) => a - b)`  → orden numérico ascendente
  const anios = [
    ...new Set(visibles.map((materia) => anioDe(materia.cuatrimestre))),
  ].sort((a, b) => a - b);

  // Los totales de la carrera, calculados con las materias actuales.
  // (un objeto con materiasAprobadas, materiasTotales, finalesPendientes...)
  const resumen = resumenCarrera(materias);
  // Fracción de 0 a 1 para la barra de progreso.
  const avance = resumen.materiasAprobadas / resumen.materiasTotales;

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        // Permite tocar una materia con el teclado abierto sin tener que cerrarlo antes.
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------- Título ---------- */}
        <View>
          <Text style={estilos.titulo}>Plan de estudios</Text>
          <Text style={estilos.subtitulo}>
            {carrera.nombre} · {carrera.universidad}
          </Text>
        </View>

        {/* ---------- Progreso de la carrera ---------- */}
        <View style={estilos.bloqueProgreso}>
          <View style={estilos.filaProgreso}>
            <Text style={estilos.textoProgreso}>
              {resumen.materiasAprobadas} de {resumen.materiasTotales} materias
              aprobadas
              {/* Si hay finales por rendir, se avisa (con el plural correcto): el
                  ternario de afuera decide si se agrega el aviso y el de adentro
                  elige "final pendiente" (1) o "finales pendientes" (varios). Las
                  comillas invertidas con `${...}` arman el texto uniendo partes. */}
              {resumen.finalesPendientes > 0
                ? ` · ${resumen.finalesPendientes} ${
                    resumen.finalesPendientes === 1
                      ? "final pendiente"
                      : "finales pendientes"
                  }`
                : ""}
            </Text>
            <Text style={estilos.porcentaje}>{Math.round(avance * 100)}%</Text>
          </View>
          <BarraProgreso valor={avance} alto={6} />
        </View>

        {/* ---------- Buscador ---------- */}
        <View style={estilos.filaBusqueda}>
          <View style={estilos.buscador}>
            <Ionicons name="search" size={16} color={colores.textoDebil} />
            {/* INPUT CONTROLADO [JS 23]: el texto que se ve sale de `busqueda`
                y cada tecla actualiza el estado con `setBusqueda`. Al cambiar el
                estado, la pantalla se vuelve a dibujar y `visibles` se recalcula. */}
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar materia o apunte"
              placeholderTextColor={colores.textoDebil}
              style={estilos.input}
              returnKeyType="search" // el botón del teclado dice "buscar"
            />
          </View>
        </View>

        {/* ---------- Chips de filtro ---------- */}
        {/* `valor` baja (dato) y `alCambiar` sube (evento). `setFiltro` se pasa
            directo como callback: ChipsFiltro lo llama con la clave elegida. */}
        <ChipsFiltro opciones={FILTROS} valor={filtro} alCambiar={setFiltro} />

        {/* ---------- Lista de materias: un desplegable por año ---------- */}
        {/* Si el filtro/búsqueda no deja ninguna materia, se muestra un aviso
            (ESTADO VACÍO); si no, un bloque por cada año. */}
        {anios.length === 0 ? (
          <View style={estilos.vacio}>
            <Ionicons
              name="search-outline"
              size={28}
              color={colores.textoDebil}
            />
            <Text style={estilos.textoVacio}>
              Ninguna materia coincide con la búsqueda.
            </Text>
          </View>
        ) : (
          // `anios.map(...)` dibuja un desplegable por cada año. Como el callback
          // usa llaves `{ }` y `return`, puede tener variables adentro.
          anios.map((anio) => {
            // Las materias de TODO el año (no solo las visibles): sirven para el
            // resumen de la cabecera ("2 de 6 aprobadas"), que no cambia al buscar.
            const delAnio = materias.filter(
              (materia) => anioDe(materia.cuatrimestre) === anio
            );
            // `.length` de la lista filtrada = cuántas aprobadas tiene el año.
            const aprobadasDelAnio = delAnio.filter(
              (materia) => materia.estado === "aprobada"
            ).length;
            // ¿Se ve desplegado? Si se lo abrió, o si hay búsqueda o filtro.
            // `||` = "o": basta con que una de las dos sea cierta. `includes` dice si
            // la lista `aniosAbiertos` contiene ese número de año.
            const abierto = hayFiltro || aniosAbiertos.includes(anio);

            return (
              // `key`: el número de año (es único entre los hermanos).
              <View key={anio} style={estilos.bloqueAnio}>
                {/* La CABECERA del desplegable: tocarla abre o cierra el año.
                    Con búsqueda o filtro activos queda deshabilitada: todo se
                    muestra abierto. */}
                <Pressable
                  // Una flecha que llama a `alternarAnio` con ESTE año.
                  onPress={() => alternarAnio(anio)}
                  disabled={hayFiltro} // con filtro o búsqueda no responde al toque
                  style={({ pressed }) => [
                    estilos.cabeceraAnio,
                    // `pressed && estilo`: el estilo se suma solo mientras se aprieta.
                    pressed && estilos.filaPresionada,
                  ]}
                >
                  <View style={estilos.textosAnio}>
                    <Text style={estilos.tituloAnio}>{nombreDelAnio(anio)}</Text>
                    <Text style={estilos.resumenAnio}>
                      {aprobadasDelAnio} de {delAnio.length} aprobadas
                    </Text>
                  </View>
                  {/* La flechita apunta hacia arriba si está abierto y hacia
                      abajo si está cerrado. */}
                  <Ionicons
                    name={abierto ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colores.azulClaro}
                  />
                </Pressable>

                {/* El contenido solo se dibuja si el año está abierto. */}
                {abierto ? (
                  <View style={estilos.contenidoAnio}>
                    {/* Cada año tiene dos cuatrimestres. El cuatrimestre de la
                        carrera es (año − 1) × 2 + 1 o + 2: el año 2 tiene el 3º y
                        el 4º. */}
                    {/* `[1, 2].map(...)`: se repite el bloque para el 1º y el 2º
                        cuatrimestre del año. */}
                    {[1, 2].map((delAnioNumero) => {
                      const cuatrimestre = (anio - 1) * 2 + delAnioNumero;
                      // Las materias visibles de ESTE cuatrimestre.
                      const delCuatrimestre = visibles.filter(
                        (materia) => materia.cuatrimestre === cuatrimestre
                      );
                      // Si el filtro no deja ninguna, no se dibuja el bloque (devolver
                      // `null` desde un componente o un `map` es "no dibujar nada").
                      if (delCuatrimestre.length === 0) return null;

                      return (
                        <View key={cuatrimestre} style={estilos.seccion}>
                          <View style={estilos.tituloSeccion}>
                            <View style={estilos.puntoSeccion} />
                            <Text style={estilos.textoSeccion}>
                              {delAnioNumero}º cuatrimestre
                            </Text>
                          </View>

                          {delCuatrimestre.map((materia) => (
                            <FilaMateria
                              key={materia.id} // el código es único: sirve de clave estable
                              materia={materia}
                              // Al tocar, se abre el detalle (la ruta lleva el código).
                              alAbrir={() => router.push(`/materia/${materia.id}`)}
                            />
                          ))}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): una fila de materia
// ---------------------------------------------------------------------------

type PropsFila = {
  materia: Materia;
  alAbrir: () => void; // qué hacer al tocarla (lo decide la pantalla)
};

function FilaMateria({ materia, alAbrir }: PropsFila) {
  // `true` si la materia todavía no se puede cursar.
  const bloqueada = materia.estado === "bloqueada";
  // El aspecto de este estado (colores e ícono) sale de `tema/materias.ts`.
  const aspecto = estilosPorEstado[materia.estado];

  return (
    <Pressable
      onPress={alAbrir}
      // Una materia bloqueada no se puede abrir: el botón queda deshabilitado.
      disabled={bloqueada}
      style={({ pressed }) => [
        estilos.fila,
        // Los colores dependen del estado: son valores dinámicos, van inline.
        { backgroundColor: aspecto.fondo, borderColor: aspecto.borde },
        // El feedback de "apretado" solo si NO está bloqueada.
        pressed && !bloqueada && estilos.filaPresionada,
      ]}
    >
      <View style={estilos.textoFila}>
        <Text
          // Un array de estilos: el segundo se suma solo si está bloqueada.
          style={[estilos.nombre, bloqueada && estilos.nombreBloqueado]}
          numberOfLines={1} // una sola línea; si no entra, se corta con "..."
        >
          {materia.nombre}
        </Text>
        <Text style={estilos.codigo}>
          {materia.id} · {materia.creditos} créditos
          {/* Una disponible avisa que ya se puede arrancar. */}
          {materia.estado === "disponible" ? " · Podés arrancarla" : ""}
        </Text>
        {/* Una bloqueada dice qué le falta: los códigos de las correlativas sin cumplir. */}
        {bloqueada ? (
          <Text style={estilos.codigo}>
            Necesitás la cursada de{" "}
            {materia.correlativas
              .filter((correlativa) => !correlativa.cumplida)
              .map((correlativa) => correlativa.id)
              .join(", ")}
          </Text>
        ) : null}
      </View>

      <View style={estilos.derechaFila}>
        {/* La nota del final, solo en las aprobadas. Se compara con `undefined`
            (y no con `0` o vacío) porque el campo es opcional. */}
        {materia.notaFinal !== undefined ? (
          <Text style={estilos.nota}>{materia.notaFinal}</Text>
        ) : null}
        <Ionicons name={aspecto.icono} size={16} color={aspecto.acento} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  // El contenedor raíz: ocupa toda la pantalla con el fondo negro del tema.
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  // El `ScrollView` ocupa todo el alto disponible.
  scroll: {
    flex: 1,
  },

  // `espacioBajoTabs`: deja lugar abajo para la barra de tabs flotante.
  contenido: {
    padding: espaciado.lg,
    paddingBottom: espacioBajoTabs,
    gap: espaciado.lg,
  },

  // "Plan de estudios", el texto grande de la pantalla.
  titulo: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.7,
    color: colores.texto,
  },

  // La carrera y la universidad, debajo del título.
  subtitulo: {
    marginTop: 4,
    fontSize: 12,
    color: colores.textoTenue,
  },

  // El bloque del avance: texto con porcentaje arriba y la barra abajo.
  bloqueProgreso: {
    gap: espaciado.sm,
  },

  // "2 de 10 materias aprobadas" a la izquierda y el porcentaje a la derecha.
  filaProgreso: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaciado.md,
  },

  // `flex: 1` + `flexShrink`: el texto baja de renglón en vez de empujar el %.
  textoProgreso: {
    flex: 1,
    fontSize: 13,
    color: colores.textoTenue,
  },

  // El porcentaje, en azul.
  porcentaje: {
    fontSize: 14,
    fontWeight: "700",
    color: colores.azulClaro,
  },

  // La fila del buscador (deja lugar para sumar botones al costado).
  filaBusqueda: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },

  // El recuadro del buscador: lupa + campo de texto en fila.
  buscador: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    height: 42,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficie,
    paddingHorizontal: espaciado.md,
  },

  // `padding: 0` quita el relleno que Android agrega por defecto al `TextInput`.
  input: {
    flex: 1,
    fontSize: 14,
    color: colores.textoSuave,
    padding: 0,
  },

  // Un desplegable por año: una tarjeta que contiene la cabecera y el contenido.
  bloqueAnio: {
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    overflow: "hidden",
  },

  // La cabecera tocable: título a la izquierda y flechita a la derecha.
  cabeceraAnio: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
  },

  // El título y el resumen del año; `flex: 1` los deja ocupar lo que sobra.
  textosAnio: {
    flex: 1,
  },

  // "Primer año", "Segundo año".
  tituloAnio: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: colores.texto,
  },

  // "2 de 6 aprobadas", chico y apagado.
  resumenAnio: {
    marginTop: 2,
    fontSize: 12,
    color: colores.textoTenue,
  },

  // Lo que se muestra al desplegar: los cuatrimestres, uno debajo del otro.
  contenidoAnio: {
    gap: espaciado.lg,
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
  },

  // Un bloque por cuatrimestre: las filas van una debajo de otra con `gap`.
  seccion: {
    gap: espaciado.sm,
  },

  // Encabezado del cuatrimestre: puntito azul + texto en fila.
  tituloSeccion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    marginBottom: espaciado.xs,
  },

  // El puntito azul (un cuadrado de 6×6 con `borderRadius` de la mitad es un círculo).
  puntoSeccion: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colores.primario,
  },

  // "1º CUATRIMESTRE": chico, en mayúsculas y con letras separadas.
  textoSeccion: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  // Base común de las filas de materia; los colores de fondo y borde los pone el
  // estado (inline, desde `tema/materias.ts`).
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaciado.md,
    minHeight: 54,
    borderRadius: radios.md,
    borderWidth: 1,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },

  // Se suma a la cabecera o a una fila mientras se aprieta: queda semitransparente.
  filaPresionada: {
    opacity: 0.75,
  },

  // `flexShrink: 1`: el texto se achica (y se corta con "...") en lugar de
  // empujar el ícono fuera de la fila.
  textoFila: {
    flexShrink: 1,
  },

  // El nombre de la materia.
  nombre: {
    fontSize: 15,
    fontWeight: "600",
    color: colores.texto,
  },

  // Se suma a `nombre` para las bloqueadas: color apagado y menos grueso.
  nombreBloqueado: {
    color: colores.textoDebil,
    fontWeight: "500",
  },

  // "MAT-201 · 8 créditos", debajo del nombre.
  codigo: {
    marginTop: 2,
    fontSize: 11,
    color: colores.textoTenue,
  },

  // La nota y el ícono, en fila a la derecha de la fila de materia.
  derechaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },

  // La nota del final (solo en las materias aprobadas).
  nota: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.texto,
  },

  // El aviso de que ninguna materia coincide con la búsqueda: centrado y con aire.
  vacio: {
    alignItems: "center",
    gap: espaciado.sm,
    paddingVertical: espaciado.xxl,
  },

  // El texto de ese aviso.
  textoVacio: {
    fontSize: 13,
    color: colores.textoDebil,
  },
});

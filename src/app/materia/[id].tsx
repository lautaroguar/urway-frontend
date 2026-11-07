/**
 * ============================================================================
 * app/materia/[id].tsx — Detalle de una materia
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla de una materia. Lo que muestra depende de su ESTADO:
 *
 *   - DISPONIBLE (se desbloqueó al aprobar sus correlativas y todavía no se arrancó):
 *       el encabezado, los datos, la dificultad estimada (solo para leer: no se puede
 *       reseñar una materia que no se cursa) y un único botón, «Arrancar la
 *       cursada». Al tocarlo pasa a «En curso» y se ve la pantalla completa.
 *
 *   - EN CURSO, PENDIENTE DE FINAL o APROBADA (pantalla completa):
 *       la tarjeta del ESTADO (qué falta y «Cargar lo que rendí»), el HISTORIAL de lo
 *       rendido, la dificultad con MI reseña (estrellas + «Guardar reseña»), una zona
 *       «Apuntes y recursos» con cuatro solapas —Oficiales · Comunidad · De mis amigos ·
 *       Mis apuntes— y, al final, «Abandonar cursada» (solo mientras se cursa).
 *
 *   - BLOQUEADA: lo mismo que antes, y la tarjeta del estado explica qué correlativas
 *       faltan.
 *
 * EL ESTADO SE AUTOGESTIONA:
 *   No se elige a mano: sale de las correlativas, de si se arrancó la cursada y del
 *   historial (ver `datos/carrera.ts`). Esta pantalla se actualiza sola porque la
 *   materia viene del Context.
 *
 * LA DIFICULTAD SE RECALCULA AL ENTRAR:
 *   Al abrir la pantalla se vuelven a pedir las materias al servidor (un `useEffect`):
 *   la dificultad estimada es el promedio de las reseñas de ese momento, incluidas las
 *   que dejaron otros estudiantes desde la última vez.
 *
 * LA RUTA DINÁMICA `[id]`:
 *   Los corchetes en el nombre del archivo indican una ruta con un valor
 *   variable: `/materia/MAT-201`, `/materia/CS-302`... El valor se lee con
 *   `useLocalSearchParams()`. Al vivir en el Stack RAÍZ (no dentro de una
 *   pestaña), esta única pantalla sirve para todos los orígenes: Inicio, Plan y
 *   el perfil. El botón "volver" del header vuelve siempre al lugar de origen.
 *
 * ESTADO:
 *   Un solo `useState`: la solapa elegida (`categoria`). Todo lo demás se
 *   deriva del dato de la materia, que se lee del Context de datos (así el estado
 *   y la nota son siempre los actuales).
 *
 * TEORÍA:
 *   [NAV]   Navegación con PARÁMETROS: `useLocalSearchParams` es el equivalente
 *           en expo-router de `route.params` en React Navigation.
 *   [JS 22] Renderizado condicional: retorno temprano (`if (!materia) return`) y
 *           ternarios anidados.
 *   [JS 25] `recursos` se DERIVA de `materia` y `categoria`; no se guarda.
 *   [JS 26] `useEffect` para pedir las materias al entrar.
 *   [JS 23] `ChipsFiltro` es un componente controlado.
 *   [JS 24] Regla de los hooks: se llaman siempre, en el mismo orden y ANTES de
 *           cualquier `return` condicional.
 *   [JS 29] `useDatos()` lee las materias del Context.
 *   [COMP]  Composición: `Tarjeta`, `Etiqueta`, `EstadoDeMateria`, `HistorialMateria`,
 *           `DificultadMateria`, `ArrancarCursada`, `AbandonarCursada`, `MisApuntes`,
 *           `ApuntesDeOtros`.
 */
import { Ionicons } from "@expo/vector-icons";
// `useLocalSearchParams` lee los parámetros de la ruta actual (acá, `id`).
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApuntesDeOtros } from "@/componentes/ApuntesDeOtros";
import { ChipsFiltro } from "@/componentes/ChipsFiltro";
import { AbandonarCursada, ArrancarCursada } from "@/componentes/CursadaMateria";
import { DificultadMateria } from "@/componentes/DificultadMateria";
import { Etiqueta } from "@/componentes/Etiqueta";
// La tarjeta del estado (qué falta) y la lista de todo lo rendido.
import { EstadoDeMateria } from "@/componentes/EstadoDeMateria";
import { HistorialMateria } from "@/componentes/HistorialMateria";
import { MisApuntes } from "@/componentes/MisApuntes";
import { Tarjeta } from "@/componentes/Tarjeta";
import {
  carrera,
  etiquetasCategoria, // nombre de cada solapa ("Oficiales", "Comunidad"...)
  etiquetasEstado, // nombre de cada estado ("Pendiente de final"...)
  type CategoriaRecurso,
} from "@/datos/carrera";
// Las materias ACTUALES viven en el Context de datos (no en `datos/carrera.ts`).
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
// Colores e ícono de cada estado: los mismos que usa la lista del Plan.
import { estilosPorEstado } from "@/tema/materias";
// `etiquetaPeriodo(materia)`: "Primer año · 2º cuatrimestre".
import { etiquetaPeriodo } from "@/utilidades/materias";

// Las cuatro solapas, con la forma que espera `ChipsFiltro` ({ clave, etiqueta }).
// Las etiquetas se toman del diccionario de `datos/carrera.ts`, así el texto
// está escrito en un solo lugar.
const CATEGORIAS: { clave: CategoriaRecurso; etiqueta: string }[] = [
  { clave: "oficiales", etiqueta: etiquetasCategoria.oficiales },
  { clave: "comunidad", etiqueta: etiquetasCategoria.comunidad },
  { clave: "amigos", etiqueta: etiquetasCategoria.amigos },
  { clave: "misApuntes", etiqueta: etiquetasCategoria.misApuntes },
];

// Ícono según el formato del archivo. Las claves son textos cualquiera
// (`Record<string, ...>`), por eso más abajo se usa `?? "document-outline"` como
// respaldo para un formato que no esté en la lista.
const ICONOS_FORMATO: Record<string, keyof typeof Ionicons.glyphMap> = {
  PDF: "document-text-outline",
  DOCX: "document-outline",
  ZIP: "folder-outline",
  TXT: "create-outline",
};

/**
 * Detalle de una materia. Vive en el Stack raíz y se abre desde Inicio, Plan y
 * el perfil, así que el botón de volver del header nativo siempre lleva a la
 * pantalla de origen.
 */
export default function PantallaMateria() {
  // `useLocalSearchParams<{ id: string }>()` devuelve un objeto con los
  // parámetros de la ruta; el tipo entre `< >` dice qué se espera. Se extrae
  // `id` con desestructuración: para "/materia/MAT-201", `id` vale "MAT-201".
  const { id } = useLocalSearchParams<{ id: string }>();
  // La solapa seleccionada. Arranca en "oficiales".
  const [categoria, setCategoria] = useState<CategoriaRecurso>("oficiales");

  // Las materias ACTUALES (con el estado y la nota al día) vienen del Context.
  // Como esta pantalla las lee de ahí, se redibuja sola cuando cambia el estado.
  const { materias, recargarMaterias } = useDatos();

  // [JS 26] Cada vez que se ENTRA a la materia se piden las materias de nuevo: así la
  // dificultad estimada se recalcula con las reseñas de este momento. Si falla (sin
  // red), se sigue mostrando lo que ya había.
  useEffect(() => {
    recargarMaterias().catch(() => {});
  }, [id]);

  // Busca la materia en esa lista (`find` devuelve la primera que cumple la
  // condición). Puede devolver `undefined` si el id no existe.
  const materia = materias.find((candidata) => candidata.id === id);

  // RETORNO TEMPRANO: si la materia no existe, se muestra un aviso y se corta
  // acá. Los hooks (`useState`, etc.) ya se llamaron ARRIBA, antes de este
  // `return`: los hooks nunca se llaman de forma condicional. Después de este
  // `if`, TypeScript sabe que `materia` NO es `undefined`.
  if (!materia) {
    return (
      <View style={[estilos.pantalla, estilos.vacioPantalla]}>
        <Ionicons
          name="help-circle-outline"
          size={32}
          color={colores.textoDebil}
        />
        <Text style={estilos.textoVacio}>No encontramos la materia {id}.</Text>
      </View>
    );
  }

  // Los recursos oficiales de la solapa elegida: se DERIVA filtrando por categoría.
  const recursos = materia.recursos.filter(
    (recurso) => recurso.categoria === categoria
  );
  const bloqueada = materia.estado === "bloqueada";
  const disponible = materia.estado === "disponible";

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Encabezado ---------- */}
        <Text style={estilos.titulo}>{materia.nombre}</Text>
        <Text style={estilos.subtitulo}>
          {materia.id} · {carrera.nombre}
        </Text>

        {/* Pastilla con el estado. El texto sale del diccionario de
            `datos/carrera.ts` y los colores y el ícono de `tema/materias.ts`, el
            mismo lugar que usa el plan: así la materia se ve igual en los dos. */}
        {/* Se busca en cada diccionario con el estado como clave: `dic[clave]`. */}
        <Etiqueta
          texto={etiquetasEstado[materia.estado]}
          icono={estilosPorEstado[materia.estado].icono}
          color={estilosPorEstado[materia.estado].colorEtiqueta}
          fondo={estilosPorEstado[materia.estado].fondoEtiqueta}
        />

        {/* ---------- Tarjeta de datos ---------- */}
        <Tarjeta style={estilos.tarjetaDatos}>
          {/* Año y cuatrimestre, y créditos, uno al lado del otro. */}
          <View style={estilos.fila}>
            <View style={estilos.columna}>
              <Text style={estilos.rotulo}>Cursada</Text>
              {/* Año y cuatrimestre juntos, calculados a partir de `materia.cuatrimestre`. */}
              <Text style={estilos.valor}>{etiquetaPeriodo(materia)}</Text>
            </View>
            <View style={estilos.columna}>
              <Text style={estilos.rotulo}>Créditos</Text>
              <Text style={estilos.valor}>{materia.creditos}</Text>
            </View>
          </View>

          <View>
            <Text style={estilos.rotulo}>Profesor</Text>
            <Text style={estilos.valor}>{materia.profesor}</Text>
          </View>
        </Tarjeta>

        {disponible ? (
          // ===== DISPONIBLE: solo la dificultad (sin reseña) y arrancar la cursada =====
          <>
            <DificultadMateria materia={materia} puedeResenar={false} />
            <ArrancarCursada materia={materia} />
          </>
        ) : (
          // ===== LA PANTALLA COMPLETA (en curso, pendiente de final, aprobada o bloqueada) =====
          <>
            {/* ---------- Estado: qué falta y el botón "Cargar lo que rendí" ---------- */}
            <EstadoDeMateria materia={materia} />

            {/* ---------- Historial: todo lo rendido (si la materia se puede cursar) ---------- */}
            {!bloqueada ? <HistorialMateria materia={materia} /> : null}

            {/* ---------- Dificultad estimada y, si la cursa, MI reseña ---------- */}
            <DificultadMateria materia={materia} puedeResenar={!bloqueada} />

            {/* ---------- Apuntes y recursos ---------- */}
            <Text style={estilos.tituloSeccion}>Apuntes y recursos</Text>

            {/* Las cuatro solapas. `setCategoria` se pasa como callback:
                `ChipsFiltro` lo llama con la clave elegida. */}
            <ChipsFiltro
              opciones={CATEGORIAS}
              valor={categoria}
              alCambiar={setCategoria}
            />

            {/* Contenido de la solapa. Se lee así:
                  ¿"Mis apuntes"?   → (bloqueada: aviso) o <MisApuntes />
                  ¿"Comunidad" o "De mis amigos"? → <ApuntesDeOtros /> con esa lista
                  si no ("Oficiales") → la lista de recursos, o un aviso si no hay */}
            {categoria === "misApuntes" ? (
              bloqueada ? (
                <Tarjeta style={estilos.tarjetaVacia}>
                  <Text style={estilos.textoVacio}>
                    Vas a poder subir apuntes cuando empieces a cursarla.
                  </Text>
                </Tarjeta>
              ) : (
                <MisApuntes materiaId={materia.id} />
              )
            ) : categoria === "comunidad" || categoria === "amigos" ? (
              <ApuntesDeOtros materiaId={materia.id} origen={categoria} />
            ) : recursos.length === 0 ? (
              <Tarjeta style={estilos.tarjetaVacia}>
                <Text style={estilos.textoVacio}>
                  Todavía no hay material en esta solapa.
                </Text>
              </Tarjeta>
            ) : (
              // Un `Pressable` por recurso. Todavía no descarga nada (es visual).
              recursos.map((recurso) => (
                <Pressable
                  key={recurso.id}
                  style={({ pressed }) => [
                    estilos.filaRecurso,
                    pressed && estilos.presionado,
                  ]}
                >
                  <View style={estilos.iconoRecurso}>
                    <Ionicons
                      // `??` = "si lo de la izquierda es undefined, usar lo de la
                      // derecha": el respaldo para un formato desconocido.
                      name={ICONOS_FORMATO[recurso.formato] ?? "document-outline"}
                      size={18}
                      color={colores.azulClaro}
                    />
                  </View>
                  <View style={estilos.textoRecurso}>
                    <Text style={estilos.nombreRecurso}>{recurso.nombre}</Text>
                    <Text style={estilos.metaRecurso}>
                      {recurso.formato} · {recurso.peso}
                    </Text>
                  </View>
                  <Ionicons
                    name="download-outline"
                    size={18}
                    color={colores.textoTenue}
                  />
                </Pressable>
              ))
            )}

            {/* ---------- Abajo de todo: abandonar la cursada ---------- */}
            <View style={estilos.abandonar}>
              <AbandonarCursada materia={materia} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
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

  // Esta pantalla vive en el Stack raíz (sin barra de tabs flotante), por eso
  // usa un `paddingBottom` común en lugar de `espacioBajoTabs`.
  contenido: {
    padding: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.md,
  },

  // El nombre de la materia, en grande.
  titulo: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colores.texto,
  },

  // Margen NEGATIVO: acerca el subtítulo al título (compensa el `gap` del contenedor).
  subtitulo: {
    marginTop: -espaciado.sm,
    fontSize: 13,
    color: colores.textoTenue,
  },

  // La tarjeta de datos: sus bloques van uno debajo del otro, con aire.
  tarjetaDatos: {
    gap: espaciado.lg,
  },

  // Año/cuatrimestre y créditos, uno al lado del otro.
  fila: {
    flexDirection: "row",
    gap: espaciado.lg,
  },

  // Dos columnas de igual ancho.
  columna: {
    flex: 1,
  },

  // El rótulo chico en mayúsculas encima de cada dato ("Cursada", "Profesor").
  rotulo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  // El dato en sí, debajo de su rótulo.
  valor: {
    marginTop: espaciado.xs,
    fontSize: 15,
    color: colores.textoSuave,
  },

  // "Apuntes y recursos".
  tituloSeccion: {
    marginTop: espaciado.sm,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colores.texto,
  },

  // Fila de un recurso: ícono + textos + ícono de descarga.
  filaRecurso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    padding: espaciado.md,
  },

  // Se suma a un recurso mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.7,
  },

  // El cuadradito redondeado donde va el ícono del tipo de archivo.
  iconoRecurso: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radios.sm,
    backgroundColor: colores.primarioProfundo,
  },

  // El nombre y el peso del recurso; `flex: 1` los deja ocupar lo que sobra.
  textoRecurso: {
    flex: 1,
  },

  // El nombre del archivo.
  nombreRecurso: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.textoSuave,
  },

  // "PDF · 1.1 MB".
  metaRecurso: {
    marginTop: 2,
    fontSize: 11,
    color: colores.textoTenue,
  },

  // La tarjeta con el aviso cuando no hay material: el texto va centrado.
  tarjetaVacia: {
    alignItems: "center",
  },

  // Separa «Abandonar cursada» de todo lo de arriba.
  abandonar: {
    marginTop: espaciado.lg,
  },

  // Pantalla completa centrada, para el caso "no existe la materia".
  vacioPantalla: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.md,
    padding: espaciado.xl,
  },

  // El texto de los avisos (no existe la materia, no hay material...).
  textoVacio: {
    fontSize: 13,
    textAlign: "center",
    color: colores.textoDebil,
  },
});

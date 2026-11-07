/**
 * ============================================================================
 * componentes/FormularioEvento.tsx — El formulario de un evento (crear o editar)
 * ============================================================================
 *
 * QUÉ ES:
 *   Los campos de un evento: título, tipo, materia, fecha, horario, REPETICIÓN,
 *   invitados (si es una juntada de estudio), lugar y notas. Lo usan dos
 *   pantallas: `evento/nuevo.tsx` (crear) y `evento/editar/[id].tsx` (editar).
 *   Cada una le pasa los valores iniciales y qué hacer al guardar.
 *
 * LA JUNTADA DE ESTUDIO NO LLEVA MATERIA:
 *   El título ya dice de qué es ("Estudiar Álgebra"), así que con el tipo «Estudio»
 *   no se muestra el campo Materia y el evento se guarda sin ella.
 *
 * INVITAR AMIGOS (aunque haya más de 100):
 *   Una lista con scroll propio y un buscador por nombre (`SelectorAmigos`).
 *
 * PARCIAL O ENTREGA EN EL DÍA DE UNA CLASE:
 *   Si el evento es un PARCIAL o una ENTREGA de una materia y la fecha cae en un día
 *   en que esa materia tiene CLASE, aparece la opción «Horario»: dejarlo en el
 *   horario de esa clase (toma su hora y su aula) o ponerle uno PERSONALIZADO. Si ese
 *   día no hay clase (un sábado, por ejemplo), la opción no aparece y se escribe el
 *   horario como siempre. Es un evento común: no cambia cómo se guarda, solo ayuda a
 *   completar la hora y el lugar. Las clases del día salen de `ocurrenciasEntre`
 *   (`utilidades/repeticion.ts`), la misma función que arma la agenda.
 *
 * LA REPETICIÓN:
 *   - CLASE: no se elige. Se repite cada semana, en los días que se marquen
 *     ("Días de cursada"), hasta el fin del cuatrimestre. Y si la cursada se
 *     aprueba antes, las clases dejan de aparecer solas desde ese día.
 *   - Lo demás (parcial, entrega, estudio): "No se repite", "Todos los días",
 *     "Cada semana", "Cada 2 semanas" o "Cada mes", con un "Repetir hasta"
 *     opcional (vacío = se repite siempre).
 *
 * LA IDEA CENTRAL — FORMULARIO CONTROLADO Y ERRORES DERIVADOS:
 *   - Cada campo tiene su propio `useState` (formulario controlado).
 *   - Los errores NO se guardan en estado: se CALCULAN en cada render a partir
 *     de lo que hay escrito. Así nunca pueden quedar desactualizados.
 *   - `intentoGuardar` evita mostrar errores antes de que se intente guardar.
 *
 * TEORÍA:
 *   [JS 23] Formulario controlado: `value` + `onChangeText` en cada campo.
 *   [JS 25] Estado derivado: todos los `error...`, el fin del cuatrimestre, las
 *           opciones de los selectores y las clases del día.
 *   [JS 20] `useState` (varios), con tipos, y actualización funcional (días).
 *   [JS 14] `async/await` + `try/catch` al guardar.
 *   [COMP]  Props (`inicial`, `alGuardar`), `TextInput`, `ChipsFiltro` y chips de
 *           selección múltiple (un componente auxiliar privado).
 */
import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChipsFiltro } from "@/componentes/ChipsFiltro";
import { SelectorAmigos } from "@/componentes/SelectorAmigos";
import {
  etiquetasFrecuencia,
  etiquetasTipo,
  type BorradorEvento,
  type Frecuencia,
  type TipoEvento,
} from "@/datos/agenda";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { limitesDelCuatrimestre } from "@/utilidades/cuatrimestre";
import {
  aClaveFecha,
  aMinutos,
  aTextoFecha,
  claveFecha,
  desdeClave,
  etiquetaDiaLargo,
} from "@/utilidades/fechas";
import { codigosEnCurso } from "@/utilidades/materias";
import { cortesDeClases, ocurrenciasEntre } from "@/utilidades/repeticion";
import { formatearFecha, validarFecha } from "@/utilidades/validaciones";

// Las opciones del selector "Tipo" ({ clave, etiqueta }), armadas a partir del
// diccionario `etiquetasTipo`: `Object.keys` da sus claves y `map` arma cada opción.
// `as TipoEvento[]` le dice a TypeScript que las claves son del tipo más preciso.
const TIPOS = (Object.keys(etiquetasTipo) as TipoEvento[]).map((clave) => ({
  clave,
  etiqueta: etiquetasTipo[clave],
}));

// Lo mismo para la frecuencia.
const FRECUENCIAS = (Object.keys(etiquetasFrecuencia) as Frecuencia[]).map(
  (clave) => ({ clave, etiqueta: etiquetasFrecuencia[clave] })
);

// Los días de la semana para "Días de cursada", de lunes a domingo. El número es
// el de `Date.getDay()` (0 = domingo).
const DIAS = [
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mié" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
  { valor: 6, etiqueta: "Sáb" },
  { valor: 0, etiqueta: "Dom" },
];

// Valor especial de "sin materia" (una constante para no repetir el texto).
const SIN_MATERIA = "ninguna";

// Valor especial de la opción «Horario personalizado» (frente a las clases del día).
const HORARIO_PERSONALIZADO = "personalizado";

// ES_HORA: la hora es 00–19 o 20–23, después `:` y los minutos 00–59. Acepta "08:30".
const ES_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type Props = {
  /** Con qué valores arranca el formulario (vacío al crear, el evento al editar). */
  inicial: BorradorEvento;
  /** El texto del botón: "Crear evento" o "Guardar cambios". */
  textoBoton: string;
  /** Qué hacer con el evento completo. Si falla (`throw`), se muestra el error. */
  alGuardar: (borrador: BorradorEvento) => Promise<void>;
  /** `true` al editar un evento que ya existe (cambia cómo arranca el «Horario»). */
  editando?: boolean;
};

/** Formulario de un evento de la agenda, para crearlo o editarlo. */
export function FormularioEvento({ inicial, textoBoton, alGuardar, editando = false }: Props) {
  // Las materias ACTUALES (para el selector), los compañeros (para invitar) y los
  // eventos (para saber si hay clase el día de un parcial o una entrega).
  const { materias, estudiantes, eventos } = useDatos();

  // ESTADO DEL FORMULARIO: un `useState` por campo, con los valores iniciales.
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [tipo, setTipo] = useState<TipoEvento>(inicial.tipo);
  const [materiaId, setMateriaId] = useState(inicial.materiaId ?? SIN_MATERIA);
  // Las fechas se escriben como "24/10/2026" (adentro se guardan "2026-10-24").
  const [fecha, setFecha] = useState(aTextoFecha(inicial.fecha));
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [lugar, setLugar] = useState(inicial.lugar);
  const [notas, setNotas] = useState(inicial.notas ?? "");
  // Para lo que no es clase: cada cuánto y hasta cuándo ("" = sin fin).
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(
    inicial.tipo === "clase" ? "nunca" : inicial.frecuencia
  );
  const [repetirHasta, setRepetirHasta] = useState(
    inicial.repetirHasta && inicial.tipo !== "clase" ? aTextoFecha(inicial.repetirHasta) : ""
  );
  // Para las clases: los días de cursada. Si no venían, el día de la fecha inicial.
  const [dias, setDias] = useState<number[]>(
    inicial.dias && inicial.dias.length > 0
      ? inicial.dias
      : [desdeClave(inicial.fecha).getDay()]
  );
  const [invitadosIds, setInvitadosIds] = useState<string[]>(inicial.invitadosIds);
  // Para un parcial o una entrega el día de una clase: el id de la CLASE elegida,
  // `null` si se eligió «Horario personalizado», o `undefined` si todavía no se tocó
  // nada (ver `claseEfectiva` más abajo).
  const [claseElegida, setClaseElegida] = useState<string | null | undefined>(undefined);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // ---------- Lo derivado (se calcula en cada render) [JS 25] ----------

  const esClase = tipo === "clase";
  const esEstudio = tipo === "estudio";
  // Un parcial o una entrega pueden quedar en el horario de una clase de la materia.
  const puedeUsarClase = tipo === "parcial" || tipo === "entrega";

  // Las opciones de "Materia": "Ninguna", las que estoy cursando y, si se está
  // editando un evento de una materia que ya no curso, también esa (si no, se perdería).
  const enCurso = codigosEnCurso(materias);
  // Spread [JS 7]: los de ahora más, si hace falta, la del evento (sin `push`).
  const codigos =
    inicial.materiaId && !enCurso.includes(inicial.materiaId)
      ? [...enCurso, inicial.materiaId]
      : enCurso;
  const opcionesMateria = [
    { clave: SIN_MATERIA, etiqueta: "Ninguna" },
    ...codigos.map((codigo) => ({ clave: codigo, etiqueta: codigo })),
  ];

  // Los amigos a los que se puede invitar a estudiar.
  const amigos = estudiantes.filter((persona) => persona.relacion === "amigos");

  const claveInicio = aClaveFecha(fecha); // "AAAA-MM-DD" o `null`
  // El último día de clases del cuatrimestre de esa fecha (para las clases).
  const finCuatrimestre = claveInicio
    ? claveFecha(limitesDelCuatrimestre(desdeClave(claveInicio)).fin)
    : null;
  const claveHasta = repetirHasta ? aClaveFecha(repetirHasta) : null;
  const seRepite = !esClase && frecuencia !== "nunca";

  // Las CLASES de la materia elegida que caen EN ESE DÍA, ordenadas por hora. Es la
  // misma cuenta que hace la agenda: `ocurrenciasEntre` con un solo día y los cortes
  // (una materia que ya no se cursa no tiene clases). Si el día no tiene clase —un
  // sábado, por ejemplo— la lista queda vacía y la opción «Horario» no aparece.
  const clasesDelDia =
    puedeUsarClase && claveInicio && materiaId !== SIN_MATERIA
      ? ocurrenciasEntre(
          eventos.filter(
            (evento) =>
              evento.tipo === "clase" && evento.materiaId === materiaId && !evento.organizador
          ),
          claveInicio,
          claveInicio,
          cortesDeClases(materias)
        ).sort((a, b) => a.desde.localeCompare(b.desde))
      : [];
  // La clase en cuyo horario queda el evento, o `undefined` si el horario es propio:
  //   - ya se eligió una (o «personalizado», que es `null`): se usa esa elección;
  //   - todavía no se tocó nada: al CREAR arranca personalizado; al EDITAR, si el
  //     horario del evento coincide con el de una clase de ese día, se muestra elegida.
  const claseEfectiva =
    claseElegida === undefined
      ? editando
        ? clasesDelDia.find((c) => c.desde === inicial.desde && c.hasta === inicial.hasta)
        : undefined
      : clasesDelDia.find((c) => c.id === claseElegida);

  // Los errores: cada uno es un TEXTO (el mensaje) o `null` (sin error).
  const errorTitulo = titulo.trim().length === 0 ? "Poné un título." : null;
  const errorFecha = validarFecha(fecha);
  // Si queda en el horario de una clase, la hora ya es válida: no se revisa.
  const errorHora = claseEfectiva
    ? null
    : !ES_HORA.test(desde) || !ES_HORA.test(hasta)
      ? "Las horas van como HH:MM, por ejemplo 08:30."
      : aMinutos(hasta) <= aMinutos(desde)
        ? "La hora de fin tiene que ser posterior a la de inicio."
        : null;
  const errorDias = esClase && dias.length === 0 ? "Elegí al menos un día de cursada." : null;
  // "Repetir hasta" es opcional; si se escribió, tiene que ser válida y no anterior al inicio.
  const errorHasta =
    !seRepite || repetirHasta.length === 0
      ? null
      : validarFecha(repetirHasta) ??
        (claveInicio && claveHasta && claveHasta < claveInicio
          ? "Tiene que ser después de la primera fecha."
          : null);
  const hayErrores = Boolean(
    errorTitulo || errorFecha || errorHora || errorDias || errorHasta
  );

  // ---------- Acciones ----------

  // Agrega el valor si no estaba o lo saca si estaba (selección múltiple). Es una
  // actualización FUNCIONAL [JS 20] y siempre devuelve un array NUEVO.
  const alternarDia = (dia: number) =>
    setDias((actuales) =>
      actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia]
    );
  const alternarInvitado = (id: string) =>
    setInvitadosIds((actuales) =>
      actuales.includes(id) ? actuales.filter((i) => i !== id) : [...actuales, id]
    );
  const limpiarInvitados = () => setInvitadosIds([]);

  const guardar = async () => {
    setIntentoGuardar(true);
    setErrorGuardado(null);
    if (hayErrores || guardando || !claveInicio) return;

    setGuardando(true);
    try {
      await alGuardar({
        titulo: titulo.trim(), // sin espacios sobrantes
        tipo,
        // Si se eligió "Ninguna" —o es una juntada de estudio, que no lleva materia—,
        // el campo queda `undefined` (opcional).
        materiaId: esEstudio || materiaId === SIN_MATERIA ? undefined : materiaId,
        fecha: claveInicio,
        // En el horario de una clase: la hora de esa clase. Si no, la que se escribió.
        desde: claseEfectiva ? claseEfectiva.desde : desde,
        hasta: claseEfectiva ? claseEfectiva.hasta : hasta,
        // Lo escrito; si se dejó vacío y está en una clase, el aula de esa clase.
        lugar: lugar.trim() || claseEfectiva?.lugar || "",
        // `notas.trim() || undefined`: un texto vacío se guarda como `undefined`.
        notas: notas.trim() || undefined,
        // Una clase SIEMPRE se repite cada semana hasta el fin del cuatrimestre.
        frecuencia: esClase ? "semanal" : frecuencia,
        dias: esClase ? dias : undefined,
        repetirHasta: esClase
          ? (finCuatrimestre ?? undefined)
          : seRepite
            ? (claveHasta ?? undefined)
            : undefined,
        invitadosIds: esEstudio ? invitadosIds : [],
      });
    } catch (error) {
      setErrorGuardado(error instanceof Error ? error.message : "No se pudo guardar.");
      setGuardando(false);
    }
  };

  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenido}
      showsVerticalScrollIndicator={false}
      // Permite tocar botones y chips con el teclado abierto.
      keyboardShouldPersistTaps="handled"
      // En iOS, sube el contenido cuando aparece el teclado para no taparlo.
      automaticallyAdjustKeyboardInsets
    >
      {/* ---------- Título ---------- */}
      <Campo etiqueta="Título">
        <TextInput
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Parcial de Física I"
          placeholderTextColor={colores.textoDebil}
          style={estilos.input}
        />
      </Campo>
      {intentoGuardar && errorTitulo ? <Text style={estilos.error}>{errorTitulo}</Text> : null}

      {/* ---------- Tipo y materia (chips) ---------- */}
      <Campo etiqueta="Tipo">
        <ChipsFiltro opciones={TIPOS} valor={tipo} alCambiar={setTipo} />
      </Campo>
      {/* Una juntada de estudio no lleva materia: el título ya dice de qué es. */}
      {!esEstudio ? (
        <Campo etiqueta="Materia">
          <ChipsFiltro opciones={opcionesMateria} valor={materiaId} alCambiar={setMateriaId} />
        </Campo>
      ) : null}

      {/* ---------- Fecha (en una clase, desde cuándo) ---------- */}
      <Campo etiqueta={esClase ? "Empieza el" : "Fecha"}>
        <TextInput
          value={fecha}
          // Se tipean los números y las barras aparecen solas ("24102026" → "24/10/2026").
          onChangeText={(texto) => setFecha(formatearFecha(texto))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={colores.textoDebil}
          keyboardType="number-pad"
          maxLength={10} // "DD/MM/AAAA" tiene 10 caracteres
          style={estilos.input}
        />
      </Campo>
      {intentoGuardar && errorFecha ? <Text style={estilos.error}>{errorFecha}</Text> : null}

      {/* ---------- Horario: ¿en la clase de ese día o uno propio? ---------- */}
      {/* Solo aparece si es un parcial o una entrega de una materia que TIENE clase
          el día elegido. Si ese día no hay (un sábado), no se muestra nada de esto. */}
      {clasesDelDia.length > 0 ? (
        <>
          <Campo etiqueta="Horario">
            <ChipsFiltro
              opciones={[
                ...clasesDelDia.map((clase) => ({
                  clave: clase.id,
                  etiqueta: `En la clase · ${clase.desde} a ${clase.hasta}`,
                })),
                { clave: HORARIO_PERSONALIZADO, etiqueta: "Horario personalizado" },
              ]}
              valor={claseEfectiva?.id ?? HORARIO_PERSONALIZADO}
              alCambiar={(clave) =>
                setClaseElegida(clave === HORARIO_PERSONALIZADO ? null : clave)
              }
            />
          </Campo>
          {!claseEfectiva ? (
            <Text style={estilos.textoTenue}>
              Ese día tenés clase de esta materia. Si querés, el {etiquetasTipo[tipo].toLowerCase()}{" "}
              puede quedar en su horario.
            </Text>
          ) : null}
        </>
      ) : null}

      {claseEfectiva ? (
        // En el horario de la clase: no se escriben las horas, se muestran las de la clase.
        <View style={estilos.aviso}>
          <Ionicons name="time-outline" size={16} color={colores.azulClaro} />
          <Text style={estilos.textoAviso}>
            Queda en el horario de la clase: {claseEfectiva.desde} a {claseEfectiva.hasta}
            {claseEfectiva.lugar ? ` · ${claseEfectiva.lugar}` : ""}.
          </Text>
        </View>
      ) : (
        <>
          {/* ---------- Horas: "Desde" y "Hasta" en dos columnas ---------- */}
          <View style={estilos.filaHoras}>
            <View style={estilos.columnaHora}>
              <Campo etiqueta="Desde">
                <TextInput
                  value={desde}
                  onChangeText={setDesde}
                  placeholder="HH:MM"
                  placeholderTextColor={colores.textoDebil}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5} // "HH:MM" tiene 5 caracteres
                  style={estilos.input}
                />
              </Campo>
            </View>
            <View style={estilos.columnaHora}>
              <Campo etiqueta="Hasta">
                <TextInput
                  value={hasta}
                  onChangeText={setHasta}
                  placeholder="HH:MM"
                  placeholderTextColor={colores.textoDebil}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={estilos.input}
                />
              </Campo>
            </View>
          </View>
          {intentoGuardar && errorHora ? <Text style={estilos.error}>{errorHora}</Text> : null}
        </>
      )}

      {/* ---------- Repetición ---------- */}
      {esClase ? (
        <>
          {/* La clase: se eligen los días y la repetición queda fija. */}
          <Campo etiqueta="Días de cursada">
            <ChipsMultiples
              opciones={DIAS.map((d) => ({ clave: String(d.valor), etiqueta: d.etiqueta }))}
              elegidas={dias.map(String)}
              alTocar={(clave) => alternarDia(Number(clave))}
            />
          </Campo>
          {intentoGuardar && errorDias ? <Text style={estilos.error}>{errorDias}</Text> : null}
          <View style={estilos.aviso}>
            <Ionicons name="repeat" size={16} color={colores.azulClaro} />
            <Text style={estilos.textoAviso}>
              Las clases se repiten todas las semanas
              {finCuatrimestre
                ? ` hasta el fin del cuatrimestre (${etiquetaDiaLargo(desdeClave(finCuatrimestre))})`
                : " hasta el fin del cuatrimestre"}{" "}
              o hasta que apruebes la cursada.
            </Text>
          </View>
        </>
      ) : (
        <>
          <Campo etiqueta="Repetición">
            <ChipsFiltro opciones={FRECUENCIAS} valor={frecuencia} alCambiar={setFrecuencia} />
          </Campo>
          {seRepite ? (
            <Campo etiqueta="Repetir hasta (opcional)">
              <TextInput
                value={repetirHasta}
                onChangeText={(texto) => setRepetirHasta(formatearFecha(texto))}
                placeholder="DD/MM/AAAA · vacío = siempre"
                placeholderTextColor={colores.textoDebil}
                keyboardType="number-pad"
                maxLength={10}
                style={estilos.input}
              />
            </Campo>
          ) : null}
          {errorHasta ? <Text style={estilos.error}>{errorHasta}</Text> : null}
        </>
      )}

      {/* ---------- Invitados (solo en una juntada de estudio) ---------- */}
      {esEstudio ? (
        <Campo etiqueta="Invitar amigos">
          {amigos.length === 0 ? (
            <Text style={estilos.textoTenue}>
              Todavía no tenés amigos para invitar. Agregá compañeros en Conectar.
            </Text>
          ) : (
            <>
              {/* Lista con scroll y buscador por nombre: sirve con 3 amigos o con 300. */}
              <SelectorAmigos
                amigos={amigos}
                elegidos={invitadosIds}
                alAlternar={alternarInvitado}
                alLimpiar={limpiarInvitados}
              />
              <Text style={estilos.textoTenue}>
                A cada uno le llega una invitación que puede aceptar o rechazar.
              </Text>
            </>
          )}
        </Campo>
      ) : null}

      {/* ---------- Lugar y notas ---------- */}
      <Campo etiqueta="Lugar">
        <TextInput
          value={lugar}
          onChangeText={setLugar}
          placeholder="Aula 302"
          placeholderTextColor={colores.textoDebil}
          style={estilos.input}
        />
      </Campo>
      <Campo etiqueta="Notas">
        <TextInput
          value={notas}
          onChangeText={setNotas}
          placeholder="Qué entra, qué llevar…"
          placeholderTextColor={colores.textoDebil}
          style={[estilos.input, estilos.inputLargo]}
          multiline // permite varias líneas
          textAlignVertical="top" // en Android, el texto arranca arriba
        />
      </Campo>

      {errorGuardado ? <Text style={estilos.error}>{errorGuardado}</Text> : null}

      {/* ---------- Botón de guardar ---------- */}
      <Pressable
        onPress={guardar}
        disabled={guardando}
        style={({ pressed }) => [
          estilos.boton,
          guardando && estilos.apagado,
          pressed && estilos.presionado,
        ]}
      >
        <Ionicons name="checkmark-circle-outline" size={18} color={colores.blanco} />
        <Text style={estilos.textoBoton}>{guardando ? "Guardando…" : textoBoton}</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTES AUXILIARES (privados)
// ---------------------------------------------------------------------------

// Un campo con su rótulo arriba. Lo que va entre `<Campo>` y `</Campo>`
// (`children`) se dibuja debajo del rótulo.
function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>
      {children}
    </View>
  );
}

// Chips en los que se pueden elegir VARIOS (a diferencia de `ChipsFiltro`, que
// tiene uno solo activo). No guarda nada: recibe cuáles están elegidos y avisa
// cuál se tocó [JS 23] "datos bajan, eventos suben".
function ChipsMultiples({
  opciones,
  elegidas,
  alTocar,
}: {
  opciones: { clave: string; etiqueta: string }[];
  elegidas: string[];
  alTocar: (clave: string) => void;
}) {
  return (
    <View style={estilos.filaChips}>
      {opciones.map((opcion) => {
        const activa = elegidas.includes(opcion.clave);
        return (
          <Pressable
            key={opcion.clave}
            onPress={() => alTocar(opcion.clave)}
            style={({ pressed }) => [
              estilos.chip,
              activa && estilos.chipActivo,
              pressed && estilos.presionado,
            ]}
          >
            {activa ? <Ionicons name="checkmark" size={13} color={colores.blanco} /> : null}
            <Text style={[estilos.textoChip, activa && estilos.textoChipActivo]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  scroll: {
    flex: 1,
  },

  contenido: {
    padding: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.lg,
  },

  // Un campo: rótulo arriba y control abajo (en columna, con poca separación).
  campo: {
    gap: espaciado.sm,
  },

  etiquetaCampo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  // El recuadro de todos los campos de texto.
  input: {
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.md,
    fontSize: 15,
    color: colores.textoSuave,
  },

  // Se suma a `input` en el campo de notas para que sea más alto.
  inputLargo: {
    minHeight: 92,
  },

  // "Desde" y "Hasta" en fila, cada uno con el mismo ancho.
  filaHoras: {
    flexDirection: "row",
    gap: espaciado.md,
  },

  columnaHora: {
    flex: 1,
  },

  // El mensaje de error va pegado debajo de su campo: el margen negativo anula
  // el `gap` del contenedor.
  error: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    color: colores.alerta,
  },

  // El aviso de cómo se repiten las clases: ícono y texto en fila.
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.sm,
    marginTop: -espaciado.xs,
    borderRadius: radios.md,
    backgroundColor: colores.primarioProfundo,
    padding: espaciado.md,
  },

  textoAviso: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colores.azulPalido,
  },

  textoTenue: {
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },

  // Los chips de selección múltiple: mismo aspecto que los de `ChipsFiltro`.
  filaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espaciado.sm,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radios.pastilla,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficie,
    paddingVertical: 7,
    paddingHorizontal: espaciado.md,
  },

  chipActivo: {
    borderColor: colores.primario,
    backgroundColor: colores.primario,
  },

  textoChip: {
    fontSize: 13,
    color: colores.textoTenue,
  },

  textoChipActivo: {
    color: colores.blanco,
    fontWeight: "600",
  },

  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primario,
    paddingVertical: espaciado.md + 2,
  },

  textoBoton: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  apagado: {
    opacity: 0.5,
  },

  presionado: {
    opacity: 0.7,
  },
});

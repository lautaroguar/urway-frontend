/**
 * ============================================================================
 * app/rendi.tsx — "Rendí": cargar un parcial, recuperatorio, TP, exposición o final
 * ============================================================================
 *
 * QUÉ ES:
 *   El formulario con el que el estudiante AUTOGESTIONA sus materias: dice qué
 *   rindió, de qué materia, qué nota sacó y cuándo (la fecha arranca en HOY y se
 *   puede cambiar). Al guardarlo, eso entra al historial de la materia y su estado
 *   se recalcula solo:
 *
 *     Parcial / Recuperatorio / TP / Exposición
 *       → "¿Con esto terminaste de cursar?"  Sí y aprobado → Pendiente de final
 *     Recuperatorio desaprobado (menos de 4)
 *       → dos botones: "Aún puedo aprobar" (sigue en curso) o "Recursar la materia"
 *     Final aprobado → Aprobada (la nota cuenta para el promedio)
 *     Final desaprobado
 *       → dos botones: "Aún puedo rendirlo" (sigue pendiente) o "Recursar la materia"
 *
 *   Antes de guardar se muestra "Qué va a pasar", para que no haya sorpresas.
 *
 * DESDE DÓNDE SE ABRE:
 *   - Inicio ("¿Rendiste algo?") → sin parámetros.
 *   - Inicio, "Finales pendientes" → `?tipo=final&materiaId=INF-102`.
 *   - El detalle de una materia → `?materiaId=MAT-201`.
 *
 * QUÉ MATERIAS SE OFRECEN:
 *   Solo las que permiten cargar ese tipo: lo de la cursada, las que están "en
 *   curso"; el final, las "pendientes de final" (`materiasPara`).
 *
 * TEORÍA:
 *   [JS 23] Formulario controlado: `value` + `onChangeText` en cada campo.
 *   [JS 25] Estado derivado: los errores, la consecuencia y qué botones mostrar
 *           se CALCULAN en el render; `intento` evita mostrar errores antes de tiempo.
 *   [JS 20] `useState` con valor inicial calculado (una función).
 *   [JS 14] `async/await` + `try/catch` al guardar.
 *   [JS 29] `registrarInstancia` viene del Context.
 *   [NAV]   `useLocalSearchParams` para los parámetros y `router.back()` al terminar.
 *   [COMP]  `ChipsFiltro`, `OpcionesPregunta`, `TextInput`, `Pressable`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { OpcionesPregunta } from "@/componentes/OpcionesPregunta";
import { Tarjeta } from "@/componentes/Tarjeta";
import {
  etiquetasEstado,
  etiquetasInstancia,
  type BorradorInstancia,
  type TipoInstancia,
} from "@/datos/carrera";
import { useDatos } from "@/estado/datos";
import { colores, espaciado, radios } from "@/tema/colores";
import { aClaveFecha, aTextoFecha, claveFecha } from "@/utilidades/fechas";
import {
  aprobo,
  consecuencia,
  esDeCursada,
  materiasPara,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  permiteRecursar,
  validarInstancia,
  validarNota,
} from "@/utilidades/materias";
import {
  formatearFecha,
  soloDigitos,
  validarFecha,
} from "@/utilidades/validaciones";

// Las cinco opciones de "¿Qué rendiste?", en el orden en que suelen pasar.
const TIPOS: { clave: TipoInstancia; etiqueta: string }[] = [
  { clave: "parcial", etiqueta: etiquetasInstancia.parcial },
  { clave: "recuperatorio", etiqueta: etiquetasInstancia.recuperatorio },
  { clave: "tp", etiqueta: "TP" }, // corto para que entre en el chip
  { clave: "exposicion", etiqueta: etiquetasInstancia.exposicion },
  { clave: "final", etiqueta: etiquetasInstancia.final },
];

// Las dos respuestas de "¿Terminaste de cursar?".
const RESPUESTAS: { clave: "si" | "no"; etiqueta: string }[] = [
  { clave: "no", etiqueta: "No, sigo cursando" },
  { clave: "si", etiqueta: "Sí, terminé de cursar" },
];

/** ¿El texto que llegó por la ruta es uno de los tipos válidos? (un "type guard") */
function esTipo(valor: string | undefined): valor is TipoInstancia {
  return TIPOS.some((opcion) => opcion.clave === valor);
}

/** Formulario para cargar algo rendido. */
export default function PantallaRendi() {
  const router = useRouter();
  // Los parámetros llegan como texto y pueden faltar (`?`).
  const parametros = useLocalSearchParams<{ materiaId?: string; tipo?: string }>();
  const { materias, registrarInstancia } = useDatos();

  // El tipo con el que arranca: el que llegó por la ruta o, si la materia que llegó
  // está pendiente de final, "final"; si no, "parcial".
  const materiaPedida = materias.find((m) => m.id === parametros.materiaId);
  const tipoInicial: TipoInstancia = esTipo(parametros.tipo)
    ? parametros.tipo
    : materiaPedida?.estado === "pendienteFinal"
      ? "final"
      : "parcial";

  // ESTADO DEL FORMULARIO: un `useState` por campo.
  const [tipo, setTipo] = useState<TipoInstancia>(tipoInicial);
  // Valor inicial con una FUNCIÓN: se calcula una sola vez, al abrir la pantalla.
  // Si la materia pedida sirve para el tipo, esa; si no, la primera que sirva.
  const [materiaId, setMateriaId] = useState<string | null>(() => {
    const validas = materiasPara(tipoInicial, materias);
    return validas.some((m) => m.id === parametros.materiaId)
      ? (parametros.materiaId ?? null)
      : (validas[0]?.id ?? null);
  });
  const [nota, setNota] = useState("");
  // La fecha arranca en HOY, ya escrita como "24/10/2026" (se puede cambiar).
  const [fecha, setFecha] = useState(aTextoFecha(claveFecha(new Date())));
  const [terminoCursada, setTerminoCursada] = useState(false);
  // ¿Ya se intentó guardar? Hasta entonces no se muestran los errores.
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // ---------- Todo lo de abajo se CALCULA en cada render [JS 25] ----------

  // Las materias en las que se puede cargar este tipo, y la elegida.
  const validas = materiasPara(tipo, materias);
  const materia = validas.find((m) => m.id === materiaId);

  const errorNota = validarNota(nota);
  const errorFormatoFecha = validarFecha(fecha);
  const clave = aClaveFecha(fecha); // "AAAA-MM-DD" o `null` si no es válida
  // La nota como número, solo si es válida.
  const notaNumero = errorNota ? null : Number(nota);
  const desaprobado = notaNumero !== null && !aprobo(notaNumero);
  // Desaprobar un recuperatorio o un final pide elegir cómo sigue la materia.
  const pideDecision = desaprobado && permiteRecursar(tipo);
  // "¿Terminaste de cursar?" solo para lo de la cursada y si no está desaprobado.
  const preguntaCursada = esDeCursada(tipo) && !desaprobado;

  // El borrador que se guardaría (o `null` si todavía falta algo).
  const armar = (recursa: boolean): BorradorInstancia | null => {
    if (!materia || notaNumero === null || !clave) return null;
    return {
      materiaId: materia.id,
      tipo,
      nota: notaNumero,
      fecha: clave,
      // `|| undefined`: si es `false`, el campo directamente no va.
      cierraCursada: (preguntaCursada && terminoCursada) || undefined,
      recursa: recursa || undefined,
    };
  };
  const borrador = armar(false);
  // Las reglas que dependen de la materia (fecha futura, fecha anterior a lo último...).
  const errorRegla = materia && borrador ? validarInstancia(materia, borrador) : null;
  const errorFecha = errorFormatoFecha ?? errorRegla;

  // ---------- Acciones ----------

  // Al cambiar el tipo, si la materia elegida ya no sirve, se elige la primera que
  // sirva. Se hace ACÁ (en el evento) y no con un `useEffect` [JS 26].
  const elegirTipo = (nuevo: TipoInstancia) => {
    setTipo(nuevo);
    const nuevasValidas = materiasPara(nuevo, materias);
    if (!nuevasValidas.some((m) => m.id === materiaId)) {
      setMateriaId(nuevasValidas[0]?.id ?? null);
    }
    setErrorGuardado(null);
  };

  // Guarda. `recursa` dice cuál de los dos botones se tocó al desaprobar.
  const guardar = async (recursa: boolean) => {
    setIntento(true);
    setErrorGuardado(null);
    if (guardando || !materia || errorNota || errorFecha) return;
    const aGuardar = armar(recursa);
    if (!aGuardar) return;

    setGuardando(true);
    try {
      // `await` espera a que el Context (o el servidor) lo guarde.
      await registrarInstancia(aGuardar);
      router.back(); // vuelve a donde estaba: ya muestra la materia actualizada
    } catch (error) {
      // `instanceof Error` asegura que el error tenga `message`.
      setErrorGuardado(error instanceof Error ? error.message : "No se pudo guardar.");
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" // tocar botones con el teclado abierto
        automaticallyAdjustKeyboardInsets // en iOS, que el teclado no tape los campos
      >
        {/* ---------- ¿Qué rendiste? ---------- */}
        <Campo etiqueta="¿Qué rendiste?">
          <ChipsFiltro opciones={TIPOS} valor={tipo} alCambiar={elegirTipo} />
        </Campo>

        {/* ---------- ¿De qué materia? ---------- */}
        {validas.length === 0 ? (
          // ESTADO VACÍO: no hay ninguna materia donde cargar este tipo.
          <Tarjeta style={estilos.vacia}>
            <Ionicons name="information-circle-outline" size={20} color={colores.textoTenue} />
            <Text style={estilos.textoVacio}>
              {tipo === "final"
                ? "No tenés finales pendientes. Cuando termines una cursada (cargando el último parcial, TP o exposición con «Terminé de cursar»), la materia aparece acá."
                : "No tenés materias en curso para cargar."}
            </Text>
          </Tarjeta>
        ) : (
          <OpcionesPregunta
            pregunta="¿De qué materia?"
            // Una opción por materia: el código va en la etiqueta para distinguirlas.
            opciones={validas.map((m) => ({ clave: m.id, etiqueta: `${m.nombre} · ${m.id}` }))}
            valor={materiaId}
            alElegir={setMateriaId}
            error={intento && !materia ? "Elegí una materia." : null}
          />
        )}

        {/* ---------- Nota y fecha, en dos columnas ---------- */}
        <View style={estilos.filaDoble}>
          <View style={estilos.columna}>
            <Campo etiqueta={`Nota (${NOTA_MINIMA} a ${NOTA_MAXIMA})`}>
              <TextInput
                value={nota}
                // Solo números, como mucho dos ("10").
                onChangeText={(texto) => setNota(soloDigitos(texto, 2))}
                placeholder="Por ejemplo, 8"
                placeholderTextColor={colores.textoDebil}
                keyboardType="number-pad"
                maxLength={2}
                style={[estilos.input, intento && errorNota && estilos.inputError]}
              />
            </Campo>
          </View>
          <View style={estilos.columna}>
            <Campo etiqueta="Fecha">
              <TextInput
                value={fecha}
                // Se escriben solo los números y las barras aparecen solas.
                onChangeText={(texto) => setFecha(formatearFecha(texto))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colores.textoDebil}
                keyboardType="number-pad"
                maxLength={10}
                style={[estilos.input, errorFecha && intento && estilos.inputError]}
              />
            </Campo>
          </View>
        </View>
        {/* La nota ya escrita se califica al instante; los errores, al intentar guardar. */}
        {notaNumero !== null ? (
          <Text style={[estilos.calificacion, desaprobado && estilos.calificacionMal]}>
            {desaprobado ? "Desaprobado (menos de 4)" : "Aprobado"}
          </Text>
        ) : null}
        {intento && errorNota ? <Text style={estilos.error}>{errorNota}</Text> : null}
        {/* El error de la fecha (formato o reglas) se muestra siempre que haya uno
            de las reglas: es información útil aunque no se haya intentado guardar. */}
        {errorFecha && (intento || errorRegla) ? (
          <Text style={estilos.error}>{errorFecha}</Text>
        ) : null}

        {/* ---------- ¿Terminaste de cursar? (solo cursada aprobada o sin nota aún) ---------- */}
        {preguntaCursada ? (
          <Campo etiqueta="¿Con esto terminaste de cursar la materia?">
            <ChipsFiltro
              opciones={RESPUESTAS}
              valor={terminoCursada ? "si" : "no"}
              alCambiar={(clave) => setTerminoCursada(clave === "si")}
            />
          </Campo>
        ) : null}
        {/* Un parcial, TP o exposición desaprobado no cierra la cursada. */}
        {desaprobado && esDeCursada(tipo) && !permiteRecursar(tipo) ? (
          <Text style={estilos.ayuda}>
            Con menos de 4 no se aprueba la cursada. Si tenés recuperatorio, cargalo
            cuando lo rindas.
          </Text>
        ) : null}

        {/* ---------- Qué va a pasar (antes de guardar) ---------- */}
        {materia && borrador && !pideDecision && !errorRegla ? (
          <Tarjeta style={estilos.consecuencia}>
            <Ionicons name="sparkles-outline" size={18} color={colores.azulClaro} />
            <View style={estilos.textosConsecuencia}>
              <Text style={estilos.rotuloConsecuencia}>
                Ahora: {etiquetasEstado[materia.estado]}
              </Text>
              <Text style={estilos.textoConsecuencia}>
                {consecuencia(materia, borrador)}
              </Text>
            </View>
          </Tarjeta>
        ) : null}

        {errorGuardado ? <Text style={estilos.error}>{errorGuardado}</Text> : null}

        {/* ---------- Botones ---------- */}
        {pideDecision && materia && borrador ? (
          // Desaprobó un recuperatorio o un final: ¿cómo sigue la materia?
          <View style={estilos.decision}>
            <Text style={estilos.preguntaDecision}>
              Desaprobaste. ¿Cómo sigue la materia?
            </Text>
            <BotonDecision
              titulo={tipo === "final" ? "Aún puedo rendirlo" : "Aún puedo aprobar"}
              detalle={consecuencia(materia, borrador)}
              icono="trending-up"
              principal
              apagado={guardando}
              alTocar={() => guardar(false)}
            />
            <BotonDecision
              titulo="Recursar la materia"
              detalle={consecuencia(materia, { ...borrador, recursa: true })}
              icono="refresh"
              apagado={guardando}
              alTocar={() => guardar(true)}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => guardar(false)}
            disabled={guardando || validas.length === 0}
            style={({ pressed }) => [
              estilos.boton,
              (guardando || validas.length === 0) && estilos.apagado,
              pressed && estilos.presionado,
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colores.blanco} />
            <Text style={estilos.textoBoton}>{guardando ? "Guardando…" : "Guardar"}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTES AUXILIARES (privados)
// ---------------------------------------------------------------------------

// Un campo con su rótulo arriba (igual que en el formulario de eventos).
function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>
      {children}
    </View>
  );
}

// Uno de los dos botones grandes de la decisión, con su explicación abajo.
function BotonDecision({
  titulo,
  detalle,
  icono,
  principal = false,
  apagado,
  alTocar,
}: {
  titulo: string;
  detalle: string;
  icono: keyof typeof Ionicons.glyphMap;
  principal?: boolean;
  apagado: boolean;
  alTocar: () => void;
}) {
  return (
    <Pressable
      onPress={alTocar}
      disabled={apagado}
      style={({ pressed }) => [
        estilos.botonDecision,
        principal && estilos.botonDecisionPrincipal,
        apagado && estilos.apagado,
        pressed && estilos.presionado,
      ]}
    >
      <Ionicons
        name={icono}
        size={20}
        color={principal ? colores.blanco : colores.alerta}
      />
      <View style={estilos.textosDecision}>
        <Text style={[estilos.tituloDecision, !principal && { color: colores.alerta }]}>
          {titulo}
        </Text>
        <Text style={[estilos.detalleDecision, principal && { color: colores.azulPalido }]}>
          {detalle}
        </Text>
      </View>
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
    gap: espaciado.lg,
  },

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

  // Nota y fecha en fila, cada una con el mismo ancho.
  filaDoble: {
    flexDirection: "row",
    gap: espaciado.md,
  },

  columna: {
    flex: 1,
  },

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

  inputError: {
    borderColor: colores.alerta,
  },

  // "Aprobado" / "Desaprobado", pegado debajo de la nota (margen negativo = anula el `gap`).
  calificacion: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  calificacionMal: {
    color: colores.alerta,
  },

  error: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    color: colores.alerta,
  },

  ayuda: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },

  vacia: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.md,
  },

  textoVacio: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoTenue,
  },

  // "Qué va a pasar": ícono y textos en fila.
  consecuencia: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.md,
    borderColor: colores.primarioOscuro,
  },

  textosConsecuencia: {
    flex: 1,
    gap: 2,
  },

  rotuloConsecuencia: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colores.textoTenue,
  },

  textoConsecuencia: {
    fontSize: 14,
    lineHeight: 20,
    color: colores.textoSuave,
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

  // La decisión al desaprobar: la pregunta y los dos botones en columna.
  decision: {
    gap: espaciado.md,
  },

  preguntaDecision: {
    fontSize: 16,
    fontWeight: "700",
    color: colores.texto,
  },

  // El botón de "Recursar": solo con borde rojizo.
  botonDecision: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.alerta,
    padding: espaciado.md,
  },

  // El de "Aún puedo...": azul relleno (pisa el borde y suma el fondo).
  botonDecisionPrincipal: {
    borderColor: colores.primario,
    backgroundColor: colores.primario,
  },

  textosDecision: {
    flex: 1,
    gap: 2,
  },

  tituloDecision: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.blanco,
  },

  detalleDecision: {
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoTenue,
  },

  apagado: {
    opacity: 0.5,
  },

  presionado: {
    opacity: 0.7,
  },
});

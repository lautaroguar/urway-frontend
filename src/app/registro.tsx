/**
 * ============================================================================
 * app/registro.tsx — Crear cuenta
 * ============================================================================
 *
 * QUÉ ES:
 *   El formulario de registro. Se abre desde "Crear cuenta" del login y se apila
 *   encima de él (con botón de volver). Tiene tres bloques:
 *     1. TUS DATOS: nombre, apellido, fecha de nacimiento y DNI. Se pueden
 *        completar a mano o escaneando el código de barras del DNI.
 *     2. TU CUENTA: correo y contraseña, siempre a mano.
 *     3. TU CARRERA: dos preguntas con opciones (facultad y carrera).
 *
 * ESCANEAR EL DNI (OPCIONAL):
 *   "Escanear mi DNI" abre la cámara (con linterna y zoom). Lo leído pasa por
 *   `leerDatosDni`, que solo devuelve los datos que pasan las mismas validaciones
 *   del formulario: lo que no se pudo leer bien queda VACÍO y se completa a mano.
 *   Todo lo leído se puede corregir. (En iPhone el texto del código llega con
 *   caracteres rotos y es normal que se lean pocos datos: ver el informe del sprint 1.)
 *
 * VALIDACIÓN DE FORMATO:
 *   Cada error se CALCULA en el render con las funciones de
 *   `utilidades/validaciones.ts`. No se muestran hasta que se intenta crear la
 *   cuenta (`intento`) y a partir de ahí se actualizan mientras se escribe.
 *
 * AL TERMINAR:
 *   Con todo válido CREA la cuenta en el BACKEND (`registrar` de `estado/sesion.tsx`
 *   → `POST /api/auth/registro`; el servidor guarda la contraseña como hash) y
 *   vuelve al login:
 *   `router.dismissAll()` y después `router.replace("/login")` (lo mismo que
 *   "Cerrar sesión"), para que quede UN solo login en la pila. Va con el
 *   parámetro `registrado=1` y el login muestra un aviso de "Cuenta creada". Para
 *   entrar con esa cuenta hay que iniciar sesión (no entra sola).
 *
 * CORREO REPETIDO:
 *   Si ya hay una cuenta con ese correo, el servidor responde 409. La pantalla
 *   guarda ESE correo (`correoRepetido`) y el campo muestra el error mientras no
 *   se lo cambie: el mensaje sigue siendo un valor DERIVADO.
 *
 * TEORÍA:
 *   [JS 23]   Formulario controlado: `value` + `onChangeText` en cada campo.
 *   [JS 25]   Estado derivado: todos los `error...` y `hayErrores`.
 *   [JS 20]   `useState` (varios) y actualización funcional.
 *   [JS 7]    Spread de props (`{...resto}`) para pasar todo a `TextInput`.
 *   [JS 14]   `async/await` y `try/catch`: guardar la cuenta tarda y puede fallar.
 *   [CTX]     `useSesion()` (`estado/sesion.tsx`) para crear la cuenta.
 *   [NAV]     `router.dismissAll` + `router.replace` con parámetros.
 *   [SENS 26] La cámara de `EscanerDni` (`expo-camera`).
 *   [COMP]    `TextInput` (keyboardType, maxLength, secureTextEntry), `Pressable`.
 */
// Íconos de Ionicons: el escáner, la lupa, el ojito de la contraseña, los tildes.
import { Ionicons } from "@expo/vector-icons";
// `useRouter` da el "router": el objeto con el que se navega desde el código.
import { useRouter } from "expo-router";
// `ErrorApi` trae el status del servidor (409 = correo repetido); `mensajeDe`, el texto.
import { ErrorApi, mensajeDe } from "@/api/cliente";
// `useState` guarda valores que, al cambiar, vuelven a dibujar la pantalla.
// `type ReactNode` es el tipo de "cualquier cosa que React pueda dibujar".
import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  // El TIPO con todas las props de un `TextInput` (se usa en `CampoTexto`).
  type TextInputProps,
} from "react-native";

// El panel con la cámara que lee el código de barras del DNI.
import { EscanerDni } from "@/componentes/EscanerDni";
// Una pregunta con opciones de las que se elige una.
import { OpcionesPregunta } from "@/componentes/OpcionesPregunta";
import { Tarjeta } from "@/componentes/Tarjeta";
// Las opciones de las dos preguntas del registro.
import { carreras, facultades } from "@/datos/registro";
// `useSesion` ofrece `registrar` del Context de la sesión.
import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";
// Interpreta el texto del código de barras y devuelve solo los datos confiables.
import { leerDatosDni } from "@/utilidades/dni";
import {
  formatearFecha, // "01021990" → "01/02/1990"
  soloDigitos, // deja solo números
  validarContrasenia,
  validarDni,
  validarEmail,
  validarFechaNacimiento,
  validarNombre,
} from "@/utilidades/validaciones";

// El resultado del escaneo, para mostrarlo: si fue bueno o no, y qué decir.
// Es un objeto con dos campos: `bueno` decide el ícono y el color, `texto` el mensaje.
type AvisoDni = { bueno: boolean; texto: string };

/** Formulario de registro. */
export default function PantallaRegistro() {
  const router = useRouter();
  // De la sesión: crear la cuenta (en el servidor).
  const { registrar } = useSesion();

  // ESTADO DEL FORMULARIO: un `useState` por campo (formulario controlado).
  // Cada uno devuelve [valor, función para cambiarlo]; todos arrancan vacíos.
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState(""); // "DD/MM/AAAA"
  const [dni, setDni] = useState(""); // solo números, sin puntos
  const [email, setEmail] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [mostrarContrasenia, setMostrarContrasenia] = useState(false); // ¿se ve la contraseña?
  // Las preguntas guardan la `clave` elegida, o `null` si todavía no se eligió.
  // `useState<string | null>` dice que el valor es un texto o `null`.
  const [facultad, setFacultad] = useState<string | null>(null);
  const [carrera, setCarrera] = useState<string | null>(null);
  // ¿Ya se apretó "Crear cuenta"? Hasta entonces no se muestran los errores.
  const [intento, setIntento] = useState(false);
  // ¿Está abierta la cámara? Y qué pasó con el último escaneo.
  const [escaneando, setEscaneando] = useState(false);
  const [avisoDni, setAvisoDni] = useState<AvisoDni | null>(null);
  // Mientras se guarda la cuenta (evita un segundo toque) y si falló al guardar.
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  // El correo que el servidor dijo que ya tiene cuenta (409), para marcarlo.
  const [correoRepetido, setCorreoRepetido] = useState<string | null>(null);

  // ERRORES DERIVADOS [JS 25]: cada uno es un TEXTO (el mensaje) o `null`.
  // Se recalculan en cada render a partir de lo escrito: no se guardan en estado.
  const errorNombre = validarNombre(nombre, "nombre"); // el 2º argumento arma el mensaje
  const errorApellido = validarNombre(apellido, "apellido");
  const errorFecha = validarFechaNacimiento(fechaNacimiento);
  const errorDni = validarDni(dni);
  // `??` usa el segundo valor solo si el primero es `null`: primero el error de
  // formato y, si el correo está bien escrito, que no esté ya registrado.
  const errorEmail =
    validarEmail(email) ??
    (correoRepetido !== null &&
    email.trim().toLowerCase() === correoRepetido.trim().toLowerCase()
      ? "Ya existe una cuenta con ese correo. Ingresá desde el login."
      : null);
  const errorContrasenia = validarContrasenia(contrasenia);
  // Una pregunta sin responder (`null`) es un error; respondida, no hay error.
  const errorFacultad = facultad === null ? "Elegí una opción." : null;
  const errorCarrera = carrera === null ? "Elegí una opción." : null;
  // `Boolean(a || b || ...)`: `||` devuelve el primer valor "verdadero" (un
  // mensaje es verdadero, `null` es falso). `Boolean` lo convierte en true/false:
  // `true` si AL MENOS UN campo tiene error.
  const hayErrores = Boolean(
    errorNombre ||
      errorApellido ||
      errorFecha ||
      errorDni ||
      errorEmail ||
      errorContrasenia ||
      errorFacultad ||
      errorCarrera
  );

  // Se ejecuta cuando la cámara lee un código. Completa solo lo que se pudo
  // leer y cierra la cámara.
  const alLeerDni = (texto: string) => {
    // `datos` es un objeto con SOLO los campos que se leyeron bien (los demás no
    // existen), por ejemplo `{ dni: "12345678" }`.
    const datos = leerDatosDni(texto);
    // Cada `if` pisa SOLO el campo que se leyó bien: lo demás queda como estaba.
    // `if (datos.nombre)` es verdadero si existe y no está vacío.
    if (datos.nombre) setNombre(datos.nombre);
    if (datos.apellido) setApellido(datos.apellido);
    if (datos.fechaNacimiento) setFechaNacimiento(datos.fechaNacimiento);
    if (datos.dni) setDni(datos.dni);

    // `Object.keys(datos).length` = cuántos datos se leyeron (0 a 4).
    const leidos = Object.keys(datos).length;
    // Tres casos, según cuántos se leyeron: ninguno, los cuatro o algunos.
    if (leidos === 0) {
      setAvisoDni({
        bueno: false,
        texto:
          "Leímos el código pero no pudimos usar sus datos. Probá de nuevo o completalos a mano.",
      });
    } else if (leidos === 4) {
      setAvisoDni({
        bueno: true,
        texto: "Leímos los 4 datos de tu DNI. Revisá que estén bien.",
      });
    } else {
      setAvisoDni({
        bueno: true,
        // La plantilla `${...}` mete el número dentro del texto.
        texto: `Leímos ${leidos} de 4 datos. Completá los que faltan y revisá los demás.`,
      });
    }
    // En los tres casos se cierra la cámara (para reintentar se toca el botón de nuevo).
    setEscaneando(false);
  };

  // Se ejecuta al tocar "Crear cuenta". Es `async` porque guardar la cuenta tarda.
  const crearCuenta = async () => {
    // Desde ahora los errores (si los hay) se muestran.
    setIntento(true);
    // Si hay errores (o ya se está guardando) no se avanza. Las preguntas sin
    // responder ya cuentan como error, pero TypeScript necesita comprobar que no
    // son `null` para poder usarlas como texto.
    if (hayErrores || guardando || facultad === null || carrera === null) return;

    // Se marca que se está guardando (el botón se apaga) y se borra un error viejo.
    setGuardando(true);
    setErrorGuardado(null);
    // `try/catch`: si algo falla dentro del `try`, se salta al `catch` en lugar
    // de romper la app.
    try {
      // `await` PAUSA hasta que el servidor crea la cuenta.
      await registrar({
        nombre: nombre.trim(), // `trim` saca los espacios de los extremos
        apellido: apellido.trim(),
        fechaNacimiento,
        dni,
        email, // el servidor lo guarda en minúsculas y sin espacios
        contrasenia, // viaja una sola vez; el servidor guarda solo su hash
        facultad,
        carrera,
      });
    } catch (error) {
      // 409: ese correo ya tiene cuenta → se marca en el campo del correo. Si no,
      // el mensaje del servidor (o "no se pudo conectar") va abajo del formulario.
      if (error instanceof ErrorApi && error.estado === 409) {
        setCorreoRepetido(email);
      } else {
        setErrorGuardado(mensajeDe(error));
      }
      setGuardando(false);
      return;
    }

    // Vuelve al login dejando UNO solo en la pila: `dismissAll` cierra esta
    // pantalla y `replace` reemplaza la base por un login nuevo (con los campos
    // vacíos). `registrado: "1"` hace que el login muestre "Cuenta creada".
    router.dismissAll();
    router.replace({ pathname: "/login", params: { registrado: "1" } });
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        // Permite tocar botones con el teclado abierto.
        keyboardShouldPersistTaps="handled"
        // En iOS, sube el contenido cuando aparece el teclado para no taparlo.
        automaticallyAdjustKeyboardInsets
      >
        {/* ---------- BLOQUE 1: tus datos ---------- */}
        <Text style={estilos.titulo}>Tus datos</Text>

        {/* O la cámara, o el botón para abrirla (un ternario `cond ? A : B`). */}
        {escaneando ? (
          <EscanerDni
            // Qué hacer con el texto leído (completar los campos y cerrar).
            alLeer={alLeerDni}
            // Qué hacer al cancelar: cerrar la cámara.
            alCancelar={() => setEscaneando(false)}
          />
        ) : (
          <Pressable
            // Al tocar: se borra el aviso del escaneo anterior y se abre la cámara.
            onPress={() => {
              setAvisoDni(null);
              setEscaneando(true);
            }}
            // `style` como función: recibe `pressed` (¿se está apretando?) para
            // atenuar el botón mientras se toca.
            style={({ pressed }) => [
              estilos.botonEscanear,
              pressed && estilos.presionado,
            ]}
          >
            <Ionicons name="scan-outline" size={26} color={colores.azulClaro} />
            <View style={estilos.textosEscanear}>
              <Text style={estilos.tituloEscanear}>Escanear mi DNI</Text>
              <Text style={estilos.detalleEscanear}>
                Completamos tus datos con el código de barras.
              </Text>
            </View>
          </Pressable>
        )}

        {/* El resultado del último escaneo (solo si hay uno). */}
        {avisoDni ? (
          <Tarjeta style={estilos.aviso}>
            <Ionicons
              // Tilde si se leyó algo; signo de alerta si no se pudo.
              name={avisoDni.bueno ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={20}
              color={avisoDni.bueno ? colores.azulClaro : colores.alerta}
            />
            <Text style={estilos.textoAviso}>{avisoDni.texto}</Text>
          </Tarjeta>
        ) : null}

        <Text style={estilos.o}>O completalos a mano</Text>

        <CampoTexto
          etiqueta="Nombre" // el rótulo de arriba
          error={errorNombre} // el mensaje de error (o `null`)
          mostrarError={intento} // el error se ve recién después de intentar
          value={nombre} // INPUT CONTROLADO [JS 23]: lo que se ve sale del estado...
          onChangeText={setNombre} // ...y cada tecla lo actualiza
          placeholder="Juan Carlos" // el texto de ejemplo, en gris
          autoCapitalize="words" // mayúscula al empezar cada palabra
          autoComplete="name-given" // Android sugiere el nombre guardado del teléfono
          textContentType="givenName" // ídem, en iOS
          maxLength={40} // no deja escribir más de 40 caracteres
        />

        <CampoTexto
          etiqueta="Apellido"
          error={errorApellido}
          mostrarError={intento}
          value={apellido}
          onChangeText={setApellido}
          placeholder="Pérez"
          autoCapitalize="words"
          autoComplete="name-family" // sugiere el apellido guardado
          textContentType="familyName" // ídem, en iOS
          maxLength={40}
        />

        <CampoTexto
          etiqueta="Fecha de nacimiento"
          error={errorFecha}
          mostrarError={intento}
          value={fechaNacimiento}
          // `formatearFecha` deja solo números y agrega las barras solas.
          onChangeText={(texto) => setFechaNacimiento(formatearFecha(texto))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad" // teclado solo con números (sin la barra: la pone `formatearFecha`)
          maxLength={10} // "DD/MM/AAAA" tiene 10 caracteres
        />

        <CampoTexto
          etiqueta="DNI"
          error={errorDni}
          mostrarError={intento}
          value={dni}
          // `soloDigitos` descarta lo que no sea número (por ejemplo, si se pega).
          onChangeText={(texto) => setDni(soloDigitos(texto, 8))}
          placeholder="12345678"
          keyboardType="number-pad"
          maxLength={8} // un DNI tiene 7 u 8 números
        />

        {/* ---------- BLOQUE 2: tu cuenta ---------- */}
        <Text style={estilos.titulo}>Tu cuenta</Text>

        <CampoTexto
          etiqueta="Correo electrónico"
          error={errorEmail}
          mostrarError={intento}
          value={email}
          onChangeText={setEmail}
          placeholder="tu.nombre@uca.edu.ar"
          keyboardType="email-address" // teclado con la "@"
          autoCapitalize="none" // sin mayúscula inicial automática
          autoCorrect={false} // sin corrector
          autoComplete="email" // sugiere el correo guardado
          textContentType="emailAddress" // ídem, en iOS
        />

        <CampoTexto
          etiqueta="Contraseña"
          error={errorContrasenia}
          mostrarError={intento}
          value={contrasenia}
          onChangeText={setContrasenia}
          placeholder="Mínimo 8, con letras y números"
          // Puntitos en vez de letras, salvo que se haya pedido mostrarla.
          secureTextEntry={!mostrarContrasenia}
          autoCapitalize="none"
          autoComplete="password-new" // el teléfono puede ofrecer una contraseña segura
          textContentType="newPassword" // ídem, en iOS
          maxLength={64}
          // El ojito va dentro del recuadro, a la derecha.
          derecha={
            <Pressable
              // `(actual) => !actual` es una actualización FUNCIONAL [JS 20]:
              // recibe el valor actual y devuelve su opuesto.
              onPress={() => setMostrarContrasenia((actual) => !actual)}
              hitSlop={10} // agranda el área táctil 10 dp por lado
            >
              <Ionicons
                // Ícono distinto según si la contraseña se ve o no.
                name={mostrarContrasenia ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colores.textoTenue}
              />
            </Pressable>
          }
        />

        {/* ---------- BLOQUE 3: tu carrera ---------- */}
        <Text style={estilos.titulo}>Tu carrera</Text>

        <OpcionesPregunta
          pregunta="¿A qué facultad vas?"
          opciones={facultades} // las respuestas posibles (de `datos/registro.ts`)
          valor={facultad} // la elegida, o `null` si todavía no se eligió
          alElegir={setFacultad} // al tocar una opción se guarda su clave
          // El error se muestra recién después de intentar crear la cuenta.
          error={intento ? errorFacultad : null}
        />

        <OpcionesPregunta
          pregunta="¿Qué carrera cursás?"
          opciones={carreras}
          valor={carrera}
          alElegir={setCarrera}
          error={intento ? errorCarrera : null}
        />

        {/* ---------- Botón de crear la cuenta ---------- */}
        <Pressable
          onPress={crearCuenta}
          // Mientras se guarda, el botón no responde (evita crear la cuenta dos veces).
          disabled={guardando}
          style={({ pressed }) => [
            estilos.boton,
            // Se atenúa al apretarlo y también mientras se guarda.
            (pressed || guardando) && estilos.presionado,
          ]}
        >
          <Text style={estilos.textoBoton}>
            {/* El texto cambia mientras se guarda. */}
            {guardando ? "Creando cuenta…" : "Crear cuenta"}
          </Text>
        </Pressable>

        {/* Si hay errores después de intentar, se avisa también abajo del
            botón (los campos con error pueden quedar fuera de la vista). */}
        {intento && hayErrores ? (
          <Text style={estilos.errorGeneral}>
            Revisá los campos marcados antes de crear la cuenta.
          </Text>
        ) : null}

        {/* Si falló el guardado (por ejemplo, SecureStore no disponible). */}
        {errorGuardado ? (
          <Text style={estilos.errorGeneral}>{errorGuardado}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): un campo de texto con rótulo, error y, si hace
// falta, algo a la derecha (el ojito de la contraseña)
// ---------------------------------------------------------------------------

// `TextInputProps` son TODAS las props de `TextInput`. `&` suma las propias.
// `...resto` (spread / "rest") junta todo lo que no se nombró y se lo pasa
// entero al `TextInput`, así no hay que repetir `value`, `keyboardType`, etc.
type PropsCampo = TextInputProps & {
  etiqueta: string;
  /** El mensaje de error del campo, o `null` si está bien. */
  error: string | null;
  /** ¿Se muestra el error? Es `false` hasta que se intenta crear la cuenta. */
  mostrarError: boolean;
  /** Algo para dibujar dentro del recuadro, a la derecha. */
  derecha?: ReactNode;
};

function CampoTexto({
  etiqueta,
  error,
  mostrarError,
  derecha,
  // Todo lo demás (value, onChangeText, placeholder...) queda junto en `resto`.
  ...resto
}: PropsCampo) {
  // El error se ve solo si se pidió mostrarlo Y el campo tiene un mensaje.
  const hayError = mostrarError && error !== null;

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>
      {/* El recuadro; con error se pinta con borde rojizo. `[a, b]` aplica los
          dos estilos en orden y `hayError && ...` suma el segundo solo si hay error. */}
      <View style={[estilos.caja, hayError && estilos.cajaConError]}>
        <TextInput
          placeholderTextColor={colores.textoDebil} // color del texto de ejemplo
          style={estilos.input}
          // Se pasan todas las props que llegaron (`value`, `onChangeText`...).
          {...resto}
        />
        {/* Lo que haya a la derecha (el ojito), o nada si no se pasó. */}
        {derecha}
      </View>
      {/* El mensaje de error, debajo del recuadro. */}
      {hayError ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Contenedor raíz: `flex: 1` = ocupa todo el alto disponible.
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  // El `ScrollView` ocupa todo el alto disponible.
  scroll: {
    flex: 1,
  },

  // Estilo del contenido DENTRO del scroll (por eso va en `contentContainerStyle`).
  // `gap` separa cada bloque del formulario.
  contenido: {
    padding: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.lg,
  },

  // Título de cada bloque. `marginTop` lo separa del bloque anterior.
  titulo: {
    marginTop: espaciado.sm,
    fontSize: 18,
    fontWeight: "700",
    color: colores.texto,
  },

  // El botón grande "Escanear mi DNI": ícono a la izquierda y dos textos.
  botonEscanear: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
    backgroundColor: colores.primarioProfundo,
    padding: espaciado.lg,
  },

  // `flex: 1` para que el texto ocupe lo que sobra y baje de renglón si hace falta.
  textosEscanear: {
    flex: 1,
    gap: 2,
  },

  // El título del botón: azul clarito y en negrita.
  tituloEscanear: {
    fontSize: 15,
    fontWeight: "700",
    color: colores.azulPalido,
  },

  // La explicación de abajo: más chica y apagada. `lineHeight` es la altura de
  // cada renglón.
  detalleEscanear: {
    fontSize: 12,
    lineHeight: 17,
    color: colores.textoSecundario,
  },

  // La tarjeta con el resultado del escaneo: ícono y texto en fila.
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
  },

  // `flex: 1`: el mensaje ocupa lo que sobra y baja de renglón (no empuja al ícono).
  textoAviso: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSuave,
  },

  // El separador "O completalos a mano".
  o: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: colores.textoTenue,
  },

  // Un campo: rótulo arriba, recuadro abajo y, si hay, el error.
  campo: {
    gap: espaciado.sm,
  },

  // El rótulo: chico, en mayúsculas (`textTransform` no cambia el texto escrito,
  // solo cómo se ve) y con las letras un poco separadas.
  etiquetaCampo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colores.textoTenue,
  },

  // El recuadro: el texto a la izquierda y, si hay, el ojito a la derecha.
  caja: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    borderRadius: radios.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingHorizontal: espaciado.md,
  },

  // El recuadro de un campo con error (pisa el color del borde de `caja`).
  cajaConError: {
    borderColor: colores.alerta,
  },

  // `flex: 1` = el texto ocupa todo el ancho que sobra. `paddingHorizontal: 0`
  // quita el relleno lateral por defecto del `TextInput` en Android (el recuadro
  // ya tiene el suyo).
  input: {
    flex: 1,
    paddingVertical: espaciado.md,
    paddingHorizontal: 0,
    fontSize: 15,
    color: colores.textoSuave,
  },

  // El mensaje de error debajo de un campo: chico y en rojo claro.
  error: {
    fontSize: 12,
    color: colores.alerta,
  },

  // El botón principal: ancho completo (por defecto en una columna) y azul.
  boton: {
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    marginTop: espaciado.sm,
    borderRadius: radios.lg,
    backgroundColor: colores.primario,
  },

  // El texto blanco del botón "Crear cuenta".
  textoBoton: {
    fontSize: 17,
    fontWeight: "700",
    color: colores.blanco,
  },

  // Los avisos de abajo del botón, centrados.
  errorGeneral: {
    fontSize: 13,
    textAlign: "center",
    color: colores.alerta,
  },

  // Se suma a un botón mientras se aprieta: queda un poco transparente.
  presionado: {
    opacity: 0.7,
  },
});

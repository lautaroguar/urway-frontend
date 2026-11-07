/**
 * ============================================================================
 * app/login.tsx — Pantalla de login
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla de ingreso. Primero valida el FORMATO (un correo con forma de
 *   correo y una contraseña no vacía) y después autentica con `useSesion()`, que
 *   le pregunta al BACKEND: el servidor compara la contraseña con el hash
 *   guardado y, si coincide, devuelve un token. El token queda guardado (cifrado)
 *   en el teléfono: al reabrir la app no se pide de nuevo.
 *   Si no se puede llegar al servidor, se muestra ese aviso debajo del formulario.
 *
 * POR QUÉ SE LLAMA `login.tsx`:
 *   En expo-router el nombre del archivo es la RUTA: este archivo es `/login`.
 *   La ruta raíz ("/") es la bienvenida animada (`index.tsx`), que al terminar
 *   pasa sola a esta pantalla. Al cerrar sesión también se vuelve acá, sin
 *   repetir la animación de arranque.
 *
 * QUÉ CONTIENE:
 *   - Marca (ícono + "urway" + lema).
 *   - Formulario: campo de correo, campo de contraseña (con botón para
 *     mostrarla/ocultarla) y botón "Ingresar". Valida el formato al intentar
 *     ingresar y muestra el error debajo.
 *   - Un aviso "Cuenta creada" cuando se llega desde el registro (parámetro
 *     `registrado=1`).
 *   - El enlace "Crear cuenta" (abre `registro`, apilado encima del login).
 *   - Un recordatorio de las cuentas de prueba del backend.
 *
 * TEORÍA:
 *   [JS 23] FORMULARIO CONTROLADO: cada campo tiene su `useState`; el `value`
 *           del `TextInput` sale del estado y `onChangeText` lo actualiza.
 *           "value viene del state y onChange lo actualiza."
 *   [JS 20] `useState` y actualización funcional (`(actual) => !actual`).
 *   [JS 25] Estado derivado: `errorEmail` y `errorContrasenia` se calculan en el
 *           render (validaciones en `utilidades/validaciones.ts`); `intento`
 *           evita mostrarlos antes de apretar "Ingresar".
 *   [JS 14] `async/await`: iniciar sesión lee la contraseña guardada (tarda).
 *   [CTX]   `useSesion()` lee el Context de la sesión (`estado/sesion.tsx`).
 *   [NAV]   `router.replace` vs `router.push` (ver `ingresar` y `crearCuenta`) y
 *           `useLocalSearchParams` para leer el parámetro `registrado`.
 *   [EST]   `KeyboardAvoidingView` + `ScrollView`, Flexbox y `SafeAreaView`.
 *   [COMP]  `TextInput` con sus props de teclado.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
// `mensajeDe`: el texto de un error (por ejemplo, "No se pudo conectar con el servidor").
import { mensajeDe } from "@/api/cliente";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// `SafeAreaView` deja un margen para no quedar debajo de la muesca (notch) ni de
// la barra de gestos.
import { SafeAreaView } from "react-native-safe-area-context";

import { Tarjeta } from "@/componentes/Tarjeta";
// El Context de la sesión: guarda quién inició sesión y sabe autenticar.
import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";
import {
  validarContraseniaLogin, // texto con el problema, o `null` si está bien
  validarEmail, // idem para el formato del correo
} from "@/utilidades/validaciones";

/**
 * Login: se llega desde la bienvenida o desde el registro. Valida el formato y
 * autentica contra el backend. `replace` en vez de `push` para que el gesto de
 * volver no regrese al login.
 */
export default function PantallaLogin() {
  const router = useRouter();
  // De la sesión solo se necesita la acción de iniciarla. `{ iniciarSesion }` es
  // desestructuración: se saca del objeto del Context solo ese campo.
  const { iniciarSesion } = useSesion();
  // Parámetro de la ruta: el registro vuelve acá con `registrado=1`. Los
  // parámetros son siempre texto (o `undefined` si no vinieron).
  const { registrado } = useLocalSearchParams<{ registrado?: string }>();

  // ESTADO de los tres controles del formulario. Cada `useState` devuelve un
  // valor y la función para cambiarlo.
  const [email, setEmail] = useState(""); // lo escrito en el campo de correo
  const [contrasenia, setContrasenia] = useState(""); // lo escrito en la contraseña
  const [mostrarContrasenia, setMostrarContrasenia] = useState(false); // ¿se ve la contraseña?
  // ¿Ya se apretó "Ingresar" alguna vez? Hasta entonces no se muestran los
  // errores, para no "retar" a quien todavía está escribiendo.
  const [intento, setIntento] = useState(false);
  // El error que viene de AUTENTICAR (no de la forma de los campos): se guarda en
  // estado porque es el resultado de una operación asíncrona. Se borra apenas se
  // vuelve a escribir. `ingresando` evita un segundo toque mientras se verifica.
  // `useState<string | null>(null)`: el tipo entre `< >` dice que guarda un texto o
  // `null` (sin error); arranca en `null`.
  const [errorIngreso, setErrorIngreso] = useState<string | null>(null);
  const [ingresando, setIngresando] = useState(false);

  // Los errores de FORMATO se CALCULAN en cada render [JS 25]: un texto (el
  // mensaje) o `null` si el campo está bien.
  const errorEmail = validarEmail(email);
  const errorContrasenia = validarContraseniaLogin(contrasenia);

  // Al ingresar se REEMPLAZA la pantalla actual por Inicio. Con `push` el login
  // quedaría en el historial y el gesto de "volver" regresaría a él; con
  // `replace` el login desaparece de la pila.
  // "/inicio" es la pestaña `app/(tabs)/inicio.tsx` (los paréntesis del grupo
  // `(tabs)` no aparecen en la ruta).
  // `async` marca una función que puede usar `await` adentro [JS 14]: devuelve una
  // promesa y no bloquea la pantalla mientras espera.
  const ingresar = async () => {
    // Desde ahora los errores (si los hay) se muestran.
    setIntento(true);
    // Si algún campo tiene error de formato (o ya se está verificando) no se avanza.
    // `||` = "o": basta con que una de las tres sea cierta (un texto no vacío
    // cuenta como cierto; `null`, no). `return` corta la función acá.
    if (errorEmail || errorContrasenia || ingresando) return;

    setIngresando(true);
    // `await` PAUSA hasta que el SERVIDOR decide: o entra, o el correo y la
    // contraseña no coinciden. `try/catch`: si ni siquiera se llega al servidor
    // (está apagado, no hay red), se muestra ese mensaje.
    try {
      const resultado = await iniciarSesion(email, contrasenia);
      if (resultado === "credencialesIncorrectas") {
        // Se muestra el error y se libera el botón para que pueda reintentar.
        setErrorIngreso("El correo o la contraseña no son correctos.");
        setIngresando(false);
        return;
      }
    } catch (error) {
      setErrorIngreso(mensajeDe(error));
      setIngresando(false);
      return;
    }
    // Entró: se reemplaza el login por Inicio (la sesión ya quedó guardada).
    router.replace("/inicio");
  };

  // "Crear cuenta" APILA el registro encima del login (`push`): desde el
  // registro se puede volver con la flecha del header.
  const crearCuenta = () => router.push("/registro");

  return (
    <SafeAreaView style={estilos.pantalla}>
      {/* Sube el contenido cuando aparece el teclado, para que no tape los
          campos. En iOS se logra con "padding"; en Android el sistema ya lo
          resuelve (por eso `undefined`). `Platform.OS` dice en cuál se corre. */}
      <KeyboardAvoidingView
        style={estilos.teclado}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ScrollView: si el teclado achica la pantalla, se puede desplazar. */}
        <ScrollView
          contentContainerStyle={estilos.contenido}
          // Con el teclado abierto, un toque en un botón funciona directo en
          // lugar de solo cerrar el teclado.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* --- BLOQUE 1: la marca --- */}
          <View style={estilos.marca}>
            <View style={estilos.logo}>
              <Ionicons name="school" size={40} color={colores.azulTenue} />
            </View>
            <Text style={estilos.nombre}>urway</Text>
            <Text style={estilos.lema}>Tu carrera, en un solo lugar.</Text>
          </View>

          {/* --- BLOQUE 2: el formulario --- */}
          <View style={estilos.formulario}>
            {/* Aviso al volver del registro. `registrado === "1"` porque los
                parámetros de la ruta llegan como texto. */}
            {registrado === "1" ? (
              <Tarjeta style={estilos.cuentaCreada}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={colores.azulClaro}
                />
                <Text style={estilos.textoCuentaCreada}>
                  Cuenta creada. Ingresá con tu correo y tu contraseña.
                </Text>
              </Tarjeta>
            ) : null}

            {/* Los dos campos comparten una tarjeta, separados por una línea.
                Si ya se intentó ingresar y algún campo tiene error, el borde
                se pinta de rojizo. */}
            <View
              style={[
                estilos.grupoCampos,
                // Se lee: ¿(se intentó Y hay error de formato) O hay error de
                // autenticación? Si sí, se suma el borde rojizo; si no, es
                // `false`/`null` y React Native ignora ese elemento del array.
                ((intento && (errorEmail || errorContrasenia)) ||
                  errorIngreso) &&
                  estilos.grupoConError,
              ]}
            >
              {/* Campo de correo */}
              <View style={estilos.campo}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colores.textoTenue}
                />
                {/* INPUT CONTROLADO [JS 23]: lo que se ve (`value`) sale del
                    estado; al escribir, `onChangeText` recibe el texto nuevo y
                    `setEmail` lo guarda, lo que vuelve a dibujar el campo. */}
                <TextInput
                  value={email}
                  // Con varias instrucciones la flecha lleva llaves `{ }`:
                  onChangeText={(texto) => {
                    setEmail(texto);
                    setErrorIngreso(null); // se vuelve a escribir: el error ya no vale
                  }}
                  placeholder="tu.nombre@uca.edu.ar"
                  placeholderTextColor={colores.textoDebil}
                  // Las siguientes props ajustan el teclado y el autocompletado:
                  keyboardType="email-address" // teclado con "@"
                  autoCapitalize="none" // sin mayúscula inicial automática
                  autoCorrect={false} // sin corrector
                  autoComplete="email" // sugiere el correo guardado
                  textContentType="emailAddress" // ídem, en iOS
                  returnKeyType="next" // el botón del teclado dice "siguiente"
                  style={estilos.input}
                />
              </View>

              {/* Línea fina entre los dos campos. */}
              <View style={estilos.separador} />

              {/* Campo de contraseña */}
              <View style={estilos.campo}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colores.textoTenue}
                />
                <TextInput
                  value={contrasenia}
                  onChangeText={(texto) => {
                    setContrasenia(texto);
                    setErrorIngreso(null); // igual que en el correo
                  }}
                  placeholder="Contraseña"
                  placeholderTextColor={colores.textoDebil}
                  // Puntitos en vez de letras, salvo que se haya pedido mostrarla.
                  secureTextEntry={!mostrarContrasenia}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go" // el botón del teclado dice "ir"
                  // Al apretar "ir" en el teclado, es lo mismo que "Ingresar".
                  onSubmitEditing={ingresar}
                  style={estilos.input}
                />
                {/* El ojito: alterna mostrar/ocultar. `(actual) => !actual` es
                    una actualización FUNCIONAL [JS 20]: recibe el valor actual y
                    devuelve su opuesto (`!` = "no"). */}
                <Pressable
                  onPress={() => setMostrarContrasenia((actual) => !actual)}
                  hitSlop={10}
                >
                  <Ionicons
                    // Ícono distinto según si la contraseña se ve o no.
                    name={mostrarContrasenia ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colores.textoTenue}
                  />
                </Pressable>
              </View>
            </View>

            {/* Los errores van pegados debajo de la tarjeta, solo después de
                intentar ingresar. */}
            {intento && errorEmail ? (
              <Text style={estilos.error}>{errorEmail}</Text>
            ) : null}
            {intento && errorContrasenia ? (
              <Text style={estilos.error}>{errorContrasenia}</Text>
            ) : null}
            {/* El error de AUTENTICACIÓN: el correo es de una cuenta creada pero
                la contraseña no coincide. Sale del estado `errorIngreso` (no se
                calcula en el render: es el resultado de `iniciarSesion`). */}
            {errorIngreso ? (
              <Text style={estilos.error}>{errorIngreso}</Text>
            ) : null}

            {/* Botón principal: valida, autentica y, si sale bien, navega a Inicio. */}
            <Pressable
              onPress={ingresar}
              style={({ pressed }) => [
                estilos.boton,
                pressed && estilos.presionado,
              ]}
            >
              <Text style={estilos.textoBoton}>Ingresar</Text>
            </Pressable>
          </View>

          {/* --- BLOQUE 3: pie con "Crear cuenta" (queda pegado abajo, ver
              `marginTop: "auto"` en los estilos) --- */}
          {/* --- Las cuentas de prueba que carga el backend (`semilla.ts`). --- */}
          <Text style={estilos.prueba}>
            Cuentas de prueba: franco.diaz@uca.edu.ar o mariana.sosa@uca.edu.ar,
            contraseña urway2026.
          </Text>

          <View style={estilos.pie}>
            <Text style={estilos.textoPie}>¿No tenés cuenta?</Text>
            <Pressable onPress={crearCuenta} hitSlop={8}>
              <Text style={estilos.enlace}>Crear cuenta</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  // Contenedor raíz de la pantalla: `flex: 1` = ocupa todo el alto disponible.
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  // El `KeyboardAvoidingView` ocupa todo el alto disponible.
  teclado: {
    flex: 1,
  },

  // El contenido del scroll (va en `contentContainerStyle`, no en `style`).
  contenido: {
    // flexGrow en vez de flex: deja que el pie se vaya abajo con
    // `marginTop: "auto"` pero permite scroll si el teclado achica la pantalla.
    flexGrow: 1,
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.xxl * 2, // 32 × 2 = 64
    paddingBottom: espaciado.xl,
  },

  // La marca: columna centrada.
  marca: {
    alignItems: "center",
    gap: espaciado.sm,
  },

  // Cuadrado redondeado que contiene el ícono.
  logo: {
    width: 84,
    height: 84,
    borderRadius: radios.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espaciado.sm,
    backgroundColor: colores.primarioProfundo,
    borderWidth: 1,
    borderColor: colores.primarioOscuro,
  },

  // "urway", el nombre de la marca, en grande.
  nombre: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    color: colores.azulTenue,
  },

  // El lema, debajo del nombre.
  lema: {
    fontSize: 15,
    color: colores.textoTenue,
  },

  // Separación entre la marca y el formulario (32 + 16 = 48); `gap` separa los
  // hijos del formulario entre sí.
  formulario: {
    marginTop: espaciado.xxl + espaciado.lg,
    gap: espaciado.lg,
  },

  // Tarjeta redondeada que agrupa los dos campos. `overflow: "hidden"` recorta
  // el contenido en las esquinas.
  grupoCampos: {
    borderRadius: radios.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    overflow: "hidden",
  },

  // Cada fila: ícono + campo (+ ojito), en horizontal.
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
    paddingHorizontal: espaciado.lg,
    height: 54,
  },

  // Línea fina. El margen izquierdo la alinea con el texto (salta el ícono):
  // padding + ancho del ícono (18) + separación.
  separador: {
    height: StyleSheet.hairlineWidth,
    marginLeft: espaciado.lg + 18 + espaciado.md,
    backgroundColor: colores.bordeSuave,
  },

  // El texto escrito ocupa todo el ancho que sobra (`flex: 1`). `padding: 0`
  // quita el relleno por defecto del `TextInput` en Android.
  input: {
    flex: 1,
    fontSize: 16,
    color: colores.texto,
    padding: 0,
  },

  // El borde de la tarjeta de campos cuando hay un error.
  grupoConError: {
    borderColor: colores.alerta,
  },

  // El mensaje de error va pegado debajo de la tarjeta: el margen negativo anula
  // el `gap` del formulario.
  error: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    color: colores.alerta,
  },

  // El aviso "Cuenta creada": ícono y texto en fila.
  cuentaCreada: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.md,
  },

  // El mensaje del aviso; `flex: 1` lo deja bajar de renglón sin empujar el ícono.
  textoCuentaCreada: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSuave,
  },

  // El texto del enlace "Crear cuenta".
  enlace: {
    fontSize: 14,
    fontWeight: "600",
    color: colores.azulClaro,
  },

  // El botón "Ingresar": ancho completo, alto fijo y azul.
  boton: {
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    marginTop: espaciado.sm,
    borderRadius: radios.lg,
    backgroundColor: colores.primario,
  },

  // Se suma al botón mientras se aprieta: queda semitransparente.
  presionado: {
    opacity: 0.75,
  },

  // El texto blanco del botón.
  textoBoton: {
    fontSize: 17,
    fontWeight: "700",
    color: colores.blanco,
  },

  // `marginTop: "auto"` empuja el pie hasta el fondo de la pantalla.
  pie: {
    marginTop: "auto",
    paddingTop: espaciado.xxl,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: espaciado.xs,
  },

  // El recordatorio de las cuentas de prueba: chico, centrado y tenue.
  prueba: {
    marginTop: espaciado.lg,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: colores.textoTenue,
  },

  // "¿No tenés cuenta?", al lado del enlace "Crear cuenta".
  textoPie: {
    fontSize: 14,
    color: colores.textoTenue,
  },
});

/**
 * ============================================================================
 * app/editar-perfil.tsx — Editar mi perfil (datos y foto)
 * ============================================================================
 *
 * QUÉ ES:
 *   La pantalla para cambiar mis datos y mi foto de perfil. Se abre con «Editar
 *   perfil» en «Mi perfil». Se puede cambiar:
 *     - la FOTO: elegir una de la galería (con recorte cuadrado en el celular) o
 *       quitar la actual. Sin foto se ven las iniciales;
 *     - el NOMBRE, el APELLIDO, el DNI y la FECHA DE NACIMIENTO.
 *   El correo, la facultad y la carrera no se cambian desde acá.
 *
 * PARA GUARDAR HAY QUE ESCRIBIR LA CONTRASEÑA:
 *   Cualquier cambio —hasta la foto— pide la contraseña actual. Es una medida de
 *   seguridad: si alguien agarra el teléfono con la sesión abierta, no puede cambiarle
 *   los datos a la cuenta. La contraseña viaja al servidor, que la compara con su
 *   hash; si no coincide, responde 403 y se muestra el error debajo del campo.
 *
 * QUÉ SE MANDA:
 *   Solo lo que cambió (`cambios`), más la contraseña. Si no cambió nada, se avisa y no
 *   se manda nada. La foto viaja en base64, igual que los apuntes.
 *
 * TEORÍA:
 *   [JS 23] Formulario controlado: `value` + `onChangeText` en cada campo.
 *   [JS 25] Estado derivado: los errores y los `cambios` se CALCULAN en el render;
 *           `intento` evita mostrarlos antes de apretar «Guardar».
 *   [JS 14] `async/await` + `try/catch` al guardar.
 *   [CTX]   `editarPerfil` viene del Context de la sesión (`estado/sesion.tsx`).
 *   [COMP]  `Avatar`, `TextInput` con sus props de teclado, `expo-image-picker`.
 */
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ErrorApi, mensajeDe } from "@/api/cliente";
import { Avatar } from "@/componentes/Avatar";
import { useSesion } from "@/estado/sesion";
import { colores, espaciado, radios } from "@/tema/colores";
import { bytesDeBase64, leerComoBase64, MAXIMO_BYTES, tamanioLegible } from "@/utilidades/archivos";
import { nombreCompleto } from "@/utilidades/usuario";
import {
  formatearFecha,
  soloDigitos,
  validarContraseniaLogin,
  validarDni,
  validarFechaNacimiento,
  validarNombre,
} from "@/utilidades/validaciones";

/** Pantalla para editar mis datos y mi foto de perfil. */
export default function PantallaEditarPerfil() {
  const router = useRouter();
  const { usuario, editarPerfil } = useSesion();

  // ESTADO DEL FORMULARIO: arranca con los datos actuales de la cuenta.
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [apellido, setApellido] = useState(usuario?.apellido ?? "");
  const [dni, setDni] = useState(usuario?.dni ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(usuario?.fechaNacimiento ?? "");
  // La foto elegida en esta pantalla (todavía sin guardar) y si se pidió quitarla.
  const [fotoNueva, setFotoNueva] = useState<{ uri: string; base64: string } | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [contrasenia, setContrasenia] = useState("");
  const [mostrarContrasenia, setMostrarContrasenia] = useState(false);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // El error del SERVIDOR sobre la contraseña (403) y cualquier otro error al guardar.
  const [errorContraseniaServidor, setErrorContraseniaServidor] = useState<string | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  // Retorno temprano: sin sesión no hay nada que editar (no debería pasar). Los hooks
  // ya se llamaron ARRIBA.
  if (!usuario) return null;

  // ---------- Lo derivado (se calcula en cada render) [JS 25] ----------

  // El DNI y la fecha de nacimiento: si la cuenta nunca los tuvo, pueden quedar vacíos;
  // si ya los tenía, se validan igual que en el registro.
  const errorNombre = validarNombre(nombre, "nombre");
  const errorApellido = validarNombre(apellido, "apellido");
  const errorDni = dni.length === 0 && !usuario.dni ? null : validarDni(dni);
  const errorFecha =
    fechaNacimiento.length === 0 && !usuario.fechaNacimiento
      ? null
      : validarFechaNacimiento(fechaNacimiento);
  const errorContrasenia = validarContraseniaLogin(contrasenia);
  const hayErrores = Boolean(errorNombre || errorApellido || errorDni || errorFecha || errorContrasenia);

  // Lo que cambió respecto de la cuenta: solo eso se manda.
  const cambios = {
    ...(nombre.trim() !== usuario.nombre ? { nombre: nombre.trim() } : {}),
    ...(apellido.trim() !== usuario.apellido ? { apellido: apellido.trim() } : {}),
    ...(dni !== (usuario.dni ?? "") ? { dni } : {}),
    ...(fechaNacimiento !== (usuario.fechaNacimiento ?? "") ? { fechaNacimiento } : {}),
    ...(fotoNueva ? { foto: fotoNueva.base64 } : {}),
    ...(quitarFoto && !fotoNueva ? { quitarFoto: true } : {}),
  };
  const haySinCambios = Object.keys(cambios).length === 0;

  // La foto que se ve en el círculo de arriba: la elegida, la actual o ninguna.
  const fotoVisible = quitarFoto ? undefined : (fotoNueva?.uri ?? usuario.foto);

  // ---------- Acciones ----------

  /** Abre la galería; en el celular deja recortar la foto en cuadrado. */
  const elegirFoto = async () => {
    setErrorFoto(null);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true, // la pantalla de recorte del sistema (en la web se ignora)
        aspect: [1, 1], // cuadrada: se ve bien dentro de un círculo
        quality: 0.5, // compresión: 50 % de calidad (la foto viaja al servidor)
        base64: true, // el contenido como texto, para mandarlo en el JSON
      });
      if (resultado.canceled) return;
      const foto = resultado.assets[0];
      const base64 = foto.base64 ?? (await leerComoBase64(foto.uri));
      if (bytesDeBase64(base64) > MAXIMO_BYTES) {
        setErrorFoto(`La foto pesa más de ${tamanioLegible(MAXIMO_BYTES)}. Elegí una más liviana.`);
        return;
      }
      setFotoNueva({ uri: foto.uri, base64 });
      setQuitarFoto(false);
    } catch {
      setErrorFoto("No se pudo abrir la galería.");
    }
  };

  const guardar = async () => {
    setIntento(true);
    setErrorGuardado(null);
    setErrorContraseniaServidor(null);
    if (hayErrores || guardando) return;
    if (haySinCambios) {
      setErrorGuardado("No cambiaste nada todavía.");
      return;
    }

    setGuardando(true);
    try {
      // `await` espera al servidor: compara la contraseña y guarda los cambios.
      await editarPerfil({ contrasenia, ...cambios });
      router.back(); // vuelve al perfil, que ya muestra los datos nuevos
    } catch (error) {
      // 403 = la contraseña no coincide → se marca en su campo. Lo demás, abajo.
      if (error instanceof ErrorApi && error.estado === 403) {
        setErrorContraseniaServidor(error.message);
      } else {
        setErrorGuardado(mensajeDe(error));
      }
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // En iOS, sube el contenido cuando aparece el teclado para no taparlo.
        automaticallyAdjustKeyboardInsets
      >
        {/* ---------- La foto ---------- */}
        <View style={estilos.bloqueFoto}>
          <Avatar nombre={nombreCompleto(usuario)} foto={fotoVisible} tamanio={110} />
          <View style={estilos.botonesFoto}>
            <Pressable
              onPress={elegirFoto}
              style={({ pressed }) => [estilos.botonFoto, pressed && estilos.presionado]}
            >
              <Ionicons name="images-outline" size={18} color={colores.azulClaro} />
              <Text style={estilos.textoBotonFoto}>
                {fotoVisible ? "Cambiar foto" : "Agregar foto"}
              </Text>
            </Pressable>
            {fotoVisible ? (
              <Pressable
                onPress={() => {
                  setFotoNueva(null);
                  setQuitarFoto(true);
                }}
                style={({ pressed }) => [estilos.botonFoto, pressed && estilos.presionado]}
              >
                <Ionicons name="trash-outline" size={18} color={colores.alerta} />
                <Text style={[estilos.textoBotonFoto, { color: colores.alerta }]}>Quitar</Text>
              </Pressable>
            ) : null}
          </View>
          {errorFoto ? <Text style={estilos.error}>{errorFoto}</Text> : null}
        </View>

        {/* ---------- Mis datos ---------- */}
        <Campo etiqueta="Nombre">
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre"
            placeholderTextColor={colores.textoDebil}
            autoCapitalize="words"
            autoComplete="name-given"
            style={estilos.input}
          />
        </Campo>
        {intento && errorNombre ? <Text style={estilos.error}>{errorNombre}</Text> : null}

        <Campo etiqueta="Apellido">
          <TextInput
            value={apellido}
            onChangeText={setApellido}
            placeholder="Apellido"
            placeholderTextColor={colores.textoDebil}
            autoCapitalize="words"
            autoComplete="name-family"
            style={estilos.input}
          />
        </Campo>
        {intento && errorApellido ? <Text style={estilos.error}>{errorApellido}</Text> : null}

        <Campo etiqueta="DNI">
          <TextInput
            value={dni}
            // `soloDigitos` descarta lo que no sea número (por ejemplo, si se pega).
            onChangeText={(texto) => setDni(soloDigitos(texto, 8))}
            placeholder="12345678"
            placeholderTextColor={colores.textoDebil}
            keyboardType="number-pad"
            maxLength={8}
            style={estilos.input}
          />
        </Campo>
        {intento && errorDni ? <Text style={estilos.error}>{errorDni}</Text> : null}

        <Campo etiqueta="Fecha de nacimiento">
          <TextInput
            value={fechaNacimiento}
            // Se tipean los números y las barras aparecen solas ("01021990" → "01/02/1990").
            onChangeText={(texto) => setFechaNacimiento(formatearFecha(texto))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colores.textoDebil}
            keyboardType="number-pad"
            maxLength={10}
            style={estilos.input}
          />
        </Campo>
        {intento && errorFecha ? <Text style={estilos.error}>{errorFecha}</Text> : null}

        {/* ---------- La contraseña, para confirmar ---------- */}
        <View style={estilos.confirmar}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colores.azulClaro} />
          <Text style={estilos.textoConfirmar}>
            Por seguridad, escribí tu contraseña actual para guardar los cambios.
          </Text>
        </View>
        <Campo etiqueta="Contraseña actual">
          <View style={[estilos.input, estilos.filaContrasenia]}>
            <TextInput
              value={contrasenia}
              onChangeText={(texto) => {
                setContrasenia(texto);
                setErrorContraseniaServidor(null); // el error era de la anterior
              }}
              placeholder="Tu contraseña"
              placeholderTextColor={colores.textoDebil}
              secureTextEntry={!mostrarContrasenia}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={guardar}
              style={estilos.inputContrasenia}
            />
            {/* El ojito: alterna mostrar/ocultar. */}
            <Pressable onPress={() => setMostrarContrasenia((actual) => !actual)} hitSlop={10}>
              <Ionicons
                name={mostrarContrasenia ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colores.textoTenue}
              />
            </Pressable>
          </View>
        </Campo>
        {intento && errorContrasenia ? <Text style={estilos.error}>{errorContrasenia}</Text> : null}
        {errorContraseniaServidor ? (
          <Text style={estilos.error}>{errorContraseniaServidor}</Text>
        ) : null}

        {errorGuardado ? <Text style={estilos.error}>{errorGuardado}</Text> : null}

        {/* ---------- Guardar ---------- */}
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
          <Text style={estilos.textoBoton}>{guardando ? "Guardando…" : "Guardar cambios"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE AUXILIAR (privado): un campo con su rótulo arriba
// ---------------------------------------------------------------------------

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>
      {children}
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
    padding: espaciado.lg,
    paddingBottom: espaciado.xxl,
    gap: espaciado.lg,
  },

  // La foto, centrada, con sus botones debajo.
  bloqueFoto: {
    alignItems: "center",
    gap: espaciado.md,
  },

  botonesFoto: {
    flexDirection: "row",
    gap: espaciado.md,
  },

  botonFoto: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
    borderRadius: radios.pastilla,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    backgroundColor: colores.superficieAlta,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.lg,
  },

  textoBotonFoto: {
    fontSize: 13,
    fontWeight: "600",
    color: colores.azulClaro,
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

  // El campo de la contraseña: el texto y el ojito en fila, dentro del mismo recuadro.
  filaContrasenia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },

  inputContrasenia: {
    flex: 1,
    fontSize: 15,
    color: colores.textoSuave,
    padding: 0,
  },

  // El mensaje de error va pegado debajo de su campo: el margen negativo anula el `gap`.
  error: {
    marginTop: -espaciado.sm,
    fontSize: 12,
    color: colores.alerta,
  },

  // El aviso de por qué se pide la contraseña: ícono y texto en fila.
  confirmar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: colores.primarioProfundo,
    padding: espaciado.md,
  },

  textoConfirmar: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colores.azulPalido,
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

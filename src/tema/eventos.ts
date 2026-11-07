/**
 * ============================================================================
 * tema/eventos.ts — Cómo se ve cada tipo de evento
 * ============================================================================
 *
 * QUÉ ES:
 *   Una tabla que asocia cada TIPO de evento (clase, parcial, entrega, estudio)
 *   con sus colores y su ícono.
 *
 * QUIÉN LO USA:
 *   - componentes/FilaEvento.tsx  → barra de color y etiqueta del tipo
 *   - componentes/BloqueEvento.tsx → fondo y barrita del bloque en la grilla semanal,
 *                                    y el círculo de un parcial / entrega dentro de una clase
 *   - app/evento/[id].tsx         → insignia con el ícono del detalle
 *   - app/notificaciones.tsx      → ícono de las notificaciones de calendario
 *
 * POR QUÉ ASÍ:
 *   Al tener UN solo lugar que decide el aspecto de cada tipo, la fila de
 *   Inicio, el bloque de la agenda, el detalle y la notificación de un mismo evento nunca se
 *   contradicen (no puede pasar que el parcial sea rojo en un lado y azul en
 *   otro).
 */

// `import type`: importa SOLO el tipo (que existe únicamente para TypeScript y
// desaparece al compilar). `TipoEvento` es "clase" | "parcial" | "entrega".
import type { TipoEvento } from "@/datos/agenda";
import { colores } from "@/tema/colores";

// `type` declara la FORMA de un objeto (TypeScript lo verifica; no existe en la
// app ya compilada). Cada tipo de evento tiene estas cuatro propiedades.
type EstiloEvento = {
  /** Color de la barra lateral de la fila y del ícono. */
  acento: string;
  fondo: string; // fondo de la insignia (un tono oscuro del acento)
  borde: string; // borde de la etiqueta del tipo
  // El ícono solo puede ser uno de estos nombres de Ionicons (una unión de
  // textos). Si se escribe otro, TypeScript marca error.
  icono: "school" | "alert-circle" | "cloud-upload" | "people";
  // El ícono del CÍRCULO que un parcial o una entrega dibujan adentro de una clase
  // en la agenda. Es otro porque `alert-circle` ya es un círculo: metido en el
  // círculo de la agenda se vería un círculo dentro de otro.
  iconoMarca: "school" | "document-text" | "cloud-upload" | "people";
};

/**
 * Un solo lugar decide de qué color se ve cada tipo de evento, así la fila de
 * la agenda, la ficha de detalle y la notificación no se contradicen.
 */
// `Record<TipoEvento, EstiloEvento>` significa "un objeto que tiene UNA entrada
// por cada tipo de evento, y cada entrada es un EstiloEvento". Si algún día se
// agrega un tipo nuevo a `TipoEvento` y se olvida definir su estilo acá,
// TypeScript avisa. Se consulta así: `estilosPorTipo[evento.tipo]`.
export const estilosPorTipo: Record<TipoEvento, EstiloEvento> = {
  // Clase: azul de la marca
  clase: {
    acento: colores.primario,
    fondo: colores.primarioProfundo,
    borde: colores.primarioOscuro,
    icono: "school",
    iconoMarca: "school",
  },
  // Parcial: rojo claro (llama la atención)
  parcial: {
    acento: colores.alerta,
    fondo: "#2A1416",
    borde: "#5A2A2E",
    icono: "alert-circle",
    iconoMarca: "document-text", // la hoja del examen
  },
  // Entrega: naranja
  entrega: {
    acento: "#F5A524",
    fondo: "#2A2113",
    borde: "#5A4522",
    icono: "cloud-upload",
    iconoMarca: "cloud-upload",
  },
  // Estudio con amigos: verde (se distingue de las clases, que son azules)
  estudio: {
    acento: "#4ADE80",
    fondo: "#10261A",
    borde: "#1F5136",
    icono: "people",
    iconoMarca: "people",
  },
};

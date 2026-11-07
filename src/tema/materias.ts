/**
 * ============================================================================
 * tema/materias.ts — Cómo se ve cada estado de una materia
 * ============================================================================
 *
 * QUÉ ES:
 *   Una tabla que asocia cada ESTADO de materia (bloqueada, disponible, en curso,
 *   pendiente de final, aprobada) con sus colores y su ícono. Es lo mismo que hace
 *   `tema/eventos.ts` con los tipos de evento.
 *
 * QUIÉN LO USA:
 *   - app/(tabs)/plan.tsx       → color e ícono de cada fila de materia
 *   - app/materia/[id].tsx      → la pastilla de estado del encabezado
 *   - componentes/EstadoDeMateria.tsx → íconos del selector
 *
 * POR QUÉ ASÍ:
 *   Con UN solo lugar que decide el aspecto de cada estado, una misma materia se
 *   ve igual en el plan, en el detalle y en el selector. Y como la tabla es un
 *   `Record<EstadoMateria, ...>`, si algún día se agrega un estado y se olvida
 *   definir su aspecto, TypeScript avisa.
 */
// Solo el tipo de los estados ("bloqueada" | "disponible" | "cursando" | ...).
import type { EstadoMateria } from "@/datos/carrera";
// La paleta del tema: acá se usan sus nombres, nunca valores hexadecimales sueltos.
import { colores } from "@/tema/colores";

// La "forma" del aspecto de UN estado. Las pantallas lo usan así:
//   const aspecto = estilosPorEstado[materia.estado];  → aspecto.fondo, aspecto.icono...
type EstiloEstado = {
  /** Fondo y borde de la fila de la materia en el plan. */
  fondo: string;
  borde: string;
  /** Color del ícono de la fila. */
  acento: string;
  /** El ícono solo puede ser uno de estos nombres de Ionicons (una unión de textos). */
  icono: "lock-closed" | "lock-open-outline" | "sync" | "hourglass-outline" | "checkmark";
  /** Colores de la pastilla `Etiqueta` del detalle. */
  colorEtiqueta: string;
  fondoEtiqueta: string;
};

// `Record<EstadoMateria, EstiloEstado>` = un objeto con UNA entrada por cada estado,
// todas con la forma de `EstiloEstado`. Si falta un estado, TypeScript avisa.
export const estilosPorEstado: Record<EstadoMateria, EstiloEstado> = {
  // Bloqueada: gris apagado, con candado.
  bloqueada: {
    fondo: colores.superficie,
    borde: colores.bordeSuave,
    acento: colores.textoDebil,
    icono: "lock-closed",
    colorEtiqueta: colores.textoDebil,
    fondoEtiqueta: colores.primarioProfundo,
  },
  // Disponible: se desbloqueó y todavía no se arrancó. Fondo oscuro con borde azul y
  // un candado abierto.
  disponible: {
    fondo: colores.superficieAlta,
    borde: colores.primario,
    acento: colores.azulClaro,
    icono: "lock-open-outline",
    colorEtiqueta: colores.azulClaro,
    fondoEtiqueta: colores.primarioProfundo,
  },
  // En curso: azul pleno, el estado "activo" de siempre.
  cursando: {
    fondo: colores.primario,
    borde: colores.azulClaro,
    acento: colores.azulClaro,
    icono: "sync",
    colorEtiqueta: colores.blanco,
    fondoEtiqueta: colores.primario,
  },
  // Pendiente de final: fondo oscuro con borde azul claro (a mitad de camino
  // entre "en curso" y "aprobada") y un reloj de arena.
  pendienteFinal: {
    fondo: colores.superficieAlta,
    borde: colores.azulClaro,
    acento: colores.azulClaro,
    icono: "hourglass-outline",
    colorEtiqueta: colores.azulClaro,
    fondoEtiqueta: colores.superficieSuave,
  },
  // Aprobada: azul oscuro con tilde.
  aprobada: {
    fondo: colores.primarioProfundo,
    borde: colores.primarioOscuro,
    acento: colores.azulClaro,
    icono: "checkmark",
    colorEtiqueta: colores.blanco,
    fondoEtiqueta: colores.primarioProfundo,
  },
};

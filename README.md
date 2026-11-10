# urway — Tu carrera, en un solo lugar (app)

App móvil (Expo + React Native + expo-router, TypeScript) para seguir la carrera universitaria:
plan de estudios autogestionado, agenda semanal, compañeros, apuntes y notificaciones.

Este repositorio es **solo la app**. Los datos viven en un backend propio (Express + Prisma +
SQLite) que está en **otro repositorio: `urway_backend`**. Para usar la app, el backend tiene que
estar corriendo (ver su README).

```
urway_frontend/
├── src/           La app: pantallas, componentes, Context, llamadas a la API
├── assets/        Íconos y splash
├── app.json       Configuración de Expo (nombre, íconos, permisos de cámara y fotos)
└── .env           EXPO_PUBLIC_API_URL: la dirección del backend (viene comentada: casi nunca hace falta)
```

Hecho por Lautaro Guarnieri y Franco Di Biase para Programación de Aplicaciones Móviles.

## Cómo correrla

Requisitos: Node.js 20 o superior, npm y la app **Expo Go** en el celular (o un navegador).

**1. El backend** (en otra terminal, desde la carpeta del repo `urway_backend`):

```bash
npm install
npx prisma generate
npm run db:setup
npm run dev
```

`npm run db:setup` va la primera vez: arma la base del backend con las **migraciones** de Prisma y
le carga los datos de ejemplo con el **seeder** (las cuentas de prueba de abajo). Ningún repo sube
la base de datos: cada uno la arma en su máquina con ese comando (ver el README del backend).

**2. La app** (desde esta carpeta):

```bash
npm install
npx expo start
```

`w` abre la web. Para el celular con Expo Go **no hay que tocar nada**: la app detecta sola la IP de
la PC que sirve Expo y usa esa IP con el puerto 3000 (con la PC y el celular en la misma red Wi-Fi y
el puerto 3000 permitido en el firewall).

**El `.env` viene en el repositorio** (lo pidió la cátedra y no tiene nada secreto). Trae
`EXPO_PUBLIC_API_URL` comentada a propósito: así la app detecta sola el backend. Solo hay que
descomentarla (y poner la IP y el puerto) si el backend corre en otra máquina u otro puerto.

Cuentas de prueba (contraseña `urway2026`): la de la demo es `franco.diaz@uca.edu.ar`; también
`mariana.sosa`, `elena.ruiz`, `david.lopez`, `tomas.vega`, `lucia.fernandez`, `joaquin.alvarez`,
`camila.medina`, `martin.gomez`, `valentina.torres`, `sofia.romero`, `nicolas.herrera`,
`agustin.castro`, `florencia.rios` y `bruno.acosta` (todas `@uca.edu.ar`). Qué tiene cada una
está en el README del backend.

## Qué hay en cada carpeta de `src/`

| Carpeta        | Qué contiene                                                             |
|----------------|--------------------------------------------------------------------------|
| `app/`         | Las pantallas (cada archivo es una ruta de expo-router)                  |
| `componentes/` | Piezas de interfaz reutilizables                                         |
| `estado/`      | Los Context: sesión (`sesion.tsx`) y datos (`datos.tsx`)                  |
| `api/`         | `cliente.ts` (fetch + errores) y `urway.ts` (una función por ruta)       |
| `datos/`       | Los TIPOS de los datos (el contrato con la API) y textos fijos           |
| `utilidades/`  | Funciones puras: fechas, repetición de eventos, reglas de materias...    |
| `tema/`        | Colores, espacios y estilos por tipo de evento y estado de materia       |

## El contrato con el backend

La app solo conoce la API (`src/api/urway.ts`): los tipos de `src/datos/` coinciden con el JSON que
devuelve cada ruta. Las rutas y las reglas (estados de una materia, correlativas, privacidad) están
documentadas en el README del backend.

El código es el mismo que el de la carpeta de desarrollo, donde el backend vivía en una
subcarpeta `backend/`. Por eso, cuando un comentario nombra un archivo como
`backend/src/reglas.ts`, se refiere al archivo `src/reglas.ts` del repositorio `urway_backend`.

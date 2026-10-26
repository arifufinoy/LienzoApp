# Galería personal

Aplicación móvil sobre el proyecto existente: Expo SDK 57, React Native 0.86, TypeScript, Expo Router y TanStack Query v5. Permite explorar arte, consultar detalles, guardar obras con notas y editar notas/favoritos. Interfaz neumórfica gris azulada `#E8EDF3`, con estados de carga, error, lista vacía e imagen ausente.

## APIs y datos

- Art Institute of Chicago: `https://api.artic.edu/api/v1`. Exclusivamente GET `/artworks` (paginación de 20 obras) y `/artworks/:id`. Imágenes: `config.iiif_url + '/' + image_id + '/full/843,/0/default.jpg'`.
- MockAPI: `https://6ade41964e88f1bba4a50ff8.mockapi.io/coleccion`. GET listado/detalle, POST creación y PUT edición. No se implementa eliminación.
- Se guardan `artworkId`, `title`, `artist`, `imageUrl`, `note`, `favorite` y `createdAt` (ISO 8601). MockAPI genera `id`; nunca se envía en POST ni PUT.
- Los errores HTTP no exitosos se convierten en errores visibles; las solicitudes tienen límite de 20 segundos. Los cambios personales no modifican la API de arte.

MockAPI es un recurso público compartido, sin autenticación propia ni aislamiento por usuario. No guardar información sensible. AsyncStorage tampoco cifra la información.

## Entorno y ejecución

Requiere Node.js 22.13 o superior compatible con SDK 57 y npm.

```sh
npm ci
npx expo start
npx expo start --android
```

`.env` y `.env.example` contienen:

```dotenv
EXPO_PUBLIC_MOCKAPI_BASE_URL=https://6ade41964e88f1bba4a50ff8.mockapi.io
```

El valor **no** incluye `/coleccion`. Se lee estáticamente mediante `process.env.EXPO_PUBLIC_MOCKAPI_BASE_URL`. Es una URL pública, no un secreto. Reiniciar Metro después de modificarla. El perfil preview de `eas.json` incluye el mismo valor en `env`, por lo que el servidor de compilación no depende de un archivo local.

## Dependencias principales

- Existentes: `expo`, `expo-router`, `react-native`, `@tanstack/react-query`.
- Añadidas mediante `npx expo install`: `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `@react-native-async-storage/async-storage` (2.2.0), `expo-network` (~57.0.3).
- `expo lint` configuró ESLint 9 y `eslint-config-expo` ~57.0.2, que faltaban.

Para añadir módulos usar `npx expo install`, no instalar versiones nativas arbitrarias. Los módulos nativos deben incluirse en un binario compatible; el APK preview ya los incluye.

## Estructura

```text
src/app/_layout.tsx          Provider persistente y navegación Stack
src/app/index.tsx            Explorar
src/app/explore.tsx          Mi colección (ruta conservada del proyecto)
src/app/artwork/[id].tsx     Detalle y creación
src/app/edit/[id].tsx        Edición
src/query/queryKeys.ts      Todas las claves de queries y mutaciones
src/query/client.ts         QueryClient, tiempos, defaults y persister
src/query/Provider.tsx       Hidratación, red y ciclo de vida
src/services/api.ts         HTTP centralizado, errores, IIIF y APIs
src/hooks/use-gallery.ts    Consultas, mutaciones y vista optimista
src/types/art.ts            Tipos de ambas APIs
src/components/gallery-ui.tsx Componentes y estado de sincronización
src/constants/gallery-theme.ts Paleta, espaciado y sombras nativas
eas.json                    Perfil Android preview APK
instrucciones.md            Obtención e instalación del APK
```

Se mantienen Expo Router y las rutas iniciales. Los componentes auxiliares de la plantilla se conservan fuera de las rutas; no forman parte de las pantallas nuevas. Se añadieron declaraciones CSS y se corrigió la hidratación del hook web original para pasar TypeScript/lint.

## Claves e invalidaciones

Todas se construyen en `src/query/queryKeys.ts` con tuplas `as const`:

| Uso | Clave |
| --- | --- |
| Listado público | `['artworks', 'list', page]` |
| Detalle público | `['artworks', 'detail', idNumerico]` |
| Colección | `['collection', 'list']` |
| Registro guardado | `['collection', 'detail', idString]` |
| POST | `['collection-write', 'create']` |
| PUT | `['collection-write', 'edit']` |

Tras **cada POST o PUT exitoso**, los defaults cancelan lecturas personales en curso, incorporan la respuesta definitiva a listado/detalle y llaman `queryClient.invalidateQueries` para:

1. `queryKeys.collection.list()`: refrescar la colección que cambió.
2. `queryKeys.collection.detail(item.id)`: reconciliar el registro confirmado por el servidor.

No se invalidan las consultas públicas: las notas y favoritos no cambian las obras del museo. Las funciones de reconciliación están en defaults, no en callbacks de una pantalla que podría desmontarse.

## Caché y persistencia

| Origen | staleTime | gcTime |
| --- | --- | --- |
| API pública | 60 minutos | 48 horas |
| MockAPI | 2 minutos | 72 horas |

`maxAge = 24 horas`. Las obras son estables y admiten una hora sin nueva lectura. Los datos personales se consideran obsoletos antes para recoger cambios del servidor. Los tiempos de recolección más largos permiten reutilizar pantallas inactivas y son mayores que la ventana persistente.

Si `gcTime` fuera menor que `maxAge`, una query inactiva podría eliminarse de memoria y de la siguiente instantánea persistida antes de vencer esas 24 horas; se perdería la caché antes de lo esperado. `gcTime` no controla por sí solo la validez del archivo persistido.

`PersistQueryClientProvider` restaura AsyncStorage mediante `createAsyncStoragePersister`. Se persisten consultas con datos, incluso si una actualización falla, y mutaciones pendientes o fallidas. El inicio comprueba primero la red nativa y luego hidrata. Las pantallas muestran los datos hidratados sin esperar un GET; una actualización fallida no oculta los datos disponibles.

La clave de almacenamiento es `art-gallery-cache-v1`, con buster `gallery-v1`. La escritura no tiene espera de throttling. Al recuperar una operación que estaba en vuelo al cerrar el proceso, su copia persistida se marca pausada para poder reanudarla. Las funciones nunca se serializan.

**Límites:** `maxAge` se aplica a la instantánea completa, incluida su cola; si se vuelve después de más de 24 horas sin persistir actividad, TanStack descarta esa instantánea. Borrar los datos/desinstalar también borra la caché y la cola. Persistir JSON **no garantiza imágenes offline**: la caché de imágenes es independiente y se muestra un placeholder si falla su carga.

## Mutaciones offline

1. `expo-network` consulta la conexión inicial, escucha sus cambios y actualiza `onlineManager`. Se vuelve a comprobar al regresar la app al primer plano; `focusManager` también sigue `AppState`.
2. Antes de hidratar, `setMutationDefaults` registra `api.create` y `api.edit` con **exactamente** las mismas mutationKey usadas por `useMutation`. Esto evita `No mutationFn found` al reiniciar.
3. `networkMode: 'online'` pausa las operaciones sin conexión. Ambas comparten el scope `collection-writes` para procesarse en serie.
4. `useMutationState` superpone las variables de operaciones pendientes/fallidas sobre los datos del servidor. Una creación usa un identificador **solo local** `pending:artworkId`, nunca enviado a MockAPI. Las ediciones muestran nota y favorito nuevos inmediatamente.
5. Se bloquean nuevas creaciones del mismo artworkId, incluyendo operaciones pendientes/fallidas recuperadas; existe además una comprobación síncrona en el caché de mutaciones para impedir dobles pulsaciones. Una obra pendiente de creación se edita solamente cuando existe su ID definitivo.
6. Antes del POST se hace un GET de la colección para deduplicar por artworkId, también si se perdió la respuesta de un POST ya aplicado. MockAPI no ofrece unicidad atómica ni claves de idempotencia: no es posible garantizar exclusión entre dispositivos concurrentes. No se inventa esa garantía.
7. `resumePausedMutations()` se ejecuta en `onSuccess` del provider. TanStack reanuda al reconectar. La sincronización ocurre con la app ejecutándose; no se promete ejecución en segundo plano con la app cerrada.
8. Los errores de conexión/servidor tienen hasta dos reintentos; los HTTP menores a 500 no se reintentan automáticamente. El aviso global conserva errores y permite reintentar la misma operación. No se descarta silenciosamente la nota optimista ni se etiqueta como sincronizada.
9. La respuesta confirmada reemplaza el estado optimista y actualiza/invalida solo datos personales. El aviso distingue sin conexión, pendiente, sincronizando, error y sincronización completada. La confirmación aparece solo cuando no quedan operaciones pendientes ni fallidas.

## Diseño Android

Sombras dobles mediante `boxShadow` **nativo de React Native/Fabric**, como objetos, no CSS del navegador. Funciona con sombras exteriores desde Android 9; para Android 7/8 se usa `elevation` y bordes claros como alternativa. Fondos suaves, tarjetas redondeadas, botones presionables, listas virtualizadas y áreas seguras. No se añadieron librerías de diseño.

## Logs para la demostración con el APK

El botón **Ver logs de sincronización**, disponible en todas las pantallas, abre un panel desplazable con los últimos 120 eventos de la sesión (más recientes arriba). No requiere Metro, ADB ni una dependencia nueva. Ocultarlo no detiene la captura. El historial diagnóstico es solo de la sesión: al reiniciar se generan nuevos eventos que muestran qué caché y operaciones se recuperaron realmente. No se borra ni se cambia el formato de la caché existente.

`src/services/diagnostics.ts` emite también cada evento con `console.log`, prefijo `[Galeria]` y fecha/hora ISO con milisegundos; el panel muestra hora local. Se registran conexión, ciclo de vida, lectura de AsyncStorage, hidratación, uso de datos en caché, estados reales de mutaciones, solicitudes HTTP y reconciliación. El mensaje **escritura completada** se emite después de resolver `AsyncStorage.setItem`, no al serializar. **Sincronización completada** se emite con el ID definitivo al pasar la mutación a `success`, no al pausarla ni al iniciar el envío. No se registran notas, cuerpos HTTP ni JSON de la caché.

Para correlacionar con MockAPI, buscar el `artworkId` y el `id` mostrado en los logs. Si ya existe la obra, el log indica que se evita otro POST; no se atribuye una creación nueva a una simple lectura. El panel es informativo: no ofrece acciones para borrar caché, alterar la cola o simular respuestas. El detalle sigue requiriendo haberse consultado con red antes de usarlo offline. La recuperación después del cierre completo aún debe comprobarse en el APK instalado; estos logs no sustituyen esa comprobación.

Opcionalmente, con Android conectado por USB y autorizado, se pueden observar las líneas que Android exponga en Logcat usando PowerShell:

```powershell
adb logcat -v time | Select-String -SimpleMatch '[Galeria]'
```

La exposición de `console.log` en builds release depende del entorno; el panel dentro del APK es la alternativa disponible sin herramientas externas. Los pasos para actualizar el APK están en `instrucciones.md`.

## Comprobaciones y compilación

```sh
npx tsc --noEmit
npx expo lint
npx expo install --check
npx expo config --type public
```

Las consultas reales de verificación se limitan a GET; no se insertan datos de prueba en MockAPI. No se han comprobado instalación física, cambios físicos de red ni reinicio de una app instalada. Esas comprobaciones requieren un dispositivo.

Resultados ejecutados en esta entrega: TypeScript y lint finalizaron sin errores; `expo install --check` confirmó compatibilidad; `expo config --type public` resolvió la configuración y `expo-doctor` aprobó 21/21 comprobaciones. Los GET de listado/detalle del museo y colección MockAPI respondieron correctamente (colección inicialmente vacía). npm notificó 8 vulnerabilidades al instalar (3 moderadas y 5 altas); no se aplicó `audit fix --force` para evitar actualizaciones incompatibles fuera de alcance.

Para compilar un APK instalable:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

El último comando equivale a `eas build --platform android --profile preview` usando EAS CLI sin instalación global. En `init`, vincular el proyecto EAS deseado o crearlo en la cuenta propia; EAS escribirá `extra.eas.projectId`. Permitir generar/seleccionar el keystore Android cuando se solicite. No se necesita Android Studio para la compilación en la nube.

**Estado actualizado:** `app.json` ya tiene `extra.eas.projectId`, incorporado después del primer intento de compilación, y el usuario informa que está probando un APK instalado. No se ha generado otro APK durante la incorporación de los logs. Para incluir estos cambios hay que ejecutar de nuevo el build preview e instalarlo como actualización con la misma firma. Ver `instrucciones.md`.

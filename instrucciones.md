# Obtener e instalar la aplicación en Android

## 1. Generar y obtener el APK

El proyecto ya está vinculado a EAS y existe un APK que estás probando. Para incluir el panel y los logs nuevos, debes generar **otro APK**; el que ya está instalado no incorpora estos cambios automáticamente. No se ha generado un APK nuevo durante esta modificación.

En una terminal dentro de la carpeta del proyecto, con Node.js 22.13+ y npm:

```sh
npm ci
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

- Si ya tienes sesión, puedes omitir `login`.
- No ejecutes `init` de nuevo: `app.json` ya tiene el ID del proyecto EAS. Usa la cuenta con acceso a ese proyecto.
- Cuando EAS solicite las credenciales Android, selecciona un keystore existente o permite generar uno nuevo. Guarda acceso a esa cuenta para futuras actualizaciones.
- `preview` está configurado para producir `.apk`, no `.aab`, e incluye la URL pública de MockAPI durante la compilación.
- Espera a que EAS indique que la compilación terminó correctamente. Abre el enlace que imprima y descarga el archivo APK desde la página del build.
- Puedes recuperar la lista de compilaciones con `npx eas-cli@latest build:list --platform android` y abrir la que haya finalizado correctamente.

## 2. Llevar el APK al teléfono

Abre el enlace real de EAS en el navegador de Android y descarga el APK. También puedes descargarlo en la computadora y transferirlo por USB a la carpeta Descargas del teléfono.

## 3. Permitir esta fuente

Toca el APK desde el navegador o la aplicación Archivos. Si Android solicita permiso para instalar aplicaciones desconocidas, abre la configuración indicada y permite instalar desde **esa fuente concreta**. No es necesario habilitarlo para todas las aplicaciones.

## 4. Instalar

Vuelve al archivo APK y toca **Instalar**. Si ya hay una versión con una firma incompatible, Android puede rechazar la actualización; conserva el mismo keystore. Desinstalar la versión anterior elimina su caché y cambios pendientes.

## 5. Ejecutar

Pulsa **Abrir** o busca **Galería personal** en las aplicaciones. El APK preview no necesita Metro ni una computadora conectada. La primera carga de obras necesita internet. Las respuestas guardadas pueden consultarse después sin conexión; las imágenes pueden no estar disponibles offline. Los cambios pendientes se envían cuando vuelve la conexión y la aplicación está abierta.

## Alternativa: instalación mediante ADB

Instala Android Platform Tools, habilita las opciones de desarrollador y la depuración USB en tu teléfono, conéctalo y acepta su autorización. Ejecuta en la computadora:

```sh
adb devices
adb install -r "C:\ruta\galeria.apk"
```

Sustituye la ruta por el APK descargado realmente. Cuando indique `Success`, abre **Galería personal** desde el teléfono. ADB no genera el APK: primero debes completar la compilación de la sección 1.

Estas instrucciones no significan que se haya instalado o probado la aplicación en un dispositivo desde OpenCode.

## Logs visibles para el video

En el APK nuevo, toca **Ver logs de sincronización** en la parte superior. El panel funciona sin Metro y sin conexión. Puedes abrirlo, ocultarlo y desplazarte por los eventos, que muestran la hora local con milisegundos; los más recientes están arriba.

- **Vista … desde caché** identifica datos mostrados sin esperar un GET nuevo.
- **Cambio pendiente / pausada** no significa enviado ni sincronizado.
- **AsyncStorage: escritura completada … pendientes guardadas en disco** confirma que terminó la escritura local de esa instantánea.
- Al reiniciar, **Restauración completada** y **operación pendiente recuperada** permiten identificar la recuperación real. No se conserva el historial de logs anterior; se conserva la caché y la cola de operaciones.
- **HTTP POST … envío iniciado** es solo el inicio; **respuesta … recibida** y **sincronización completada; MockAPI id=…** identifican la confirmación. El ID permite ubicar el registro en MockAPI.
- Un detalle no consultado previamente con red puede no estar en caché. Las imágenes tienen una caché independiente.

Instala como actualización con la misma firma (o `adb install -r`) para conservar datos. No desinstales ni borres el almacenamiento para actualizar. El diagnóstico no puede capturar eventos mientras el proceso está cerrado; muestra los de la nueva sesión al abrirlo.

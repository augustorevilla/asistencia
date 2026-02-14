# Guía de Instalación y Uso - App Tomar Asistencia

Esta aplicación es una **Progressive Web App (PWA)**. Esto significa que funciona como una página web pero puede instalarse en tu celular y funcionar sin internet.

## 1. Preparación (En tu computadora)

Para que la aplicación funcione correctamente (especialmente el modo offline), debe ejecutarse desde un servidor local, no abriendo el archivo directamente.

### Opción A: Usando Python (Recomendado si ya lo tienes)
1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta:
   ```bash
   python -m http.server 8000
   ```
3. En tu navegador, ve a `http://localhost:8000`

### Opción B: Visual Studio Code
1. Instala la extensión "Live Server".
2. Haz clic derecho en `index.html` y selecciona "Open with Live Server".

## 2. Instalación en el Celular (Android)

Para instalarla en tu celular, necesitas que tu celular pueda acceder a tu computadora (estando en la misma red Wi-Fi) o subir los archivos a un hosting gratuito como GitHub Pages o Netlify.

### Método Local (Misma red Wi-Fi)
1.  Asegúrate que tu PC y Celular estén en el mismo Wi-Fi.
2.  Averigua la IP de tu PC (comando `ipconfig` en terminal, busca IPv4, ej: `192.168.1.5`).
3.  Inicia el servidor (paso 1).
4.  En el celular, abre Chrome y ve a `http://192.168.1.5:8000` (reemplaza la IP y puerto).
5.  Deberías ver la app.
6.  Toca el menú de tres puntos de Chrome -> **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
7.  Ahora aparecerá como una app nativa en tu menú.

### Método Permanente (GitHub Pages / Netlify)
Subir los archivos a un servicio de hosting es la mejor opción para uso real.
1.  Sube los archivos a un repositorio GitHub.
2.  Activa **GitHub Pages** en la configuración del repositorio.
3.  Entra al link que te da GitHub desde tu celular.
4.  Instálala como se indicó arriba.

## 3. Uso de la App

1.  **Crear Grupo**: Toca el botón `+` en la pantalla principal.
2.  **Agregar Miembros**: Entra al grupo y toca el botón `+`.
3.  **Tomar Asistencia**:
    - Entra al grupo.
    - Toca "Tomar Asistencia".
    - Selecciona la fecha.
    - Toca la "P" (Verde/Presente) o "A" (Rojo/Ausente) para cambiar el estado.
    - Clic en "Guardar".
    - Puedes volver a la pantalla anterior con el botón "Volver".

4.  **Ver Registros Recientes**:
    - En la pantalla principal, baja hasta "Últimos Registros".
    - Toca "Ver" en cualquier registro para ver los detalles de esa asistencia.

5.  **Estadísticas y Exportar**:
    - **Exportar Todo**: En la pantalla principal, toca "Exportar Todo a Excel" para descargar un archivo con todos los grupos y asistencias.
    - **Por Grupo**: Entra al grupo, toca "Estadísticas" y luego "Exportar a Excel (CSV)".

## 4. Modo Offline
Una vez instalada, puedes poner el celular en modo avión y abrir la app. Seguirá funcionando y guardará los datos localmente.

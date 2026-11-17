# EBS Dashboard · Grupo Attie

Catálogo de inventario para clientes (pedidos, catálogos por marca y exportación a Excel).
Todo vive en un solo archivo: `index.html`. Los datos van dentro del archivo.

## Cómo se actualiza (cada lunes)

1. Alex baja el Excel de inventario de **EBS Navigator**.
2. Abre el dashboard publicado y toca el botón **Alex**, en la esquina inferior izquierda.
3. Escribe la contraseña y arrastra el Excel.
4. Revisa el resumen (productos, unidades, marcas) y toca **Publicar en la página**.
5. En unos minutos (entre 1 y 10) el sitio queda actualizado para todos, con la fecha nueva en "Actualizado".

La página reconoce sola las columnas del Excel (Referencia, Descripción, Marca, CIA, Disponible, Precio, Grupo, Año, Temporada, Color, Estado, Foto). Si alguna no la reconoce, se elige una vez en la lista y queda guardada para la próxima.

En los catálogos que se descargan para clientes el botón Alex no aparece.

## Fotos

- Salen del servidor de TopManage: `pic.aspx`, con `ID=4` para Multimoda y `ID=5` para Prestige.
- En la cuadrícula se cargan miniaturas (`MaxSize=400`). La foto original se carga solo al ampliar.
- Si el EBS no trae link de foto, se busca por referencia: en otra talla, como `REFERENCIA.JPG` y como la referencia sin talla.
- Si la foto no existe, se muestra 📦.

## Configuración inicial (una sola vez)

### 1. Publicar con GitHub Pages
En el repo: *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save*.
El link queda en `https://prestigefashionpty.github.io/ebs-dashboard/`.
Con la cuenta gratis de GitHub, el repo tiene que ser **público** para usar Pages.

### 2. Token de GitHub para Alex
1. En GitHub, ve a *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*.
2. En *Resource owner* elige `Prestigefashionpty`. En *Repository access* elige *Only select repositories* y marca este repo.
3. En *Permissions → Repository permissions → Contents* elige **Read and write**. Ponle un vencimiento de 1 año.
4. En el dashboard, toca **Alex → ⚙️ Configuración**. Pega el token, revisa que el dueño, el repo, la rama y el archivo coincidan con el repo real, y toca **Guardar**. Después toca **Probar conexión**.

El token se guarda solo en el navegador de Alex. No va en el código ni en el repo.

### 3. Contraseña del botón Alex
En el código solo está la huella SHA-256 de la contraseña (`PW_HASH`, dentro de `<script id="alex-upd">`).
Para cambiarla, calcula el SHA-256 de la nueva contraseña y reemplaza ese valor.

## Plan B (sin token)
En el panel de Alex, **Descargar HTML** genera el `index.html` actualizado. Súbelo al repo a mano con *Add file → Upload files* y reemplaza el anterior.

## Archivos
- `index.html`: el dashboard completo, con app, datos y fotos.
- `src/fotos-fix.js` y `src/alex.js`: copia legible de los dos módulos que ya van incluidos dentro de `index.html`, por si hay que editarlos.

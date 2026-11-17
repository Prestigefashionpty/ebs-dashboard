# EBS Dashboard · Grupo Attie

Catálogo de inventario para clientes (pedidos, catálogos por marca y exportación a Excel).
Todo vive en un solo archivo: `index.html`. Los datos van dentro del archivo.

## Cómo se actualiza

**Automático, todos los días a las 5:30 am:** un robot (GitHub Actions en el repo privado `sap-mcp-attie`, tarea "Inventario EBS Dashboard")
1. entra al EBS Navigator y baja *Inventory → Report (including batches)* de Prestige y Multimoda (disponible de la bodega Regular);
2. toma de SAP el precio (lista 3 "1.Precio_Vta Wholesale"), año, temporada, color, foto y lo que viene en camino (compras abiertas);
3. publica la página. Si algo falla, no publica y GitHub manda un correo.

Productos sin precio en la lista 3 conservan el último precio publicado; los que no tienen ningún precio no salen y quedan en `reportes/sin_precio_lista3.csv`.

**Manual (respaldo):** botón **⬆ Alex** → contraseña → arrastrar el Excel del EBS (uno por compañía). Toma precio y datos de lo publicado; lo de la otra compañía queda igual.

## Catálogo para clientes: link + pedido por WhatsApp

1. En el dashboard, filtra la marca (y lo que quieras) y toca **📋 Catálogo**.
2. Escribe tu nombre y tu WhatsApp (quedan guardados) y, si quieres, el nombre del cliente.
3. Toca **Copiar link para cliente** o **Enviar por WhatsApp**.
   - El link abre solo esos productos, con tus condiciones de precio, sin botones internos y siempre con el inventario más reciente.
4. El cliente arma su pedido y toca **📲 Enviar pedido por WhatsApp**: te llega el pedido con referencias, cantidades y total, más un link que abre la orden con fotos (desde ahí bajas el XLSX).

Sigue existiendo **Descargar HTML** (archivo con el stock del día); ese archivo también trae el botón de WhatsApp.

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

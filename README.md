# Comercio · Gestión simple

Primera versión web de una base general para administrar un comercio. Está hecha con HTML, CSS y JavaScript sin dependencias ni proceso de instalación.

## Cómo abrirla

Abrí `index.html` en un navegador. Los cambios se guardan automáticamente en el almacenamiento local de ese navegador. La primera apertura incluye información de muestra para recorrer las pantallas.

## Qué se puede probar

- **Inicio:** resumen de hoy, accesos rápidos y recordatorios próximos.
- **Ventas:** carrito, cantidades, medio de pago e historial. Al cobrar, se descuenta el stock y se actualizan caja e indicadores; no pide datos del comprador.
- **Stock:** búsqueda por nombre, filtros, precios, edición y alta sin códigos.
- **Compras:** registra proveedor, productos y costos; suma stock y actualiza la lista de precios del proveedor.
- **Caja:** apertura con efectivo inicial, seguimiento automático de ventas en efectivo, gastos y compras, y cierre con diferencia contra el dinero contado.
- **Gastos:** carga de qué, cuánto y cuándo, o interpretación de una frase como “Gasté 25 mil pesos en luz hoy”; muestra la interpretación para confirmar.
- **Finanzas y estadísticas:** ventas, compras, gastos y ganancia aproximada, sin ticket promedio ni gráfico semanal.
- **Proveedores:** lista de precios por proveedor y actualización porcentual en lote.
- **Recordatorios:** organizados en vencidos, hoy y próximos, con uno, dos o tres avisos previos.
- **Configuración:** nombre, moneda, tema y descarga de una copia JSON.

## Alcance de esta versión

Es un prototipo funcional de un solo dispositivo. No incluye servidor, sincronización entre equipos, usuarios, permisos, copias de seguridad automáticas ni emisión fiscal. Los datos de ejemplo y los datos nuevos viven en `localStorage`; limpiar los datos del navegador los elimina. Para ofrecerlo como servicio comercial multiusuario, el siguiente paso es definir e implementar una API y una base de datos compartida, autenticación, copias de seguridad y aislamiento de datos por comercio.

Los datos anteriores del navegador se migran al abrir: se conservan ventas y proveedores, se retiran referencias a clientes y códigos de producto, y los gastos quedan sin categorías.


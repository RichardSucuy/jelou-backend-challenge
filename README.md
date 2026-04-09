# Jelou Backend Challenge

Sistema B2B de pedidos compuesto por dos APIs REST y un Lambda orquestador.


## Arquitectura

```
Customers API (3001) ←→ Orders API (3002) ←→ Lambda Orquestador (3003)
                              ↕
                           MySQL
```

## Requisitos

- Docker Desktop
- Node.js 22+
- npm

## Nota de arquitectura

Siguiendo las indicaciones de la prueba, se implementaron dos APIs principales: **Customers API** y **Orders API**, donde la gestión de productos forma parte de Orders.

Sin embargo, en un entorno de producción y a mayor escala, lo más adecuado sería desacoplar la gestión de productos en un servicio independiente (Products API). Esto permitiría:

- Escalabilidad independiente del catálogo de productos
- Mejor separación de responsabilidades (SRP)
- Mayor flexibilidad para integraciones externas (inventarios, pricing, etc.)

Además, este enfoque facilitaría la evolución hacia una arquitectura basada en microservicios.

En este caso, se mantuvo la estructura solicitada para cumplir con los requisitos de la prueba técnica.


## 🛠️ Stack Tecnológico y Decisiones Técnicas

El sistema ha sido construido utilizando herramientas modernas para garantizar robustez y escalabilidad:

- **Runtime**: Node.js 22+
- **Frameworks**: Express.js para las APIs y Serverless Framework para el Lambda.
- **Validación (Zod)**: Se implementó **Zod** en ambas APIs y en el Lambda Orquestador para garantizar que todas las peticiones (Payloads y Query Params) cumplan con el esquema requerido antes de procesar cualquier lógica de negocio.
- **Seguridad**: Autenticación mediante **JWT (JSON Web Tokens)** para proteger los endpoints sensibles.
- **Persistencia**: MySQL 8.0 con relaciones definidas y soporte para transacciones.
- **Idempotencia**: Implementada en el flujo de creación de órdenes para evitar duplicados en reintentos de red.


## 🖥️ Entorno de Ejecución y Desarrollo

Para garantizar que el sistema sea **totalmente reproducible**, auditable y fácil de probar sin dependencias de infraestructura externa, se ha optado por un entorno de desarrollo **100% local**:

*   **Docker Compose**: Orquesta las APIs y la base de datos MySQL, asegurando que los servicios corran en contenedores aislados con configuraciones idénticas.
*   **Serverless Offline**: Se utiliza para emular el comportamiento del **Lambda Orquestador** en local. Esto permite validar la lógica de orquestación, el manejo de eventos y la comunicación entre servicios de manera fiel a como operaría en un entorno real de AWS.
*   **Portabilidad**: El diseño de los servicios es *Cloud-Ready*. El código del Lambda y las APIs es compatible para ser desplegado en **AWS Lambda** y **Amazon RDS** simplemente ajustando las variables de entorno.

Este enfoque asegura que cualquier evaluador pueda levantar el flujo completo del sistema en pocos minutos sin necesidad de configurar credenciales o recursos en la nube.


## Levantamiento local

### 1. Clonar repositorio

```bash
git clone https://github.com/RichardSucuy/jelou-backend-challenge.git
cd jelou-backend-challenge
```

### 2. Configurar variables de entorno

```bash
# Raíz del proyecto
cp .env.example .env

# Customers API
cp customers-api/.env.example customers-api/.env

# Orders API
cp orders-api/.env.example orders-api/.env

# Lambda
cp lambda-orchestrator/.env.example lambda-orchestrator/.env
```

### 3. Levantar APIs con Docker Compose

```bash
docker-compose build
docker-compose up -d
```

### 4. Verificar

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| MYSQL_ROOT_PASSWORD | Password root MySQL | rootpassword |
| MYSQL_DATABASE | Nombre de la BD | jelou_db |
| MYSQL_USER | Usuario MySQL | jelou_user |
| MYSQL_PASSWORD | Password MySQL | jelou_pass |
| JWT_SECRET | Secret para JWT | supersecretjwt |
| SERVICE_TOKEN | Token interno entre servicios | internal-service-token-123 |

## Generar JWT para pruebas

```bash
cd customers-api
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({id:1, role:'operator'}, 'supersecretjwt', {expiresIn:'24h'}))"
```

## URLs base

| Servicio | URL |
|---|---|
| Customers API | http://localhost:3001 |
| Orders API | http://localhost:3002 |
| Lambda Orquestador | http://localhost:3003/dev/orchestrator/create-and-confirm-order |

## Ejemplos cURL

### Crear cliente
```bash
curl -X POST http://localhost:3001/customers \
  -H "Authorization: Bearer TU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"ACME Corp","email":"ops@acme.com","phone":"+1234567890"}'
```

### Crear producto
```bash
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer TU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU-001","name":"Laptop Pro","price_cents":129900,"stock":50}'
```

### Crear orden
```bash
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer TU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"items":[{"product_id":1,"qty":2}]}'
```

### Confirmar orden (idempotente)
```bash
curl -X POST http://localhost:3002/orders/1/confirm \
  -H "Authorization: Bearer TU_JWT" \
  -H "X-Idempotency-Key: key-unico-123"
```

### Cancelar orden
```bash
curl -X POST http://localhost:3002/orders/1/cancel \
  -H "Authorization: Bearer TU_JWT"
```

## Lambda Orquestador

### Levantar local

```bash
cd lambda-orchestrator
npm install
npm run dev  # Inicia serverless-offline para emular AWS Lambda
```

### Invocar desde Insomnia/Postman

**POST** `http://localhost:3003/dev/orchestrator/create-and-confirm-order`

```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 1, "qty": 2 }
  ],
  "idempotency_key": "key-unico-abc-123",
  "correlation_id": "req-001"
}
```

### Respuesta esperada

```json
{
  "success": true,
  "correlationId": "req-001",
  "data": {
    "customer": {
      "id": 1,
      "name": "ACME Corp",
      "email": "ops@acme.com",
      "phone": "+1234567890"
    },
    "order": {
      "id": 1,
      "status": "CONFIRMED",
      "total_cents": 259800,
      "items": [
        {
          "product_id": 1,
          "qty": 2,
          "unit_price_cents": 129900,
          "subtotal_cents": 259800
        }
      ]
    }
  }
}
```

## Idempotencia

El endpoint `/confirm` y el Lambda soportan idempotencia mediante `X-Idempotency-Key`. Enviar la misma key dos veces devuelve la misma respuesta sin ejecutar operaciones duplicadas.

## Documentación OpenAPI

- Customers API: `customers-api/openapi.yaml`
- Orders API: `orders-api/openapi.yaml`

## Pruebas con Insomnia

Para facilitar las pruebas, se incluye una colección de Insomnia con todos los endpoints configurados, incluyendo variables de entorno y ejemplos de cuerpo de solicitud.

1. Descarga el archivo `insomnia_2026-04-09_collection.json` ubicado en la raíz de este proyecto.
2. Abre **Insomnia**.
3. Ve a **Dashboard** > **Import** > **File**.
4. Selecciona el archivo descargado.
5. (Opcional) Configura la variable `base_url` en el entorno de Insomnia si usas puertos distintos.

> **Nota:** No olvides generar tu JWT e inclúyelo en la pestaña **Auth** > **Bearer** de la colección para que las peticiones funcionen correctamente.

## Gestión de Base de Datos

### Respaldos
Se ha incluido un volcado completo de la base de datos con datos de prueba actuales en:
- `db/jelou_db.sql`: Contiene la estructura y datos (Exportado desde el contenedor).

### Cómo restaurar o limpiar
Si deseas resetear la base de datos a su estado original (ejecutando de nuevo `schema.sql` y `seed.sql`):
```bash
docker-compose down -v
docker-compose up -d

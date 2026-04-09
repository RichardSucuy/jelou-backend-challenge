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

## Levantamiento local

### 1. Clonar repositorio

```bash
git clone https://github.com/TU_USUARIO/jelou-backend-challenge.git
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
npm run dev
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
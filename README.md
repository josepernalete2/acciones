# 📈 Sistema de Gestión de Portafolio Bursátil (BVC) & Motor Cambiario

Backend profesional desarrollado con **Node.js**, **TypeScript**, **Express** y **Prisma ORM (PostgreSQL)** para la gestión y seguimiento integral de portafolios de inversión en la **Bolsa de Valores de Caracas (BVC)**, sincronización automatizada de tasas cambiarias oficiales y paralelas (BCV y Binance P2P) y control de custodia de títulos (CVV).

---

## 🚀 Características Principales

- **Motor de Tasas Cambiarias en Tiempo Real**:
  - Scraping automatizado y tolerante a fallos al portal del **Banco Central de Venezuela (BCV)**.
  - Consulta y promedio de mercado de anuncios P2P en **Binance (USDT / VES)** según reputación.
  - Cálculo dinámico de la brecha cambiaria porcentual y almacenamiento histórico por fecha.
- **Modelado Financiero Robusto con Prisma ORM**:
  - Activos bursátiles (Acciones BVC y mercado US).
  - Cotizaciones diarias con volúmenes de títulos y efectivo.
  - Registro de transacciones con comisiones de corretaje y tarifas de la Caja Venezolana de Valores (CVV).
  - Auditoría de saldos en custodia por usuario.
- **Arquitectura Limpia y Modular**:
  - Controladores, servicios desacoplados, rutas versionadas, manejo de errores centralizado y *graceful shutdown*.

---

## 🛠️ Stack Tecnológico

- **Runtime & Lenguaje:** Node.js (v18+) & TypeScript (ES2022)
- **Framework Web:** Express.js 5
- **ORM & Base de Datos:** Prisma ORM 6 & PostgreSQL
- **Scraping & HTTP:** Axios & Cheerio
- **Aritmética Financiera:** Decimal.js
- **Herramientas de Desarrollo:** ts-node-dev, dotenv, cors

---

## 📁 Estructura del Proyecto

```text
├── prisma/
│   └── schema.prisma         # Modelos de base de datos relacionales y Enums
├── src/
│   ├── config/
│   │   └── prisma.ts         # Singleton de conexión a PrismaClient
│   ├── controllers/
│   │   ├── exchangeRate.controller.ts
│   │   └── health.controller.ts
│   ├── routes/
│   │   ├── exchangeRate.routes.ts
│   │   ├── health.routes.ts
│   │   └── index.ts          # Enrutador central (/api)
│   ├── services/
│   │   ├── bvc.service.ts
│   │   ├── exchangeRate.service.ts
│   │   └── index.ts
│   ├── utils/
│   │   └── index.ts          # Funciones de respuesta estandarizadas
│   └── server.ts             # Punto de entrada de la aplicación Express
├── .env.example              # Variables de entorno requeridas
├── tsconfig.json             # Configuración del compilador TypeScript
└── package.json
```

---

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/josepernalete2/acciones.git
cd acciones
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo de plantilla `.env.example` a `.env` y ajusta las credenciales de tu base de datos PostgreSQL:

```bash
cp .env.example .env
```

Contenido de `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bvc_portfolio?schema=public"
CORS_ORIGIN="*"
```

### 4. Generar cliente de Prisma, ejecutar migraciones y sembrar catálogo inicial
```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

---

## 💻 Ejecución

### 1. Backend (Node.js & Express)
- **Modo Desarrollo (con recarga en vivo en puerto 3000):**
  ```bash
  npm run dev
  ```
- **Compilar backend:**
  ```bash
  npm run build
  ```
- **Modo Producción:**
  ```bash
  npm start
  ```

### 2. Frontend (React 19, Vite & Tailwind CSS)
- **Modo Desarrollo (en http://localhost:5175):**
  ```bash
  npm run client:dev
  # o directamente en la carpeta: cd frontend && npm run dev
  ```
- **Compilar frontend para producción:**
  ```bash
  npm run client:build
  ```

---

## 📡 Endpoints de la API

### Healthcheck
- `GET /health` - Estado del servicio, uptime y entorno.

### Tasas Cambiarias (`/api/rates`)
- `GET /api/rates/latest` - Retorna el último registro de tasas cambiarias almacenado.
- `GET /api/rates/history?from=YYYY-MM-DD&to=YYYY-MM-DD` - Consulta el historial de tasas filtrado por rango de fechas.
- `POST /api/rates/sync` - Ejecuta la sincronización en vivo (BCV + Binance P2P) y guarda el registro del día.

### Catálogo de Acciones BVC y Cotizaciones (`/api/bvc`)
- `GET /api/bvc/assets` - Lista todos los activos BVC con su última cotización y precio equivalente en USD calculado con la última tasa oficial BCV.
- `GET /api/bvc/assets/:ticker/history?limit=30` - Obtiene el historial cronológico de cotizaciones para un ticker específico (ej. `BPV`, `BVL`, `ABC.A`).
- `POST /api/bvc/quotes/sync` - Ingesta y sincroniza en tiempo real las cotizaciones de la jornada bursátil de la BVC.

### Gestión de Portafolio y Transacciones (`/api/portfolio`)
- `POST /api/portfolio/transactions` - Registra una compra (`BUY`) o venta (`SELL`) con cálculo automático de comisiones y contravalor en USD según tasa BCV.
- `GET /api/portfolio/transactions?userId=USER_ID&ticker=BPV` - Historial cronológico de transacciones.
- `POST /api/portfolio/custody` - Actualiza la auditoría de títulos en custodia de la Caja Venezolana de Valores (CVV).
- `GET /api/portfolio/summary?userId=USER_ID` - Consolidado de cartera: posición neta, precio promedio ponderado, valor actual de mercado, P&L latente en USD y descuadre de custodia CVV.
- `POST /api/portfolio/import-excel` - Importación masiva automática desde libros de Excel de Solfin (pestañas 'PRECIO - VOLUMEN' para custodia CVV y 'COMPRAS VENTA' para bloques de transacciones históricas).

### Control de Gastos Multimoneda y Flujo de Caja (`/api/cashflow`)
- `POST /api/cashflow/expenses` - Registra un gasto en VES, USD o USDT con conversión automática a contravalores oficiales y paralelos según la fecha.
- `GET /api/cashflow/expenses?userId=USER_ID&category=BROKER_FEE&currency=VES` - Listado cronológico de gastos con filtros opcionales de fecha, categoría y moneda.
- `GET /api/cashflow/expenses/summary?userId=USER_ID&from=YYYY-MM-DD&to=YYYY-MM-DD` - Resumen consolidado: total gastado en USD y VES, distribución porcentual por categoría y desglose por moneda original.
- `DELETE /api/cashflow/expenses/:id` - Elimina un gasto verificando pertenencia al usuario.

### Gestión de Dividendos Bursátiles (`/api/dividends`)
- `POST /api/dividends` - Registra un dividendo en acciones liberadas (`SHARES`) o en efectivo (`CASH_VES` / `CASH_USD`) con cálculo automático de retenciones ISLR, contravalor USD y ajuste del costo promedio ponderado.
- `GET /api/dividends?userId=USER_ID&assetId=ASSET_ID` - Historial de dividendos cobrados por activo y usuario.

### Exportación de Reportes Financieros (`/api/reports`)
- `GET /api/reports/portfolio/excel?userId=USER_ID` - Genera y descarga el libro de Excel (.xlsx) estructurado con posiciones, rendimientos, tasas, custodia CVV y dividendos.
- `GET /api/reports/portfolio/pdf?userId=USER_ID` - Genera y descarga el estado de cuenta formal en PDF con membrete corporativo, tabla ejecutiva de posiciones y resumen consolidado.

#### Ejemplo de respuesta de sincronización (`POST /api/rates/sync`):
```json
{
  "success": true,
  "message": "Tasas cambiarias (BCV y Binance P2P) sincronizadas y registradas exitosamente",
  "data": {
    "id": "c1f77d61-d68a-4a6c-b3a1-ef17d4e414ab",
    "rateDate": "2026-10-22T00:00:00.000Z",
    "bcvUsd": "884.7496",
    "binanceP2pUsd": "999.8622",
    "parallelUsd": null,
    "spreadBcvParalelo": "13.0108",
    "createdAt": "2026-10-22T13:30:00.000Z",
    "isBcvFallback": false
  },
  "timestamp": "2026-10-22T13:30:00.000Z"
}
```

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta `LICENSE` para más detalles.

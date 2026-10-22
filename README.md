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

### 4. Generar cliente de Prisma y ejecutar migraciones
```bash
npm run prisma:generate
npm run prisma:migrate
```

---

## 💻 Ejecución

- **Modo Desarrollo (con recarga en vivo):**
  ```bash
  npm run dev
  ```

- **Compilar proyecto (TypeScript a JavaScript):**
  ```bash
  npm run build
  ```

- **Modo Producción:**
  ```bash
  npm start
  ```

---

## 📡 Endpoints de la API

### Healthcheck
- `GET /health` - Estado del servicio, uptime y entorno.

### Tasas Cambiarias (`/api/rates`)
- `GET /api/rates/latest` - Retorna el último registro de tasas cambiarias almacenado.
- `GET /api/rates/history?from=YYYY-MM-DD&to=YYYY-MM-DD` - Consulta el historial de tasas filtrado por rango de fechas.
- `POST /api/rates/sync` - Ejecuta la sincronización en vivo (BCV + Binance P2P) y guarda el registro del día.

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

import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, MarketType, Currency } from '@prisma/client';

const prisma = new PrismaClient();

export const INITIAL_BVC_ASSETS = [
  { ticker: 'BPV', name: 'Banco Provincial' },
  { ticker: 'BVL', name: 'Banco de Venezuela' },
  { ticker: 'ABC.A', name: 'Banco del Caribe "A"' },
  { ticker: 'BNC', name: 'Banco Nacional de Crédito' },
  { ticker: 'BOU', name: 'Banco Occidental de Descuento' },
  { ticker: 'BVCC', name: 'Bolsa de Valores de Caracas' },
  { ticker: 'CCR', name: 'Cerámicas Carabobo' },
  { ticker: 'CIE', name: 'Corporación Industrial de Energía' },
  { ticker: 'PGR', name: 'Proagro' },
  { ticker: 'PTN', name: 'Protinal' },
  { ticker: 'SVS', name: 'Sivensa' },
  { ticker: 'MVZ.B', name: 'Mercantil Servicios Financieros "B"' },
  { ticker: 'TDV.D', name: 'CANTV Clase D' },
  { ticker: 'RST', name: 'Ron Santa Teresa' },
  { ticker: 'RST.B', name: 'Ron Santa Teresa "B"' },
  { ticker: 'CRM.A', name: 'Corimon' },
  { ticker: 'DOM', name: 'Domínguez & Cía' },
  { ticker: 'EFE', name: 'Productos Efe' },
];

async function main() {
  console.log('Iniciando siembra de catálogo de acciones de la Bolsa de Valores de Caracas (BVC)...');

  let processedCount = 0;
  for (const asset of INITIAL_BVC_ASSETS) {
    const record = await prisma.asset.upsert({
      where: { ticker: asset.ticker },
      update: {
        name: asset.name,
        market: MarketType.BVC,
        baseCurrency: Currency.VES,
        isActive: true,
      },
      create: {
        ticker: asset.ticker,
        name: asset.name,
        market: MarketType.BVC,
        baseCurrency: Currency.VES,
        isActive: true,
      },
    });
    processedCount++;
    console.log(`[SEED] (${processedCount}/${INITIAL_BVC_ASSETS.length}) ${record.ticker} - ${record.name}`);
  }

  console.log(`Siembra finalizada con éxito. Total: ${processedCount} activos asegurados.`);
}

main()
  .catch((err) => {
    console.error('Error durante la ejecución del seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

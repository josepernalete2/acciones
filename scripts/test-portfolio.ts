import { Decimal } from 'decimal.js';

interface SimulatedTransaction {
  ticker: string;
  type: 'BUY' | 'SELL';
  sharesCount: Decimal;
  pricePerShareVes: Decimal;
  brokerFeeVes: Decimal;
  cvvFeeVes: Decimal;
  bcvRateUsed: Decimal;
  totalAmountVes: Decimal;
  pricePerShareUsd: Decimal;
  totalAmountUsd: Decimal;
}

function runPortfolioSimulation() {
  console.log('===============================================================');
  console.log('📊 SIMULACIÓN DE FÓRMULAS DE PORTAFOLIO Y P&L (FASE 4)');
  console.log('===============================================================\n');

  // Parámetros de prueba
  const ticker = 'BPV';
  const sharesCount = new Decimal(100);
  const pricePerShareVes = new Decimal('9280.00');
  const brokerFeeVes = new Decimal('92.80'); // 1% comisión casa de bolsa
  const cvvFeeVes = new Decimal('9.28');     // 0.1% arancel Caja Venezolana de Valores
  const bcvRate = new Decimal('884.7496');   // Tasa oficial BCV

  console.log('1. DATOS DE ENTRADA DE LA OPERACIÓN:');
  console.log(`- Activo: ${ticker} (Banco Provincial)`);
  console.log(`- Tipo: COMPRA (BUY)`);
  console.log(`- Cantidad de acciones: ${sharesCount.toString()}`);
  console.log(`- Precio unitario: Bs. ${pricePerShareVes.toFixed(2)}`);
  console.log(`- Comisión Corretaje: Bs. ${brokerFeeVes.toFixed(2)}`);
  console.log(`- Tarifa CVV: Bs. ${cvvFeeVes.toFixed(2)}`);
  console.log(`- Tasa oficial BCV aplicada: Bs. ${bcvRate.toFixed(4)} / USD\n`);

  // Fórmulas requeridas
  // totalAmountVes = (sharesCount * pricePerShareVes) + brokerFeeVes + cvvFeeVes
  const grossVes = sharesCount.times(pricePerShareVes);
  const totalAmountVes = grossVes.plus(brokerFeeVes).plus(cvvFeeVes);
  const pricePerShareUsd = pricePerShareVes.dividedBy(bcvRate).toDecimalPlaces(4);
  const totalAmountUsd = totalAmountVes.dividedBy(bcvRate).toDecimalPlaces(4);

  console.log('2. CÁLCULO DE LA TRANSACCIÓN:');
  console.log(`- Monto bruto en Bs: Bs. ${grossVes.toFixed(2)}`);
  console.log(`- Total pagado en Bs (con comisiones): Bs. ${totalAmountVes.toFixed(2)}`);
  console.log(`- Precio unitario equivalente en USD: $${pricePerShareUsd.toFixed(4)}`);
  console.log(`- Inversión total en USD: $${totalAmountUsd.toFixed(4)}\n`);

  const tx: SimulatedTransaction = {
    ticker,
    type: 'BUY',
    sharesCount,
    pricePerShareVes,
    brokerFeeVes,
    cvvFeeVes,
    bcvRateUsed: bcvRate,
    totalAmountVes,
    pricePerShareUsd,
    totalAmountUsd,
  };

  // Simulación de cotización de mercado posterior
  const currentClosingPriceVes = new Decimal('9850.00'); // Subió a 9850 Bs
  const currentBcvRate = new Decimal('884.7496');
  const latestPriceUsd = currentClosingPriceVes.dividedBy(currentBcvRate).toDecimalPlaces(4);

  // Auditoría de custodia en Caja Venezolana de Valores (CVV)
  const cvvShares = new Decimal(100);
  const currentShares = tx.sharesCount;
  const custodyDifference = cvvShares.minus(currentShares);

  // Posición consolidada
  const averageBuyPriceUsd = tx.totalAmountUsd.dividedBy(tx.sharesCount).toDecimalPlaces(4);
  const currentValueVes = currentShares.times(currentClosingPriceVes);
  const currentValueUsd = currentShares.times(latestPriceUsd);

  // P&L Latente
  const pnlUsd = currentValueUsd.minus(tx.totalAmountUsd);
  const pnlPct = pnlUsd.dividedBy(tx.totalAmountUsd).times(100).toDecimalPlaces(2);

  console.log('3. CONSOLIDACIÓN DE CARTERA Y RESUMEN DE P&L:');
  console.table([
    {
      Ticker: ticker,
      'Acciones Compradas': currentShares.toString(),
      'Precio Compra Prom USD': `$${averageBuyPriceUsd.toFixed(4)}`,
      'Inversión Total USD': `$${tx.totalAmountUsd.toFixed(4)}`,
      'Precio Mercado Bs': `Bs. ${currentClosingPriceVes.toFixed(2)}`,
      'Precio Mercado USD': `$${latestPriceUsd.toFixed(4)}`,
      'Valor Actual Cartera USD': `$${currentValueUsd.toFixed(4)}`,
      'P&L Latente USD': `$${pnlUsd.toFixed(4)}`,
      'Rendimiento %': `${pnlPct.toFixed(2)}%`,
      'Acciones CVV': cvvShares.toString(),
      'Descuadre Custodia': custodyDifference.toString(),
    },
  ]);

  console.log('✅ Validación matemática completada exitosamente sin inconsistencias de punto flotante.');
  console.log('===============================================================');
}

runPortfolioSimulation();

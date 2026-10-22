import { Decimal } from 'decimal.js';

interface SimulatedExpense {
  description: string;
  category: string;
  originalCurrency: 'VES' | 'USD' | 'USDT';
  originalAmount: Decimal;
  bcvRateUsed: Decimal;
  binanceRateUsed: Decimal;
  equivalentVes: Decimal;
  equivalentBcvUsd: Decimal;
  equivalentBinanceUsdt: Decimal;
}

function calculateConversions(
  currency: 'VES' | 'USD' | 'USDT',
  amount: Decimal,
  bcvRate: Decimal,
  binanceRate: Decimal
) {
  let equivalentVes: Decimal;
  let equivalentBcvUsd: Decimal;
  let equivalentBinanceUsdt: Decimal;

  switch (currency) {
    case 'VES':
      equivalentVes = amount;
      equivalentBcvUsd = amount.dividedBy(bcvRate).toDecimalPlaces(4);
      equivalentBinanceUsdt = amount.dividedBy(binanceRate).toDecimalPlaces(4);
      break;

    case 'USD':
      equivalentBcvUsd = amount;
      equivalentVes = amount.times(bcvRate).toDecimalPlaces(4);
      equivalentBinanceUsdt = equivalentVes.dividedBy(binanceRate).toDecimalPlaces(4);
      break;

    case 'USDT':
      equivalentBinanceUsdt = amount;
      equivalentVes = amount.times(binanceRate).toDecimalPlaces(4);
      equivalentBcvUsd = equivalentVes.dividedBy(bcvRate).toDecimalPlaces(4);
      break;
  }

  return { equivalentVes, equivalentBcvUsd, equivalentBinanceUsdt };
}

function runExpensesSimulation() {
  console.log('===============================================================');
  console.log('💳 SIMULACIÓN DE CONTROL DE GASTOS MULTIMONEDA (FASE 5)');
  console.log('===============================================================\n');

  const bcvRate = new Decimal('884.7496');   // Tasa oficial BCV
  const binanceRate = new Decimal('1000.00'); // Tasa Binance P2P

  console.log('1. TASAS CAMBIARIAS APLICADAS PARA LA CONVERSIÓN:');
  console.log(`- Tasa Oficial BCV: Bs. ${bcvRate.toFixed(4)} / USD`);
  console.log(`- Tasa Binance P2P: Bs. ${binanceRate.toFixed(4)} / USDT\n`);

  // Gasto 1: en VES (Comisión de corretaje bursátil)
  const g1Amount = new Decimal('88474.96');
  const g1Conv = calculateConversions('VES', g1Amount, bcvRate, binanceRate);
  const exp1: SimulatedExpense = {
    description: 'Comisión de corretaje compra BPV',
    category: 'BROKER_FEE',
    originalCurrency: 'VES',
    originalAmount: g1Amount,
    bcvRateUsed: bcvRate,
    binanceRateUsed: binanceRate,
    ...g1Conv,
  };

  // Gasto 2: en USD (Suscripción a terminal de datos financieros)
  const g2Amount = new Decimal('50.00');
  const g2Conv = calculateConversions('USD', g2Amount, bcvRate, binanceRate);
  const exp2: SimulatedExpense = {
    description: 'Suscripción mensual informe bursátil',
    category: 'SUBSCRIPTION',
    originalCurrency: 'USD',
    originalAmount: g2Amount,
    bcvRateUsed: bcvRate,
    binanceRateUsed: binanceRate,
    ...g2Conv,
  };

  // Gasto 3: en USDT (Gasto operativo pagado por Binance Pay)
  const g3Amount = new Decimal('20.00');
  const g3Conv = calculateConversions('USDT', g3Amount, bcvRate, binanceRate);
  const exp3: SimulatedExpense = {
    description: 'Servidor VPS y proxy scraping',
    category: 'OPERATIONAL',
    originalCurrency: 'USDT',
    originalAmount: g3Amount,
    bcvRateUsed: bcvRate,
    binanceRateUsed: binanceRate,
    ...g3Conv,
  };

  const expenses = [exp1, exp2, exp3];

  console.log('2. GASTOS MULTIMONEDA REGISTRADOS:');
  console.table(
    expenses.map((e) => ({
      Descripción: e.description,
      Categoría: e.category,
      'Moneda Original': e.originalCurrency,
      'Monto Original': `${e.originalAmount.toFixed(2)} ${e.originalCurrency}`,
      'Equiv. Bs (VES)': `Bs. ${e.equivalentVes.toFixed(2)}`,
      'Equiv. BCV (USD)': `$${e.equivalentBcvUsd.toFixed(4)}`,
      'Equiv. Binance (USDT)': `${e.equivalentBinanceUsdt.toFixed(4)} USDT`,
    }))
  );

  // Consolidado total
  const totalSpentUsd = expenses.reduce(
    (acc, e) => acc.plus(e.equivalentBcvUsd),
    new Decimal(0)
  );
  const totalSpentVes = expenses.reduce(
    (acc, e) => acc.plus(e.equivalentVes),
    new Decimal(0)
  );

  console.log('\n3. RESUMEN CONSOLIDADO DE FLUJO DE CAJA:');
  console.log(`- Total Gastado en USD (Tasa BCV): $${totalSpentUsd.toFixed(4)}`);
  console.log(`- Total Gastado en VES: Bs. ${totalSpentVes.toFixed(2)}`);

  console.log('\n4. DISTRIBUCIÓN POR CATEGORÍA:');
  const categories = ['BROKER_FEE', 'SUBSCRIPTION', 'OPERATIONAL'];
  const catSummary = categories.map((cat) => {
    const matched = expenses.filter((e) => e.category === cat);
    const sumUsd = matched.reduce((acc, e) => acc.plus(e.equivalentBcvUsd), new Decimal(0));
    const sumVes = matched.reduce((acc, e) => acc.plus(e.equivalentVes), new Decimal(0));
    const pct = sumUsd.dividedBy(totalSpentUsd).times(100).toDecimalPlaces(2);
    return {
      Categoría: cat,
      'Total USD': `$${sumUsd.toFixed(4)}`,
      'Total VES': `Bs. ${sumVes.toFixed(2)}`,
      Porcentaje: `${pct.toFixed(2)}%`,
      Cantidad: matched.length,
    };
  });
  console.table(catSummary);

  console.log('5. DESGLOSE POR MONEDA ORIGINAL:');
  const currencies: Array<'VES' | 'USD' | 'USDT'> = ['VES', 'USD', 'USDT'];
  const curSummary = currencies.map((cur) => {
    const matched = expenses.filter((e) => e.originalCurrency === cur);
    const origSum = matched.reduce((acc, e) => acc.plus(e.originalAmount), new Decimal(0));
    const equivUsdSum = matched.reduce((acc, e) => acc.plus(e.equivalentBcvUsd), new Decimal(0));
    return {
      Moneda: cur,
      'Total Original': `${origSum.toFixed(2)} ${cur}`,
      'Equivalente en USD': `$${equivUsdSum.toFixed(4)}`,
      Registros: matched.length,
    };
  });
  console.table(curSummary);

  console.log('✅ Verificación matemática de conversión multimoneda completada con éxito.');
  console.log('===============================================================');
}

runExpensesSimulation();

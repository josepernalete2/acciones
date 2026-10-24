import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { PortfolioService } from './portfolio.service';
import { ExpenseService } from './expense.service';
import { DividendService } from './dividend.service';
import { ExchangeRateService } from './exchangeRate.service';

export class ReportService {
  /**
   * Genera un libro de Excel (.xlsx) estructurado con el balance de portafolio,
   * auditoría de custodia CVV, historial de dividendos y flujo de gastos.
   */
  static async generatePortfolioExcel(userId: string): Promise<Buffer> {
    const portfolio = await PortfolioService.getPortfolioSummary(userId);
    const expenses = await ExpenseService.getExpenseSummary(userId);
    const dividends = await DividendService.listDividends(userId);
    const latestRates = await ExchangeRateService.getLatestRate();

    const wb = xlsx.utils.book_new();

    // 1. Hoja: RESUMEN Y POSICIONES
    const summaryData = [
      ['REPORTE CONSOLIDADO DE PORTAFOLIO BURSÁTIL - BVC'],
      ['Fecha de Emisión:', new Date().toLocaleDateString('es-VE')],
      ['Usuario:', userId],
      ['Tasa Oficial BCV (USD/VES):', portfolio.bcvRateUsed || 'N/A'],
      [],
      ['INDICADORES CLAVE (GLOBAL)'],
      ['Valor Total del Portafolio (USD):', Number(portfolio.totalPortfolioValueUsd)],
      ['Valor Total del Portafolio (VES):', Number(portfolio.totalPortfolioValueVes)],
      ['Inversión Total en Posiciones Abiertas (USD):', Number(portfolio.totalInvestedUsd)],
      ['P&L Latente Total (USD):', Number(portfolio.totalPnlUsd)],
      ['Rendimiento Global (%):', portfolio.totalPnlPct],
      ['Total Dividendos en Efectivo Cobrados (USD):', Number(portfolio.totalDividendsCollectedUsd)],
      ['Total Gastos Operativos y Comisiones (USD):', Number(expenses.totalSpentUsd)],
      [],
      [
        'Ticker',
        'Empresa',
        'Acciones Compradas',
        'Acciones Vendidas',
        'Acciones Liberadas (Dividendo)',
        'Tenencia Neta',
        'Costo Promedio USD',
        'Inversión Total USD',
        'Último Precio VES',
        'Último Precio USD',
        'Valor Mercado VES',
        'Valor Mercado USD',
        'P&L Latente USD',
        'P&L Latente %',
        'Acciones CVV',
        'Descuadre CVV',
        'Ponderación %',
      ],
    ];

    for (const pos of portfolio.positions) {
      summaryData.push([
        pos.ticker,
        pos.name,
        Number(pos.totalSharesBought),
        Number(pos.totalSharesSold),
        Number(pos.totalDividendShares),
        Number(pos.currentShares),
        Number(pos.averageBuyPriceUsd),
        Number(pos.totalInvestedUsd),
        pos.latestPriceVes ? Number(pos.latestPriceVes) : ('N/A' as any),
        pos.latestPriceUsd ? Number(pos.latestPriceUsd) : ('N/A' as any),
        Number(pos.currentValueVes),
        Number(pos.currentValueUsd),
        Number(pos.pnlUsd),
        pos.pnlPct,
        Number(pos.cvvShares),
        Number(pos.custodyDifference),
        pos.allocationPct,
      ]);
    }

    const wsPositions = xlsx.utils.aoa_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, wsPositions, 'Portafolio BVC');

    // 2. Hoja: DIVIDENDOS
    const dividendRows = [
      ['HISTORIAL DE DIVIDENDOS COBRADOS'],
      [],
      [
        'Ticker',
        'Empresa',
        'Tipo',
        'Fecha Pago',
        'Fecha Declaración',
        'Acciones Recibidas',
        'Monto Bruto',
        'Retención ISLR',
        'Monto Neto',
        'Tasa BCV',
        'Monto Neto USD',
        'Notas',
      ],
    ];

    for (const div of dividends) {
      dividendRows.push([
        div.asset.ticker,
        div.asset.name,
        div.type,
        new Date(div.paymentDate).toISOString().split('T')[0],
        new Date(div.declarationDate).toISOString().split('T')[0],
        div.sharesReceived ? Number(div.sharesReceived) : 0,
        div.grossAmount ? Number(div.grossAmount) : 0,
        div.taxWithheld ? Number(div.taxWithheld) : 0,
        div.netAmount ? Number(div.netAmount) : 0,
        div.bcvRateUsed ? Number(div.bcvRateUsed) : ('N/A' as any),
        div.netAmountUsd ? Number(div.netAmountUsd) : 0,
        div.notes || '',
      ]);
    }

    const wsDividends = xlsx.utils.aoa_to_sheet(dividendRows);
    xlsx.utils.book_append_sheet(wb, wsDividends, 'Dividendos');

    // 3. Hoja: GASTOS Y FLUJO DE CAJA
    const expenseRows = [
      ['RESUMEN DE GASTOS Y FLUJO DE CAJA'],
      ['Total Gastado USD:', Number(expenses.totalSpentUsd)],
      ['Total Gastado VES:', Number(expenses.totalSpentVes)],
      ['Total Registros de Gasto:', expenses.totalExpensesCount],
      [],
      ['Categoría', 'Total USD', 'Total VES', '% del Total', 'Cantidad Operaciones'],
    ];

    for (const cat of expenses.byCategory) {
      expenseRows.push([
        cat.category,
        Number(cat.totalUsd),
        Number(cat.totalVes),
        cat.percentage,
        cat.count,
      ]);
    }

    const wsExpenses = xlsx.utils.aoa_to_sheet(expenseRows);
    xlsx.utils.book_append_sheet(wb, wsExpenses, 'Gastos Operativos');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer as Buffer;
  }

  /**
   * Genera un estado de cuenta formal en PDF con membrete corporativo,
   * tabla ejecutiva de posiciones, P&L consolidado, custodia CVV y gastos.
   */
  static async generatePortfolioPdf(userId: string): Promise<Buffer> {
    const portfolio = await PortfolioService.getPortfolioSummary(userId);
    const expenses = await ExpenseService.getExpenseSummary(userId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 36,
        size: 'LETTER',
        info: {
          Title: `Estado de Cuenta Bursatil - ${userId}`,
          Author: 'Sistema Portafolio BVC',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0f172a'; // slate-900
      const accentColor = '#2563eb';  // blue-600
      const successColor = '#059669'; // emerald-600
      const dangerColor = '#e11d48';  // rose-600
      const grayColor = '#64748b';    // slate-500

      // Membrete
      doc
        .rect(36, 36, 540, 54)
        .fill(primaryColor);

      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('ESTADO DE CUENTA Y POSICIÓN CONSOLIDADA', 50, 48);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text('Bolsa de Valores de Caracas (BVC) • Custodia CVV • Multimoneda', 50, 68);

      // Metadata info
      const currentDate = new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc
        .fillColor('#334155')
        .fontSize(8)
        .font('Helvetica')
        .text(`Fecha de Emisión: ${currentDate}`, 36, 102)
        .text(`Identificador de Inversor: ${userId}`, 36, 114)
        .text(`Tasa Oficial BCV: ${portfolio.bcvRateUsed ? `${portfolio.bcvRateUsed} VES/USD` : 'N/A'}`, 36, 126);

      // KPI Boxes
      const boxY = 145;
      const boxWidth = 125;
      const boxHeight = 48;
      const gap = 13;

      // Box 1: Valor Portafolio
      doc.rect(36, boxY, boxWidth, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('VALOR PORTAFOLIO (USD)', 44, boxY + 8);
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(`$${Number(portfolio.totalPortfolioValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 44, boxY + 22);

      // Box 2: Inversión Total
      doc.rect(36 + boxWidth + gap, boxY, boxWidth, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('INVERSIÓN TOTAL (USD)', 36 + boxWidth + gap + 8, boxY + 8);
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(`$${Number(portfolio.totalInvestedUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 36 + boxWidth + gap + 8, boxY + 22);

      // Box 3: P&L Latente
      const pnlNum = Number(portfolio.totalPnlUsd);
      const isPositive = pnlNum >= 0;
      doc.rect(36 + (boxWidth + gap) * 2, boxY, boxWidth, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('P&L LATENTE (USD)', 36 + (boxWidth + gap) * 2 + 8, boxY + 8);
      doc.fillColor(isPositive ? successColor : dangerColor).fontSize(11).font('Helvetica-Bold').text(`${isPositive ? '+' : ''}$${pnlNum.toFixed(2)} (${portfolio.totalPnlPct})`, 36 + (boxWidth + gap) * 2 + 8, boxY + 22);

      // Box 4: Dividendos Cobrados
      doc.rect(36 + (boxWidth + gap) * 3, boxY, boxWidth, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor(grayColor).fontSize(7).font('Helvetica-Bold').text('DIVIDENDOS EN EFECTIVO', 36 + (boxWidth + gap) * 3 + 8, boxY + 8);
      doc.fillColor(accentColor).fontSize(12).font('Helvetica-Bold').text(`$${Number(portfolio.totalDividendsCollectedUsd).toFixed(2)}`, 36 + (boxWidth + gap) * 3 + 8, boxY + 22);

      // Tabla de Posiciones
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Detalle de Posiciones Bursátiles', 36, 210);

      const tableTop = 228;
      const headers = ['Ticker', 'Acciones', 'Liberadas', 'P. Compra', 'P. Actual', 'Valor USD', 'P&L USD', 'P&L %', 'CVV', 'Dif'];
      const colX = [36, 85, 140, 195, 250, 310, 375, 435, 490, 540];

      // Header row
      doc.rect(36, tableTop, 540, 18).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, colX[i] + 4, tableTop + 5);
      });

      let currentY = tableTop + 18;
      doc.font('Helvetica').fontSize(7.5);

      portfolio.positions.forEach((pos, idx) => {
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(36, currentY, 540, 16).fill(rowBg);

        const posPnlNum = Number(pos.pnlUsd);
        const posColor = posPnlNum >= 0 ? successColor : dangerColor;
        const diffNum = Number(pos.custodyDifference);

        doc.fillColor('#0f172a').text(pos.ticker, colX[0] + 4, currentY + 4);
        doc.fillColor('#334155').text(Number(pos.currentShares).toLocaleString('en-US'), colX[1] + 4, currentY + 4);
        doc.fillColor('#2563eb').text(Number(pos.totalDividendShares) > 0 ? Number(pos.totalDividendShares).toLocaleString('en-US') : '-', colX[2] + 4, currentY + 4);
        doc.fillColor('#334155').text(`$${Number(pos.averageBuyPriceUsd).toFixed(3)}`, colX[3] + 4, currentY + 4);
        doc.fillColor('#334155').text(pos.latestPriceUsd ? `$${Number(pos.latestPriceUsd).toFixed(3)}` : 'N/A', colX[4] + 4, currentY + 4);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(`$${Number(pos.currentValueUsd).toFixed(2)}`, colX[5] + 4, currentY + 4).font('Helvetica');
        doc.fillColor(posColor).text(`${posPnlNum >= 0 ? '+' : ''}$${posPnlNum.toFixed(2)}`, colX[6] + 4, currentY + 4);
        doc.fillColor(posColor).text(pos.pnlPct, colX[7] + 4, currentY + 4);
        doc.fillColor('#334155').text(Number(pos.cvvShares).toLocaleString('en-US'), colX[8] + 4, currentY + 4);
        doc.fillColor(diffNum === 0 ? '#10b981' : '#f59e0b').text(diffNum === 0 ? 'OK' : `${diffNum > 0 ? '+' : ''}${diffNum}`, colX[9] + 4, currentY + 4);

        currentY += 16;
      });

      // Resumen de Gastos y Comisiones
      const expenseSectionY = currentY + 20;
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('Resumen de Gastos Operativos y Comisiones', 36, expenseSectionY);

      doc.rect(36, expenseSectionY + 14, 540, 16).fill('#334155');
      doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
      doc.text('Categoría de Gasto', 40, expenseSectionY + 18);
      doc.text('Total en Dólares (USD)', 230, expenseSectionY + 18);
      doc.text('Total en Bolívares (VES)', 360, expenseSectionY + 18);
      doc.text('% Relativo', 480, expenseSectionY + 18);

      let expY = expenseSectionY + 30;
      doc.font('Helvetica').fontSize(7.5);

      if (expenses.byCategory.length === 0) {
        doc.rect(36, expY, 540, 16).fill('#ffffff');
        doc.fillColor(grayColor).text('No se registran gastos operativos para el período evaluado.', 40, expY + 4);
        expY += 16;
      } else {
        expenses.byCategory.forEach((c, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(36, expY, 540, 16).fill(rowBg);
          doc.fillColor('#0f172a').text(c.category, 40, expY + 4);
          doc.fillColor('#334155').text(`$${Number(c.totalUsd).toFixed(2)}`, 230, expY + 4);
          doc.fillColor('#334155').text(`Bs. ${Number(c.totalVes).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 360, expY + 4);
          doc.fillColor('#334155').text(c.percentage, 480, expY + 4);
          expY += 16;
        });
      }

      // Footer
      doc
        .fontSize(7)
        .fillColor(grayColor)
        .text('Este documento es emitido de manera automática por el Sistema de Portafolio Bursátil BVC con fines informativos y de auditoría interna.', 36, 730, { align: 'center', width: 540 });

      doc.end();
    });
  }
}

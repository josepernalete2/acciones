import https from 'https';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { MarketType } from '@prisma/client';
import { ExchangeRateService } from './exchangeRate.service';

export interface BvcRawQuote {
  ticker: string;
  name?: string;
  closingPrice: Decimal;
  volumeTitles: Decimal | null;
  volumeCash: Decimal | null;
  variationPct: Decimal | null;
}

/**
 * Normaliza valores numéricos en formato venezolano o internacional a Decimal
 * Ejemplos: "1.250.000,50" -> 1250000.50, ".09" -> 0.09, "-.32" -> -0.32
 */
export const parseVenezuelanNumber = (
  val: string | number | null | undefined
): Decimal | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return new Decimal(val);

  let cleaned = val.toString().trim();
  if (!cleaned || cleaned === '-' || cleaned === 'N/A') return null;

  // Ajustar formatos .09 o -.32
  if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
  if (cleaned.startsWith('-.')) cleaned = '-0.' + cleaned.slice(2);

  // Si contiene puntos y comas (ej. 1.250.000,50)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Si solo contiene comas (ej. 1250,50)
    cleaned = cleaned.replace(',', '.');
  }

  // Filtrar caracteres no numéricos
  cleaned = cleaned.replace(/[^0-9.-]/g, '');

  try {
    const d = new Decimal(cleaned);
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
};

export class BvcService {
  private static readonly BVC_BASE_URL = 'https://www.bolsadecaracas.com';
  private static readonly BVC_AJAX_URL =
    'https://www.bolsadecaracas.com/wp-admin/admin-ajax.php';

  /**
   * Ingesta las cotizaciones diarias del corro de renta variable de la BVC.
   * Utiliza el endpoint AJAX oficial y cuenta con scraping de fallback en HTML.
   */
  static async fetchBvcDailyQuotes(): Promise<BvcRawQuote[]> {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: this.BVC_BASE_URL,
    };

    // 1. Intento primario: Endpoint oficial de resumen de renta variable
    try {
      const response = await axios.post(
        this.BVC_AJAX_URL,
        new URLSearchParams({ action: 'resumenMercadoRentaVariable' }),
        { httpsAgent, headers, timeout: 15000 }
      );

      const data = response.data;
      const items: any[] = Array.isArray(data)
        ? data
        : typeof data === 'object' && data !== null
        ? Object.values(data)
        : [];

      if (items.length > 0) {
        const quotes: BvcRawQuote[] = [];

        for (const item of items) {
          const ticker = item.COD_SIMB ? String(item.COD_SIMB).trim().toUpperCase() : null;
          if (!ticker) continue;

          const closingPrice = parseVenezuelanNumber(item.PRECIO);
          if (!closingPrice || closingPrice.lessThanOrEqualTo(0)) continue;

          quotes.push({
            ticker,
            name: item.DESC_SIMB ? String(item.DESC_SIMB).trim() : undefined,
            closingPrice,
            volumeTitles: parseVenezuelanNumber(item.VOLUMEN),
            volumeCash: parseVenezuelanNumber(item.MONTO_EFECTIVO),
            variationPct: parseVenezuelanNumber(item.VAR_REL),
          });
        }

        if (quotes.length > 0) {
          return quotes;
        }
      }
    } catch (err: any) {
      console.warn(
        `[BvcService] Falló petición AJAX a resumenMercadoRentaVariable: ${err.message}. Intentando scraping HTML...`
      );
    }

    // 2. Fallback: Scraping directo de tablas en la página principal
    try {
      const pageRes = await axios.get(this.BVC_BASE_URL, {
        httpsAgent,
        headers: {
          'User-Agent': headers['User-Agent'],
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(pageRes.data);
      const quotesMap = new Map<string, BvcRawQuote>();

      // Buscar tablas con estructura de cotizaciones
      $('table').each((_, tableEl) => {
        $(tableEl)
          .find('tr')
          .each((_, trEl) => {
            const cells: string[] = [];
            $(trEl)
              .find('td')
              .each((_, tdEl) => {
                cells.push($(tdEl).text().trim());
              });

            if (cells.length >= 4) {
              const ticker = cells[0]?.trim().toUpperCase();
              const price = parseVenezuelanNumber(cells[1]);
              if (ticker && price && price.greaterThan(0) && !quotesMap.has(ticker)) {
                quotesMap.set(ticker, {
                  ticker,
                  closingPrice: price,
                  volumeTitles: parseVenezuelanNumber(cells[4] || cells[3]),
                  volumeCash: parseVenezuelanNumber(cells[2]),
                  variationPct: parseVenezuelanNumber(cells[3]),
                });
              }
            }
          });
      });

      const quotes = Array.from(quotesMap.values());
      if (quotes.length > 0) {
        return quotes;
      }
    } catch (scrapingErr: any) {
      console.error(`[BvcService] Falló scraping HTML de BVC: ${scrapingErr.message}`);
    }

    throw new Error('No se pudieron obtener cotizaciones bursátiles desde el portal de la BVC');
  }

  /**
   * Sincroniza las cotizaciones diarias de la BVC para la fecha actual (quoteDate).
   * Solo registra títulos que existan en el catálogo `Asset`.
   */
  static async syncDailyQuotes() {
    const quotes = await this.fetchBvcDailyQuotes();

    // Obtener catálogo de activos registrados en BVC
    const registeredAssets = await prisma.asset.findMany({
      where: { market: MarketType.BVC },
    });

    const assetMap = new Map(
      registeredAssets.map((asset) => [asset.ticker.toUpperCase(), asset])
    );

    const now = new Date();
    const quoteDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    let updatedCount = 0;
    const updatedTickers: string[] = [];

    for (const quote of quotes) {
      const asset = assetMap.get(quote.ticker.toUpperCase());
      if (!asset) continue;

      await prisma.dailyQuote.upsert({
        where: {
          assetId_quoteDate: {
            assetId: asset.id,
            quoteDate,
          },
        },
        update: {
          closingPrice: quote.closingPrice.toFixed(4),
          volumeTitles: quote.volumeTitles ? quote.volumeTitles.toFixed(2) : null,
          volumeCash: quote.volumeCash ? quote.volumeCash.toFixed(2) : null,
          variationPct: quote.variationPct ? quote.variationPct.toFixed(4) : null,
        },
        create: {
          assetId: asset.id,
          quoteDate,
          closingPrice: quote.closingPrice.toFixed(4),
          volumeTitles: quote.volumeTitles ? quote.volumeTitles.toFixed(2) : null,
          volumeCash: quote.volumeCash ? quote.volumeCash.toFixed(2) : null,
          variationPct: quote.variationPct ? quote.variationPct.toFixed(4) : null,
        },
      });

      updatedCount++;
      updatedTickers.push(quote.ticker);
    }

    return {
      quoteDate: quoteDate.toISOString().split('T')[0],
      totalFetched: quotes.length,
      totalUpdated: updatedCount,
      updatedTickers,
    };
  }

  /**
   * Lista todos los activos BVC activos con su última cotización y
   * calcula el precio equivalente en USD según la última tasa BCV.
   */
  static async getAllAssetsWithLatestQuote() {
    const [assets, latestRate] = await Promise.all([
      prisma.asset.findMany({
        where: {
          market: MarketType.BVC,
          isActive: true,
        },
        include: {
          dailyQuotes: {
            orderBy: { quoteDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { ticker: 'asc' },
      }),
      ExchangeRateService.getLatestRate(),
    ]);

    const bcvUsd = latestRate?.bcvUsd
      ? new Decimal(latestRate.bcvUsd.toString())
      : null;

    return assets.map((asset) => {
      const latestQuote = asset.dailyQuotes[0] || null;
      let latestPriceUsd: string | null = null;

      if (latestQuote && bcvUsd && bcvUsd.greaterThan(0)) {
        const closingVes = new Decimal(latestQuote.closingPrice.toString());
        latestPriceUsd = closingVes.dividedBy(bcvUsd).toDecimalPlaces(4).toFixed(4);
      }

      return {
        id: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        market: asset.market,
        baseCurrency: asset.baseCurrency,
        isActive: asset.isActive,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        latestQuote: latestQuote
          ? {
              id: latestQuote.id,
              quoteDate: latestQuote.quoteDate,
              closingPriceVes: latestQuote.closingPrice.toString(),
              volumeTitles: latestQuote.volumeTitles
                ? latestQuote.volumeTitles.toString()
                : null,
              volumeCashVes: latestQuote.volumeCash
                ? latestQuote.volumeCash.toString()
                : null,
              variationPct: latestQuote.variationPct
                ? latestQuote.variationPct.toString()
                : null,
            }
          : null,
        latestPriceUsd,
        bcvRateUsed: bcvUsd ? bcvUsd.toFixed(4) : null,
      };
    });
  }

  /**
   * Retorna el histórico cronológico de cotizaciones para un ticker específico.
   */
  static async getAssetQuoteHistory(ticker: string, limit?: number) {
    const formattedTicker = ticker.trim().toUpperCase();

    const asset = await prisma.asset.findUnique({
      where: { ticker: formattedTicker },
    });

    if (!asset) {
      throw new Error(`Activo bursátil con ticker '${formattedTicker}' no encontrado`);
    }

    const quotes = await prisma.dailyQuote.findMany({
      where: { assetId: asset.id },
      orderBy: { quoteDate: 'asc' },
      take: limit ? Number(limit) : undefined,
    });

    return {
      asset: {
        id: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        market: asset.market,
        baseCurrency: asset.baseCurrency,
      },
      quotesCount: quotes.length,
      history: quotes.map((q) => ({
        id: q.id,
        quoteDate: q.quoteDate,
        closingPriceVes: q.closingPrice.toString(),
        volumeTitles: q.volumeTitles ? q.volumeTitles.toString() : null,
        volumeCashVes: q.volumeCash ? q.volumeCash.toString() : null,
        variationPct: q.variationPct ? q.variationPct.toString() : null,
      })),
    };
  }
}

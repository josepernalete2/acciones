import https from 'https';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export interface BinanceAdItem {
  adv: {
    price: string;
    tradeType: string;
    asset: string;
    fiatUnit: string;
  };
  advertiser: {
    nickName: string;
    monthOrderCount: number;
    monthFinishRate: number;
  };
}

export class ExchangeRateService {
  private static readonly BCV_URL = 'https://www.bcv.org.ve';
  private static readonly BINANCE_P2P_URL =
    'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

  /**
   * Realiza scraping al portal oficial del BCV y extrae la tasa oficial del USD.
   * Maneja certificados SSL del portal y contingencia con fallback a BD.
   */
  static async fetchBcvRate(): Promise<{ rate: Decimal; isFallback: boolean }> {
    try {
      const response = await axios.get(this.BCV_URL, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const rawText =
        $('#dolar strong').text().trim() || $('#dolar').find('strong').text().trim();

      if (!rawText) {
        throw new Error('No se encontró el contenedor del dólar (#dolar strong) en el HTML del BCV');
      }

      // Normalizar número sustituyendo comas por puntos
      const normalized = rawText.replace(',', '.').replace(/\s+/g, '');
      const rateDecimal = new Decimal(normalized);

      if (rateDecimal.isNaN() || rateDecimal.lessThanOrEqualTo(0)) {
        throw new Error(`El valor extraído del BCV (${rawText}) no es válido`);
      }

      return {
        rate: rateDecimal,
        isFallback: false,
      };
    } catch (error: any) {
      console.warn(
        `[ExchangeRateService] Aviso: Error al consultar el portal del BCV (${error.message}). Intentando fallback a última tasa en base de datos...`
      );

      const latestSaved = await prisma.exchangeRate.findFirst({
        where: { bcvUsd: { not: undefined } },
        orderBy: { rateDate: 'desc' },
      });

      if (latestSaved && latestSaved.bcvUsd) {
        return {
          rate: new Decimal(latestSaved.bcvUsd.toString()),
          isFallback: true,
        };
      }

      throw new Error(`Fallo al consultar el portal del BCV y no hay tasas históricas disponibles: ${error.message}`);
    }
  }

  /**
   * Consulta el endpoint público de anuncios P2P de Binance (USDT/VES)
   * y calcula la tasa promedio de los primeros 5 anuncios con mejor reputación.
   */
  static async fetchBinanceP2pRate(): Promise<Decimal> {
    try {
      const response = await axios.post<{ code: string; data: BinanceAdItem[] }>(
        this.BINANCE_P2P_URL,
        {
          fiat: 'VES',
          page: 1,
          rows: 10,
          tradeType: 'BUY',
          asset: 'USDT',
          countries: [],
          proMerchantAds: false,
          shieldMerchantAds: false,
          filterType: 'all',
          periods: [],
          additionalKycVerifyFilter: 0,
          publisherType: null,
          payTypes: [],
        },
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            Accept: '*/*',
          },
          timeout: 10000,
        }
      );

      const ads = response.data?.data || [];
      if (!ads.length) {
        throw new Error('Binance P2P no devolvió anuncios para VES/USDT');
      }

      // Filtrar anunciantes con reputación confiable (tasa de finalización >= 80%)
      const reputableAds = ads.filter(
        (ad) => ad.advertiser && ad.advertiser.monthFinishRate >= 0.8
      );

      // Usar los primeros 5 confiables o los primeros 5 generales si la muestra es pequeña
      const selectedAds = reputableAds.length >= 3 ? reputableAds.slice(0, 5) : ads.slice(0, 5);

      const total = selectedAds.reduce((acc, item) => {
        return acc.plus(new Decimal(item.adv.price));
      }, new Decimal(0));

      return total.dividedBy(selectedAds.length).toDecimalPlaces(4);
    } catch (error: any) {
      console.error(`[ExchangeRateService] Error al obtener tasa Binance P2P: ${error.message}`);
      throw new Error(`Fallo al consultar Binance P2P: ${error.message}`);
    }
  }

  /**
   * Sincroniza las tasas del día (BCV y Binance P2P), calcula la brecha porcentual
   * y realiza upsert en ExchangeRate para la fecha actual.
   */
  static async syncDailyRates() {
    const [bcvResult, binanceRate] = await Promise.all([
      this.fetchBcvRate(),
      this.fetchBinanceP2pRate(),
    ]);

    const bcvRate = bcvResult.rate;

    // Brecha porcentual: ((Binance - BCV) / BCV) * 100
    const spreadPct = binanceRate
      .minus(bcvRate)
      .dividedBy(bcvRate)
      .times(100)
      .toDecimalPlaces(4);

    // Normalizar a fecha UTC a medianoche sin componente de hora para @db.Date
    const now = new Date();
    const rateDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const record = await prisma.exchangeRate.upsert({
      where: {
        rateDate,
      },
      update: {
        bcvUsd: bcvRate.toFixed(4),
        binanceP2pUsd: binanceRate.toFixed(4),
        spreadBcvParalelo: spreadPct.toFixed(4),
      },
      create: {
        rateDate,
        bcvUsd: bcvRate.toFixed(4),
        binanceP2pUsd: binanceRate.toFixed(4),
        spreadBcvParalelo: spreadPct.toFixed(4),
      },
    });

    return {
      ...record,
      isBcvFallback: bcvResult.isFallback,
    };
  }

  /**
   * Retorna el último registro de ExchangeRate ordenado por rateDate DESC
   */
  static async getLatestRate() {
    return prisma.exchangeRate.findFirst({
      orderBy: {
        rateDate: 'desc',
      },
    });
  }

  /**
   * Retorna el listado de tasas en un rango de fechas
   */
  static async getRateHistory(from?: string, to?: string) {
    const where: Prisma.ExchangeRateWhereInput = {};

    if (from || to) {
      where.rateDate = {};
      if (from) {
        where.rateDate.gte = new Date(from);
      }
      if (to) {
        where.rateDate.lte = new Date(to);
      }
    }

    return prisma.exchangeRate.findMany({
      where,
      orderBy: {
        rateDate: 'desc',
      },
    });
  }
}

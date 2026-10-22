import prisma from '../config/prisma';

export class BvcService {
  /**
   * Obtiene todos los activos activos registrados en la base de datos
   */
  static async getActiveAssets() {
    return prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { ticker: 'asc' },
    });
  }
}

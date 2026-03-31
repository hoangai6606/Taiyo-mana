import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { factoryPrices, factories } from '../../drizzle/schema.js';
import { eq, and, lte, desc } from 'drizzle-orm';
import { isByteArrayString, convertByteArrayToUuid } from '../utils/convertUuid.js';

const router = Router();

// GET /api/factory-prices - List all factory prices
router.get('/', async (_req: Request, res: Response) => {
  try {
    const prices = await db
      .select({
        id: factoryPrices.id,
        factoryId: factoryPrices.factoryId,
        unitPrice: factoryPrices.unitPrice,
        currency: factoryPrices.currency,
        effectiveDate: factoryPrices.effectiveDate,
        createdAt: factoryPrices.createdAt,
        createdBy: factoryPrices.createdBy,
        factoryCode: factories.code,
        factoryName: factories.name,
      })
      .from(factoryPrices)
      .leftJoin(factories, eq(factoryPrices.factoryId, factories.id))
      .orderBy(desc(factoryPrices.effectiveDate));

    const result = prices.map(r => ({
      ...r,
      id: isByteArrayString(r.id) ? convertByteArrayToUuid(r.id) : r.id,
      factoryId: isByteArrayString(r.factoryId) ? convertByteArrayToUuid(r.factoryId) : r.factoryId,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch factory prices', details: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/factory-prices/:factoryId?date=YYYY-MM-DD - Get price for a factory by date
router.get('/:factoryId', async (req: Request, res: Response) => {
  try {
    let { factoryId } = req.params;
    const { date } = req.query;

    if (isByteArrayString(factoryId)) {
      factoryId = convertByteArrayToUuid(factoryId);
    }

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD)' });
      return;
    }

    // Find the price for the factory on or before the given date
    const [price] = await db
      .select({
        id: factoryPrices.id,
        factoryId: factoryPrices.factoryId,
        unitPrice: factoryPrices.unitPrice,
        currency: factoryPrices.currency,
        effectiveDate: factoryPrices.effectiveDate,
        createdAt: factoryPrices.createdAt,
        createdBy: factoryPrices.createdBy,
        factoryCode: factories.code,
        factoryName: factories.name,
      })
      .from(factoryPrices)
      .leftJoin(factories, eq(factoryPrices.factoryId, factories.id))
      .where(
        and(
          eq(factoryPrices.factoryId, factoryId),
          lte(factoryPrices.effectiveDate, new Date(date))
        )
      )
      .orderBy(desc(factoryPrices.effectiveDate))
      .limit(1);

    if (!price) {
      res.json(null);
      return;
    }

    res.json({
      ...price,
      id: isByteArrayString(price.id) ? convertByteArrayToUuid(price.id) : price.id,
      factoryId: isByteArrayString(price.factoryId) ? convertByteArrayToUuid(price.factoryId) : price.factoryId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch factory price', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/factory-prices - Create a new factory price
router.post('/', async (req: Request, res: Response) => {
  try {
    const { factoryId, unitPrice, currency, effectiveDate } = req.body;

    if (!factoryId || !effectiveDate) {
      res.status(400).json({ error: 'factoryId and effectiveDate are required' });
      return;
    }

    let convertedFactoryId = factoryId;
    if (isByteArrayString(factoryId)) {
      convertedFactoryId = convertByteArrayToUuid(factoryId);
    }

    const id = crypto.randomUUID();

    const [price] = await db.insert(factoryPrices).values({
      id,
      factoryId: convertedFactoryId,
      unitPrice: unitPrice ?? 0,
      currency: currency ?? 'USD',
      effectiveDate: new Date(effectiveDate),
    }).returning();

    res.status(201).json({
      ...price,
      id: isByteArrayString(price.id) ? convertByteArrayToUuid(price.id) : price.id,
      factoryId: isByteArrayString(price.factoryId) ? convertByteArrayToUuid(price.factoryId) : price.factoryId,
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Factory price already exists for this factory and date' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create factory price', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

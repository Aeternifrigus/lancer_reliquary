import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, ItemRarity, ItemType } from '../types';
import { Item } from '../models/Item';
import { Player } from '../models/Player';
import { createError } from '../middleware/errorHandler';

const AwardItemSchema = z.object({
  itemId: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  type: z.enum(['WEAPON', 'ARMOR', 'CONSUMABLE', 'COSMETIC', 'CURRENCY'] satisfies [
    ItemType,
    ...ItemType[],
  ]),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] satisfies [
    ItemRarity,
    ...ItemRarity[],
  ]),
  metadata: z.record(z.unknown()).optional(),
});

export async function awardItem(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId } = req.params;
    const dto = AwardItemSchema.parse(req.body);

    if (!(await Player.exists({ _id: playerId }))) throw createError('Player not found', 404);

    const item = await Item.create({ playerId, ...dto });
    res
      .status(201)
      .json({ success: true, data: item, message: `"${item.name}" added to inventory` });
  } catch (err) {
    next(err);
  }
}

export async function getInventory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId } = req.params;

    if (!(await Player.exists({ _id: playerId }))) throw createError('Player not found', 404);

    const filter: Record<string, unknown> = { playerId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.rarity) filter.rarity = req.query.rarity;

    const items = await Item.find(filter).sort({ awardedAt: -1 }).lean();
    res.json({ success: true, data: { items, count: items.length } });
  } catch (err) {
    next(err);
  }
}

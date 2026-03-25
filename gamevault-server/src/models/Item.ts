import { Schema, model, Document } from 'mongoose';
import { IItem, ItemRarity, ItemType } from '../types';

export interface ItemDocument extends Omit<IItem, '_id'>, Document {}

const ItemSchema = new Schema<ItemDocument>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    itemId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['WEAPON', 'ARMOR', 'CONSUMABLE', 'COSMETIC', 'CURRENCY'] satisfies ItemType[],
      required: true,
    },
    rarity: {
      type: String,
      enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] satisfies ItemRarity[],
      required: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    awardedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false }
);

// Same player can't receive the same item twice
ItemSchema.index({ playerId: 1, itemId: 1 }, { unique: true });

export const Item = model<ItemDocument>('Item', ItemSchema);

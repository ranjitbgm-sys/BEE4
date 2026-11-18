import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPrintJobFilamentCost, calculateFilamentMaterialCostInr } from './filamentCostLogic';
import type { FilamentSpool, Product } from '../types';

test('calculateFilamentMaterialCostInr calculates (grams / 1000) * costPerKg', () => {
  assert.equal(calculateFilamentMaterialCostInr({ gramsUsed: 250, costPerKg: 1200 }), 300);
  assert.equal(calculateFilamentMaterialCostInr({ gramsUsed: 45, costPerKg: 1100 }), 49.5);
});

test('applyPrintJobFilamentCost deducts spool grams and updates product filament & COGS cost', () => {
  const spool: FilamentSpool = {
    id: 'sp-1',
    name: 'Matte Amber PLA+',
    material: 'Matte Bio-PLA+',
    colorHex: '#D97706',
    colorName: 'Amber',
    remainingGrams: 950,
    capacityGrams: 1000,
    costPerKg: 1200,
    gramsPerToyAvg: 45,
  };
  const product = {
    id: 'p-1',
    title: 'Wall Clock',
    cogsCost: 180,
    manufacturingCost: 180,
  } as Product;

  const result = applyPrintJobFilamentCost({
    spool,
    product,
    gramsUsed: 200,
    batchQty: 2,
  });

  assert.equal(result.updatedSpool.remainingGrams, 750);
  assert.equal(result.totalMaterialCostInr, 240);
  assert.equal(result.unitMaterialCostInr, 120);
  assert.equal(result.updatedProduct.filamentCostInr, 120);
  assert.equal(result.updatedProduct.cogsCost, 120);
  assert.equal(result.updatedProduct.manufacturingCost, 120);
});

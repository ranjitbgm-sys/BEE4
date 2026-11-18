import type { FilamentSpool, Product } from '../types';

export function calculateFilamentMaterialCostInr(input: {
  gramsUsed: number;
  costPerKg: number;
}): number {
  const grams = Math.max(0, Number(input.gramsUsed) || 0);
  const perKg = Math.max(0, Number(input.costPerKg) || 0);
  return Math.round((grams / 1000) * perKg * 100) / 100;
}

export function applyPrintJobFilamentCost(input: {
  spool: FilamentSpool;
  product: Product;
  gramsUsed: number;
  batchQty?: number;
}): {
  updatedSpool: FilamentSpool;
  updatedProduct: Product;
  totalMaterialCostInr: number;
  unitMaterialCostInr: number;
} {
  const gramsUsed = Math.max(0, Number(input.gramsUsed) || 0);
  const qty = Math.max(1, Math.round(Number(input.batchQty) || 1));

  const totalMaterialCostInr = calculateFilamentMaterialCostInr({
    gramsUsed,
    costPerKg: input.spool.costPerKg,
  });
  const unitMaterialCostInr = Math.round((totalMaterialCostInr / qty) * 100) / 100;

  const updatedSpool: FilamentSpool = {
    ...input.spool,
    remainingGrams: Math.max(0, Math.round((input.spool.remainingGrams - gramsUsed) * 10) / 10),
  };

  const roundedUnitCost = Math.max(1, Math.round(unitMaterialCostInr));
  const updatedProduct: Product = {
    ...input.product,
    filamentCostInr: unitMaterialCostInr,
    cogsCost: roundedUnitCost,
    manufacturingCost: roundedUnitCost,
  };

  return {
    updatedSpool,
    updatedProduct,
    totalMaterialCostInr,
    unitMaterialCostInr,
  };
}

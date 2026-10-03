export const FOOD_QUANTITY_UNITS = [
  { value: 'meal', label: 'Meals', plural: 'meals' },
  { value: 'portion', label: 'Portions', plural: 'portions' },
  { value: 'item', label: 'Items', plural: 'items' },
  { value: 'pack', label: 'Packs', plural: 'packs' },
  { value: 'tray', label: 'Trays', plural: 'trays' },
  { value: 'kg', label: 'Kg', plural: 'kg' },
  { value: 'litre', label: 'Litres', plural: 'litres' },
];

const UNIT_ALIASES = {
  meal: 'meal', meals: 'meal',
  portion: 'portion', portions: 'portion',
  item: 'item', items: 'item',
  pack: 'pack', packs: 'pack',
  tray: 'tray', trays: 'tray',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  litre: 'litre', litres: 'litre', liter: 'litre', liters: 'litre',
};

export const normalizeQuantityUnit = (unit) => {
  if (typeof unit !== 'string') return null;
  return UNIT_ALIASES[unit.trim().toLowerCase()] || null;
};

export const parseFoodQuantity = (value, unitHint = '') => {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = normalizeQuantityUnit(match[2] || unitHint);
  if (!Number.isFinite(amount) || amount <= 0 || !unit) return null;

  return { amount, unit };
};

export const resolveDonationQuantity = (donation) => {
  if (!donation) return null;

  const structured = parseFoodQuantity(donation.quantityAmount, donation.quantityUnit);
  if (structured) return structured;

  return parseFoodQuantity(donation.quantity);
};

export const sumMealPortionQuantities = (donations) => donations.reduce((total, donation) => {
  const parsedQuantity = resolveDonationQuantity(donation);
  const unit = normalizeQuantityUnit(donation.quantityUnit) || parsedQuantity?.unit;
  if (!['meal', 'portion'].includes(unit)) return total;

  const originalAmount = Number(donation.totalQuantityAmount);
  const remainingAmount = Number(donation.quantityAmount);
  const reservedAmount = Number(donation.reservedQuantityAmount) || 0;
  const amount = Number.isFinite(originalAmount) && originalAmount > 0
    ? originalAmount
    : Number.isFinite(remainingAmount) && remainingAmount >= 0
      ? remainingAmount + reservedAmount
      : parsedQuantity?.amount || 0;

  return total + amount;
}, 0);

export const formatFoodQuantity = (amount, unit) => {
  const normalizedUnit = normalizeQuantityUnit(unit);
  const numericAmount = Number(amount);
  if (!normalizedUnit || !Number.isFinite(numericAmount) || numericAmount <= 0) return '';

  const unitConfig = FOOD_QUANTITY_UNITS.find((option) => option.value === normalizedUnit);
  const unitLabel = numericAmount === 1 ? normalizedUnit : unitConfig.plural;
  return `${numericAmount} ${unitLabel}`;
};
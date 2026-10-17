import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// --- Type Definitions ---

export type DepreciationMode = 'simple' | 'amort';
export type PricingModel = 'markup' | 'margin';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export interface CalculationInput {
  spoolCost?: number | string;
  spoolCapacity?: number | string;
  consumption?: number | string;
  printHours?: number | string;
  printMinutes?: number | string;
  printerWattage?: number | string;
  electricityRate?: number | string;
  prepMinutes?: number | string;
  postMinutes?: number | string;
  laborRate?: number | string;
  depreciationMode?: DepreciationMode;
  hourlyWearRate?: number | string;
  machinePurchasePrice?: number | string;
  expectedLifespanHours?: number | string;
  routineMaintenance?: number | string;
  failureRiskPct?: number | string;
  pricingModel?: PricingModel;
  profitRatePct?: number | string;
  packagingFees?: number | string;
  taxRatePct?: number | string;
  currency?: CurrencyCode;
  presetKey?: string;
}

export interface MaterialPresetProfile {
  tech: 'FDM' | 'SLA';
  spoolCapacity: number;
  spoolCost: number;
  printerWattage: number;
  hourlyWearRate: number;
  failureRiskPct: number;
}

// --- Presets & Localized Currency Constants ---

export const MATERIAL_PRESETS: Record<string, MaterialPresetProfile> = Object.freeze({
  PLA: {
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 20.0,
    printerWattage: 120,
    hourlyWearRate: 0.15,
    failureRiskPct: 5,
  },
  PETG: {
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 24.0,
    printerWattage: 160,
    hourlyWearRate: 0.2,
    failureRiskPct: 8,
  },
  ABS: {
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 22.0,
    printerWattage: 280,
    hourlyWearRate: 0.25,
    failureRiskPct: 15,
  },
  TPU: {
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 32.0,
    printerWattage: 140,
    hourlyWearRate: 0.3,
    failureRiskPct: 18,
  },
  CF: {
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 55.0,
    printerWattage: 200,
    hourlyWearRate: 0.75,
    failureRiskPct: 12,
  },
  RESIN_STD: {
    tech: 'SLA',
    spoolCapacity: 1000,
    spoolCost: 30.0,
    printerWattage: 65,
    hourlyWearRate: 0.4,
    failureRiskPct: 10,
  },
  RESIN_TOUGH: {
    tech: 'SLA',
    spoolCapacity: 1000,
    spoolCost: 60.0,
    printerWattage: 70,
    hourlyWearRate: 0.45,
    failureRiskPct: 12,
  },
});

export const CURRENCY_MAP: Record<CurrencyCode, { symbol: string; name: string; locale: string }> = Object.freeze({
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
});

// --- Formatting Helpers ---

export function formatMoney(amount: number, currencyCode: CurrencyCode = 'USD'): string {
  const numericAmount = Number(amount) || 0;
  const config = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;
  const isJPY = currencyCode === 'JPY';

  if (isJPY) {
    return `${config.symbol}${Math.round(numericAmount).toLocaleString(config.locale)}`;
  }

  return `${config.symbol}${numericAmount.toLocaleString(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDuration(hours: number, minutes: number) {
  const h = Math.max(0, parseInt(String(hours), 10) || 0);
  const m = Math.max(0, Math.min(59, parseInt(String(minutes), 10) || 0));
  const decimalHours = h + m / 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h === 0) parts.push(`${m}m`);

  return {
    decimalHours,
    formatted: parts.join(' '),
  };
}

// --- Core Calculation Logic ---

function calculateCostMatrix(input: CalculationInput) {
  // Apply preset parameters if presetKey is provided and valid
  const effectivePreset =
    input.presetKey && MATERIAL_PRESETS[input.presetKey]
      ? MATERIAL_PRESETS[input.presetKey]
      : null;

  const spoolCapacity = Math.max(
    0.1,
    Math.min(50000, Number(input.spoolCapacity ?? effectivePreset?.spoolCapacity ?? 1000))
  );
  const spoolCost = Math.max(
    0,
    Math.min(10000, Number(input.spoolCost ?? effectivePreset?.spoolCost ?? 0))
  );
  const consumption = Math.max(
    0,
    Math.min(50000, Number(input.consumption ?? 0))
  );

  const printHours = Math.max(0, Math.min(2000, parseInt(String(input.printHours ?? 0), 10) || 0));
  const printMinutes = Math.max(0, Math.min(59, parseInt(String(input.printMinutes ?? 0), 10) || 0));

  const printerWattage = Math.max(
    0,
    Math.min(5000, Number(input.printerWattage ?? effectivePreset?.printerWattage ?? 0))
  );
  const electricityRate = Math.max(0, Math.min(5.0, Number(input.electricityRate ?? 0)));

  const prepMinutes = Math.max(0, Math.min(1440, Number(input.prepMinutes ?? 0)));
  const postMinutes = Math.max(0, Math.min(1440, Number(input.postMinutes ?? 0)));
  const laborRate = Math.max(0, Math.min(1000, Number(input.laborRate ?? 0)));

  const depreciationMode: DepreciationMode = input.depreciationMode === 'amort' ? 'amort' : 'simple';
  const hourlyWearRate = Math.max(
    0,
    Math.min(100, Number(input.hourlyWearRate ?? effectivePreset?.hourlyWearRate ?? 0))
  );
  const machinePurchasePrice = Math.max(0, Math.min(100000, Number(input.machinePurchasePrice ?? 0)));
  const expectedLifespanHours = Math.max(
    1,
    Math.min(100000, parseInt(String(input.expectedLifespanHours ?? 1), 10) || 1)
  );
  const routineMaintenance = Math.max(0, Math.min(50000, Number(input.routineMaintenance ?? 0)));

  const failureRiskPct = Math.max(
    0,
    Math.min(50, Number(input.failureRiskPct ?? effectivePreset?.failureRiskPct ?? 0))
  );
  const pricingModel: PricingModel = input.pricingModel === 'margin' ? 'margin' : 'markup';
  const profitRatePct = Math.max(
    0,
    pricingModel === 'margin'
      ? Math.min(99.9, Number(input.profitRatePct ?? 0))
      : Math.min(300, Number(input.profitRatePct ?? 0))
  );
  const packagingFees = Math.max(0, Math.min(10000, Number(input.packagingFees ?? 0)));
  const taxRatePct = Math.max(0, Math.min(100, Number(input.taxRatePct ?? 0)));

  // 1. Temporal Aggregation
  const totalPrintHours = printHours + printMinutes / 60;
  const totalLaborHours = (prepMinutes + postMinutes) / 60;

  // 2. Direct Manufacturing Cost Vector
  const materialCost = (spoolCost / spoolCapacity) * consumption;
  const energyKwh = (printerWattage * totalPrintHours) / 1000;
  const electricityCost = energyKwh * electricityRate;

  let depreciationCost = 0;
  if (depreciationMode === 'amort') {
    const amortizedHourlyRate = (machinePurchasePrice + routineMaintenance) / expectedLifespanHours;
    depreciationCost = amortizedHourlyRate * totalPrintHours;
  } else {
    depreciationCost = hourlyWearRate * totalPrintHours;
  }

  const laborCost = totalLaborHours * laborRate;

  // 3. Base & COGS
  const directBaseCost = materialCost + electricityCost + depreciationCost + laborCost;
  const failureBuffer = directBaseCost * (failureRiskPct / 100);
  const totalCOGS = directBaseCost + failureBuffer;

  // 4. Commercial Realization
  let subtotalPrice = 0;
  if (pricingModel === 'margin') {
    const divisor = 1 - profitRatePct / 100;
    subtotalPrice = divisor > 0 ? totalCOGS / divisor : totalCOGS;
  } else {
    subtotalPrice = totalCOGS * (1 + profitRatePct / 100);
  }

  const grossProfit = subtotalPrice - totalCOGS;
  const pricePreTax = subtotalPrice + packagingFees;
  const taxAmount = pricePreTax * (taxRatePct / 100);
  const finalClientQuote = pricePreTax + taxAmount;

  // 5. Margin and Operator Yield
  const grossMarginPct = finalClientQuote > 0 ? (grossProfit / finalClientQuote) * 100 : 0;

  let effectiveHourlyRate = 0;
  const totalRealizedReturn = grossProfit + laborCost;
  if (totalLaborHours > 0) {
    effectiveHourlyRate = totalRealizedReturn / totalLaborHours;
  } else if (totalPrintHours > 0) {
    effectiveHourlyRate = totalRealizedReturn / totalPrintHours;
  } else {
    effectiveHourlyRate = totalRealizedReturn;
  }

  // 6. SVG Donut Geometry Breakdown (Radius = 54)
  const CIRCUMFERENCE = 2 * Math.PI * 54;
  const segmentsRaw = [
    { id: 'material', label: 'Material', cost: materialCost, color: '#3B82F6' },
    { id: 'labor', label: 'Labor', cost: laborCost, color: '#10B981' },
    { id: 'power', label: 'Electricity', cost: electricityCost, color: '#F59E0B' },
    { id: 'wear', label: 'Depreciation', cost: depreciationCost, color: '#8B5CF6' },
    { id: 'risk', label: 'Failure Risk', cost: failureBuffer, color: '#EF4444' },
  ];

  let accumulatedLength = 0;
  let dominantSegment = segmentsRaw[0];

  const donutSegments = segmentsRaw.map((seg, index) => {
    if (seg.cost > dominantSegment.cost) {
      dominantSegment = seg;
    }

    const share = totalCOGS > 0.0001 ? seg.cost / totalCOGS : 0;
    const arcLength = share * CIRCUMFERENCE;
    const dashOffset = index === 0 ? 0 : CIRCUMFERENCE - accumulatedLength;
    accumulatedLength += arcLength;

    return {
      id: seg.id,
      label: seg.label,
      cost: Number(seg.cost.toFixed(4)),
      color: seg.color,
      sharePct: Number((share * 100).toFixed(2)),
      strokeDasharray: `${arcLength.toFixed(3)} ${Math.max(0, CIRCUMFERENCE - arcLength).toFixed(3)}`,
      strokeDashoffset: dashOffset.toFixed(3),
    };
  });

  const dominantMetric = {
    id: dominantSegment.id,
    label: dominantSegment.label,
    pct: Number((totalCOGS > 0.0001 ? (dominantSegment.cost / totalCOGS) * 100 : 0).toFixed(2)),
  };

  return {
    raw: {
      spoolCost,
      spoolCapacity,
      consumption,
      totalPrintHours,
      totalLaborHours,
      energyKwh,
      materialCost,
      electricityCost,
      depreciationCost,
      laborCost,
      directBaseCost,
      failureBuffer,
      totalCOGS,
      packagingFees,
      subtotalPrice,
      grossProfit,
      pricePreTax,
      taxAmount,
      finalClientQuote,
      grossMarginPct,
      effectiveHourlyRate,
    },
    geometry: {
      circumference: CIRCUMFERENCE,
      dominant: dominantMetric,
      segments: donutSegments,
    },
    temporal: {
      printHours,
      printMinutes,
      totalPrintHours,
      prepMinutes,
      postMinutes,
      totalLaborHours,
      runawayAlert: totalPrintHours > 300,
    },
  };
}

// --- POST Handler ---

export async function POST(request: NextRequest) {
  try {
    let body: CalculationInput = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload in request body' },
        { status: 400 }
      );
    }

    const currency: CurrencyCode =
      body.currency && CURRENCY_MAP[body.currency] ? body.currency : 'USD';

    const calculated = calculateCostMatrix(body);
    const { raw, geometry, temporal } = calculated;

    const formatted = {
      materialCost: formatMoney(raw.materialCost, currency),
      electricityCost: formatMoney(raw.electricityCost, currency),
      depreciationCost: formatMoney(raw.depreciationCost, currency),
      laborCost: formatMoney(raw.laborCost, currency),
      directBaseCost: formatMoney(raw.directBaseCost, currency),
      failureBuffer: formatMoney(raw.failureBuffer, currency),
      totalCOGS: formatMoney(raw.totalCOGS, currency),
      packagingFees: formatMoney(raw.packagingFees, currency),
      subtotalPrice: formatMoney(raw.subtotalPrice, currency),
      grossProfit: formatMoney(raw.grossProfit, currency),
      pricePreTax: formatMoney(raw.pricePreTax, currency),
      taxAmount: formatMoney(raw.taxAmount, currency),
      finalClientQuote: formatMoney(raw.finalClientQuote, currency),
      effectiveHourlyRate: `${formatMoney(raw.effectiveHourlyRate, currency)}/hr`,
      printDuration: formatDuration(temporal.printHours, temporal.printMinutes).formatted,
    };

    return NextResponse.json(
      {
        success: true,
        currency,
        costs: {
          materialCost: Number(raw.materialCost.toFixed(4)),
          electricityCost: Number(raw.electricityCost.toFixed(4)),
          depreciationCost: Number(raw.depreciationCost.toFixed(4)),
          laborCost: Number(raw.laborCost.toFixed(4)),
          directBaseCost: Number(raw.directBaseCost.toFixed(4)),
          failureBuffer: Number(raw.failureBuffer.toFixed(4)),
          totalCOGS: Number(raw.totalCOGS.toFixed(4)),
          packagingFees: Number(raw.packagingFees.toFixed(4)),
        },
        commercial: {
          subtotalPrice: Number(raw.subtotalPrice.toFixed(4)),
          grossProfit: Number(raw.grossProfit.toFixed(4)),
          pricePreTax: Number(raw.pricePreTax.toFixed(4)),
          taxAmount: Number(raw.taxAmount.toFixed(4)),
          finalClientQuote: Number(raw.finalClientQuote.toFixed(4)),
          grossMarginPct: Number(raw.grossMarginPct.toFixed(2)),
          effectiveHourlyRate: Number(raw.effectiveHourlyRate.toFixed(4)),
        },
        temporal: {
          totalPrintHours: Number(temporal.totalPrintHours.toFixed(4)),
          totalLaborHours: Number(temporal.totalLaborHours.toFixed(4)),
          energyKwh: Number(raw.energyKwh.toFixed(4)),
          runawayAlert: temporal.runawayAlert,
        },
        geometry,
        formatted,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
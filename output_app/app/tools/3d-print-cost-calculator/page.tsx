'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';

// --- Type Definitions ---
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
type Technology = 'FDM' | 'SLA';
type DepreciationMode = 'simple' | 'amort';
type PricingModel = 'markup' | 'margin';
type QuoteViewMode = 'detailed' | 'simple';

interface AppState {
  currency: CurrencyCode;
  tech: Technology;
  presetKey: string;
  spoolCapacity: number;
  spoolCost: number;
  consumption: number;
  printHours: number;
  printMinutes: number;
  printerWattage: number;
  electricityRate: number;
  prepMinutes: number;
  postMinutes: number;
  laborRate: number;
  depreciationMode: DepreciationMode;
  hourlyWearRate: number;
  machinePurchasePrice: number;
  expectedLifespanHours: number;
  routineMaintenance: number;
  failureRiskPct: number;
  pricingModel: PricingModel;
  profitRatePct: number;
  packagingFees: number;
  taxRatePct: number;
  makerName: string;
  clientName: string;
  quoteMode: QuoteViewMode;
  quoteTerms: string;
}

interface CurrencyMeta {
  symbol: string;
  name: string;
  locale: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// --- Presets & Constants ---
const STRIPE_PRO_URL = 'https://buy.stripe.com/YOUR_LIVE_STRIPE_LINK';
const MAX_FREE_USES = 3;

const CURRENCY_MAP: Record<CurrencyCode, CurrencyMeta> = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
};

const MATERIAL_PRESETS: Record<
  string,
  {
    name: string;
    tech: Technology;
    spoolCapacity: number;
    spoolCost: number;
    printerWattage: number;
    hourlyWearRate: number;
    failureRiskPct: number;
  }
> = {
  PLA: {
    name: 'PLA Standard',
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 22.0,
    printerWattage: 150,
    hourlyWearRate: 0.15,
    failureRiskPct: 5,
  },
  PETG: {
    name: 'PETG Tough',
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 24.0,
    printerWattage: 180,
    hourlyWearRate: 0.2,
    failureRiskPct: 8,
  },
  ABS: {
    name: 'ABS / ASA Technical',
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 28.0,
    printerWattage: 250,
    hourlyWearRate: 0.25,
    failureRiskPct: 15,
  },
  TPU: {
    name: 'TPU Flex 95A',
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 36.0,
    printerWattage: 160,
    hourlyWearRate: 0.3,
    failureRiskPct: 18,
  },
  CF: {
    name: 'Carbon Fiber Composite',
    tech: 'FDM',
    spoolCapacity: 1000,
    spoolCost: 65.0,
    printerWattage: 220,
    hourlyWearRate: 0.75,
    failureRiskPct: 12,
  },
  RESIN_STD: {
    name: 'Standard UV Resin',
    tech: 'SLA',
    spoolCapacity: 1000,
    spoolCost: 30.0,
    printerWattage: 65,
    hourlyWearRate: 0.4,
    failureRiskPct: 10,
  },
  RESIN_TOUGH: {
    name: 'Engineering Tough Resin',
    tech: 'SLA',
    spoolCapacity: 1000,
    spoolCost: 55.0,
    printerWattage: 75,
    hourlyWearRate: 0.45,
    failureRiskPct: 12,
  },
};

const FAQ_LIST: FAQItem[] = [
  {
    question: 'How do you accurately calculate the true cost of a 3D print?',
    answer:
      'The true cost of 3D printing requires five fundamental components: direct material consumption (spool or resin weight multiplied by the cost per gram or milliliter), electricity utility expense (average wattage consumed over total print run-time multiplied by the regional kilowatt-hour tariff), operator labor (time spent prepping CAD files, slicing, bed leveling, post-curing, and cleaning supports), machine wear depreciation (reserving capital to replace nozzles, belts, build plates, or LCD screens), and a risk contingency allowance to account for misprints or scrap parts.',
  },
  {
    question: 'What is the formula for calculating electricity cost in 3D printing?',
    answer:
      'Electricity Cost = (Printer Average Wattage ÷ 1,000) × Total Print Hours × Electricity Cost per kWh. For example, an FDM printer drawing an average of 150 Watts running for 8 hours at an electricity rate of $0.16/kWh equals: (150 ÷ 1,000) × 8 × 0.16 = $0.192. Heated build plates and high-temp enclosures for ABS/Nylon increase power draw relative to standard PLA.',
  },
  {
    question: 'What is the difference between Cost Markup and Gross Profit Margin for 3D quotes?',
    answer:
      'Cost Markup calculates profit as a percentage added on top of your raw production costs: Price = COGS × (1 + Markup %). Target Gross Margin defines profit as a percentage of the total client-facing invoice: Price = COGS ÷ (1 - Margin %). A 50% markup on a $10 base production cost produces a $15 quote (a 33.3% gross margin), whereas a 50% gross margin target requires quoting $20 to the client.',
  },
  {
    question: 'Why should machine wear and depreciation be factored into every quote?',
    answer:
      '3D printers undergo continuous mechanical wear. Moving components like brass/hardened steel nozzles, linear bearings, stepper motors, PTFE tubes, silicone socks, PEI sheets, and SLA LCD screens and FEP release films wear out after designated operating hours. Factoring machine depreciation ($0.15–$0.75 per print hour or straight-line asset amortization) ensures your business accumulates a funded capital reserve to repair and replace equipment without eroding operating profits.',
  },
  {
    question: 'How much should I charge for 3D printing operator labor?',
    answer:
      'Commercial fabrication studios typically bill active labor at $25 to $60+ per hour depending on technical skill requirements. While the printer operates autonomously during the print cycle, human labor is required for file verification, support optimization, bed adhesion prep, manual wash/cure cycles, support removal, sanding, threading heat-set inserts, quality inspection, and protective packaging.',
  },
  {
    question: 'What failure contingency percentage should be budgeted?',
    answer:
      'Standard low-risk materials like PLA and PETG on tuned printers typically warrant a 5% to 8% failure contingency. Complex geometries, tall aspect ratios, engineering materials prone to warping (ABS, ASA, Nylon), flexible TPU, or tight-tolerance resin prints carry failure risks of 12% to 20%. Budgeting a failure buffer safeguards cash flow against spaghetti fails, layer shifts, clogged nozzles, or resin delamination.',
  },
];

const DEFAULT_STATE: AppState = {
  currency: 'USD',
  tech: 'FDM',
  presetKey: 'PLA',
  spoolCapacity: 1000,
  spoolCost: 22.0,
  consumption: 125,
  printHours: 6,
  printMinutes: 30,
  printerWattage: 150,
  electricityRate: 0.16,
  prepMinutes: 15,
  postMinutes: 20,
  laborRate: 25.0,
  depreciationMode: 'simple',
  hourlyWearRate: 0.25,
  machinePurchasePrice: 400.0,
  expectedLifespanHours: 2500,
  routineMaintenance: 50.0,
  failureRiskPct: 10,
  pricingModel: 'markup',
  profitRatePct: 40,
  packagingFees: 3.5,
  taxRatePct: 0,
  makerName: 'Apex 3D Manufacturing & Prototyping',
  clientName: 'Acme Precision Lab',
  quoteMode: 'detailed',
  quoteTerms:
    'Quotation valid for 30 days. Lead time is 3-5 business days upon digital proof authorization. Dimensional accuracy guaranteed within standard ±0.2% tolerance.',
};

const CIRCUMFERENCE = 2 * Math.PI * 54; // ≈ 339.292

export default function PrintCostCalculator() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Form input unique IDs for accessibility
  const idSpoolWeight = useId();
  const idSpoolCost = useId();
  const idModelConsumption = useId();
  const idPrintHours = useId();
  const idPrintMinutes = useId();
  const idPrinterWattage = useId();
  const idElectricityKwh = useId();
  const idPrepMinutes = useId();
  const idPostMinutes = useId();
  const idLaborRate = useId();
  const idHourlyWearRate = useId();
  const idMachinePrice = useId();
  const idMachineLife = useId();
  const idMachineMaint = useId();
  const idPackagingFee = useId();
  const idTaxRate = useId();

  // Load preferences and monetization stats from localStorage
  useEffect(() => {
    try {
      const proStatus = localStorage.getItem('micro_tools_pro') === 'true';
      setIsPro(proStatus);

      const savedUses = parseInt(localStorage.getItem('micro_tools_uses') || '0', 10);
      setUsageCount(isNaN(savedUses) ? 0 : savedUses);

      const saved = localStorage.getItem('apex_3d_print_calc_pref');
      if (saved) {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          currency: parsed.currency ?? prev.currency,
          electricityRate: typeof parsed.electricityRate === 'number' ? parsed.electricityRate : prev.electricityRate,
          laborRate: typeof parsed.laborRate === 'number' ? parsed.laborRate : prev.laborRate,
          hourlyWearRate: typeof parsed.hourlyWearRate === 'number' ? parsed.hourlyWearRate : prev.hourlyWearRate,
          machinePurchasePrice: typeof parsed.machinePurchasePrice === 'number' ? parsed.machinePurchasePrice : prev.machinePurchasePrice,
          makerName: typeof parsed.makerName === 'string' ? parsed.makerName : prev.makerName,
          quoteTerms: typeof parsed.quoteTerms === 'string' ? parsed.quoteTerms : prev.quoteTerms,
        }));
      }
    } catch (e) {
      console.warn('Unable to hydrate preferences from localStorage:', e);
    }
    setHasHydrated(true);
  }, []);

  // Save persistent fields to localStorage
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      const toSave = {
        currency: state.currency,
        electricityRate: state.electricityRate,
        laborRate: state.laborRate,
        hourlyWearRate: state.hourlyWearRate,
        machinePurchasePrice: state.machinePurchasePrice,
        makerName: state.makerName,
        quoteTerms: state.quoteTerms,
      };
      localStorage.setItem('apex_3d_print_calc_pref', JSON.stringify(toSave));
    } catch (e) {
      console.warn('Unable to save preferences to localStorage:', e);
    }
  }, [
    state.currency,
    state.electricityRate,
    state.laborRate,
    state.hourlyWearRate,
    state.machinePurchasePrice,
    state.makerName,
    state.quoteTerms,
    hasHydrated,
  ]);

  // Freemium usage gate trigger
  const handleOpenQuoteModal = () => {
    if (isPro) {
      setIsQuoteModalOpen(true);
      return;
    }

    const currentUses = parseInt(localStorage.getItem('micro_tools_uses') || '0', 10);
    if (currentUses >= MAX_FREE_USES) {
      setIsPaywallOpen(true);
      return;
    }

    const nextUses = currentUses + 1;
    localStorage.setItem('micro_tools_uses', nextUses.toString());
    setUsageCount(nextUses);
    setIsQuoteModalOpen(true);
  };

  // Handle Preset Change
  const applyPreset = (key: string) => {
    if (key === 'CUSTOM') {
      setState((s) => ({ ...s, presetKey: 'CUSTOM' }));
      return;
    }
    const preset = MATERIAL_PRESETS[key];
    if (!preset) return;
    setState((s) => ({
      ...s,
      presetKey: key,
      tech: preset.tech,
      spoolCapacity: preset.spoolCapacity,
      spoolCost: preset.spoolCost,
      printerWattage: preset.printerWattage,
      hourlyWearRate: preset.hourlyWearRate,
      failureRiskPct: preset.failureRiskPct,
    }));
  };

  // Math Pipeline computation
  const calc = useMemo(() => {
    const spoolCapacity = Math.max(0.1, Number(state.spoolCapacity) || 0.1);
    const spoolCost = Math.max(0, Number(state.spoolCost) || 0);
    const consumption = Math.max(0, Number(state.consumption) || 0);

    const printHours = Math.max(0, parseInt(String(state.printHours), 10) || 0);
    const printMinutes = Math.max(0, Math.min(59, parseInt(String(state.printMinutes), 10) || 0));

    const printerWattage = Math.max(0, Number(state.printerWattage) || 0);
    const electricityRate = Math.max(0, Number(state.electricityRate) || 0);

    const prepMinutes = Math.max(0, Number(state.prepMinutes) || 0);
    const postMinutes = Math.max(0, Number(state.postMinutes) || 0);
    const laborRate = Math.max(0, Number(state.laborRate) || 0);

    const hourlyWearRate = Math.max(0, Number(state.hourlyWearRate) || 0);
    const machinePurchasePrice = Math.max(0, Number(state.machinePurchasePrice) || 0);
    const expectedLifespanHours = Math.max(1, parseInt(String(state.expectedLifespanHours), 10) || 1);
    const routineMaintenance = Math.max(0, Number(state.routineMaintenance) || 0);

    const failureRiskPct = Math.max(0, Math.min(50, Number(state.failureRiskPct) || 0));
    const profitRatePct = Math.max(0, Number(state.profitRatePct) || 0);
    const packagingFees = Math.max(0, Number(state.packagingFees) || 0);
    const taxRatePct = Math.max(0, Math.min(100, Number(state.taxRatePct) || 0));

    // Time calculations
    const totalPrintHours = printHours + printMinutes / 60;
    const totalLaborHours = (prepMinutes + postMinutes) / 60;

    // Direct Costs
    const materialCost = (spoolCost / spoolCapacity) * consumption;
    const electricityCost = ((printerWattage * totalPrintHours) / 1000) * electricityRate;

    let depreciationCost = 0;
    if (state.depreciationMode === 'amort') {
      const hourlyAmort = (machinePurchasePrice + routineMaintenance) / expectedLifespanHours;
      depreciationCost = hourlyAmort * totalPrintHours;
    } else {
      depreciationCost = hourlyWearRate * totalPrintHours;
    }

    const laborCost = totalLaborHours * laborRate;
    const directBaseCost = materialCost + electricityCost + depreciationCost + laborCost;
    const failureBuffer = directBaseCost * (failureRiskPct / 100);
    const totalCOGS = directBaseCost + failureBuffer;

    // Commercial pricing
    let subtotalPrice = 0;
    if (state.pricingModel === 'margin') {
      const clampedMargin = Math.min(99.9, profitRatePct);
      const divisor = 1 - clampedMargin / 100;
      subtotalPrice = divisor > 0 ? totalCOGS / divisor : totalCOGS;
    } else {
      subtotalPrice = totalCOGS * (1 + profitRatePct / 100);
    }

    const grossProfit = subtotalPrice - totalCOGS;
    const pricePreTax = subtotalPrice + packagingFees;
    const taxAmount = pricePreTax * (taxRatePct / 100);
    const finalClientQuote = pricePreTax + taxAmount;

    // Return metrics
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

    // Donut Segments
    const segmentsRaw = [
      { id: 'material', label: 'Material', cost: materialCost, color: '#06b6d4' },
      { id: 'labor', label: 'Labor', cost: laborCost, color: '#a855f7' },
      { id: 'power', label: 'Electricity', cost: electricityCost, color: '#eab308' },
      { id: 'wear', label: 'Depreciation', cost: depreciationCost, color: '#64748b' },
      { id: 'risk', label: 'Failure Risk', cost: failureBuffer, color: '#f43f5e' },
    ];

    let runningOffset = 0;
    let dominant = segmentsRaw[0];

    const donutSegments = segmentsRaw.map((seg) => {
      if (seg.cost > dominant.cost) {
        dominant = seg;
      }
      const share = totalCOGS > 0.0001 ? seg.cost / totalCOGS : 0;
      const arcLength = share * CIRCUMFERENCE;
      const offset = runningOffset;
      runningOffset += arcLength;

      return {
        ...seg,
        sharePct: share * 100,
        arcLength,
        dashArray: `${arcLength.toFixed(3)} ${(CIRCUMFERENCE - arcLength).toFixed(3)}`,
        dashOffset: -offset,
      };
    });

    const dominantPct = totalCOGS > 0.0001 ? (dominant.cost / totalCOGS) * 100 : 0;

    return {
      materialCost,
      electricityCost,
      depreciationCost,
      laborCost,
      directBaseCost,
      failureBuffer,
      totalCOGS,
      subtotalPrice,
      grossProfit,
      packagingFees,
      pricePreTax,
      taxAmount,
      finalClientQuote,
      grossMarginPct,
      effectiveHourlyRate,
      totalPrintHours,
      totalLaborHours,
      donutSegments,
      dominant: { ...dominant, pct: dominantPct },
      isLongPrint: totalPrintHours > 300,
    };
  }, [state]);

  // Currency Formatter
  const fmt = (val: number): string => {
    const num = Number(val) || 0;
    const config = CURRENCY_MAP[state.currency] || CURRENCY_MAP.USD;
    if (state.currency === 'JPY') {
      return `${config.symbol}${Math.round(num).toLocaleString(config.locale)}`;
    }
    return `${config.symbol}${num.toLocaleString(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const unitLabel = state.tech === 'FDM' ? 'g' : 'ml';
  const unitCapacityLabel = state.tech === 'FDM' ? 'Spool' : 'Bottle';

  // JSON-LD Structured Data Schema (WebApplication + FAQPage)
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: '3D Print Cost & Filament Price Calculator',
        url: typeof window !== 'undefined' ? window.location.href : 'https://microtools.dev/3d-print-cost-calculator',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Works on all modern browsers.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description:
          'Professional 3D print pricing and cost calculator. Compute direct filament and resin consumption, electricity tariffs, human labor, equipment depreciation, scrap buffers, and profit margins with itemized PDF quotes.',
        featureList: [
          'FDM and SLA material presets',
          'Electricity cost per kWh calculation',
          'Equipment depreciation and asset amortization',
          'Cost Markup vs Gross Margin modeling',
          'Printable and itemized client quotes',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_LIST.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300 min-h-screen flex flex-col font-sans">
      {/* Inject Structured Data for SEO / Rich Snippets (escaped to prevent script breakout) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSchema).replace(/</g, '\\u003c'),
        }}
      />

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #quote-print-modal,
          #quote-print-modal * {
            visibility: visible !important;
          }
          #quote-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #quote-print-area {
            background: white !important;
            color: #09090b !important;
            padding: 1.5rem !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Back Navigation & Brand Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-cyan-400 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-zinc-800/50"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>← All Tools</span>
            </a>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100">
                3D Print Cost & Filament Price Calculator
              </h1>
            </div>
          </div>

          {/* Pro Badge & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                PRO Active
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsPaywallOpen(true)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
              >
                <span>Free ({Math.max(0, MAX_FREE_USES - usageCount)} left)</span>
                <span className="text-amber-400 font-bold ml-1">Upgrade</span>
              </button>
            )}

            <div className="inline-flex p-1 bg-zinc-800/80 rounded-lg border border-zinc-700/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, tech: 'FDM' }))}
                className={`px-2.5 py-1 rounded transition ${
                  state.tech === 'FDM' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                FDM (g)
              </button>
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, tech: 'SLA' }))}
                className={`px-2.5 py-1 rounded transition ${
                  state.tech === 'SLA' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SLA (ml)
              </button>
            </div>

            <select
              value={state.currency}
              onChange={(e) => setState((s) => ({ ...s, currency: e.target.value as CurrencyCode }))}
              aria-label="Select Currency"
              className="bg-zinc-800/80 border border-zinc-700/60 text-xs rounded-lg px-2.5 py-1.5 font-medium text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>
      </header>

      {/* AdSense Top Header Banner Slot */}
      {!isPro && (
        <div className="no-print w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-2 min-h-[90px] flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-600 mb-1">Advertisement</span>
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: '90px' }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="1234567890"
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      )}

      {/* Extreme Runtime Warning Banner */}
      {calc.isLongPrint && (
        <aside className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2.5 text-center text-xs text-rose-200 animate-in fade-in duration-300">
          <span className="font-semibold text-rose-300">⚠️ High Run-time Warning:</span> Total print duration exceeds
          300 operating hours ({calc.totalPrintHours.toFixed(1)} hrs). Verify active thermal runaway protections, scheduled nozzle checkups, and UPS backup battery integrity.
        </aside>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Modular Input Sections (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Material & Filament Profile */}
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h2 className="text-sm font-semibold tracking-wide uppercase">1. Material & Filament Profile</h2>
              </div>
              <span className="text-xs text-zinc-500">Direct Material COGS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="material-preset">
                  Preset Formulation
                </label>
                <select
                  id="material-preset"
                  value={state.presetKey}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="PLA">PLA Standard ($22/kg, 150W)</option>
                  <option value="PETG">PETG Tough ($24/kg, 180W)</option>
                  <option value="ABS">ABS / ASA Technical ($28/kg, 250W)</option>
                  <option value="TPU">TPU Flex 95A ($36/kg, 160W)</option>
                  <option value="CF">Carbon Fiber Composite ($65/kg, 220W)</option>
                  <option value="RESIN_STD">Standard UV Resin ($30/L, 65W)</option>
                  <option value="RESIN_TOUGH">Engineering Tough Resin ($55/L, 75W)</option>
                  <option value="CUSTOM">Custom Configuration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idSpoolWeight}>
                  {unitCapacityLabel} Capacity ({unitLabel})
                </label>
                <input
                  type="number"
                  id={idSpoolWeight}
                  min={0.1}
                  step={10}
                  value={state.spoolCapacity}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      presetKey: 'CUSTOM',
                      spoolCapacity: Math.max(0.1, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idSpoolCost}>
                  Container Cost ({CURRENCY_MAP[state.currency].symbol})
                </label>
                <input
                  type="number"
                  id={idSpoolCost}
                  min={0}
                  step={0.5}
                  value={state.spoolCost}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      presetKey: 'CUSTOM',
                      spoolCost: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idModelConsumption}>
                  Model Consumption ({unitLabel})
                </label>
                <input
                  type="number"
                  id={idModelConsumption}
                  min={0}
                  step={1}
                  value={state.consumption}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      consumption: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-zinc-400 flex items-center justify-between border-t border-zinc-800/60">
              <span>Unit Material Cost:</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {fmt(state.spoolCost / Math.max(0.1, state.spoolCapacity))}/{unitLabel}
              </span>
            </div>
          </section>

          {/* 2. Print Runtime & Electricity */}
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-semibold tracking-wide uppercase">2. Print Runtime & Electricity</h2>
              </div>
              <span className="text-xs text-zinc-500">
                Total: {calc.totalPrintHours.toFixed(2)} hrs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idPrintHours}>
                  Hours
                </label>
                <input
                  type="number"
                  id={idPrintHours}
                  min={0}
                  max={2000}
                  value={state.printHours}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      printHours: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idPrintMinutes}>
                  Minutes (0-59)
                </label>
                <input
                  type="number"
                  id={idPrintMinutes}
                  min={0}
                  max={59}
                  value={state.printMinutes}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      printMinutes: Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idPrinterWattage}>
                  Avg Power (W)
                </label>
                <input
                  type="number"
                  id={idPrinterWattage}
                  min={0}
                  step={5}
                  value={state.printerWattage}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      presetKey: 'CUSTOM',
                      printerWattage: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idElectricityKwh}>
                  Tariff ({CURRENCY_MAP[state.currency].symbol}/kWh)
                </label>
                <input
                  type="number"
                  id={idElectricityKwh}
                  min={0}
                  step={0.01}
                  value={state.electricityRate}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      electricityRate: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </section>

          {/* 3. Labor & Equipment Depreciation */}
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-violet-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h2 className="text-sm font-semibold tracking-wide uppercase">3. Labor & Equipment Depreciation</h2>
              </div>
              <span className="text-xs text-zinc-500">
                Active Labor: {(calc.totalLaborHours * 60).toFixed(0)} min
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idPrepMinutes}>
                  Prep / Slicing (min)
                </label>
                <input
                  type="number"
                  id={idPrepMinutes}
                  min={0}
                  step={5}
                  value={state.prepMinutes}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      prepMinutes: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idPostMinutes}>
                  Post-Process (min)
                </label>
                <input
                  type="number"
                  id={idPostMinutes}
                  min={0}
                  step={5}
                  value={state.postMinutes}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      postMinutes: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idLaborRate}>
                  Labor Wage ({CURRENCY_MAP[state.currency].symbol}/hr)
                </label>
                <input
                  type="number"
                  id={idLaborRate}
                  min={0}
                  step={1}
                  value={state.laborRate}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      laborRate: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Depreciation Mode Selection */}
            <div className="pt-3 border-t border-zinc-800/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Machine Wear Model</span>
                <div className="inline-flex p-0.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setState((s) => ({ ...s, depreciationMode: 'simple' }))}
                    className={`px-3 py-1 rounded font-medium transition ${
                      state.depreciationMode === 'simple'
                        ? 'bg-zinc-800 text-cyan-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Simple Hourly Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setState((s) => ({ ...s, depreciationMode: 'amort' }))}
                    className={`px-3 py-1 rounded font-medium transition ${
                      state.depreciationMode === 'amort'
                        ? 'bg-zinc-800 text-cyan-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Asset Amortization
                  </button>
                </div>
              </div>

              {state.depreciationMode === 'simple' ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idHourlyWearRate}>
                    Wear Rate ({CURRENCY_MAP[state.currency].symbol}/print hour)
                  </label>
                  <input
                    type="number"
                    id={idHourlyWearRate}
                    min={0}
                    step={0.05}
                    value={state.hourlyWearRate}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        presetKey: 'CUSTOM',
                        hourlyWearRate: Math.max(0, parseFloat(e.target.value) || 0),
                      }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1" htmlFor={idMachinePrice}>
                      Machine Price ({CURRENCY_MAP[state.currency].symbol})
                    </label>
                    <input
                      type="number"
                      id={idMachinePrice}
                      min={0}
                      step={50}
                      value={state.machinePurchasePrice}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          machinePurchasePrice: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1" htmlFor={idMachineLife}>
                      Lifespan (Hours)
                    </label>
                    <input
                      type="number"
                      id={idMachineLife}
                      min={1}
                      step={100}
                      value={state.expectedLifespanHours}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          expectedLifespanHours: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1" htmlFor={idMachineMaint}>
                      Parts/Consumables ({CURRENCY_MAP[state.currency].symbol})
                    </label>
                    <input
                      type="number"
                      id={idMachineMaint}
                      min={0}
                      step={10}
                      value={state.routineMaintenance}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          routineMaintenance: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4. Risk Buffer, Commercial Markup & Taxes */}
          <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h2 className="text-sm font-semibold tracking-wide uppercase">4. Risk Contingency & Pricing</h2>
              </div>
              <span className="text-xs text-zinc-500">Commercial Pipeline</span>
            </div>

            {/* Failure Risk Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                <span className="text-zinc-300">Failure Contingency Buffer</span>
                <span className="text-rose-400 font-mono font-semibold">{state.failureRiskPct}%</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={state.failureRiskPct}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      failureRiskPct: Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  aria-label="Failure Contingency Buffer Slider"
                  className="flex-1 accent-rose-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={state.failureRiskPct}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      failureRiskPct: Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  aria-label="Failure Contingency Buffer Percentage"
                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs text-zinc-200"
                />
              </div>
            </div>

            {/* Profit Model: Markup vs Gross Margin */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300">Commercial Strategy</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono">
                    {state.pricingModel === 'markup' ? 'Cost Markup' : 'Target Margin'}
                  </span>
                </div>
                <div className="inline-flex text-[11px] p-0.5 bg-zinc-950 border border-zinc-800 rounded-md">
                  <button
                    type="button"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        pricingModel: 'markup',
                        profitRatePct: Math.min(300, s.profitRatePct),
                      }))
                    }
                    className={`px-2 py-0.5 rounded transition ${
                      state.pricingModel === 'markup' ? 'bg-emerald-600 text-white font-medium' : 'text-zinc-400'
                    }`}
                  >
                    Markup %
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        pricingModel: 'margin',
                        profitRatePct: Math.min(99.9, s.profitRatePct),
                      }))
                    }
                    className={`px-2 py-0.5 rounded transition ${
                      state.pricingModel === 'margin' ? 'bg-emerald-600 text-white font-medium' : 'text-zinc-400'
                    }`}
                  >
                    Margin %
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={state.pricingModel === 'margin' ? 95 : 300}
                  step={state.pricingModel === 'margin' ? 0.5 : 1}
                  value={state.profitRatePct}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      profitRatePct: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  aria-label="Profit Rate Slider"
                  className="flex-1 accent-emerald-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={state.pricingModel === 'margin' ? 99.9 : 300}
                  step={0.5}
                  value={state.profitRatePct}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      profitRatePct:
                        state.pricingModel === 'margin'
                          ? Math.min(99.9, Math.max(0, parseFloat(e.target.value) || 0))
                          : Math.min(300, Math.max(0, parseFloat(e.target.value) || 0)),
                    }))
                  }
                  aria-label="Profit Rate Percentage"
                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs text-zinc-200"
                />
              </div>
            </div>

            {/* Packaging & Tax */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idPackagingFee}>
                  Packaging & Boxes ({CURRENCY_MAP[state.currency].symbol})
                </label>
                <input
                  type="number"
                  id={idPackagingFee}
                  min={0}
                  step={0.5}
                  value={state.packagingFees}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      packagingFees: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor={idTaxRate}>
                  Sales Tax / VAT (%)
                </label>
                <input
                  type="number"
                  id={idTaxRate}
                  min={0}
                  max={100}
                  step={0.25}
                  value={state.taxRatePct}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      taxRatePct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                    }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* AdSense Mid-Section Rectangle Ad */}
          {!isPro && (
            <div className="no-print bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-600 mb-2">Sponsored</span>
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '120px' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="9876543210"
                data-ad-format="rectangle"
                data-full-width-responsive="true"
              />
            </div>
          )}
        </div>

        {/* Right Column: Sticky Dashboard, SVG Donut & Invoice Trigger (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Hero Quote Metric Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-cyan-500/30 rounded-2xl p-6 shadow-xl shadow-cyan-950/20">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                Recommended Client Quote
              </span>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50">
                {state.taxRatePct > 0 ? `Tax Incl. (${state.taxRatePct}%)` : 'Tax Free / 0%'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {fmt(calc.finalClientQuote)}
              </span>
              <span className="text-xs text-zinc-400 font-mono">{state.currency}</span>
            </div>

            {/* 4-KPI Grid Indicators */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/80">
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/50">
                <span className="block text-[11px] text-zinc-400 uppercase font-medium">Direct COGS</span>
                <span className="text-base font-bold text-zinc-200 font-mono">{fmt(calc.totalCOGS)}</span>
              </div>
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/50">
                <span className="block text-[11px] text-zinc-400 uppercase font-medium">Gross Profit</span>
                <span className="text-base font-bold text-emerald-400 font-mono">{fmt(calc.grossProfit)}</span>
              </div>
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/50">
                <span className="block text-[11px] text-zinc-400 uppercase font-medium">Operator Return</span>
                <span className="text-base font-bold text-cyan-300 font-mono">{fmt(calc.effectiveHourlyRate)}/h</span>
              </div>
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/50">
                <span className="block text-[11px] text-zinc-400 uppercase font-medium">Realized Margin</span>
                <span className="text-base font-bold text-indigo-400 font-mono">
                  {calc.grossMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Cost Allocation Donut SVG Widget */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Cost Base Allocation Breakdown
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Donut graphic */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                  {/* Background Track */}
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-zinc-800/60"
                    fill="transparent"
                  />
                  {/* Dynamic Slices */}
                  {calc.donutSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="64"
                      cy="64"
                      r="54"
                      stroke={seg.color}
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] uppercase text-zinc-500 font-mono">Dominant</span>
                  <span className="text-xs font-bold text-zinc-200">{calc.dominant.label}</span>
                  <span className="text-xs text-cyan-400 font-mono font-semibold">
                    {calc.dominant.pct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Cost Category Legend */}
              <ul className="text-xs space-y-2 flex-1 w-full font-mono">
                {calc.donutSegments.map((seg) => (
                  <li key={seg.id} className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-zinc-300">{seg.label}</span>
                    </span>
                    <span className="text-zinc-100 font-semibold">{fmt(seg.cost)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action: Open Printable Invoice Modal with Usage Counter */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleOpenQuoteModal}
              className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Generate Printable Client Quote</span>
              {!isPro && (
                <span className="ml-1 text-xs bg-zinc-950/20 px-2 py-0.5 rounded font-mono font-bold">
                  {Math.max(0, MAX_FREE_USES - usageCount)} left
                </span>
              )}
            </button>

            {!isPro && (
              <p className="text-center text-[11px] text-zinc-500 font-mono">
                Free plan allows 3 quote generations.
                <button
                  type="button"
                  onClick={() => setIsPaywallOpen(true)}
                  className="text-cyan-400 hover:underline ml-1 font-semibold"
                >
                  Go Pro for unlimited
                </button>
              </p>
            )}
          </div>

          {/* AdSense Sidebar Widget */}
          {!isPro && (
            <div className="no-print bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-600 mb-1">Sponsored Links</span>
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '250px' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="5432109876"
                data-ad-format="rectangle"
                data-full-width-responsive="true"
              />
            </div>
          )}
        </div>
      </main>

      {/* SEO & Informational FAQ Section */}
      <section className="border-t border-zinc-800/80 bg-zinc-900/30 py-12 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800/50">
              Pricing Knowledge Base
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions About 3D Print Costing
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Master the financial economics of additive manufacturing. Calculate real filament usage, machine depreciation, labor rates, and profitable client pricing.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_LIST.map((item, index) => (
              <details
                key={index}
                className="group bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-200 open:border-cyan-500/40 open:bg-zinc-900"
              >
                <summary className="flex items-center justify-between p-4 sm:p-5 text-sm sm:text-base font-semibold text-zinc-200 cursor-pointer list-none select-none hover:text-cyan-300">
                  <span>{item.question}</span>
                  <span className="ml-3 shrink-0 text-cyan-400 transition-transform duration-200 group-open:rotate-180">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-4 pb-5 pt-1 sm:px-5 sm:pb-6 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50 mt-1">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>

          {/* Educational Formula Summary Card */}
          <div className="mt-10 p-5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-2">
            <h3 className="font-semibold text-zinc-200 uppercase tracking-wide">
              Standard 3D Print Cost Formula Reference
            </h3>
            <p className="font-mono text-zinc-300 bg-zinc-900 p-3 rounded border border-zinc-800 text-[11px] sm:text-xs overflow-x-auto">
              Total COGS = Material Cost + Electricity Cost + Depreciation Reserve + Labor Value + Failure Buffer
            </p>
            <p className="text-zinc-500 pt-1">
              Final Client Quote = (Subtotal Price via Markup/Margin + Packaging Fees) × (1 + Regional Tax / VAT Rate)
            </p>
          </div>
        </div>
      </section>

      {/* Freemium Paywall Modal */}
      {isPaywallOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative bg-zinc-900 border border-cyan-500/40 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 text-zinc-100">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsPaywallOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              aria-label="Close paywall modal"
            >
              ✕
            </button>

            {/* Modal Badge & Headline */}
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ⚡ 3D Print Cost Calculator Pro
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Unlock Unlimited Quotes
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You have reached your limit of {MAX_FREE_USES} free quotes. Upgrade to Pro for lifetime unlimited quotes, PDF export, zero ads, and multi-machine amortization.
              </p>
            </div>

            {/* Feature Checklist */}
            <ul className="text-xs space-y-2.5 bg-zinc-950/70 border border-zinc-800 p-4 rounded-xl text-zinc-300 font-medium">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Unlimited Printable Client Quotes & Invoices</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Persistent Studio Profile & Material Presets</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Ad-Free High Performance Experience</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Direct PDF Client Export with Custom Branding</span>
              </li>
            </ul>

            {/* Stripe Direct Link Button */}
            <div className="space-y-3 pt-2">
              <a
                href={STRIPE_PRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-zinc-950 font-bold text-center rounded-xl text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                <span>Upgrade to Pro Now</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>

              <p className="text-[11px] text-center text-zinc-500">
                Instant access. One-time payment, lifetime updates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal Dialog */}
      {isQuoteModalOpen && (
        <div
          id="quote-print-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col my-8">
            {/* Modal Controls Header (no-print) */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between no-print bg-zinc-900/90">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-200">Quotation Document</span>
                <div className="inline-flex text-xs bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setState((s) => ({ ...s, quoteMode: 'detailed' }))}
                    className={`px-2.5 py-1 rounded transition ${
                      state.quoteMode === 'detailed'
                        ? 'bg-zinc-800 text-cyan-400 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Itemized BOM
                  </button>
                  <button
                    type="button"
                    onClick={() => setState((s) => ({ ...s, quoteMode: 'simple' }))}
                    className={`px-2.5 py-1 rounded transition ${
                      state.quoteMode === 'simple'
                        ? 'bg-zinc-800 text-cyan-400 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Consolidated View
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition"
                  aria-label="Close quote modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div id="quote-print-area" className="p-8 space-y-6 text-zinc-200 text-sm bg-zinc-900">
              {/* Quotation Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-zinc-800 pb-6">
                <div>
                  <input
                    type="text"
                    value={state.makerName}
                    onChange={(e) => setState((s) => ({ ...s, makerName: e.target.value }))}
                    className="font-bold text-lg text-white bg-transparent border-b border-dashed border-zinc-700 focus:border-cyan-400 focus:outline-none w-full"
                    placeholder="Your Studio / Fabrication Lab Name"
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    Additive Manufacturing Specification & Quotation
                  </p>
                </div>
                <div className="sm:text-right font-mono text-xs text-zinc-400 space-y-0.5">
                  <p>
                    <span className="font-semibold text-zinc-300">Quote Date:</span>{' '}
                    {new Date().toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-300">Tech:</span>{' '}
                    {state.tech} ({state.presetKey})
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-300">Duration:</span>{' '}
                    {state.printHours}h {state.printMinutes}m
                  </p>
                </div>
              </div>

              {/* Client & Part Reference */}
              <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Project & Client Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">Client Reference</span>
                    <input
                      type="text"
                      value={state.clientName}
                      onChange={(e) => setState((s) => ({ ...s, clientName: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block mb-1">Part Net Weight / Vol</span>
                    <p className="text-xs font-mono font-medium text-zinc-200 pt-1">
                      {state.consumption} {unitLabel} ({state.presetKey} Resin/Filament)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quote Representation: Detailed vs Simple */}
              {state.quoteMode === 'detailed' ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Itemized Bill of Materials & Processing
                  </h4>
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                        <th className="py-2 font-medium">Line Item Description</th>
                        <th className="py-2 font-medium text-right">Cost Component</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      <tr>
                        <td className="py-2 text-zinc-300">
                          Raw Material Feedstock ({state.consumption} {unitLabel} @ {fmt(state.spoolCost)} / {state.spoolCapacity}{unitLabel})
                        </td>
                        <td className="py-2 text-right text-zinc-200">{fmt(calc.materialCost)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-300">
                          Active Power & Utility Run-time ({calc.totalPrintHours.toFixed(2)}h @ {state.printerWattage}W)
                        </td>
                        <td className="py-2 text-right text-zinc-200">{fmt(calc.electricityCost)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-300">
                          Operator Labor: Prep & Post-processing ({(calc.totalLaborHours * 60).toFixed(0)} min)
                        </td>
                        <td className="py-2 text-right text-zinc-200">{fmt(calc.laborCost)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-300">
                          Hardware Depr. & Preventive Maintenance Reserve
                        </td>
                        <td className="py-2 text-right text-zinc-200">{fmt(calc.depreciationCost)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-300">
                          Scrap & Failure Risk Allowance ({state.failureRiskPct}%)
                        </td>
                        <td className="py-2 text-right text-zinc-200">{fmt(calc.failureBuffer)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-300">
                          Commercial Service Margin ({state.pricingModel === 'markup' ? 'Markup' : 'Target Margin'} @ {state.profitRatePct}%)
                        </td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">
                          +{fmt(calc.grossProfit)}
                        </td>
                      </tr>
                      {state.packagingFees > 0 && (
                        <tr>
                          <td className="py-2 text-zinc-300">Protective Handling & Custom Packaging</td>
                          <td className="py-2 text-right text-zinc-200">{fmt(state.packagingFees)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">
                      Precision 3D Fabrication Service ({state.tech} - {state.presetKey})
                    </span>
                    <span className="font-mono text-zinc-100">{fmt(calc.subtotalPrice)}</span>
                  </div>
                  {state.packagingFees > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Packaging & Desiccant Encapsulation</span>
                      <span className="font-mono text-zinc-300">{fmt(state.packagingFees)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fiscal Calculation & Final Balance */}
              <div className="pt-4 border-t border-zinc-800 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal Pre-Tax:</span>
                  <span>{fmt(calc.pricePreTax)}</span>
                </div>
                {state.taxRatePct > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Applicable Tax ({state.taxRatePct}%):</span>
                    <span>{fmt(calc.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                  <span className="text-cyan-400">Total Quotation Value:</span>
                  <span className="text-cyan-400">{fmt(calc.finalClientQuote)}</span>
                </div>
              </div>

              {/* Quote Terms & Footer */}
              <div className="pt-4 border-t border-zinc-800/80">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Terms of Service & Warranty
                </span>
                <textarea
                  rows={2}
                  value={state.quoteTerms}
                  onChange={(e) => setState((s) => ({ ...s, quoteTerms: e.target.value }))}
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-400 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
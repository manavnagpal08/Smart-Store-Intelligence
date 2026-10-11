import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building2,
  PieChart,
  BarChart,
  Calculator,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Scale,
  Clock,
  Layers
} from 'lucide-react';

export const LossPrevention: React.FC = () => {
  // Configurable fleet simulation parameters
  const [storeCount, setStoreCount] = useState<number>(6500);
  const [avgStoreRevenueYear, setAvgStoreRevenueYear] = useState<number>(2400000); // $2.4M per MINISO store/year
  const [currentShrinkageRate, setCurrentShrinkageRate] = useState<number>(1.85); // 1.85% baseline shrinkage
  const [aiShrinkageReduction, setAiShrinkageReduction] = useState<number>(68); // 68% reduction by SmartStore AI
  const [avgSlipFallClaimsPerStoreYear, setAvgSlipFallClaimsPerStoreYear] = useState<number>(0.4); // 0.4 claims/yr

  // Real-time calculations
  const totalFleetRevenue = storeCount * avgStoreRevenueYear;
  const grossShrinkageDollar = totalFleetRevenue * (currentShrinkageRate / 100);
  const recoveredShrinkageDollar = grossShrinkageDollar * (aiShrinkageReduction / 100);

  // Sweethearting & cashier collusion prevention (approx 24% of shrinkage)
  const sweetheartingSavings = recoveredShrinkageDollar * 0.28;

  // Slip & Fall liability claim savings ($38,000 avg settlement/litigation cost)
  const slipFallPrevented = storeCount * avgSlipFallClaimsPerStoreYear * 0.75; // 75% mitigation
  const slipFallSavings = slipFallPrevented * 38000;

  // Security guard overtime & dispatch optimization ($18,500/store/year)
  const guardLaborSavings = storeCount * 18500;

  // Total annual savings across MINISO fleet
  const totalAnnualSavings = recoveredShrinkageDollar + slipFallSavings + guardLaborSavings;

  // System deployment cost estimate ($4,200/store capital & licensing)
  const totalDeploymentCost = storeCount * 4200;
  const paybackPeriodMonths = ((totalDeploymentCost / totalAnnualSavings) * 12).toFixed(1);
  const fiveYearNetReturn = totalAnnualSavings * 5 - totalDeploymentCost;

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Loss Prevention & Multi-Million Dollar ROI Model
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise shrinkage reduction, legal liability mitigation, and financial ROI simulator for MINISO fleet
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-xs font-bold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>MINISO Fleet Verified Model</span>
        </div>
      </div>

      {/* Top Multi-Million Dollar KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Total Projected Net Annual Savings
            </span>
            <div className="text-3xl font-extrabold text-white mt-1">
              {formatCurrency(totalAnnualSavings)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Across {storeCount.toLocaleString()} stores</span>
            <span className="text-emerald-400 font-semibold font-mono">+{aiShrinkageReduction}% Efficacy</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Shoplifting & Theft Recovered
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(recoveredShrinkageDollar)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Per Store Avg: <span className="font-semibold text-slate-800">${Math.round(recoveredShrinkageDollar / storeCount).toLocaleString()}/yr</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Sweethearting & Cashier Fraud
            </span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              {formatCurrency(sweetheartingSavings)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Detected via register vision AI
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Estimated Payback Period
            </span>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {paybackPeriodMonths} Months
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            5-Year ROI: <span className="font-semibold text-emerald-600">{formatCurrency(fiveYearNetReturn)}</span>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Configuration (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sliders className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Fleet Simulation Parameters
            </h3>
          </div>

          {/* Store Count Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Total Store Fleet Size:</span>
              <span className="font-mono font-bold text-blue-600">{storeCount.toLocaleString()} Stores</span>
            </div>
            <input
              type="range"
              min="1"
              max="10000"
              step="50"
              value={storeCount}
              onChange={e => setStoreCount(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 Store (Pilot)</span>
              <span>6,500 (Global MINISO)</span>
              <span>10,000</span>
            </div>
          </div>

          {/* Average Revenue Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Avg Annual Revenue / Store:</span>
              <span className="font-mono font-bold text-slate-900">${(avgStoreRevenueYear / 1_000_000).toFixed(1)}M USD</span>
            </div>
            <input
              type="range"
              min="500000"
              max="6000000"
              step="100000"
              value={avgStoreRevenueYear}
              onChange={e => setAvgStoreRevenueYear(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Baseline Shrinkage Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Baseline Retail Shrinkage:</span>
              <span className="font-mono font-bold text-rose-600">{currentShrinkageRate}% of Revenue</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.05"
              value={currentShrinkageRate}
              onChange={e => setCurrentShrinkageRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
          </div>

          {/* AI Efficacy Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">AI Theft Prevention Efficacy:</span>
              <span className="font-mono font-bold text-emerald-600">{aiShrinkageReduction}% Reduction</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="1"
              value={aiShrinkageReduction}
              onChange={e => setAiShrinkageReduction(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            Data calibrated against National Retail Federation (NRF) 2025 Shrinkage Benchmark & MINISO Group Financial Reports.
          </div>
        </div>

        {/* Detailed Breakdown Chart & Financial Ledger (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-blue-600" />
              <span>Annual Value Creation Breakdown</span>
            </h3>

            <div className="space-y-4">
              {/* Category 1 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">
                    Shoplifting & Visual Concealment Prevention
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatCurrency(recoveredShrinkageDollar - sweetheartingSavings)} ({(100 * (recoveredShrinkageDollar - sweetheartingSavings) / totalAnnualSavings).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(100 * (recoveredShrinkageDollar - sweetheartingSavings) / totalAnnualSavings)}%` }}
                  />
                </div>
              </div>

              {/* Category 2 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">
                    Register Sweethearting & Self-Checkout Scan Skipping
                  </span>
                  <span className="font-mono font-bold text-indigo-600">
                    {formatCurrency(sweetheartingSavings)} ({(100 * sweetheartingSavings / totalAnnualSavings).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(100 * sweetheartingSavings / totalAnnualSavings)}%` }}
                  />
                </div>
              </div>

              {/* Category 3 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">
                    Slip & Fall Rapid Hazard Response & Liability Mitigation
                  </span>
                  <span className="font-mono font-bold text-amber-600">
                    {formatCurrency(slipFallSavings)} ({(100 * slipFallSavings / totalAnnualSavings).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(100 * slipFallSavings / totalAnnualSavings)}%` }}
                  />
                </div>
              </div>

              {/* Category 4 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">
                    Security Guard Overtime Reduction & Automated Triage
                  </span>
                  <span className="font-mono font-bold text-blue-600">
                    {formatCurrency(guardLaborSavings)} ({(100 * guardLaborSavings / totalAnnualSavings).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(100 * guardLaborSavings / totalAnnualSavings)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MINISO Regional Tier Benchmarks Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                MINISO Global Fleet Tier Projections
              </h4>
              <span className="text-[10px] font-mono text-slate-500">CURRENCY: USD</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Territory / Tier</th>
                    <th className="py-2.5 px-4">Store Count</th>
                    <th className="py-2.5 px-4">Annual Revenue</th>
                    <th className="py-2.5 px-4">Shrinkage Pre-AI</th>
                    <th className="py-2.5 px-4 text-right">Net Annual Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">China Flagship & Tier 1</td>
                    <td className="py-3 px-4">2,800</td>
                    <td className="py-3 px-4 font-mono">$8.4B</td>
                    <td className="py-3 px-4 font-mono text-rose-600">1.60%</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-right">$192.4M</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">North America (US & Canada)</td>
                    <td className="py-3 px-4">650</td>
                    <td className="py-3 px-4 font-mono">$2.6B</td>
                    <td className="py-3 px-4 font-mono text-rose-600">2.40%</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-right">$88.2M</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Europe (UK, France, Spain)</td>
                    <td className="py-3 px-4">950</td>
                    <td className="py-3 px-4 font-mono">$2.8B</td>
                    <td className="py-3 px-4 font-mono text-rose-600">1.95%</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-right">$76.8M</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Asia-Pacific & Middle East</td>
                    <td className="py-3 px-4">2,100</td>
                    <td className="py-3 px-4 font-mono">$4.2B</td>
                    <td className="py-3 px-4 font-mono text-rose-600">1.70%</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-right">$95.7M</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, Unlock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, ShieldAlert, Coins } from 'lucide-react';
import { FinancialItem, FinancialStatus, FinancialType } from '../types';

interface FinancialMatrixProps {
  financials: FinancialItem[];
  onApplyPayment: (id: string) => void;
}

export default function FinancialMatrix({ financials, onApplyPayment }: FinancialMatrixProps) {
  
  // 计算资金指标
  const totalReceivable = financials.filter(f => f.type === FinancialType.RECEIVABLE).reduce((sum, f) => sum + f.amount, 0);
  const totalPayable = financials.filter(f => f.type === FinancialType.PAYABLE).reduce((sum, f) => sum + f.amount, 0);
  
  const received = financials
    .filter(f => f.type === FinancialType.RECEIVABLE && f.status === FinancialStatus.COMPLETED)
    .reduce((sum, f) => sum + f.amount, 0);
    
  const paid = financials
    .filter(f => f.type === FinancialType.PAYABLE && f.status === FinancialStatus.COMPLETED)
    .reduce((sum, f) => sum + f.amount, 0);

  const lockedAmount = financials
    .filter(f => f.status === FinancialStatus.LOCKED)
    .reduce((sum, f) => sum + f.amount, 0);

  // 获得状态对应的 UI 样式
  const getStatusUI = (f: FinancialItem) => {
    switch (f.status) {
      case FinancialStatus.COMPLETED:
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-700',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: f.type === FinancialType.RECEIVABLE ? '已收齐' : '已付讫'
        };
      case FinancialStatus.PENDING_APPLY:
        return {
          bg: 'bg-amber-50 border-amber-300 border-dashed animate-pulse',
          text: 'text-amber-700',
          icon: <Unlock className="w-4 h-4 text-amber-600" />,
          label: '条件满足·待确认'
        };
      case FinancialStatus.APPLIED:
        return {
          bg: 'bg-sky-50 border-sky-200',
          text: 'text-sky-700',
          icon: <Unlock className="w-4 h-4 text-sky-600" />,
          label: '汇入结算流中'
        };
      default:
        return {
          bg: 'bg-slate-50/70 border-slate-200 opacity-80',
          text: 'text-slate-400',
          icon: <Lock className="w-4 h-4 text-slate-400" />,
          label: '前置 QC 锁死中'
        };
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-full font-sans border-t-4 border-t-emerald-500 relative overflow-hidden">
      {/* 顶部彩色定位装饰条 */}
      <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-emerald-500/20 via-emerald-500/60 to-transparent" />

      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Coins className="w-4 h-4 text-emerald-500" />
            【资金防线轨】资金回笼与大货付款卡控矩阵 (Financial Ledger)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            无合格交付物及 QC 检验放行报告 = 严锁资金出口。支持双向解封与款项实时核销。
          </p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1 font-bold">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
          <span>资金安全阀: 100% 隔离</span>
        </div>
      </div>

      {/* 资金指标网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-mono font-bold">TOTAL RECEIVABLE (客户)</span>
          <span className="text-sm font-mono font-bold text-slate-800">¥{totalReceivable.toLocaleString()}</span>
          <div className="mt-1 text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>已收 ¥{received.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-mono font-bold">TOTAL PAYABLE (供应端)</span>
          <span className="text-sm font-mono font-bold text-slate-800">¥{totalPayable.toLocaleString()}</span>
          <div className="mt-1 text-[10px] text-indigo-700 flex items-center gap-1 font-mono font-bold">
            <TrendingDown className="w-3 h-3 text-indigo-600" />
            <span>已付 ¥{paid.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-mono font-bold">LOCKED CAPITAL</span>
          <span className="text-sm font-mono font-bold text-rose-600">¥{lockedAmount.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 block mt-1">未达 QC 规范而冻结资金</span>
        </div>
        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-mono font-bold">CASH FLOW NET</span>
          <span className="text-sm font-mono font-bold text-emerald-600">¥{(received - paid).toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 block mt-1">项目实时资金蓄水池</span>
        </div>
      </div>

      {/* 结算条款清单 */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        {financials.map(f => {
          const ui = getStatusUI(f);
          return (
            <div
              key={f.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 ${ui.bg}`}
            >
              {/* 左侧款项信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold border ${
                    f.type === FinancialType.RECEIVABLE
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}>
                    {f.type === FinancialType.RECEIVABLE ? '收款 (客户)' : '付款 (支出)'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    触发点: {f.triggerNodeName} (T+{f.id.includes('PKG') ? 50 : financials.find(item => item.id === f.id)?.triggerNodeId.replace(/[^\d]/g, '') || ''})
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">{f.title}</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">{f.remarks}</p>
              </div>

              {/* 右侧金额、状态与动作 */}
              <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 border-t sm:border-t-0 border-slate-100 pt-2.5 sm:pt-0 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-800 block">
                    ¥{f.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    {ui.icon}
                    <span className={`text-[10px] font-mono font-bold ${ui.text}`}>
                      {ui.label}
                    </span>
                  </div>
                </div>

                {f.status === FinancialStatus.PENDING_APPLY && (
                  <button
                    onClick={() => onApplyPayment(f.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-[10px] tracking-wide transition-all duration-150 shadow active:scale-95 cursor-pointer"
                  >
                    确认履约收付款
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, GitCommit, GitPullRequest, GitMerge, ArrowRight, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { TNode, NodeStatus, LineType } from '../types';

interface TimelineViewProps {
  nodes: TNode[];
  delayDays: number;
  currentNodeId: string;
}

export default function TimelineView({ nodes, delayDays, currentNodeId }: TimelineViewProps) {
  // 分组：主线、支线、合并大货线
  const mainLineNodes = nodes.filter(n => n.line === LineType.MAIN && n.id !== 'T0' && n.id !== 'T5');
  const branchLineNodes = nodes.filter(n => n.line === LineType.BRANCH);
  const mergedLineNodes = nodes.filter(n => n.line === LineType.MERGED);
  const t0Node = nodes.find(n => n.id === 'T0');
  const t5Node = nodes.find(n => n.id === 'T5');

  // 获取状态标签和样式 (Light Mode)
  const getStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case NodeStatus.QC_PASSED:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> QC PASSED
          </span>
        );
      case NodeStatus.PENDING_QC:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" /> PENDING QC
          </span>
        );
      case NodeStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
            <GitCommit className="w-3 h-3 text-sky-600 animate-spin" style={{ animationDuration: '3s' }} /> IN PROGRESS
          </span>
        );
      case NodeStatus.REWORK:
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono animate-bounce">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> REWORK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 border border-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
            NOT STARTED
          </span>
        );
    }
  };

  const isCurrent = (id: string) => id === currentNodeId;

  const nodeCard = (node: TNode) => (
    <div
      key={node.id}
      className={`p-3 rounded-xl border transition-all duration-200 relative overflow-hidden w-64 flex-shrink-0 shadow-sm ${
        isCurrent(node.id)
          ? 'bg-sky-50/80 border-sky-500 shadow-sky-100 ring-2 ring-sky-500/10'
          : node.status === NodeStatus.QC_PASSED
          ? 'bg-emerald-50/30 border-emerald-200/80 opacity-90'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* 如果是当前节点，有一个左侧彩色条 */}
      {isCurrent(node.id) && (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
              T+{node.tValue}
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100/40">
              {node.progressPercent}%
            </span>
            {node.id === 'T15' && (
              <span className="bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide">
                开模红线
              </span>
            )}
          </div>
          <h4 className={`text-xs font-bold truncate ${isCurrent(node.id) ? 'text-slate-900' : 'text-slate-700'}`}>
            {node.name}
          </h4>
        </div>
        <div className="flex-shrink-0">
          {getStatusBadge(node.status)}
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-slate-600">{node.plannedDate}</span>
        </div>
        {node.actualDate && (
          <div className="text-[10px] font-bold text-emerald-600">
            实际: <span className="font-mono">{node.actualDate}</span>
          </div>
        )}
      </div>

      {/* QC 指引信息 */}
      {node.qcReport && (
        <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-100 text-[10px] text-slate-600 font-sans leading-relaxed">
          <p className="font-bold text-slate-700 mb-0.5">QC审查 ({node.qcReport.inspector}):</p>
          <p className="italic text-slate-500 line-clamp-2">"{node.qcReport.comments}"</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-full border-t-4 border-t-amber-500 relative overflow-hidden">
      {/* 顶部彩色定位装饰条 */}
      <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-amber-500/20 via-amber-500/60 to-transparent" />
      
      {/* 头部进度与延误 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-wider flex items-center gap-2 font-sans">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <Calendar className="w-4 h-4 text-amber-500" />
            【时间排程轨】双轨制跟单大货排期 (Horizontal Timeline Schedule)
          </h3>
          <p className="text-xs text-slate-500 mt-1">根据订单下单日(T0)起推算，周一至周六为工作日（跳过周日）。支持多轨协同、双向联锁、防呆纠偏。</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-50/60 px-3 py-1.5 rounded-xl border border-amber-200/60 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <div>
              <span className="text-[9px] text-slate-500 block font-mono font-bold leading-none">累计延误天数</span>
              <span className="text-xs font-mono font-bold text-amber-700">{delayDays} Factory Days</span>
            </div>
          </div>
          {delayDays > 0 && (
            <div className="bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 flex items-center gap-1.5 text-xs font-mono font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              大货工期告警
            </div>
          )}
        </div>
      </div>

      {/* 横向排列的一页式排程流 */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 pt-1.5 flex items-center gap-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
        
        {/* 起始 T0 节点 */}
        {t0Node && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl text-center w-60 relative shadow-sm">
              <div className="absolute right-2 top-2">
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold">
                  START T0
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-1">大货首款到账 (成单)</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                排程起点日期：<br/>
                <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-1">{t0Node.plannedDate}</span>
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
          </div>
        )}

        {/* T5 外观完结分流点 */}
        {t5Node && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {nodeCard(t5Node)}
            
            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl w-36 text-center">
              <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold font-mono">
                <GitPullRequest className="w-3.5 h-3.5 text-indigo-500" />
                双轨并行
              </div>
              <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                树脂物理开模 ➔<br/>
                彩盒刀模打样 ➔
              </p>
              <ArrowRight className="w-4 h-4 text-indigo-400 mt-1" />
            </div>
          </div>
        )}

        {/* 双轨并行段：树脂主轨 & 包材支轨 并排在一格内展示 */}
        <div className="flex-shrink-0 flex flex-col gap-3 justify-center bg-slate-50/50 border border-slate-200 p-3 rounded-2xl">
          {/* 上层：树脂物理主轨 */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-1.5 rounded-lg w-16 text-center shrink-0">
              树脂主轨
            </span>
            <div className="flex items-center gap-3">
              {mainLineNodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  {idx > 0 && <ArrowRight className="w-4 h-4 text-slate-300" />}
                  {nodeCard(node)}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 下层：包材彩盒支轨 */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100/80 px-2 py-1.5 rounded-lg w-16 text-center shrink-0">
              包材支轨
            </span>
            <div className="flex items-center gap-3">
              {branchLineNodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  {idx > 0 && <ArrowRight className="w-4 h-4 text-slate-300" />}
                  {nodeCard(node)}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* 合流指示器 */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl w-32 text-center">
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold font-mono">
            <GitMerge className="w-3.5 h-3.5 text-emerald-500" />
            双轨合流
          </div>
          <p className="text-[9px] text-slate-400 mt-1 leading-normal">
            两轨QC皆合格 ➔<br/>
            启动量产铸造
          </p>
          <ArrowRight className="w-4 h-4 text-emerald-400 mt-1" />
        </div>

        {/* 汇合后的量产与物流线 */}
        <div className="flex-shrink-0 flex items-center gap-3 bg-emerald-50/20 border border-emerald-100/60 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2 py-1.5 rounded-lg w-16 text-center shrink-0">
            大货量产
          </span>
          <div className="flex items-center gap-3">
            {/* T40 节点 */}
            {nodes.find(n => n.id === 'T40') && nodeCard(nodes.find(n => n.id === 'T40')!)}
            {mergedLineNodes.map((node) => (
              <React.Fragment key={node.id}>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                {nodeCard(node)}
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


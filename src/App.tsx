/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bot, ShieldAlert, Layers, ShieldCheck, Activity, HelpCircle, FileText, RefreshCw, Sparkles, LogOut, Terminal, Coins, BookOpen, History, AlertCircle, Play, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { NodeStatus, LineType, FinancialStatus, FinancialType, TNode, FinancialItem, DFMRecord, FulfillmentLog, LogType, AgentOSState } from './types';
import { getInitialState } from './initialData';
import { addFactoryWorkdays, getTodayDateStr } from './utils';

// 导入提取的组件
import TimelineView from './components/TimelineView';
import FinancialMatrix from './components/FinancialMatrix';
import DFMKnowledgeBase from './components/DFMKnowledgeBase';
import ControlPanel from './components/ControlPanel';
import AgentChat from './components/AgentChat';

export default function App() {
  const t0Date = getTodayDateStr();
  const [state, setState] = useState<AgentOSState>(() => getInitialState(t0Date));
  const [activeTab, setActiveTab] = useState<'workbench' | 'finance' | 'dfm' | 'audit'>('workbench');
  
  // 自检测 API 是否可用
  const [apiHealth, setApiHealth] = useState({ status: 'offline', aiEnabled: false });
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setApiHealth({ status: data.status, aiEnabled: data.aiEnabled });
      })
      .catch(() => {
        setApiHealth({ status: 'offline', aiEnabled: false });
      });
  }, []);

  // 1. 添加履约系统日志
  const handleAddLog = (type: LogType, message: string, nodeName?: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullTime = `${new Date().toISOString().split('T')[0]} ${timestamp}`;
    const newLog: FulfillmentLog = {
      id: `LOG_${Date.now()}`,
      timestamp: fullTime,
      type,
      message,
      nodeName
    };
    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs]
    }));
  };

  // 2. 模拟上传交付物
  const handleUploadDeliverable = (nodeId: string, type: 'FILE' | 'PHOTO') => {
    const fileName = type === 'FILE' ? `${nodeId}_3D_Structure_v2.stp` : `${nodeId}_Physical_Sample_First.jpg`;
    
    setState(prev => {
      const updatedNodes = prev.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: NodeStatus.PENDING_QC,
            deliverables: {
              fileName,
              fileUrl: '#',
              mediaName: type === 'PHOTO' ? fileName : undefined,
              mediaUrl: '#'
            }
          };
        }
        return n;
      });

      return {
        ...prev,
        nodes: updatedNodes
      };
    });

    const targetNode = state.nodes.find(n => n.id === nodeId);
    handleAddLog(
      LogType.SYSTEM,
      `【供应链上传】交付物 [${fileName}] 已成功上传挂载。触发 [${targetNode?.name}] 进入跟单 OS 待审查状态。`,
      targetNode?.name
    );
  };

  // 3. QC 通过
  const handleQCPass = (nodeId: string, comments: string, inspector: string) => {
    setState(prev => {
      const updatedNodes = prev.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: NodeStatus.QC_PASSED,
            actualDate: getTodayDateStr(),
            qcReport: {
              result: 'PASS' as const,
              inspector,
              comments,
              checkDate: getTodayDateStr()
            }
          };
        }
        return n;
      });

      // 寻找下一个节点，设为进行中
      let nextNodeId = prev.currentNodeId;
      const sortedNodes = [...updatedNodes].sort((a, b) => a.tValue - b.tValue);
      const currentIdx = sortedNodes.findIndex(n => n.id === nodeId);
      
      // 如果当前是 T5，需要将 T8 (主线) 和 T30_BRANCH (支线) 同时激活进行中
      if (nodeId === 'T5') {
        updatedNodes.forEach(n => {
          if (n.id === 'T8' || n.id === 'T30_BRANCH') {
            n.status = NodeStatus.IN_PROGRESS;
          }
        });
        nextNodeId = 'T8'; // 主线继续移动
      } else {
        const nextNode = sortedNodes[currentIdx + 1];
        if (nextNode) {
          updatedNodes.forEach(n => {
            if (n.id === nextNode.id && n.status === NodeStatus.NOT_STARTED) {
              n.status = NodeStatus.IN_PROGRESS;
            }
          });
          nextNodeId = nextNode.id;
        }
      }

      // 财务卡控联动解除锁死
      const updatedFinancials = prev.financials.map(f => {
        if (f.triggerNodeId === nodeId && f.status === FinancialStatus.LOCKED) {
          return {
            ...f,
            status: FinancialStatus.PENDING_APPLY
          };
        }
        return f;
      });

      return {
        ...prev,
        currentNodeId: nextNodeId,
        nodes: updatedNodes,
        financials: updatedFinancials
      };
    });

    const targetNode = state.nodes.find(n => n.id === nodeId);
    handleAddLog(
      LogType.QC,
      `【QC放行成功】节点 [${targetNode?.name}] 经由 ${inspector} 校验合格，顺利通过大货工艺卡口。财务资金解卡已就位。`,
      targetNode?.name
    );
  };

  // 4. QC 打回 (返工)
  const handleQCRework = (nodeId: string, comments: string, delayDays: number, tags: string[]) => {
    const recordId = `DFM_${Date.now().toString().slice(-3)}`;
    const targetNode = state.nodes.find(n => n.id === nodeId);

    const newDFM: DFMRecord = {
      id: recordId,
      nodeId,
      nodeName: targetNode?.name || nodeId,
      tags,
      description: comments,
      reworkAdvice: `跟单 Agent 强制返工要求：重新对红蜡表面打磨及合模面偏差进行重测，要求公差在 ±0.15mm 以内。并在大样边缘增加排气流道。`,
      createdAt: getTodayDateStr()
    };

    setState(prev => {
      // 当前节点置为 REWORK 状态
      const updatedNodes = prev.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: NodeStatus.REWORK
          };
        }
        return n;
      });

      // 触发后续未完成节点的计划日期向后顺延 delayDays 天
      const sortedNodes = [...updatedNodes].sort((a, b) => a.tValue - b.tValue);
      const currentIdx = sortedNodes.findIndex(n => n.id === nodeId);

      const delayedNodes = updatedNodes.map((n, idx) => {
        // 如果是该节点之后未完工的节点，整体向后加 delayDays
        if (n.status !== NodeStatus.QC_PASSED && n.id !== 'T0' && n.id !== nodeId) {
          return {
            ...n,
            plannedDate: addFactoryWorkdays(n.plannedDate, delayDays)
          };
        }
        return n;
      });

      return {
        ...prev,
        nodes: delayedNodes,
        delayDays: prev.delayDays + delayDays,
        dfmKnowledge: [newDFM, ...prev.dfmKnowledge]
      };
    });

    handleAddLog(
      LogType.WARNING,
      `⚠️【QC打回警告】节点 [${targetNode?.name}] 质量检测未通过，强制进入返工。
触发保质顺延：后续节点及大货最终交付日整体向后推迟 ${delayDays} 个工厂工作日。提取特征沉淀到 DFM 缺陷库 (ID: ${recordId})。`,
      targetNode?.name
    );
  };

  // 5. 不可逆点强行回滚
  const handleRollback = (
    targetNodeId: string,
    responsibility: 'CLIENT' | 'INTERNAL' | 'FACTORY',
    costEstimate: number,
    reason: string
  ) => {
    const targetNode = state.nodes.find(n => n.id === targetNodeId);
    const originNode = state.nodes.find(n => n.id === state.currentNodeId);

    setState(prev => {
      // 1. 回滚节点状态重置
      const updatedNodes = prev.nodes.map(n => {
        // 大于等于目标节点且小于当前节点的进行状态重置
        const isTarget = n.id === targetNodeId;
        const isSubsequent = n.tValue > (targetNode?.tValue || 0);

        if (isTarget) {
          return {
            ...n,
            status: NodeStatus.IN_PROGRESS,
            actualDate: undefined,
            qcReport: undefined
          };
        } else if (isSubsequent) {
          return {
            ...n,
            status: NodeStatus.NOT_STARTED,
            actualDate: undefined,
            deliverables: undefined,
            qcReport: undefined
          };
        }
        return n;
      });

      // 2. 财务逆向重新锁死
      const updatedFinancials = prev.financials.map(f => {
        const itemTriggerNode = prev.nodes.find(n => n.id === f.triggerNodeId);
        // 如果触发付款的节点在回滚链中，重新锁死为 LOCKED
        if (itemTriggerNode && itemTriggerNode.tValue >= (targetNode?.tValue || 0) && f.triggerNodeId !== 'T0') {
          return {
            ...f,
            status: FinancialStatus.LOCKED
          };
        }
        return f;
      });

      // 3. 记录回滚历史
      const rollbackAct = {
        targetNodeId,
        sourceNodeId: prev.currentNodeId,
        responsibility,
        costEstimate,
        reason,
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        currentNodeId: targetNodeId,
        nodes: updatedNodes,
        financials: updatedFinancials,
        rollbackHistory: [rollbackAct, ...prev.rollbackHistory]
      };
    });

    // 写入日志
    if (costEstimate > 0) {
      handleAddLog(
        LogType.HIGH_RISK,
        `🚨【高危回滚执行】已强行在硅胶模具制成后向逆推至 [${targetNode?.name}] 进行重改！
定责归属：【${responsibility === 'CLIENT' ? '客户责任' : responsibility === 'INTERNAL' ? '设计责任' : '车间/产能方'}】。
实物报废损失核销：¥${costEstimate.toLocaleString()}。系统已逆向重新锁死后续所有关联解卡财务。`,
        originNode?.name
      );
    } else {
      handleAddLog(
        LogType.SYSTEM,
        `【常规工法优化】开模前节点回退：项目退回到 [${targetNode?.name}] 重写 3D 设计细节。尚未造成模具报废物理损失。`,
        originNode?.name
      );
    }
  };

  // 6. 确认收付款
  const handleApplyPayment = (id: string) => {
    setState(prev => {
      const updatedFinancials = prev.financials.map(f => {
        if (f.id === id) {
          return {
            ...f,
            status: FinancialStatus.COMPLETED,
            updateTime: getTodayDateStr()
          };
        }
        return f;
      });
      return {
        ...prev,
        financials: updatedFinancials
      };
    });

    const item = state.financials.find(f => f.id === id);
    handleAddLog(
      LogType.FINANCE,
      `【财务清算凭证】资金流水已放行：[${item?.title}] 成功结算完成。款项：¥${item?.amount.toLocaleString()} 归宿已核对。`
    );
  };

  // 6.5. 修改订单下单日并自动双轨排程
  const handleT0DateChange = (newT0Date: string) => {
    if (!newT0Date) return;
    
    setState(prev => {
      // 重新推算所有节点的日期
      const updatedNodes = prev.nodes.map(n => {
        // T0 本身就等于 newT0Date
        if (n.id === 'T0') {
          return {
            ...n,
            plannedDate: newT0Date,
            actualDate: n.actualDate ? newT0Date : undefined
          };
        }
        
        // 算出基础标准 T+X 的工作日
        let baseTValue = n.tValue;
        if (n.id === 'T30_BRANCH') baseTValue = 12; // 支线标准
        if (n.id === 'T35_BRANCH') baseTValue = 18; // 支线标准

        let pDate = addFactoryWorkdays(newT0Date, baseTValue);
        // 如果节点还未 QC_PASSED，且有累积延误，则累加
        if (n.status !== NodeStatus.QC_PASSED && prev.delayDays > 0) {
          pDate = addFactoryWorkdays(pDate, prev.delayDays);
        }

        return {
          ...n,
          plannedDate: pDate,
          actualDate: n.actualDate ? addFactoryWorkdays(newT0Date, baseTValue) : undefined
        };
      });

      // 同时重设 F_T0 财务条目的更新日期
      const updatedFinancials = prev.financials.map(f => {
        if (f.id === 'F_T0') {
          return {
            ...f,
            updateTime: newT0Date
          };
        }
        return f;
      });

      return {
        ...prev,
        t0Date: newT0Date,
        nodes: updatedNodes,
        financials: updatedFinancials
      };
    });

    handleAddLog(
      LogType.SYSTEM,
      `【下单日调整】用户重设定了 [大货订单下单日 (T0)] 为 ${newT0Date}。系统已按【周一至周六工厂工作日（跳过周日）】重推后续全部工期节点。`
    );
  };

  // 7. 处理来自跟单 Agent 的 AI 决策指令
  const handleAgentTriggerAction = (actionData: any) => {
    const { action, nodeId, comments, delayDays, rollbackResponsibility, rollbackCost } = actionData;
    
    if (action === 'QC_PASS') {
      handleQCPass(nodeId, comments || 'AI Agent 跟单审查通过。', 'Fulfillment Agent AI');
    } else if (action === 'REWORK') {
      handleQCRework(nodeId, comments || 'AI Agent 审查未通过，要求返工。', delayDays || 3, ['尺寸公差偏离', '手办拼装干涉']);
    } else if (action === 'ROLLBACK') {
      handleRollback(nodeId, rollbackResponsibility || 'CLIENT', rollbackCost || 0, comments || 'AI Agent 判定不可逆高危回滚。');
    } else if (action === 'FINANCE_APPLY') {
      // 激活满足条件的款项
      const targetFin = state.financials.find(f => f.triggerNodeId === nodeId && f.status === FinancialStatus.PENDING_APPLY);
      if (targetFin) {
        handleApplyPayment(targetFin.id);
      }
    }
  };

  // 计算全局头部指标
  const activeNode = state.nodes.find(n => n.id === state.currentNodeId) || state.nodes[0];
  const totalDfm = state.dfmKnowledge.length;
  
  const clientPaid = state.financials
    .filter(f => f.type === FinancialType.RECEIVABLE && f.status === FinancialStatus.COMPLETED)
    .reduce((sum, f) => sum + f.amount, 0);

  const factoryPaid = state.financials
    .filter(f => f.type === FinancialType.PAYABLE && f.status === FinancialStatus.COMPLETED)
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-sky-100 selection:text-sky-800">
      {/* 顶部超酷大货履约 OS Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-wider uppercase font-sans">树脂大货履约跟单 Agent OS</h1>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wide animate-pulse">
                PROD RUNTIME
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">面向 1/4 & 1/6 收藏级雕像工艺线·时间-质量-资金三重联锁引擎</p>
          </div>
        </div>

        {/* 顶部中央核心指标 */}
        <div className="hidden lg:flex items-center gap-6 text-xs">
          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-400 block font-mono font-bold">CURRENT T-NODE</span>
            <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Activity className="w-3.5 h-3.5 text-sky-500" />
              {activeNode.name} (T+{activeNode.tValue})
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-400 block font-mono font-bold">CLIENT DEPOSITS</span>
            <span className="font-mono font-bold text-emerald-600 mt-0.5 block">
              ¥{clientPaid.toLocaleString()} <span className="text-[9px] text-slate-400">已到账</span>
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-400 block font-mono font-bold">SUPPLIER DISBURSEMENTS</span>
            <span className="font-mono font-bold text-indigo-600 mt-0.5 block">
              ¥{factoryPaid.toLocaleString()} <span className="text-[9px] text-slate-400">已代付</span>
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-400 block font-mono font-bold">CUMULATIVE DELAYS</span>
            <span className="font-mono font-bold text-amber-600 mt-0.5 block">
              {state.delayDays} Factory Days
            </span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-400 block font-mono font-bold">DFM KNOWLEDGE</span>
            <span className="font-mono font-bold text-sky-600 mt-0.5 block">
              {totalDfm}工艺红线沉淀
            </span>
          </div>
        </div>

        {/* 右侧微型系统自检指示 */}
        <div className="flex items-center gap-3">
          {/* 订单下单日（T0）自定义选择器 */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-sm">
            <span className="text-slate-500 font-mono text-[10px] uppercase font-bold">大货下单日 (T0):</span>
            <input
              type="date"
              value={state.t0Date}
              onChange={(e) => handleT0DateChange(e.target.value)}
              className="bg-white text-amber-800 font-mono font-bold outline-none border border-slate-300 rounded-lg px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 w-32 cursor-pointer text-[11px]"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-500 font-bold shadow-sm">
            <span className={`w-2 h-2 rounded-full ${apiHealth.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
            <span>AI AGENT: {apiHealth.aiEnabled ? 'GEMINI 3.5' : 'LOCAL ENGINE'}</span>
          </div>
        </div>
      </header>

      {/* 选项卡式高效主菜单导航栏 */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === 'workbench'
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            核心履约工作台 (Fulfillment Workspace)
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === 'finance'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            资金卡控矩阵 (Financial Ledger)
          </button>
          <button
            onClick={() => setActiveTab('dfm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === 'dfm'
                ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            工艺红线缺陷库 (DFM Database)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === 'audit'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            履约事件审计 (Audit & Logs)
          </button>
        </div>

        {/* 动态重要通知标签 */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="text-slate-500 text-[11px] font-sans">
            当前跟单节点: 
            <strong className="text-amber-700 font-mono ml-1.5 font-bold">
              {activeNode.name} {activeNode.status === NodeStatus.PENDING_QC ? '🚨 [待QC检验放行]' : activeNode.status === NodeStatus.REWORK ? '⚠️ [紧急工艺返工中]' : '⚙️ [正常大货流转中]'}
            </strong>
          </span>
        </div>
      </div>

      {/* 核心双栏大货协同舱布局 */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col">
        {activeTab === 'workbench' && (
          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
            {/* 🎯 亮点：当前高优跟单关注卡（Current Action Focus Banner） */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t-4 border-t-indigo-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-indigo-500/20 via-indigo-500/60 to-transparent" />
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl flex items-center justify-center ${
                  activeNode.status === NodeStatus.PENDING_QC
                    ? 'bg-rose-50 text-rose-500 border border-rose-100'
                    : activeNode.status === NodeStatus.REWORK
                    ? 'bg-amber-50 text-amber-500 border border-amber-100'
                    : 'bg-sky-50 text-sky-500 border border-sky-100'
                }`}>
                  {activeNode.status === NodeStatus.PENDING_QC ? (
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  ) : activeNode.status === NodeStatus.REWORK ? (
                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      STEP {activeNode.id}
                    </span>
                    <h2 className="text-sm font-bold text-slate-800 font-sans">
                      当前关注：{activeNode.name}（T+{activeNode.tValue}天）
                    </h2>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      activeNode.status === NodeStatus.PENDING_QC
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : activeNode.status === NodeStatus.REWORK
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : activeNode.status === NodeStatus.QC_PASSED
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {activeNode.status === NodeStatus.PENDING_QC && '🚨 待QC审核放行'}
                      {activeNode.status === NodeStatus.REWORK && '⚠️ 工艺缺陷返工中'}
                      {activeNode.status === NodeStatus.IN_PROGRESS && '⚙️ 生产交付中'}
                      {activeNode.status === NodeStatus.QC_PASSED && '✅ QC已过关'}
                      {activeNode.status === NodeStatus.NOT_STARTED && '⌛ 尚未开始'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-sans mt-1.5 leading-relaxed">
                    {activeNode.status === NodeStatus.PENDING_QC && (
                      <span><strong>💡 AI 跟单建议：</strong> 供应链已上传样品数字包/实物图！请立即在下方右侧的【控制台仿真】栏内审核交付物，判断大样质量。</span>
                    )}
                    {activeNode.status === NodeStatus.REWORK && (
                      <span><strong>💡 AI 跟单建议：</strong> 质量不合格已驳回返工，本次返工将导致后续节点整体推迟 <strong>{state.delayDays}</strong> 工作日，正在等待车间修整后重新上传。</span>
                    )}
                    {activeNode.status === NodeStatus.IN_PROGRESS && (
                      <span><strong>💡 AI 跟单建议：</strong> 当前工艺正在大货流水线进行中，工厂计划于 <strong>{activeNode.plannedDate}</strong> 之前完工，请催促车间在下方上传交付物。</span>
                    )}
                    {activeNode.status === NodeStatus.QC_PASSED && (
                      <span><strong>💡 AI 跟单建议：</strong> 本节点已顺利完成！资金卡控已相应解除，后续关联的收付款项已转换为<strong>[待申请]</strong>，主线项目正自动朝下个阶段流转。</span>
                    )}
                    {activeNode.status === NodeStatus.NOT_STARTED && (
                      <span><strong>💡 AI 跟单建议：</strong> 正在等待前置大货工序校验完成。可在左侧排程日历上双击任意节点，强行将该节点作为当前的全局关注重心。</span>
                    )}
                  </p>
                </div>
              </div>

              {/* 右侧关键路径指引 */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl w-full md:w-auto shadow-sm">
                <div className="text-left font-mono">
                  <span className="text-[9px] text-slate-400 block font-bold">PLANNED TARGET</span>
                  <span className="text-xs text-amber-700 font-bold block">{activeNode.plannedDate}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="text-left font-mono">
                  <span className="text-[9px] text-slate-400 block font-bold">FLOW STATUS</span>
                  <span className="text-xs text-slate-600 block font-bold">{activeNode.line === LineType.MAIN ? '主线雕像工艺' : activeNode.line === LineType.BRANCH ? '包材支线卡位' : '量产汇合主线'}</span>
                </div>
              </div>
            </div>

            {/* 双轨排程日历 */}
            <div className="h-[430px] flex-shrink-0">
              <TimelineView
                nodes={state.nodes}
                delayDays={state.delayDays}
                currentNodeId={state.currentNodeId}
              />
            </div>

            {/* 核心跟单操作和AI决策舱 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-shrink-0">
              {/* 控制台仿真与 QC 质检操作台 */}
              <div className="lg:col-span-6 h-[460px]">
                <ControlPanel
                  nodes={state.nodes}
                  currentNodeId={state.currentNodeId}
                  onUploadDeliverable={handleUploadDeliverable}
                  onQCPass={handleQCPass}
                  onQCRework={handleQCRework}
                  onRollback={handleRollback}
                  onSwitchNode={(id) => setState(prev => ({ ...prev, currentNodeId: id }))}
                />
              </div>

              {/* 顶层：跟单主管对话舱 */}
              <div className="lg:col-span-6 h-[460px]">
                <AgentChat
                  state={state}
                  onTriggerAction={handleAgentTriggerAction}
                  onAddLog={handleAddLog}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
            {/* 资金矩阵核心统计卡 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">大货总款项笔数</span>
                <span className="text-xl font-bold text-slate-800 font-mono mt-1 block">
                  {state.financials.length} <span className="text-xs text-slate-500 font-sans font-bold">个节点挂接款</span>
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">大货首付款 (T0)</span>
                <span className="text-xl font-bold text-amber-700 font-mono mt-1 block">
                  {state.t0Date} <span className="text-xs text-slate-500 font-sans font-bold">已锁定</span>
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">客户定金已核收</span>
                <span className="text-xl font-bold text-emerald-600 font-mono mt-1 block">
                  ¥{clientPaid.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-bold">元已放行</span>
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">供应商代付款项</span>
                <span className="text-xl font-bold text-indigo-600 font-mono mt-1 block">
                  ¥{factoryPaid.toLocaleString()} <span className="text-xs text-slate-500 font-sans font-bold">元已代付</span>
                </span>
              </div>
            </div>

            {/* 结果导向财务矩阵 */}
            <div className="flex-1 h-[520px]">
              <FinancialMatrix
                financials={state.financials}
                onApplyPayment={handleApplyPayment}
              />
            </div>
          </div>
        )}

        {activeTab === 'dfm' && (
          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
            {/* DFM 缺陷指标统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">已提取缺陷特征</span>
                  <span className="text-xl font-bold text-sky-700 font-mono mt-1 block">
                    {totalDfm} 条大货红线
                  </span>
                </div>
                <BookOpen className="w-8 h-8 text-sky-400/30" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">保质顺延天数</span>
                  <span className="text-xl font-bold text-amber-600 font-mono mt-1 block">
                    + {state.delayDays} 工厂工作日
                  </span>
                </div>
                <ShieldAlert className="w-8 h-8 text-amber-500/30" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] font-mono block uppercase font-bold">平均驳回惩罚</span>
                  <span className="text-xl font-bold text-emerald-600 font-mono mt-1 block">
                    3 - 5 天/缺陷
                  </span>
                </div>
                <Activity className="w-8 h-8 text-emerald-400/30" />
              </div>
            </div>

            {/* 可制造性设计 DFM 缺陷库 */}
            <div className="flex-1 h-[520px]">
              <DFMKnowledgeBase records={state.dfmKnowledge} />
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1">
            
            {/* 左栏：系统履约实时事件日志 */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[550px] border-t-4 border-t-sky-500 relative overflow-hidden">
              {/* 顶部彩色定位装饰条 */}
              <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-sky-500/20 via-sky-500/60 to-transparent" />
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <Terminal className="w-4 h-4 text-sky-500" />
                  【操作流审计】跟单 OS 大货履约审计日志 (DFM AUDIT LOG)
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold hidden sm:inline">
                  AUTONOMOUS TRACE LEVEL: VERBOSE
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2.5 text-xs font-mono pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {state.logs.map(log => (
                  <div key={log.id} className="flex gap-2.5 items-start leading-relaxed border-b border-slate-100 pb-2">
                    <span className="text-slate-400 flex-shrink-0 text-[10px] font-sans">[{log.timestamp}]</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex-shrink-0 border uppercase ${
                      log.type === LogType.HIGH_RISK
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : log.type === LogType.WARNING
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : log.type === LogType.FINANCE
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-sky-700 border-slate-200'
                    }`}>
                      {log.type}
                    </span>
                    <div className="text-slate-700 font-sans">
                      {log.nodeName && (
                        <span className="text-amber-700 font-bold mr-1.5 font-sans">
                          [{log.nodeName}]
                        </span>
                      )}
                      {log.message}
                    </div>
                  </div>
                ))}
                {state.logs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    暂无大货履约流水。
                  </div>
                )}
              </div>
            </div>

            {/* 右栏：不可逆点高危重构/回滚事件历史 (Rollback & Reset History) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[550px] border-t-4 border-t-rose-500 relative overflow-hidden">
              {/* 顶部彩色定位装饰条 */}
              <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-rose-500/20 via-rose-500/60 to-transparent" />
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <RefreshCw className="w-4 h-4 text-rose-500" />
                  【高危卡控轨】高危逆向重构回置历史记录 ({state.rollbackHistory.length})
                </span>
                <span className="text-[10px] text-rose-500 font-mono font-bold hidden sm:inline">
                  HIGH RISK BARRIER
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {state.rollbackHistory.map((history, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                          回退 #{state.rollbackHistory.length - idx}
                        </span>
                        <span className="text-xs text-slate-700 font-bold font-mono">
                          {state.nodes.find(n => n.id === history.sourceNodeId)?.name || history.sourceNodeId}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-emerald-700 font-bold font-mono">
                          {state.nodes.find(n => n.id === history.targetNodeId)?.name || history.targetNodeId}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono font-bold">
                        {new Date(history.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-sans mb-3">
                      <strong>回退缘由：</strong>{history.reason}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-slate-200 pt-2.5">
                      <div>
                        <span className="text-slate-400 block font-bold">定责归属</span>
                        <span className={`font-bold ${
                          history.responsibility === 'CLIENT'
                            ? 'text-amber-700'
                            : history.responsibility === 'INTERNAL'
                            ? 'text-sky-700'
                            : 'text-rose-700'
                        }`}>
                          {history.responsibility === 'CLIENT' && '👤 客户责任'}
                          {history.responsibility === 'INTERNAL' && '📐 设计责任'}
                          {history.responsibility === 'FACTORY' && '🏭 车间/产能方'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">物损报废核销</span>
                        <span className="text-rose-600 font-bold">
                          ¥{history.costEstimate.toLocaleString()} 元
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {state.rollbackHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                    <ShieldCheck className="w-12 h-12 text-emerald-500/10 mb-2" />
                    <p className="text-xs font-bold">暂无不可逆点高危回置记录</p>
                    <p className="text-[10px] text-slate-400 mt-1">系统卡控严密，模具至今未发生逆向报废</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, RotateCcw, AlertOctagon, HelpCircle, FileText, ChevronRight, User } from 'lucide-react';
import { TNode, NodeStatus, LineType } from '../types';

interface ControlPanelProps {
  nodes: TNode[];
  currentNodeId: string;
  onUploadDeliverable: (nodeId: string, type: 'FILE' | 'PHOTO') => void;
  onQCPass: (nodeId: string, comments: string, inspector: string) => void;
  onQCRework: (nodeId: string, comments: string, delayDays: number, tags: string[]) => void;
  onRollback: (targetNodeId: string, responsibility: 'CLIENT' | 'INTERNAL' | 'FACTORY', costEstimate: number, reason: string) => void;
  onSwitchNode: (nodeId: string) => void;
}

export default function ControlPanel({
  nodes,
  currentNodeId,
  onUploadDeliverable,
  onQCPass,
  onQCRework,
  onRollback,
  onSwitchNode
}: ControlPanelProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(currentNodeId);
  
  // QC 判定表单
  const [qcInspector, setQcInspector] = useState('跟单OS智能检验中枢');
  const [qcComments, setQcComments] = useState('各维度偏差符合工业标准公差。树脂注浆结构均匀，表皮未见缩水及合模面大阶差，予以审核通过。');
  
  // 返工表单
  const [reworkDays, setReworkDays] = useState(3);
  const [reworkReason, setReworkReason] = useState('分模线残留溢料严重，且手办底座出现干涉，无法完美扣入卡槽。');
  const [reworkTags, setReworkTags] = useState<string[]>(['收缩变形', '分模线暴露']);
  const tagsList = ['起泡气孔', '收缩变形', '装配干涉', '分模线暴露', '材料缺料', '表面划伤'];

  // 回滚（不可逆点高危拦截）表单
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTargetNodeId, setRollbackTargetNodeId] = useState('T5');
  const [rollbackResponsibility, setRollbackResponsibility] = useState<'CLIENT' | 'INTERNAL' | 'FACTORY'>('CLIENT');
  const [rollbackCost, setRollbackCost] = useState(15000);
  const [rollbackReason, setRollbackReason] = useState('客户中途变更产品尺寸，决定将大货高度从 15cm 临时调整为 18cm。导致已开具的全套模具（T15）作废。');

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];
  const currentNode = nodes.find(n => n.id === currentNodeId) || nodes[0];

  const handleTagToggle = (tag: string) => {
    if (reworkTags.includes(tag)) {
      setReworkTags(reworkTags.filter(t => t !== tag));
    } else {
      setReworkTags([...reworkTags, tag]);
    }
  };

  const handleTriggerRollback = () => {
    if (!rollbackReason.trim()) {
      alert('请填写回滚原因及成本评估声明！');
      return;
    }
    onRollback(rollbackTargetNodeId, rollbackResponsibility, rollbackCost, rollbackReason);
    setShowRollbackModal(false);
  };

  // 检查是否在 T15 物理开模之后
  const showReworkWarning = selectedNode.tValue >= 15;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-full font-sans border-t-4 border-t-rose-500 relative overflow-hidden">
      {/* 顶部彩色定位装饰条 */}
      <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-rose-500/20 via-rose-500/60 to-transparent" />

      {/* 头部 */}
      <div className="border-b border-slate-100 pb-4 mb-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <UploadCloud className="w-4 h-4 text-rose-500" />
          【控制操作台】智能履约仿真控制台 (Simulation Console)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          模拟大货履约流水。可在此模拟交付物提交、QC检验合格/打回返工，以及不可逆点高危拦截
        </p>
      </div>

      {/* 节点选择快速切换 */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1.5">当前操作节点：</label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {nodes.map(n => (
            <button
              key={n.id}
              onClick={() => {
                setSelectedNodeId(n.id);
                // 如果是物理不可逆点后的节点，改变默认的回滚目标
                if (n.tValue >= 15) {
                  setRollbackTargetNodeId('T5');
                  setRollbackCost(15000);
                }
              }}
              className={`text-[10px] px-1.5 py-1.5 rounded transition-all font-mono font-bold border cursor-pointer ${
                n.id === selectedNodeId
                  ? 'bg-sky-50 text-sky-700 border-sky-400'
                  : n.id === currentNodeId
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 animate-pulse'
                  : n.status === NodeStatus.QC_PASSED
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {n.id.replace('_BRANCH', '')}
            </button>
          ))}
        </div>
      </div>

      {/* 选定节点状态和操作面板 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        
        {/* 节点状态简述卡片 */}
        <div className="bg-slate-50/60 border border-slate-200 p-3.5 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-mono px-1.5 py-0.5 rounded font-bold">
                T+{selectedNode.tValue} 节点
              </span>
              <h4 className="text-xs font-bold text-slate-800 mt-1">{selectedNode.name}</h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">当前状态</span>
              <span className="text-xs font-bold font-mono text-sky-600 uppercase">{selectedNode.status}</span>
            </div>
          </div>

          {/* 交付凭证状态 */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">📦 履约数字化交付物：</span>
            {selectedNode.deliverables ? (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-700 font-mono shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{selectedNode.deliverables.fileName || selectedNode.deliverables.mediaName}</span>
                </div>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200 font-bold flex-shrink-0">已就位</span>
              </div>
            ) : (
              <div className="bg-slate-50/30 p-3.5 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                <span>暂无任何大货数字化模型或实体打样图片</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUploadDeliverable(selectedNode.id, 'FILE')}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    模拟上传3D文件 (.stp)
                  </button>
                  <button
                    onClick={() => onUploadDeliverable(selectedNode.id, 'PHOTO')}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    模拟上传首件实物照 (.jpg)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. QC 审查面板 (当交付物已就位且未通过 QC 时展示) */}
        {selectedNode.status === NodeStatus.PENDING_QC && (
          <div className="bg-sky-50/30 border border-sky-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-sky-100">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-xs font-bold text-sky-700 tracking-wide uppercase font-mono">QC 跟单卡控台</span>
            </div>

            {/* 审核人 */}
            <div>
              <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">QC检验执行人：</label>
              <input
                type="text"
                value={qcInspector}
                onChange={(e) => setQcInspector(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
              />
            </div>

            {/* QC 审查判定选项 */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* 方案 A: 给予通过 */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <h5 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    判定 QC 合格
                  </h5>
                  <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">各项尺寸偏差、外观水纹均符合工业交货标准。</p>
                </div>
                <button
                  onClick={() => onQCPass(selectedNode.id, qcComments, qcInspector)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-2 rounded-lg text-[10px] tracking-wide transition-all active:scale-95 cursor-pointer shadow"
                >
                  放行 (解开财务付款)
                </button>
              </div>

              {/* 方案 B: 判定打回 (返工) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <h5 className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    判定不合格打回
                  </h5>
                  <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">表面缺陷、合模干涉，强制截断结算流并沉淀 DFM。</p>
                </div>
                <button
                  onClick={() => onQCRework(selectedNode.id, reworkReason, reworkDays, reworkTags)}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-1 px-2 rounded-lg text-[10px] tracking-wide transition-all active:scale-95 cursor-pointer shadow"
                >
                  打回 (启动顺延机制)
                </button>
              </div>
            </div>

            {/* 审核备注详情配置 */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-sm">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">合格批准批示：</label>
                <textarea
                  value={qcComments}
                  onChange={(e) => setQcComments(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700 outline-none focus:border-sky-400 focus:bg-white"
                />
              </div>

              <div className="border-t border-slate-100 pt-2">
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">若选择打回：设置预计延误工期 & 缺陷标签</label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-slate-500 font-mono">预计延期天数:</span>
                  <input
                    type="number"
                    value={reworkDays}
                    onChange={(e) => setReworkDays(Number(e.target.value))}
                    className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center font-mono text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500">工作日</span>
                </div>
                
                {/* 缺陷标签 */}
                <div className="flex flex-wrap gap-1">
                  {tagsList.map(t => (
                    <button
                      key={t}
                      onClick={() => handleTagToggle(t)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono border transition-all cursor-pointer ${
                        reworkTags.includes(t)
                          ? 'bg-rose-100 text-rose-700 border-rose-300 font-semibold'
                          : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">不合格打回指令意见：</label>
                  <textarea
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-[11px] text-slate-700 outline-none focus:border-rose-400 focus:bg-white"
                  />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. 逆向回滚与不可逆卡控触发面板 */}
        <div className="bg-rose-50/20 border border-rose-100 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100">
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold text-rose-700 tracking-wide uppercase font-mono">逆向工序拦截机制</span>
            </div>
            {selectedNode.tValue >= 15 && (
              <span className="bg-rose-100 text-rose-700 text-[9px] font-mono border border-rose-200 px-1.5 rounded animate-pulse font-bold">
                物理不可逆
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            在硅胶模具制成（T15）之后，任何试图打回到 T15 之前的操作，都将导致高危模具作废，系统将自动触发【高危拦截】。
          </p>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase">回滚目标工序:</span>
              <select
                value={rollbackTargetNodeId}
                onChange={(e) => setRollbackTargetNodeId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded px-1.5 py-0.5 outline-none font-mono cursor-pointer"
              >
                <option value="T5">T5 (3D建模外观尺寸设计)</option>
                <option value="T8">T8 (3D拆件分模工序)</option>
                <option value="T10">T10 (红蜡打印制备)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase">模具损失估算:</span>
              <span className="text-xs font-mono font-bold text-rose-600">
                ¥{selectedNode.tValue >= 15 ? '15,000 (模具报废重制)' : '0 (模前常规修改)'}
              </span>
            </div>

            <button
              onClick={() => {
                if (selectedNode.tValue >= 15) {
                  setRollbackCost(15000);
                  setShowRollbackModal(true);
                } else {
                  // 常规回滚
                  onRollback(rollbackTargetNodeId, 'INTERNAL', 0, '开模前常规工法优化，无实物报废损失。');
                }
              }}
              className="w-full bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              {selectedNode.tValue >= 15 ? '申请不可逆逆向打回 (触发高危警告)' : '申请常规工序回滚'}
            </button>
          </div>
        </div>

      </div>

      {/* 不可逆点强行打回高危警告弹窗 (模组化嵌入) */}
      {showRollbackModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white border-2 border-red-500 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            
            <div className="flex items-start gap-3.5 text-red-600">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 border border-red-200">
                <AlertOctagon className="w-6 h-6 text-red-600 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-600 tracking-wide uppercase">
                  🚨 履约系统核心卡控拦截：不可逆点高危警告
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  当前处于 [{selectedNode.name}]，已超越物理制造红线 T15 (硅胶开模)。任何逆向回滚将造成物理成本实质损失！
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>被破坏模具节点：</span>
                <span className="font-mono font-bold text-slate-800">T15 (硅胶模具完成)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>重新回溯设计至：</span>
                <span className="font-mono font-bold text-slate-800">[{nodes.find(n => n.id === rollbackTargetNodeId)?.name}]</span>
              </div>
              
              {/* 强制定责 */}
              <div className="border-t border-slate-200 pt-2.5 flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase">🚨 必须声明【高危责任归属方】:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CLIENT', 'INTERNAL', 'FACTORY'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRollbackResponsibility(role)}
                      className={`py-1 rounded-lg text-[10px] font-bold border font-mono transition-all cursor-pointer ${
                        rollbackResponsibility === role
                          ? 'bg-red-50 text-red-600 border-red-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {role === 'CLIENT' ? '客户责任' : role === 'INTERNAL' ? '设计责任' : '车间工厂'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 强制估算费用 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">💸 模具报废重置物理成本 (元):</label>
                <input
                  type="number"
                  value={rollbackCost}
                  onChange={(e) => setRollbackCost(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-red-600 font-bold"
                />
              </div>

              {/* 强制说明 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">📝 强制回滚原因及异常声明 (大货DFM审计):</label>
                <textarea
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  rows={3}
                  placeholder="由于此款修改将报废已有模具，请在此详细声明责任纠纷判定和重开协议细则..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-red-400"
                />
              </div>
            </div>

            {/* 确认和取消按钮 */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowRollbackModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-1.5 rounded-lg text-xs transition-all active:scale-95 cursor-pointer"
              >
                取消打回·维持现状
              </button>
              <button
                onClick={handleTriggerRollback}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded-lg text-xs transition-all active:scale-95 shadow cursor-pointer"
              >
                签署协议·强行作废回滚
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

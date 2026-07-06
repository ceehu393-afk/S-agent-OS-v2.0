/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ShieldCheck, AlertTriangle, HelpCircle, Sparkles, User, Database, Receipt } from 'lucide-react';
import { AgentOSState, LogType } from '../types';

interface AgentChatProps {
  state: AgentOSState;
  onTriggerAction: (actionData: any) => void;
  onAddLog: (type: LogType, message: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionTriggered?: {
    action: string;
    nodeId: string;
    comments: string;
    delayDays?: number;
    rollbackResponsibility?: string;
    rollbackCost?: number;
  };
}

export default function AgentChat({ state, onTriggerAction, onAddLog }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `【当前状态】
目前大货订单成功立项，首付款50%已确认入账，目前正处于 [T5 3D模型外观与尺寸设计] (10% 进度) 阶段。

【动作判定】
**大货跟单 Agent OS 已就位。**

【系统触发】
**时间管理、双轨并行、DFM沉淀和物理不可逆点（T15）拦截系统，正在后台严密监视供应链全链条。**

【下一步指令】
请立即点击控制台上传 3D 模型设计文件（如 .stp/.obj）或者在这里告诉我已上传，并向我下达 “QC审核” 指令，检验 3D 尺寸是否通过，以解开后续的物理开模和首笔设计费用放款权限。`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: '📤 T5模型合格，申请QC审核', text: 'T5模型 3D-Appearance.stp 已经上传了。请求大货 Agent 帮我做一个详细的 QC 审核并予以通过。' },
    { label: '⚠️ T5模型检测不合格，打回返工3天', text: '由于头部合模线过于突兀，我决定对 T5 节点进行打回返工处理。返工可能延误 3 天。请系统沉淀 DFM 并自动调整后续排期。' },
    { label: '🚨 不可逆高危！大货阶段逆回T5修改', text: '我们在现在的量产阶段发现尺寸不对，强行要求打回 T5 重新做 3D 建模。我们要修改它的总体尺寸！' },
    { label: '💰 财务卡控评估', text: '帮我检查一下目前的履约财务卡控矩阵。有合格交付物和 QC 报告的款项，现在都处于什么状态？' }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state,
          message: textToSend
        })
      });

      if (!response.ok) {
        throw new Error('API server unreachable');
      }

      const data = await response.json();
      
      const agentMsg: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        actionTriggered: data.triggerAction?.action !== 'NONE' ? data.triggerAction : undefined
      };

      setMessages(prev => [...prev, agentMsg]);

      // 如果有 triggerAction，通知父组件执行动作
      if (data.triggerAction && data.triggerAction.action !== 'NONE') {
        onTriggerAction(data.triggerAction);
        
        // 记录系统日志
        const actName = data.triggerAction.action;
        const actNode = data.triggerAction.nodeId;
        const logType = actName === 'ROLLBACK' ? LogType.HIGH_RISK : (actName === 'REWORK' ? LogType.WARNING : LogType.QC);
        onAddLog(logType, `【Agent OS 决策联动】执行指令 [${actName}]，作用于节点 ${actNode}。备注: ${data.triggerAction.comments || '无'}`);
      }

    } catch (err) {
      console.error(err);
      // 这里的 Fallback 已经在 server.ts 中完美定义了
    } finally {
      setIsLoading(false);
    }
  };

  // 精致的排版解析
  const renderMessageText = (text: string) => {
    const blocks = text.split('\n\n');
    return (
      <div className="space-y-3 font-sans leading-relaxed text-sm">
        {blocks.map((block, idx) => {
          if (block.startsWith('【当前状态】')) {
            return (
              <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700 shadow-sm">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-sky-500" />
                  当前履约进度
                </span>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{block.replace('【当前状态】\n', '')}</p>
              </div>
            );
          }
          if (block.startsWith('【动作判定】')) {
            return (
              <div key={idx} className="p-1.5 text-slate-700">
                <span className="font-bold text-sky-700 flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  跟单判定
                </span>
                <p className="text-xs whitespace-pre-wrap font-mono font-bold text-slate-800 leading-relaxed">{block.replace('【动作判定】\n', '')}</p>
              </div>
            );
          }
          if (block.startsWith('【系统触发】')) {
            return (
              <div key={idx} className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-800 shadow-sm">
                <span className="font-bold text-amber-700 flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  系统联动触发
                </span>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{block.replace('【系统触发】\n', '')}</p>
              </div>
            );
          }
          if (block.startsWith('【下一步指令】')) {
            return (
              <div key={idx} className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-emerald-800 shadow-sm">
                <span className="font-bold text-emerald-700 flex items-center gap-1.5 mb-1.5 text-xs uppercase tracking-wider">
                  <Database className="w-4 h-4 text-emerald-600" />
                  下阶段动作指引
                </span>
                <p className="text-xs whitespace-pre-wrap font-bold leading-relaxed">{block.replace('【下一步指令】\n', '')}</p>
              </div>
            );
          }
          return <p key={idx} className="whitespace-pre-wrap text-slate-600 text-xs leading-relaxed">{block}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm border-t-4 border-t-indigo-500 relative">
      {/* 顶部彩色定位装饰条 */}
      <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-indigo-500/20 via-indigo-500/60 to-transparent" />

      {/* 头部：Agent 身份卡片 */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-50 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800 tracking-wider">【决策大脑轨】AI 智能跟单决策舱</h3>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 rounded-full font-mono uppercase font-bold">
                OS Brain
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">大货跟单主管 · 自动研判工艺红线、财务合规及不可逆逆向拦截</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-400 block font-mono font-bold">T-LINE ACCURACY</span>
          <span className="text-xs font-mono font-bold text-indigo-600">100% SECURED</span>
        </div>
      </div>

      {/* 快捷推荐提问 */}
      <div className="bg-slate-50/50 p-2.5 border-b border-slate-200 overflow-x-auto flex gap-2 scrollbar-none">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.text)}
            disabled={isLoading}
            className="flex-shrink-0 text-[11px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm font-medium"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 聊天内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[90%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
              m.sender === 'user' ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-100 border border-slate-200'
            }`}>
              {m.sender === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-sky-600" />}
            </div>
            <div className={`flex flex-col gap-1 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-xl shadow-sm ${
                m.sender === 'user'
                  ? 'bg-indigo-600 border border-indigo-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-none'
              }`}>
                {m.sender === 'user' ? (
                  <p className="text-xs whitespace-pre-wrap font-sans text-white font-medium leading-relaxed">{m.text}</p>
                ) : (
                  renderMessageText(m.text)
                )}

                {/* 如果触发了动作，这里给出非常科幻的联动提示 */}
                {m.actionTriggered && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[10px] text-emerald-600 font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>[OS ACTION EXECUTED] {m.actionTriggered.action} FOR NODE {m.actionTriggered.nodeId}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 px-1 font-mono font-bold">{m.timestamp}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 animate-spin">
              <Sparkles className="w-4 h-4 text-sky-500" />
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl rounded-tl-none text-slate-500 text-xs flex items-center gap-2 font-mono shadow-sm">
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="font-medium">跟单 Agent 正在进行数字化审核与规则验证...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 底部输入框 */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="向大货跟单 Agent 下达履约审核或返工指令..."
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg px-4 py-2 text-xs transition-all flex items-center justify-center gap-1 shadow active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>执行</span>
          </button>
        </form>
        <div className="mt-1.5 px-1 flex items-center justify-between text-[9px] text-slate-400 font-mono font-bold">
          <span>🎯 按回车直接发送指令</span>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> 时间-质量-财务 3 重防线卡点生效中</span>
        </div>
      </div>
    </div>
  );
}

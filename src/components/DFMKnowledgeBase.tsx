/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Tag, FileText, PlusCircle, Bookmark, Archive } from 'lucide-react';
import { DFMRecord } from '../types';

interface DFMKnowledgeBaseProps {
  records: DFMRecord[];
}

export default function DFMKnowledgeBase({ records }: DFMKnowledgeBaseProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 获取所有标签
  const allTags = Array.from(new Set(records.flatMap(r => r.tags)));

  // 过滤
  const filteredRecords = records.filter(r => {
    const matchesSearch = r.nodeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.reworkAdvice.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag ? r.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-full font-sans border-t-4 border-t-sky-500 relative overflow-hidden">
      {/* 顶部彩色定位装饰条 */}
      <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-sky-500/20 via-sky-500/60 to-transparent" />

      {/* 头部 */}
      <div className="border-b border-slate-100 pb-4 mb-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <Archive className="w-4 h-4 text-sky-500" />
          【工艺沉淀轨】DFM (可制造性设计) 工艺缺陷沉淀库 (DFM Database)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          智能汇聚与沉淀大货制造中产生的各项首件缺陷及优化指引，驱动工厂质量自修正
        </p>
      </div>

      {/* 搜索与筛选工具栏 */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索缺陷描述、返工建议或节点名称..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* 标签栏 */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-500 font-bold mr-1 uppercase">标签筛选:</span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-[10px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer border ${
              !selectedTag
                ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`text-[10px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer border ${
                tag === selectedTag
                  ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 缺陷卡片列表 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        {filteredRecords.length === 0 ? (
          <div className="h-32 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <FileText className="w-8 h-8 opacity-40 mb-1" />
            <span className="text-xs font-mono">未检索到符合条件的 DFM 工艺红线沉淀</span>
          </div>
        ) : (
          filteredRecords.map(r => (
            <div
              key={r.id}
              className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-2.5 relative overflow-hidden shadow-sm"
            >
              {/* 缺陷 ID 水印 */}
              <span className="absolute right-3 top-3 text-[10px] font-mono text-slate-400 font-bold">
                {r.id}
              </span>

              {/* 节点名称 */}
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700">
                  [{r.nodeName}]
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {r.createdAt} 录入
                </span>
              </div>

              {/* 缺陷描述 */}
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-lg font-sans leading-relaxed">
                <span className="font-bold block text-[10px] text-rose-600 uppercase tracking-wide mb-0.5">
                  物理质量缺陷:
                </span>
                {r.description}
              </div>

              {/* 返工修复建议 */}
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg font-sans leading-relaxed">
                <span className="font-bold block text-[10px] text-emerald-600 uppercase tracking-wide mb-0.5">
                  DFM 优化与返工指南:
                </span>
                {r.reworkAdvice}
              </div>

              {/* 标签列表 */}
              <div className="flex items-center gap-1.5 mt-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex gap-1">
                  {r.tags.map(t => (
                    <span
                      key={t}
                      className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

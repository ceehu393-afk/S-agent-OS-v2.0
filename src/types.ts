/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum NodeStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_QC = 'PENDING_QC',
  QC_PASSED = 'QC_PASSED',
  REWORK = 'REWORK',
}

export enum LineType {
  MAIN = 'MAIN',       // 树脂工艺主线
  BRANCH = 'BRANCH',   // 包材工艺支线
  MERGED = 'MERGED',   // 汇合大货量产线
}

export interface TNode {
  id: string;
  name: string;
  tValue: number;          // T+X 的值
  progressPercent: number; // 进度百分比
  status: NodeStatus;
  line: LineType;
  plannedDate: string;     // YYYY-MM-DD
  actualDate?: string;     // 实际完成日期
  deliverables?: {
    fileUrl?: string;      // 数字化文件路径 (.stp/.obj)
    fileName?: string;
    mediaUrl?: string;     // 实体照片或视频
    mediaName?: string;
  };
  qcReport?: {
    result: 'PASS' | 'FAIL';
    inspector: string;
    comments: string;
    checkDate: string;
  };
}

export enum FinancialStatus {
  LOCKED = 'LOCKED',         // 未满足触发条件，锁死
  PENDING_APPLY = 'PENDING_APPLY', // 满足条件，待申请
  APPLIED = 'APPLIED',       // 已提交申请（待审批/处理中）
  COMPLETED = 'COMPLETED',   // 已收/付款完成
}

export enum FinancialType {
  RECEIVABLE = 'RECEIVABLE', // 客户收款 (向客户收)
  PAYABLE = 'PAYABLE',       // 供应商付款 (付给产能方)
}

export interface FinancialItem {
  id: string;
  triggerNodeId: string;     // 触发节点 ID
  triggerNodeName: string;   // 触发节点名称
  title: string;             // 款项名称
  percentage?: number;       // 比例百分比 (比如 "大货总款50%")
  amount: number;            // 仿真金额 (元)
  type: FinancialType;
  status: FinancialStatus;
  updateTime?: string;
  remarks: string;
}

export interface DFMRecord {
  id: string;
  nodeId: string;
  nodeName: string;
  tags: string[];            // 缺陷标签：如 "起泡", "收缩", "变形", "分模线暴露", "尺寸偏差"
  description: string;       // 缺陷描述
  reworkAdvice: string;      // 针对性返工建议
  createdAt: string;
}

export enum LogType {
  SYSTEM = 'SYSTEM',
  QC = 'QC',
  FINANCE = 'FINANCE',
  WARNING = 'WARNING',
  HIGH_RISK = 'HIGH_RISK',
}

export interface FulfillmentLog {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
  nodeName?: string;
}

export interface RollbackAction {
  targetNodeId: string;
  sourceNodeId: string;
  responsibility: 'CLIENT' | 'INTERNAL' | 'FACTORY';
  costEstimate: number;
  reason: string;
  timestamp: string;
}

export interface AgentOSState {
  t0Date: string;          // 首付款到账日
  currentNodeId: string;   // 当前处于哪一步
  nodes: TNode[];
  financials: FinancialItem[];
  dfmKnowledge: DFMRecord[];
  logs: FulfillmentLog[];
  delayDays: number;       // 累积顺延天数
  rollbackHistory: RollbackAction[];
}

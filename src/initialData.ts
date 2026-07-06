/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TNode, FinancialItem, NodeStatus, LineType, FinancialStatus, FinancialType } from './types';
import { addFactoryWorkdays } from './utils';

export function getInitialState(t0DateStr: string) {
  const nodes: TNode[] = [
    {
      id: 'T0',
      name: '大货首款到账 (成单)',
      tValue: 0,
      progressPercent: 0,
      status: NodeStatus.QC_PASSED, // T0 到账即完成
      line: LineType.MAIN,
      plannedDate: t0DateStr,
      actualDate: t0DateStr,
      deliverables: {
        fileName: '大货首期款到账单.pdf',
        fileUrl: '#'
      },
      qcReport: {
        result: 'PASS',
        inspector: '财务自动入账系统',
        comments: '客户已在线确认合同，并成功支付 50% 订金，触发 T0 大货项目启动。',
        checkDate: t0DateStr
      }
    },
    {
      id: 'T5',
      name: '3D模型外观与尺寸设计',
      tValue: 5,
      progressPercent: 10,
      status: NodeStatus.IN_PROGRESS, // 初始进行中
      line: LineType.MAIN,
      plannedDate: addFactoryWorkdays(t0DateStr, 5)
    },
    {
      id: 'T8',
      name: '3D模型拆件处理',
      tValue: 8,
      progressPercent: 16,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MAIN,
      plannedDate: addFactoryWorkdays(t0DateStr, 8)
    },
    {
      id: 'T10',
      name: '红蜡件 3D 打印',
      tValue: 10,
      progressPercent: 20,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MAIN,
      plannedDate: addFactoryWorkdays(t0DateStr, 10)
    },
    {
      id: 'T15',
      name: '硅胶模具制造 (不可逆点)',
      tValue: 15,
      progressPercent: 30,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MAIN,
      plannedDate: addFactoryWorkdays(t0DateStr, 15)
    },
    {
      id: 'T25',
      name: '灌坯初版实物产出',
      tValue: 25,
      progressPercent: 50,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MAIN,
      plannedDate: addFactoryWorkdays(t0DateStr, 25)
    },
    {
      id: 'T30_BRANCH',
      name: '包材刀模设计派发 (支线)',
      tValue: 30,
      progressPercent: 60,
      status: NodeStatus.NOT_STARTED,
      line: LineType.BRANCH,
      plannedDate: addFactoryWorkdays(t0DateStr, 12) // 支线 T5 完工后触发，在 T12-T30 运行
    },
    {
      id: 'T35_BRANCH',
      name: '包材打样与检测 (支线)',
      tValue: 35,
      progressPercent: 70,
      status: NodeStatus.NOT_STARTED,
      line: LineType.BRANCH,
      plannedDate: addFactoryWorkdays(t0DateStr, 18)
    },
    {
      id: 'T40',
      name: '产前样与包材汇合检测',
      tValue: 40,
      progressPercent: 80,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MERGED,
      plannedDate: addFactoryWorkdays(t0DateStr, 40)
    },
    {
      id: 'T45',
      name: '大货成品生产与抽检',
      tValue: 45,
      progressPercent: 90,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MERGED,
      plannedDate: addFactoryWorkdays(t0DateStr, 45)
    },
    {
      id: 'T50',
      name: '大货装车发货与物流确权',
      tValue: 50,
      progressPercent: 100,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MERGED,
      plannedDate: addFactoryWorkdays(t0DateStr, 50)
    },
    {
      id: 'T60',
      name: '账期到期结案与评价',
      tValue: 60,
      progressPercent: 100,
      status: NodeStatus.NOT_STARTED,
      line: LineType.MERGED,
      plannedDate: addFactoryWorkdays(t0DateStr, 60)
    }
  ];

  const financials: FinancialItem[] = [
    {
      id: 'F_T0',
      triggerNodeId: 'T0',
      triggerNodeName: '大货首款到账',
      title: '客户：首期大货定金 (50%)',
      percentage: 50,
      amount: 125000,
      type: FinancialType.RECEIVABLE,
      status: FinancialStatus.COMPLETED,
      remarks: '大货项目启动的首要卡控条件，目前已到账。',
      updateTime: t0DateStr
    },
    {
      id: 'F_T5',
      triggerNodeId: 'T5',
      triggerNodeName: '3D模型外观与尺寸设计',
      title: '设计方：3D 建模及外观尺寸费 (100%)',
      amount: 15000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '支付给主创设计工作室，需 T5 3D建模 QC 通过后解卡。'
    },
    {
      id: 'F_T8',
      triggerNodeId: 'T8',
      triggerNodeName: '3D模型拆件处理',
      title: '拆件厂：3D 文件拆模分件费 (100%)',
      amount: 8000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '支付给模具拆件工程师，需 T8 拆模分件 QC 通过后解卡。'
    },
    {
      id: 'F_T10',
      triggerNodeId: 'T10',
      triggerNodeName: '红蜡件 3D 打印',
      title: '打印厂：红蜡 3D 打印加工费 (100%)',
      amount: 6000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '支付给光固化打印中心，需 T10 红蜡物理样件 QC 通过后解卡。'
    },
    {
      id: 'F_T25',
      triggerNodeId: 'T25',
      triggerNodeName: '灌坯初版实物产出',
      title: '主力模具厂：大货首期开模及模具费 (30%)',
      percentage: 30,
      amount: 45000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '需见灌坯初版首件实物，实物 QC 检验通过，方允许拨付。'
    },
    {
      id: 'F_T40',
      triggerNodeId: 'T40',
      triggerNodeName: '产前样与包材汇合检测',
      title: '包材厂：刀模彩盒起定量款 (50%)',
      percentage: 50,
      amount: 12000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '需产前树脂样与包装结构双轨汇合 QC 均通过后方可支付。'
    },
    {
      id: 'F_T45',
      triggerNodeId: 'T45',
      triggerNodeName: '大货成品生产与抽检',
      title: '客户：大货发货前尾款 (50%)',
      percentage: 50,
      amount: 125000,
      type: FinancialType.RECEIVABLE,
      status: FinancialStatus.LOCKED,
      remarks: '大货发货终极阀门。大货抽检合格后，必须收齐客户此款才允许出厂。'
    },
    {
      id: 'F_T50_PKG',
      triggerNodeId: 'T50',
      triggerNodeName: '大货装车发货与物流确权',
      title: '包材厂：包材尾款 (50%)',
      percentage: 50,
      amount: 12000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '需发货完毕，提供实单单据解卡。'
    },
    {
      id: 'F_T50_FAC',
      triggerNodeId: 'T50',
      triggerNodeName: '大货装车发货与物流确权',
      title: '主力模具厂：大货量产及发货款 (40%)',
      percentage: 40,
      amount: 60000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: '需见正式发货物流确权单据解卡。'
    },
    {
      id: 'F_T60',
      triggerNodeId: 'T60',
      triggerNodeName: '账期到期结案与评价',
      title: '主力模具厂：大货质保尾款 (30%)',
      percentage: 30,
      amount: 45000,
      type: FinancialType.PAYABLE,
      status: FinancialStatus.LOCKED,
      remarks: 'T60质保期结束，无批量售后投诉扣减，全额付清。'
    }
  ];

  const dfmKnowledge = [
    {
      id: 'DFM_001',
      nodeId: 'T5',
      nodeName: '3D模型外观与尺寸设计',
      tags: ['模后缩水', '分模线隐藏'],
      description: '角色头发尖端及飘带部分树脂厚度小于 1.2mm，开模后极易在注浆时出现缺料或由于气泡导致断裂。',
      reworkAdvice: '加厚尖端部分至 1.5mm 以上，并在 3D 模型内测做斜角过渡，使流道顺畅。分模线沿发束纹理隐蔽化设计。',
      createdAt: addFactoryWorkdays(t0DateStr, 2)
    },
    {
      id: 'DFM_002',
      nodeId: 'T5',
      nodeName: '3D模型外观与尺寸设计',
      tags: ['干涉防呆', '装配干涉'],
      description: '底座卡扣与本体脚部预留槽位为完全硬连接，没有放公差，涂装大货上色油漆层后会导致装配挤压爆漆。',
      reworkAdvice: '对本体脚底插销外扩进行双向单边 -0.15mm 的偏置，预留涂装层公差。',
      createdAt: addFactoryWorkdays(t0DateStr, 3)
    }
  ];

  const logs = [
    {
      id: 'LOG_001',
      timestamp: `${t0DateStr} 09:00:00`,
      type: 'SYSTEM' as const,
      message: '【系统初始启动】树脂大货履约跟单 OS 已加载成功。'
    },
    {
      id: 'LOG_002',
      timestamp: `${t0DateStr} 10:30:15`,
      type: 'FINANCE' as const,
      message: '财务到账核销：收到客户首期大货定金（50%）¥125,000，大货订单处于 [T0 正常状态]。'
    },
    {
      id: 'LOG_003',
      timestamp: `${t0DateStr} 11:00:00`,
      type: 'SYSTEM' as const,
      message: '主排期启动：已按工作日计算自动生成 T0 至 T60 计划日期。排期监测线启动。'
    }
  ];

  return {
    t0Date: t0DateStr,
    currentNodeId: 'T5', // 初始处于 T5 待审核
    nodes,
    financials,
    dfmKnowledge,
    logs,
    delayDays: 0,
    rollbackHistory: []
  };
}

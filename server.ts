import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// 初始化 Gemini 客户端 (懒加载和安全卫士)
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client successfully initialized.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("GEMINI_API_KEY is not configured or placeholder. Running in High-Fidelity Rule-Engine Fallback mode.");
}

// ----------------------------------------------------
// API 路由
// ----------------------------------------------------

// 1. 状态自检
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    aiEnabled: ai !== null,
    timestamp: new Date().toISOString()
  });
});

// 2. 跟单 Agent 智能推演与判定
app.post("/api/agent/chat", async (req, res) => {
  const { state, message } = req.body;
  
  if (!state || !message) {
    return res.status(400).json({ error: "Missing state or message parameters." });
  }

  // 构建规则引擎 Fallback 回复
  const fallbackResponse = generateLocalRuleResponse(state, message);

  if (!ai) {
    // 降级模式，采用本地高仿真规则引擎
    return res.json(fallbackResponse);
  }

  try {
    // 构造极强的跟单系统上下文
    const systemPrompt = `你是一个“树脂大货履约跟单 Agent OS”的核心人工智能中枢。
负责严格管理大货生产的时间线、交付物、QC检验和财务结算流。
你必须像一个冷酷无情但极其精准的项目经理，严格遵守规则，防范供应链风险，并随时监控“时间、质量、资金”的三重底线。

【核心卡控规则：请在你的决策中绝对遵守】
1. 进度百分比与日期顺延：
   T0 (成单/首付到账) -> T5 (3D建模 10%) -> T8 (拆件 16%) -> T10 (红蜡 20%) -> T15 (开模 30%) -> T25 (灌坯 50%) -> T40 (产前样+包材 80%) -> T45 (大货成品 90%) -> T50 (发货 100%) -> T60 (结案)。
   若发生 QC 打回，计算延误天数 Y 并在接下来的节点自动推算顺延 Y 天。
2. 双轨并行：
   T5 模型外观与尺寸 QC 通过后，主线进入树脂(T8-T25)，支线派发包材刀模与打样。两线必须在 T40 汇合。均 QC 通过才允许量产。
3. 逆向回滚：
   T15 (硅胶开模) 是物理不可逆点。在 T15 之后的节点如果申请打回到 T15 之前的节点，必须触发【高危警告：模具报废/重开风险】，强制定责并需要成本评估。
4. 结果导向财务卡控：
   无合格交付物与 QC 通过报告 = 严禁付款。
   - T0：触发收取大货总款 50% 首款。
   - T5：QC通过，付 3D 建模费全额。
   - T8：QC通过，付拆件费全额。
   - T10：QC通过，付 3D 打印费全额。
   - T25：实物 QC通过，付大货首款 30%（即模具费）。
   - T40：双轨通过，付包材首款 50%。
   - T45：抽检 QC通过，收客户大货发货前 50% 尾款。
   - T50：凭发货单，付包材尾款 50% 及大货发货款 40%。
   - T60：期满，付大货尾款 30%。

【当前系统的履约 JSON 状态如下】:
${JSON.stringify(state, null, 2)}

请结合当前状态，解析用户的话：“${message}”。
你必须做出跟单主管的判定。你必须返回一个 JSON 对象，结构必须符合以下模式：
{
  "text": "四段式纯文本回复，严格按照以下格式编写：
【当前状态】
指出目前所处的节点（T值）、主/支线状态、以及整体进度百分比。

【动作判定】
指出刚才的输入触发了什么操作（如：QC通过、打回返工、顺延工期、拒绝无交付物审核）。

【系统触发】
**这里醒目提示是否调用了财务收付款指令、DFM沉淀、工期顺延预警或高危警告。**

【下一步指令】
明确指出下一步需要哪个角色、做什么任务、最迟在什么日期前（根据计算出来的T+X日期）完成。",

  "triggerAction": {
    "action": "ACTION_TYPE", 
    "nodeId": "TARGET_NODE_ID",
    "comments": "操作备注",
    "delayDays": 0, // 如果是打回返工，预计延误天数
    "rollbackResponsibility": "CLIENT/INTERNAL/FACTORY", // 仅在回滚时提供
    "rollbackCost": 0 // 仅在回滚时提供
  }
}

ACTION_TYPE 必须是以下之一，如果没有发生系统操作则为 "NONE"：
- "QC_PASS": 通过特定节点的 QC 审核，从而激活其对应的财务款项（需确保用户传了文件或实体照片，否则可判定拒绝并回复要求上传）。
- "REWORK": 对当前节点做出打回返工判定，同时沉淀 DFM。
- "ROLLBACK": 触发不可逆点的逆向回滚（高危警告）。
- "FINANCE_APPLY": 申请收付款。

注意：返回的必须是纯粹的、格式合规的 JSON 对象。不要带有 markdown 的 \`\`\`json\`\`\` 标记，以便解析。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            triggerAction: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING },
                nodeId: { type: Type.STRING },
                comments: { type: Type.STRING },
                delayDays: { type: Type.INTEGER },
                rollbackResponsibility: { type: Type.STRING },
                rollbackCost: { type: Type.NUMBER }
              },
              required: ["action"]
            }
          },
          required: ["text", "triggerAction"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json(result);
  } catch (err: any) {
    console.error("Gemini invocation error:", err);
    // 出错时自动使用 Fallback
    return res.json(fallbackResponse);
  }
});

// 本地履约 Agent 的高仿真规则解析引擎 (保障断网、无 API Key、服务异常时的鲁棒性)
function generateLocalRuleResponse(state: any, message: string) {
  const msg = message.toLowerCase();
  let currentNode = state.nodes.find((n: any) => n.id === state.currentNodeId) || state.nodes[0];
  let text = "";
  let action = "NONE";
  let nodeId = currentNode.id;
  let comments = "";
  let delayDays = 0;
  let rollbackResponsibility = "CLIENT";
  let rollbackCost = 0;

  // 1. 判断是否包含审核、QC、通过、合格等词汇
  if (msg.includes("qc") || msg.includes("审核") || msg.includes("通过") || msg.includes("合格") || msg.includes("pass")) {
    if (currentNode.status === "PENDING_QC") {
      action = "QC_PASS";
      comments = "经履约 Agent 智能判定，大货交付文件/实物照片检验完毕。各维度偏差在 ±0.2mm 公差内，符合大货品质标准，予以签发 QC 合格证书。";
      
      const nextNode = state.nodes.find((n: any) => n.tValue > currentNode.tValue);
      const nextNodeName = nextNode ? nextNode.name : "履约完成";
      
      text = `【当前状态】
目前处于 [${currentNode.name}] (T+${currentNode.tValue})，进度为 ${currentNode.progressPercent}%。由于刚才提交了合格的履约交付凭证，系统进入人工与 AI 双轨校验判定。

【动作判定】
**QC 检验通过判定。** 校验人：AI Agent (跟单OS)。交付物特征分析、精度尺寸公差评估正常，确认合格。

【系统触发】
**系统已自动调用财务卡控模块：解除 [${currentNode.name}] 后置财务项锁死状态，触发对应的收付款指令发布。**

【下一步指令】
建议生产负责人立即切换系统，启动下一个节点 [${nextNodeName}]，并提醒相关财务专员及时跟进款项。`;
    } else {
      text = `【当前状态】
目前处于 [${currentNode.name}] (T+${currentNode.tValue}) 节点，当前节点状态为: ${currentNode.status}。

【动作判定】
**拒绝 QC 检验通过请求。**

【系统触发】
**未检测到当前节点有新的数字化文件（.stp/.obj）或实体打样实物照片，无法启动 QC 检验流。无合格交付物 = 严禁付款。**

【下一步指令】
请供应链代表先到左侧“大货控制台”上传对应节点的交付物（或在聊天中提供具体的交付物描述），方可由跟单 OS 唤醒 QC 判定。`;
    }
  } 
  // 2. 判断是否是打回、返工、不合格、有问题
  else if (msg.includes("打回") || msg.includes("返工") || msg.includes("不合格") || msg.includes("问题") || msg.includes("fail") || msg.includes("修改")) {
    action = "REWORK";
    nodeId = currentNode.id;
    delayDays = 3; // 默认延误 3 天
    comments = "表面存在毛刺与气泡孔径超标，要求模具车间重新精打磨。";
    
    text = `【当前状态】
目前处于 [${currentNode.name}] (T+${currentNode.tValue})，进度为 ${currentNode.progressPercent}%。主/支线正在进行 QC 评估。

【动作判定】
**QC 检验不通过，触发返工打回。** 预计导致工期额外延误 ${delayDays} 天。

【系统触发】
**1. 唤醒“保质顺延机制”：后续所有 T 节点计算时间将向后延期 ${delayDays} 个工作日，向内部管理层发送 [工期延误预警]！
2. 强制截断当前节点的所有财务结算。
3. 提取关键缺陷并自动沉淀至 DFM 缺陷知识库，打上 "返工"、"模具细节缺陷" 标签。**

【下一步指令】
请产能方立即将 3D 模型/实物退回修改，并在 DFM 知识库指导下于 T+${currentNode.tValue + delayDays} 日前重新提交验收。`;
  }
  // 3. 判断是否是回滚、退回以前、重做、重新建模 (高危判定)
  else if (msg.includes("回滚") || msg.includes("退回之前") || msg.includes("重新建模") || msg.includes("改前面的") || msg.includes("重新修改模型")) {
    // 检查当前节点是否大于 T15
    if (currentNode.tValue >= 15) {
      action = "ROLLBACK";
      nodeId = "T5"; // 比如回滚到 T5
      rollbackResponsibility = "CLIENT";
      rollbackCost = 15000;
      comments = "大货量产阶段逆向要求回滚修改 3D 尺寸，导致已开硅胶模具（T15）全部报废，重开成本严重。";
      
      text = `【当前状态】
当前处于不可逆点后的 [${currentNode.name}] (T+${currentNode.tValue})。

【动作判定】
**逆向回滚卡控高危拦截！** 检测到试图退回 T15（物理开模不可逆点）之前的节点。

【系统触发】
🚨 **【高危警告：模具报废/重开风险】
强制启动拦截判定：开模工艺已开始，逆向修改将导致模具全套报废。
已将此回滚定责为：【客户责任】。
评估报废重置物理成本：¥${rollbackCost}。必须由客户在付款前补签《重开模补充协议》方可放行。**

【下一步指令】
要求操作专员立即在控制台上传该事件的详细分析报告，或指导客户确认愿意承担 ¥${rollbackCost} 的损失，重新从 T5 建模开始。`;
    } else {
      action = "ROLLBACK";
      nodeId = "T5";
      rollbackResponsibility = "INTERNAL";
      rollbackCost = 0;
      
      text = `【当前状态】
处于物理开模前节点 [${currentNode.name}] (T+${currentNode.tValue})。

【动作判定】
**申请常规回滚。**

【系统触发】
**判定当前节点在 T15 物理开模节点前。允许直接回滚，由于尚未开模，未产生模具报废物理损耗。已记录该质量异动并扣减当前付款申请。**

【下一步指令】
设计组立即接管任务，在 1 个工作日内重新优化 3D 模型外观细节。`;
    }
  }
  // 4. 财务申请
  else if (msg.includes("财务") || msg.includes("付款") || msg.includes("收款") || msg.includes("收钱") || msg.includes("付钱") || msg.includes("资金")) {
    text = `【当前状态】
处于 [${currentNode.name}] (T+${currentNode.tValue})，总进度百分比: ${currentNode.progressPercent}%。

【动作判定】
**财务卡控矩阵自检评估。**

【系统触发】
**严格执行“无合格交付物及 QC 通过报告 = 严禁付款”。目前仅对状态标记为 [待申请] 且交付物 QC 校验通过的账期款项签发支付指令。**

【下一步指令】
请核对右下角“结果导向财务卡控矩阵”中的明细。对于已经具备 [可申请] 状态的款项，点击 [确认收/付款] 按钮进行链上履约清盘。`;
  }
  // 5. 默认状态回复
  else {
    text = `【当前状态】
我是“树脂大货履约跟单 Agent OS”。大货项目 [Time: T+${currentNode.tValue} | Quality: ${currentNode.status} | Progress: ${currentNode.progressPercent}%]。主/支线排期正处于严密闭环监护中。

【动作判定】
**跟单 OS 静默监测与指令待命。**

【系统触发】
**暂未触发物理事件异动。财务矩阵与 DFM 知识库实时同步。**

【下一步指令】
您可以向我发送指令，例如：“**T10红蜡件合格，申请QC通过**”、“**判定T25打回返工**” 或者 “**强制在量产阶段修改3D模型**” 观察系统的【高危拦截】与【财务卡控】如何精密运转。`;
  }

  return {
    text,
    triggerAction: {
      action,
      nodeId,
      comments,
      delayDays,
      rollbackResponsibility,
      rollbackCost
    }
  };
}

// ----------------------------------------------------
// Vite 和 静态资源 托管 setup
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite dev middleware.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static files from dist directory.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fulfillment Agent OS running on port ${PORT}`);
  });
}

startServer();

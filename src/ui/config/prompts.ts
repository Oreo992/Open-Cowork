/**
 * 快速提示配置
 * 面向日常办公场景的 AI 助手提示
 */

export interface QuickPrompt {
  /** 图标 (emoji) */
  icon: string;
  /** 标题 */
  title: string;
  /** 提示内容 - 发送给 AI 的实际文本 */
  prompt: string;
  /** 渐变背景色 */
  color: string;
  /** 可选的副标题/描述 */
  description?: string;
}

/**
 * 文件与数据处理
 */
export const filePrompts: QuickPrompt[] = [
  {
    icon: "📁",
    title: "整理文件",
    prompt: "请帮我整理当前目录下的文件，按类型或日期分类，并给出整理方案",
    color: "from-blue-500/10 to-cyan-500/10",
    description: "自动分类归档",
  },
  {
    icon: "🔍",
    title: "查找文件",
    prompt: "请帮我查找包含以下内容的文件：",
    color: "from-sky-500/10 to-blue-500/10",
    description: "快速定位文件",
  },
  {
    icon: "📊",
    title: "分析数据",
    prompt: "请帮我分析这些数据，提取关键信息并生成汇总报告：",
    color: "from-emerald-500/10 to-teal-500/10",
    description: "数据洞察",
  },
];

/**
 * 文档与写作
 */
export const writingPrompts: QuickPrompt[] = [
  {
    icon: "✍️",
    title: "撰写文档",
    prompt: "请帮我撰写一份关于以下主题的文档：",
    color: "from-purple-500/10 to-pink-500/10",
    description: "专业文档写作",
  },
  {
    icon: "📧",
    title: "写邮件",
    prompt: "请帮我写一封邮件，主题是：",
    color: "from-rose-500/10 to-red-500/10",
    description: "邮件沟通",
  },
  {
    icon: "📋",
    title: "总结内容",
    prompt: "请帮我总结以下内容的要点：",
    color: "from-amber-500/10 to-yellow-500/10",
    description: "快速提炼重点",
  },
];

/**
 * 日程与任务管理
 */
export const planningPrompts: QuickPrompt[] = [
  {
    icon: "📅",
    title: "安排日程",
    prompt: "请帮我规划今天/本周的工作安排，需要完成的任务包括：",
    color: "from-indigo-500/10 to-violet-500/10",
    description: "时间管理",
  },
  {
    icon: "✅",
    title: "任务拆解",
    prompt: "请帮我把这个大任务拆解成可执行的小步骤：",
    color: "from-green-500/10 to-emerald-500/10",
    description: "化繁为简",
  },
  {
    icon: "💡",
    title: "头脑风暴",
    prompt: "请帮我围绕这个主题进行头脑风暴，给出创意点子：",
    color: "from-orange-500/10 to-amber-500/10",
    description: "激发灵感",
  },
];

/**
 * 默认显示的快速提示
 * 选取最常用的日常办公场景
 */
export const defaultQuickPrompts: QuickPrompt[] = [
  {
    icon: "📁",
    title: "整理文件",
    prompt: "请帮我整理当前目录下的文件，按类型或日期分类，并给出整理方案",
    color: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: "✍️",
    title: "撰写文档",
    prompt: "请帮我撰写一份关于以下主题的文档：",
    color: "from-purple-500/10 to-pink-500/10",
  },
  {
    icon: "📋",
    title: "总结内容",
    prompt: "请帮我总结以下内容的要点：",
    color: "from-amber-500/10 to-yellow-500/10",
  },
  {
    icon: "📧",
    title: "写邮件",
    prompt: "请帮我写一封邮件，主题是：",
    color: "from-rose-500/10 to-red-500/10",
  },
  {
    icon: "✅",
    title: "任务拆解",
    prompt: "请帮我把这个大任务拆解成可执行的小步骤：",
    color: "from-green-500/10 to-emerald-500/10",
  },
  {
    icon: "💡",
    title: "头脑风暴",
    prompt: "请帮我围绕这个主题进行头脑风暴，给出创意点子：",
    color: "from-orange-500/10 to-amber-500/10",
  },
];

/**
 * 欢迎页面文案配置
 */
export const welcomeTexts = {
  title: "你好，有什么可以帮你？",
  subtitle: "我可以帮你整理文件、撰写文档、分析数据、管理任务等",
  tips: {
    send: "发送",
    newline: "换行",
  },
};

/**
 * 获取所有分类的提示
 */
export function getAllPrompts() {
  return {
    file: filePrompts,
    writing: writingPrompts,
    planning: planningPrompts,
  };
}

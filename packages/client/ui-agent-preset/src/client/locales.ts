/** Locale bundles for the agent-preset hero chip, header label, and management section. */

import { guideEn, guideZh, type PresetGuideKey } from './guide-locales.ts'

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | PresetGuideKey
  | 'builtInGroup'
  | 'customGroup'
  | 'seatHint'
  | 'headerHint'
  | 'nav'
  | 'sectionIntro'
  | 'setDefault'
  | 'view'
  | 'presetStandardName'
  | 'presetStandardDescription'
  | 'presetPtcName'
  | 'presetPtcDescription'
  | 'presetMinimalName'
  | 'presetMinimalDescription'
  | 'presetCordisName'
  | 'presetCordisDescription'
  | 'inUse'
  | 'noDescription'
  | 'brokenBadge'
  | 'switchRefused'
  | 'close'
  | 'creatorDraft'
  | 'enableDevToolsToSetDefault'
  | 'enableDevToolsToCreate'
  | 'cancel'
  | 'duplicateUnavailable'
  | 'expert.accept'
  | 'expert.accepting'
  | 'expert.back'
  | 'expert.backToEditor'
  | 'expert.changeReasons'
  | 'expert.create'
  | 'expert.createHint'
  | 'expert.dismiss'
  | 'expert.edit'
  | 'expert.editHint'
  | 'expert.empty'
  | 'expert.emptyHint'
  | 'expert.history'
  | 'expert.icon'
  | 'expert.loading'
  | 'expert.loadingVersion'
  | 'expert.manage'
  | 'expert.manageHint'
  | 'expert.menu'
  | 'expert.menuHint'
  | 'expert.name'
  | 'expert.namePlaceholder'
  | 'expert.noChangeTitle'
  | 'expert.noPreviousVersion'
  | 'expert.noWelcome'
  | 'expert.optimize'
  | 'expert.optimizeFailed'
  | 'expert.optimizing'
  | 'expert.optimizingHint'
  | 'expert.original'
  | 'expert.prompt'
  | 'expert.promptPlaceholder'
  | 'expert.reviewTitle'
  | 'expert.revised'
  | 'expert.save'
  | 'expert.saved'
  | 'expert.saving'
  | 'expert.stopOptimization'
  | 'expert.tabTitle'
  | 'expert.version'
  | 'expert.versionLoadFailed'
  | 'expert.versionPrompt'
  | 'expert.versionReview'
  | 'expert.versionReviewHint'
  | 'expert.viewVersion'
  | 'expert.welcome'
  | 'expert.welcomePlaceholder'
  | 'retry'
  | 'expert.icon.sparkles'
  | 'expert.icon.briefcase'
  | 'expert.icon.graduation-cap'
  | 'expert.icon.code'
  | 'expert.icon.chart'
  | 'presetChatName'
  | 'presetChatDescription'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  ...guideEn,
  builtInGroup: 'Built-in', customGroup: 'Custom',
  sectionIntro: 'Choose the agent’s tools and how it works. Use Standard mode for everyday tasks, or Creator mode to add capabilities to DSH.',

  seatHint: 'Choose the agent preset for your new task',
  headerHint: 'The agent preset chosen when this task started',
  nav: 'Agent presets',

  setDefault: 'Set as new task default',
  view: 'View configuration',

  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Work with code, files, and information. Suitable for most tasks, with search, editing, terminal commands, and other tools available as needed.',
  presetPtcName: 'PTC mode',
  presetPtcDescription:
    'Includes all Standard mode capabilities. Better suited to tasks that call tools in batches and then filter, organize, deduplicate, count, or summarize the results.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'The agent works using only a terminal tool. Useful for testing and comparing its basic performance.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Customize DSH through conversation. Let the agent write plugins that add features or UI, or combine tools and prompts to create your own mode.',

  inUse: 'New task default',

  noDescription: 'No description.',
  brokenBadge: 'Failed to load',

  switchRefused: 'Could not switch to {name}: {reason}',

  close: 'Close',

  creatorDraft: 'Let the agent help me create a preset',

  enableDevToolsToSetDefault: 'Turn on Coding Tools in General settings to choose a default',
  enableDevToolsToCreate: 'Turn on Coding Tools in General settings to start Creator mode',
  cancel: 'Cancel',
  duplicateUnavailable: 'This deployment has no writable preset directory',
  'expert.accept': 'Accept new version',
  'expert.accepting': 'Saving version…',

  'expert.back': 'Back to agents',
  'expert.backToEditor': 'Back to agent editor',
  'expert.changeReasons': 'Why these lines changed',
  'expert.create': 'Add agent',
  'expert.createHint': 'Choose an optional icon, then add the welcome message and prompt.',
  'expert.dismiss': 'Keep current prompt',
  'expert.edit': 'Edit {name}',
  'expert.editHint': 'Manual prompt edits create a new version only when the prompt changes.',
  'expert.empty': 'No agents yet',
  'expert.emptyHint': 'Add one agent to start a focused conversation.',
  'expert.history': 'Version history',
  'expert.icon': 'Icon (optional)',
  'expert.loading': 'Loading agents…',
  'expert.loadingVersion': 'Loading version…',
  'expert.manage': 'Agent list',
  'expert.manageHint': 'Conversation prompts with local, reviewable version history.',
  'expert.menu': 'Agents',
  'expert.menuHint': 'Choose or edit a conversation agent',
  'expert.name': 'Name',
  'expert.namePlaceholder': 'Interview coach',
  'expert.noChangeTitle': 'No justified change',
  'expert.noPreviousVersion': 'Before v1',
  'expert.noWelcome': 'No welcome message',
  'expert.optimize': 'Optimize agent prompt',
  'expert.optimizeFailed': 'Prompt optimization failed',
  'expert.optimizing': 'Optimizing prompt…',
  'expert.optimizingHint': 'The refinement skill is checking the conversation evidence and will change only the supported local rule.',
  'expert.original': 'Current prompt',
  'expert.prompt': 'Prompt',
  'expert.promptPlaceholder': 'Write the agent instructions here.',
  'expert.reviewTitle': 'Review the proposed change',
  'expert.revised': 'Proposed prompt',
  'expert.save': 'Save agent',
  'expert.saved': 'Saved',
  'expert.saving': 'Saving…',
  'expert.stopOptimization': 'Stop prompt optimization',
  'expert.tabTitle': 'Agent prompt',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'Could not load this version',
  'expert.versionPrompt': 'v{version} prompt',
  'expert.versionReview': 'v{version} prompt changes',
  'expert.versionReviewHint': 'Read-only comparison with the preceding prompt version.',
  'expert.viewVersion': 'View v{version} prompt changes',
  'expert.welcome': 'Welcome message',
  'expert.welcomePlaceholder': 'Tell me the role and interview you are preparing for.',
  retry: 'Retry',
  'expert.icon.sparkles': 'General agent',
  'expert.icon.briefcase': 'Business agent',
  'expert.icon.graduation-cap': 'Learning agent',
  'expert.icon.code': 'Coding agent',
  'expert.icon.chart': 'Analysis agent',
  presetChatName: 'Chat mode',
  presetChatDescription:
    'General conversation with Standard file tools and no skills, project context, runtime context, or compaction.',
}

/** Simplified Chinese copy. */
export const zh: Record<AgentPresetSettingsKey, string> = {
  ...guideZh,
  builtInGroup: '内置', customGroup: '自定义',
  sectionIntro: '选择 Agent 的工具和工作方式。日常任务用「标准模式」，扩展 DSH 的能力用「创造模式」。',

  seatHint: '选择新任务使用的 Agent 预设',
  headerHint: '本任务的 Agent 预设，在任务开始时确定',
  nav: 'Agent 预设',

  setDefault: '设为新任务默认',
  view: '查看配置',

  presetStandardName: '标准模式',
  presetStandardDescription: '处理代码、文件和资料，适合大多数任务。Agent 会按需使用检索、编辑和终端等工具。',
  presetPtcName: 'PTC 模式',
  presetPtcDescription: '包含标准模式的所有能力，更适合批量调用工具，并对结果进行筛选、整理、去重、统计或汇总的任务。',
  presetMinimalName: '极简模式',
  presetMinimalDescription: 'Agent 仅使用终端工具完成任务，适合测试和对比其基础表现。',
  presetCordisName: '创造模式',
  presetCordisDescription: '用对话定制 DSH：让 Agent 编写插件，添加新功能或界面；也能组合工具和提示词，创建自己的模式。',

  inUse: '新任务默认',

  noDescription: '暂无描述。',
  brokenBadge: '加载失败',

  switchRefused: '无法切换到「{name}」：{reason}',

  close: '关闭',

  creatorDraft: '让 Agent 帮我创建预设模式',

  enableDevToolsToSetDefault: '请先在通用设置中开启代码工作工具，再设置默认值',
  enableDevToolsToCreate: '请先在通用设置中开启代码工作工具，再启动创造模式',
  cancel: '取消',
  duplicateUnavailable: '此部署未配置可写的预设目录',
  'expert.accept': '确认新版本',
  'expert.accepting': '正在保存版本…',

  'expert.back': '返回智能体列表',
  'expert.backToEditor': '返回智能体编辑页',
  'expert.changeReasons': '修改依据',
  'expert.create': '新增智能体',
  'expert.createHint': '图标可选，然后填写欢迎语和提示词。',
  'expert.dismiss': '保留当前版本',
  'expert.edit': '编辑{name}',
  'expert.editHint': '只有提示词发生变化时，手动保存才会新增版本。',
  'expert.empty': '还没有智能体',
  'expert.emptyHint': '先新增一个智能体，再开始有针对性的聊天。',
  'expert.history': '版本记录',
  'expert.icon': '图标（可选）',
  'expert.loading': '正在加载智能体…',
  'expert.loadingVersion': '正在加载版本…',
  'expert.manage': '智能体列表',
  'expert.manageHint': '每个智能体都有独立提示词和可查看的本地版本记录。',
  'expert.menu': '智能体',
  'expert.menuHint': '选择或编辑一个对话智能体',
  'expert.name': '名字',
  'expert.namePlaceholder': '面试模拟智能体',
  'expert.noChangeTitle': '没有足够依据修改',
  'expert.noPreviousVersion': 'v1 创建前',
  'expert.noWelcome': '暂未填写欢迎语',
  'expert.optimize': '优化智能体提示词',
  'expert.optimizeFailed': '提示词优化失败',
  'expert.optimizing': '正在优化提示词…',
  'expert.optimizingHint': '优化 skill 正在核对对话证据，只会修改有依据的局部规则。',
  'expert.original': '当前提示词',
  'expert.prompt': '提示词',
  'expert.promptPlaceholder': '在这里填写智能体提示词。',
  'expert.reviewTitle': '检查建议修改',
  'expert.revised': '建议提示词',
  'expert.save': '保存智能体',
  'expert.saved': '已保存',
  'expert.saving': '正在保存…',
  'expert.stopOptimization': '停止优化提示词',
  'expert.tabTitle': '智能体提示词',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': '无法加载该版本',
  'expert.versionPrompt': 'v{version} 提示词',
  'expert.versionReview': 'v{version} 提示词修改',
  'expert.versionReviewHint': '只读查看该版本与上一版提示词的差异。',
  'expert.viewVersion': '查看 v{version} 提示词修改',
  'expert.welcome': '欢迎语',
  'expert.welcomePlaceholder': '告诉我你要准备的岗位和面试类型。',
  retry: '重试',
  'expert.icon.sparkles': '通用智能体',
  'expert.icon.briefcase': '商务智能体',
  'expert.icon.graduation-cap': '学习智能体',
  'expert.icon.code': '编程智能体',
  'expert.icon.chart': '分析智能体',
  presetChatName: '聊天模式',
  presetChatDescription: '用于通用对话，支持标准文件工具，不加载 Skills、项目上下文、运行时上下文或压缩。',
}

// The resolution itself is the shared fold in `dsh-agent-preset-registry/display`,
// re-exported here so every surface in this plugin reads one path; the
// Settings plugin list inlines the same fold over this plugin's dictionaries.
export { isBuiltInPreset, presetDisplayText } from '@deepseek-ai/dsh-agent-preset-registry/display'
export type { PresetDisplaySource, PresetDisplayText } from '@deepseek-ai/dsh-agent-preset-registry/display'

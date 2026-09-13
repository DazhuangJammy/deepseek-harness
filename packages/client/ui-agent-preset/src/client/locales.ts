/** Locale bundles for the agent-preset hero chip, header label, and management section. */

/** Locale keys these surfaces render. */
export type AgentPresetSettingsKey =
  | 'error' | 'userTrust' | 'seatHint' | 'headerHint'
  | 'nav' | 'sectionIntro' | 'builtIn' | 'setDefault' | 'view'
  | 'presetStandardName' | 'presetStandardDescription'
  | 'presetPtcName' | 'presetPtcDescription'
  | 'presetMinimalName' | 'presetMinimalDescription'
  | 'presetCordisName' | 'presetCordisDescription'
  | 'presetChatName' | 'presetChatDescription'
  | 'duplicate' | 'duplicateUnavailable' | 'delete' | 'presetId' | 'presetIdPlaceholder' | 'copyOf'
  | 'displayName' | 'displayNamePlaceholder'
  | 'inUse' | 'selectionOffDefault' | 'noDescription' | 'builtInGroup' | 'customGroup'
  | 'brokenBadge' | 'brokenNoCopy' | 'switchRefused'
  | 'composition' | 'cancel' | 'close' | 'retry'
  | 'copyTitle' | 'copyIntro' | 'create' | 'creating' | 'creatorDraft'
  | 'openLocation' | 'showLocation' | 'revealedPathLabel'
  | 'idRequired' | 'idInvalid' | 'idTaken'
  | 'deleteTitle' | 'deleteDescription' | 'deleteConfirm' | 'deleting'
  | 'showPicker' | 'showPickerBeta' | 'showPickerDescription'
  | 'enablePickerToSetDefault' | 'enablePickerToCreate'
  | 'expert.menu' | 'expert.menuHint' | 'expert.tabTitle' | 'expert.manage' | 'expert.manageHint'
  | 'expert.create' | 'expert.createHint' | 'expert.edit' | 'expert.editHint' | 'expert.back'
  | 'expert.name' | 'expert.namePlaceholder'
  | 'expert.icon' | 'expert.icon.sparkles' | 'expert.icon.briefcase' | 'expert.icon.graduation-cap'
  | 'expert.icon.code' | 'expert.icon.chart' | 'expert.welcome' | 'expert.welcomePlaceholder'
  | 'expert.prompt' | 'expert.promptPlaceholder' | 'expert.save' | 'expert.saving' | 'expert.saved'
  | 'expert.history' | 'expert.version' | 'expert.noWelcome' | 'expert.empty' | 'expert.emptyHint'
  | 'expert.viewVersion' | 'expert.versionReview' | 'expert.versionReviewHint' | 'expert.versionPrompt'
  | 'expert.noPreviousVersion' | 'expert.backToEditor' | 'expert.loadingVersion' | 'expert.versionLoadFailed'
  | 'expert.loading' | 'expert.optimize' | 'expert.optimizing' | 'expert.optimizingHint'
  | 'expert.stopOptimization'
  | 'expert.optimizeFailed' | 'expert.refinement' | 'expert.reviewTitle' | 'expert.noChangeTitle'
  | 'expert.original' | 'expert.revised' | 'expert.changeReasons' | 'expert.dismiss'
  | 'expert.accept' | 'expert.accepting'

/** English copy. */
export const en: Record<AgentPresetSettingsKey, string> = {
  error: 'Could not load agent presets.',
  userTrust: 'Custom',
  seatHint: 'Agent preset for the session you are about to start',
  headerHint: 'The agent preset this session runs, fixed when it started',
  nav: 'Agent presets',
  sectionIntro:
    'A preset is the plugin composition one session\'s agent runs — its tools, prompt, and capabilities. '
    + 'Duplicate an existing one and make it yours, or let the agent draft one for you in Creator mode.',
  builtIn: 'Built-in',
  setDefault: 'Set as default',
  view: 'View',
  presetStandardName: 'Standard mode',
  presetStandardDescription:
    'Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.',
  presetPtcName: 'PTC mode',
  presetPtcDescription:
    'Full coding agent without the workflow tool; other tools are exposed through the PTC mode SDK so the model can combine multi-step operations in one TypeScript program.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription:
    'Single-tool coding agent with a persistent shell.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.',
  presetChatName: 'Chat mode',
  presetChatDescription:
    'General conversation with Standard file tools and no skills, project context, runtime context, or compaction.',
  duplicate: 'Duplicate',
  duplicateUnavailable: 'This deployment has no writable preset directory',
  delete: 'Delete',
  presetId: 'Identifier',
  presetIdPlaceholder: 'my-agent',
  displayName: 'Name',
  displayNamePlaceholder: 'Shown in the picker; defaults to the identifier',
  inUse: 'New task default',
  selectionOffDefault: 'Default',
  builtInGroup: 'Built-in',
  customGroup: 'Custom',
  noDescription: 'No description.',
  brokenBadge: 'Failed to load',
  brokenNoCopy: 'A preset that failed to load cannot be duplicated',
  switchRefused: 'Could not switch to {name}: {reason}',
  copyOf: 'Copied from',
  composition: 'Composition (agent.cordis.yml)',
  cancel: 'Cancel',
  close: 'Close',
  retry: 'Retry',
  copyTitle: 'Duplicate preset',
  copyIntro:
    'The whole preset is copied on this machine. The identifier becomes its directory name and cannot '
    + 'be changed later; everything else is edited in the preset\'s own files.',
  create: 'Create',
  creating: 'Creating…',
  creatorDraft: 'Draft a custom preset with Creator mode',
  openLocation: 'Open folder',
  showLocation: 'Show location',
  revealedPathLabel: 'Preset files:',
  idRequired: 'Give the preset an identifier.',
  idInvalid: 'Use lowercase letters, digits, and hyphens, starting with a letter or digit.',
  idTaken: 'A preset with this identifier already exists.',
  deleteTitle: 'Delete this preset?',
  deleteDescription:
    'The preset directory is deleted. Sessions already running on it keep working; new sessions cannot select it.',
  deleteConfirm: 'Delete',
  deleting: 'Deleting…',
  showPicker: 'Allow switching Agent modes',
  showPickerBeta: 'Beta',
  showPickerDescription:
    'When enabled, new tasks can choose Standard, PTC, Creator, Minimal, and custom modes. When disabled, all new tasks use the default mode (Standard by default; configurable). Only affects new tasks.',
  enablePickerToSetDefault: 'Turn on Agent mode selection to choose a default',
  enablePickerToCreate: 'Turn on Agent mode selection to start Creator mode',
  'expert.menu': 'Agents',
  'expert.menuHint': 'Choose or edit a conversation agent',
  'expert.tabTitle': 'Agent prompt',
  'expert.manage': 'Agent list',
  'expert.manageHint': 'Conversation prompts with local, reviewable version history.',
  'expert.create': 'Add agent',
  'expert.createHint': 'Choose an optional icon, then add the welcome message and prompt.',
  'expert.edit': 'Edit {name}',
  'expert.editHint': 'Manual prompt edits create a new version only when the prompt changes.',
  'expert.back': 'Back to agents',
  'expert.name': 'Name',
  'expert.namePlaceholder': 'Interview coach',
  'expert.icon': 'Icon (optional)',
  'expert.icon.sparkles': 'General agent',
  'expert.icon.briefcase': 'Business agent',
  'expert.icon.graduation-cap': 'Learning agent',
  'expert.icon.code': 'Coding agent',
  'expert.icon.chart': 'Analysis agent',
  'expert.welcome': 'Welcome message',
  'expert.welcomePlaceholder': 'Tell me the role and interview you are preparing for.',
  'expert.prompt': 'Prompt',
  'expert.promptPlaceholder': 'Write the agent instructions here.',
  'expert.save': 'Save agent',
  'expert.saving': 'Saving…',
  'expert.saved': 'Saved',
  'expert.history': 'Version history',
  'expert.version': 'v{version}',
  'expert.viewVersion': 'View v{version} prompt changes',
  'expert.versionReview': 'v{version} prompt changes',
  'expert.versionReviewHint': 'Read-only comparison with the preceding prompt version.',
  'expert.versionPrompt': 'v{version} prompt',
  'expert.noPreviousVersion': 'Before v1',
  'expert.backToEditor': 'Back to agent editor',
  'expert.loadingVersion': 'Loading version…',
  'expert.versionLoadFailed': 'Could not load this version',
  'expert.noWelcome': 'No welcome message',
  'expert.empty': 'No agents yet',
  'expert.emptyHint': 'Add one agent to start a focused conversation.',
  'expert.loading': 'Loading agents…',
  'expert.optimize': 'Optimize agent prompt',
  'expert.optimizing': 'Optimizing prompt…',
  'expert.optimizingHint': 'The refinement skill is checking the conversation evidence and will change only the supported local rule.',
  'expert.stopOptimization': 'Stop prompt optimization',
  'expert.optimizeFailed': 'Prompt optimization failed',
  'expert.refinement': 'Prompt refinement',
  'expert.reviewTitle': 'Review the proposed change',
  'expert.noChangeTitle': 'No justified change',
  'expert.original': 'Current prompt',
  'expert.revised': 'Proposed prompt',
  'expert.changeReasons': 'Why these lines changed',
  'expert.dismiss': 'Keep current prompt',
  'expert.accept': 'Accept new version',
  'expert.accepting': 'Saving version…',
}

/** Simplified Chinese copy. */
export const zh: Record<AgentPresetSettingsKey, string> = {
  error: '无法加载 Agent 预设。',
  userTrust: '自定义',
  seatHint: '即将开始的这个会话所用的 Agent 预设',
  headerHint: '本会话运行的 Agent 预设，开始时即固定',
  nav: 'Agent 预设',
  sectionIntro: '预设即一个会话的 Agent 所运行的插件组装 —— 它的工具、提示词与能力。复制一份既有预设改成自己的，或用「创造模式」让 Agent 帮你创建。',
  builtIn: '内置',
  setDefault: '设为默认',
  view: '查看',
  presetStandardName: '标准模式',
  presetStandardDescription: '功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。',
  presetPtcName: 'PTC 模式',
  presetPtcDescription: '功能完整的编码 Agent，但默认不提供 workflow 工具；其他工具通过 PTC 模式 SDK 呈现，让模型用一个 TypeScript 程序组合多步操作。',
  presetMinimalName: '极简模式',
  presetMinimalDescription: '仅提供持久 shell 的单工具编码 Agent。',
  presetCordisName: '创造模式',
  presetCordisDescription: '用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。',
  presetChatName: '聊天模式',
  presetChatDescription: '用于通用对话，支持标准文件工具，不加载 Skills、项目上下文、运行时上下文或压缩。',
  duplicate: '复制',
  duplicateUnavailable: '此部署未配置可写的预设目录',
  delete: '删除',
  presetId: '标识符',
  presetIdPlaceholder: 'my-agent',
  displayName: '名称',
  displayNamePlaceholder: '选择器中显示的名字，缺省用标识符',
  inUse: '新任务默认',
  selectionOffDefault: '默认',
  builtInGroup: '内置',
  customGroup: '自定义',
  noDescription: '暂无描述。',
  brokenBadge: '加载失败',
  brokenNoCopy: '预设加载失败，不能复制',
  switchRefused: '无法切换到「{name}」：{reason}',
  copyOf: '复制自',
  composition: '组装（agent.cordis.yml）',
  cancel: '取消',
  close: '关闭',
  retry: '重试',
  copyTitle: '复制预设',
  copyIntro: '整个预设会在本机复制一份。标识符将成为目录名，事后无法更改；其余内容之后直接在预设自己的文件里编辑。',
  create: '创建',
  creating: '正在创建…',
  creatorDraft: '用「创造模式」创作自定义预设',
  openLocation: '打开目录',
  showLocation: '查看路径',
  revealedPathLabel: '预设文件：',
  idRequired: '请填写标识符。',
  idInvalid: '只能使用小写字母、数字与连字符，且以字母或数字开头。',
  idTaken: '该标识符已被占用。',
  deleteTitle: '删除该预设？',
  deleteDescription: '预设目录将被删除。已在其上运行的会话不受影响；新会话将无法再选择它。',
  deleteConfirm: '删除',
  deleting: '正在删除…',
  showPicker: '允许切换agent模式',
  showPickerBeta: 'beta',
  showPickerDescription: '开启后，新任务可选择标准、PTC、创造、极简及自定义模式；关闭后统一使用默认模式（默认为标准模式，可自定义）。仅影响新任务。',
  enablePickerToSetDefault: '请先开启 Agent 模式选择，再设置默认模式',
  enablePickerToCreate: '请先开启 Agent 模式选择，再启动创造模式',
  'expert.menu': '智能体',
  'expert.menuHint': '选择或编辑一个对话智能体',
  'expert.tabTitle': '智能体提示词',
  'expert.manage': '智能体列表',
  'expert.manageHint': '每个智能体都有独立提示词和可查看的本地版本记录。',
  'expert.create': '新增智能体',
  'expert.createHint': '图标可选，然后填写欢迎语和提示词。',
  'expert.edit': '编辑{name}',
  'expert.editHint': '只有提示词发生变化时，手动保存才会新增版本。',
  'expert.back': '返回智能体列表',
  'expert.name': '名字',
  'expert.namePlaceholder': '面试模拟智能体',
  'expert.icon': '图标（可选）',
  'expert.icon.sparkles': '通用智能体',
  'expert.icon.briefcase': '商务智能体',
  'expert.icon.graduation-cap': '学习智能体',
  'expert.icon.code': '编程智能体',
  'expert.icon.chart': '分析智能体',
  'expert.welcome': '欢迎语',
  'expert.welcomePlaceholder': '告诉我你要准备的岗位和面试类型。',
  'expert.prompt': '提示词',
  'expert.promptPlaceholder': '在这里填写智能体提示词。',
  'expert.save': '保存智能体',
  'expert.saving': '正在保存…',
  'expert.saved': '已保存',
  'expert.history': '版本记录',
  'expert.version': 'v{version}',
  'expert.viewVersion': '查看 v{version} 提示词修改',
  'expert.versionReview': 'v{version} 提示词修改',
  'expert.versionReviewHint': '只读查看该版本与上一版提示词的差异。',
  'expert.versionPrompt': 'v{version} 提示词',
  'expert.noPreviousVersion': 'v1 创建前',
  'expert.backToEditor': '返回智能体编辑页',
  'expert.loadingVersion': '正在加载版本…',
  'expert.versionLoadFailed': '无法加载该版本',
  'expert.noWelcome': '暂未填写欢迎语',
  'expert.empty': '还没有智能体',
  'expert.emptyHint': '先新增一个智能体，再开始有针对性的聊天。',
  'expert.loading': '正在加载智能体…',
  'expert.optimize': '优化智能体提示词',
  'expert.optimizing': '正在优化提示词…',
  'expert.optimizingHint': '优化 skill 正在核对对话证据，只会修改有依据的局部规则。',
  'expert.stopOptimization': '停止优化提示词',
  'expert.optimizeFailed': '提示词优化失败',
  'expert.refinement': '提示词优化',
  'expert.reviewTitle': '检查建议修改',
  'expert.noChangeTitle': '没有足够依据修改',
  'expert.original': '当前提示词',
  'expert.revised': '建议提示词',
  'expert.changeReasons': '修改依据',
  'expert.dismiss': '保留当前版本',
  'expert.accept': '确认新版本',
  'expert.accepting': '正在保存版本…',
}

// The resolution itself is the shared fold in `dsh-agent-presets/display`,
// re-exported here so every surface in this plugin reads one path; the
// Settings plugin list inlines the same fold over this plugin's dictionaries.
export { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
export type { PresetDisplaySource, PresetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'

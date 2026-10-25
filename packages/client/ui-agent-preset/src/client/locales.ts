/** Locale bundles for the agent-preset hero chip, header label, and management section. */

import { guideEn, guideJa, guideEs, guideFr, guideDe, guideRu, guidePt, guideZh, type PresetGuideKey } from './guide-locales.ts'

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
  | 'standardUnavailable'
  | 'close'
  | 'creatorDraft'
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
  | 'createPlugin'
  | 'createPluginDescription'
  | 'createPluginChecking'
  | 'createPluginUnavailable'
  | 'createPluginMissing'

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
    'The agent uses a terminal and image reading, with context compaction. Useful for testing and comparing its basic performance.',
  presetCordisName: 'Creator mode',
  presetCordisDescription:
    'Customize DSH through conversation. Let the agent write plugins that add features or UI, or combine tools and prompts to create your own mode.',

  inUse: 'New task default',

  noDescription: 'No description.',
  brokenBadge: 'Failed to load',

  switchRefused: 'Could not switch to {name}: {reason}',
  standardUnavailable: 'Standard mode is unavailable. Restore it or choose another available mode.',

  close: 'Close',

  creatorDraft: 'Let the agent help me create a preset',
  createPlugin: 'Let the agent create a plugin',
  createPluginDescription: 'Enter Creator mode and make your own DSH plugin',
  createPluginChecking: 'Checking whether Creator mode is available',
  createPluginUnavailable: 'Temporarily unavailable. Reopen this menu to retry',
  createPluginMissing: 'Creator mode is not included in this configuration',

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
  presetMinimalDescription: 'Agent 使用终端和图片读取工具，并支持上下文压缩，适合测试和对比其基础表现。',
  presetCordisName: '创造模式',
  presetCordisDescription: '用对话定制 DSH：让 Agent 编写插件，添加新功能或界面；也能组合工具和提示词，创建自己的模式。',

  inUse: '新任务默认',

  noDescription: '暂无描述。',
  brokenBadge: '加载失败',

  switchRefused: '无法切换到「{name}」：{reason}',
  standardUnavailable: '标准模式不可用，请恢复该模式或选择其他可用模式。',

  close: '关闭',

  creatorDraft: '让 Agent 帮我创建预设模式',
  createPlugin: '让 Agent 创建插件',
  createPluginDescription: '进入创造模式，制作属于你的 DSH 插件',
  createPluginChecking: '正在确认创造模式是否可用',
  createPluginUnavailable: '暂时不可用，请重新打开菜单重试',
  createPluginMissing: '当前配置未提供创造模式',

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

/** Japanese copy, checked against the English keys. */
export const ja = {
  ...guideJa,
  'builtInGroup': '組み込み',
  'customGroup': 'カスタム',
  'sectionIntro': 'エージェントのツールと動作を選択します。日々のタスクには標準モードを、DSH に機能を追加するにはクリエイターモードを使用してください。',
  'seatHint': '新しいタスクで使用するエージェントプリセットを選択',
  'headerHint': 'このタスクの開始時に選択されたエージェントプリセット',
  'nav': 'エージェントプリセット',
  'setDefault': '新しいタスクの既定に設定',
  'view': '設定を表示',
  'presetStandardName': '標準モード',
  'presetStandardDescription': 'コード、ファイル、情報を扱います。検索、編集、ターミナルコマンドなどのツールを必要に応じて利用でき、ほとんどのタスクに適しています。',
  'presetPtcName': 'PTC モード',
  'presetPtcDescription': '標準モードのすべての機能を含みます。ツールを一括で呼び出し、その結果を絞り込み、整理、重複排除、集計、要約するタスクに適しています。',
  'presetMinimalName': '最小モード',
  'presetMinimalDescription': 'エージェントはターミナルと画像読み取りを使用し、コンテキスト圧縮にも対応します。基本的な性能のテストや比較に役立ちます。',
  'presetCordisName': 'クリエイターモード',
  'presetCordisDescription': '会話を通じて DSH をカスタマイズします。機能や UI を追加するプラグインをエージェントに書かせたり、ツールとプロンプトを組み合わせて独自のモードを作成したりできます。',
  'inUse': '新しいタスクの既定',
  'noDescription': '説明はありません。',
  'brokenBadge': '読み込みに失敗',
  'switchRefused': '{name} に切り替えられませんでした: {reason}',
  'standardUnavailable': '標準モードは利用できません。復元するか、利用可能な別のモードを選択してください。',
  'close': '閉じる',
  'creatorDraft': 'エージェントにプリセット作成を手伝ってもらう',
  'createPlugin': 'エージェントにプラグインを作成してもらう',
  'createPluginDescription': 'クリエイターモードに入り、独自の DSH プラグインを作成',
  'createPluginChecking': 'クリエイターモードが利用可能か確認中',
  'createPluginUnavailable': '一時的に利用できません。このメニューを開き直して再試行してください',
  'createPluginMissing': 'この構成にはクリエイターモードが含まれていません',
  cancel: 'キャンセル',
  duplicateUnavailable: 'このデプロイには書き込み可能なプリセットディレクトリがありません',
  'expert.accept': '新しいバージョンを確定',
  'expert.accepting': 'バージョンを保存中…',
  'expert.back': 'エージェント一覧に戻る',
  'expert.backToEditor': 'エージェント編集画面に戻る',
  'expert.changeReasons': '変更理由',
  'expert.create': 'エージェントを追加',
  'expert.createHint': 'アイコンは任意です。ウェルカムメッセージとプロンプトを入力してください。',
  'expert.dismiss': '現在のプロンプトを保持',
  'expert.edit': '{name}を編集',
  'expert.editHint': 'プロンプトを手動で編集した場合、プロンプトが変更されたときだけ新しいバージョンが作成されます。',
  'expert.empty': 'エージェントはまだありません',
  'expert.emptyHint': 'エージェントを1つ追加すると、目的に特化した会話を始められます。',
  'expert.history': 'バージョン履歴',
  'expert.icon': 'アイコン（任意）',
  'expert.loading': 'エージェントを読み込み中…',
  'expert.loadingVersion': 'バージョンを読み込み中…',
  'expert.manage': 'エージェント一覧',
  'expert.manageHint': '会話用プロンプトを、ローカルで確認できるバージョン履歴とともに管理します。',
  'expert.menu': 'エージェント',
  'expert.menuHint': '会話用エージェントを選択または編集',
  'expert.name': '名前',
  'expert.namePlaceholder': '面接コーチ',
  'expert.noChangeTitle': '根拠のある変更はありません',
  'expert.noPreviousVersion': 'v1 より前',
  'expert.noWelcome': 'ウェルカムメッセージなし',
  'expert.optimize': 'エージェントのプロンプトを最適化',
  'expert.optimizeFailed': 'プロンプトの最適化に失敗しました',
  'expert.optimizing': 'プロンプトを最適化中…',
  'expert.optimizingHint': '最適化スキルが会話の内容を確認しており、裏付けのあるローカルルールのみを変更します。',
  'expert.original': '現在のプロンプト',
  'expert.prompt': 'プロンプト',
  'expert.promptPlaceholder': 'ここにエージェントへの指示を入力してください。',
  'expert.reviewTitle': '提案された変更を確認',
  'expert.revised': '提案されたプロンプト',
  'expert.save': 'エージェントを保存',
  'expert.saved': '保存済み',
  'expert.saving': '保存中…',
  'expert.stopOptimization': 'プロンプトの最適化を停止',
  'expert.tabTitle': 'エージェントのプロンプト',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'このバージョンを読み込めませんでした',
  'expert.versionPrompt': 'v{version} のプロンプト',
  'expert.versionReview': 'v{version} のプロンプト変更',
  'expert.versionReviewHint': '前のバージョンのプロンプトとの差分を読み取り専用で表示します。',
  'expert.viewVersion': 'v{version} のプロンプト変更を表示',
  'expert.welcome': 'ウェルカムメッセージ',
  'expert.welcomePlaceholder': '準備している職種と面接の内容を教えてください。',
  retry: '再試行',
  'expert.icon.sparkles': '汎用エージェント',
  'expert.icon.briefcase': 'ビジネスエージェント',
  'expert.icon.graduation-cap': '学習エージェント',
  'expert.icon.code': 'コーディングエージェント',
  'expert.icon.chart': '分析エージェント',
  presetChatName: 'チャットモード',
  presetChatDescription: '汎用的な会話向けで、標準モードのファイルツールを使用します。スキル、プロジェクトコンテキスト、ランタイムコンテキスト、コンテキスト圧縮は含まれません。',
} satisfies Record<keyof typeof en, string>

/** Spanish dictionary, checked against the English keys. */
export const es = {
  ...guideEs,
  builtInGroup: 'Incorporado', customGroup: 'personalizado',
  sectionIntro: 'Elija las herramientas del agente y cómo funciona. Utilice el modo Estándar para las tareas diarias o el modo Creador para agregar capacidades a DSH.',

  seatHint: 'Elija el agente preestablecido para su nueva tarea',
  headerHint: 'El agente preestablecido elegido cuando comenzó esta tarea',
  nav: 'Ajustes preestablecidos del agente',

  setDefault: 'Establecer como nueva tarea predeterminada',
  view: 'Ver configuración',

  presetStandardName: 'Modo estándar',
  presetStandardDescription:
    'Trabaje con código, archivos e información. Adecuado para la mayoría de las tareas, con búsqueda, edición, comandos de terminal y otras herramientas disponibles según sea necesario.',
  presetPtcName: 'Modo PTC',
  presetPtcDescription:
    'Incluye todas las capacidades del modo Estándar. Más adecuado para tareas que llaman a herramientas en lotes y luego filtran, organizan, deduplican, cuentan o resumen los resultados.',
  presetMinimalName: 'modo mínimo',
  presetMinimalDescription:
    'El agente utiliza un terminal y lectura de imágenes, con compactación de contexto. Útil para probar y comparar su rendimiento básico.',
  presetCordisName: 'Modo creador',
  presetCordisDescription:
    'Personaliza DSH a través de la conversación. Deje que el agente escriba complementos que agreguen funciones o interfaz de usuario, o combine herramientas e indicaciones para crear su propio modo.',

  inUse: 'Nueva tarea predeterminada',

  noDescription: 'Sin descripción.',
  brokenBadge: 'No se pudo cargar',

  switchRefused: 'No se pudo cambiar a {name}: {reason}',
  standardUnavailable: 'El modo estándar no está disponible. Restáuralo o elige otro modo disponible.',

  close: 'Cerrar',

  creatorDraft: 'Deja que el agente me ayude a crear un preset',
  createPlugin: 'Deje que el agente cree un complemento',
  createPluginDescription: 'Ingrese al modo Creador y cree su propio complemento DSH',
  createPluginChecking: 'Comprobando si el modo Creador está disponible',
  createPluginUnavailable: 'Temporalmente no disponible. Vuelve a abrir este menú para volver a intentarlo.',
  createPluginMissing: 'El modo creador no está incluido en esta configuración.',

  cancel: 'Cancelar',
  duplicateUnavailable: 'Esta implementación no tiene un directorio de ajustes preestablecidos con permiso de escritura',
  'expert.accept': 'Aceptar nueva versión',
  'expert.accepting': 'Guardando la versión…',
  'expert.back': 'Volver a los agentes',
  'expert.backToEditor': 'Volver al editor del agente',
  'expert.changeReasons': 'Por qué cambiaron estas líneas',
  'expert.create': 'Agregar agente',
  'expert.createHint': 'Elija un icono opcional y agregue el mensaje de bienvenida y las indicaciones.',
  'expert.dismiss': 'Mantener las indicaciones actuales',
  'expert.edit': 'Editar {name}',
  'expert.editHint': 'Editar las indicaciones manualmente solo crea una nueva versión si cambian.',
  'expert.empty': 'Aún no hay agentes',
  'expert.emptyHint': 'Agregue un agente para iniciar una conversación enfocada.',
  'expert.history': 'Historial de versiones',
  'expert.icon': 'Icono (opcional)',
  'expert.loading': 'Cargando agentes…',
  'expert.loadingVersion': 'Cargando la versión…',
  'expert.manage': 'Lista de agentes',
  'expert.manageHint': 'Indicaciones de conversación con historial de versiones local y revisable.',
  'expert.menu': 'Agentes',
  'expert.menuHint': 'Elegir o editar un agente de conversación',
  'expert.name': 'Nombre',
  'expert.namePlaceholder': 'Entrenador de entrevistas',
  'expert.noChangeTitle': 'No hay ningún cambio justificado',
  'expert.noPreviousVersion': 'Antes de v1',
  'expert.noWelcome': 'Sin mensaje de bienvenida',
  'expert.optimize': 'Optimizar las indicaciones del agente',
  'expert.optimizeFailed': 'No se pudieron optimizar las indicaciones',
  'expert.optimizing': 'Optimizando las indicaciones…',
  'expert.optimizingHint': 'La habilidad de refinamiento está revisando la evidencia de la conversación y solo cambiará la regla local respaldada.',
  'expert.original': 'Indicaciones actuales',
  'expert.prompt': 'Indicaciones',
  'expert.promptPlaceholder': 'Escriba aquí las instrucciones del agente.',
  'expert.reviewTitle': 'Revise el cambio propuesto',
  'expert.revised': 'Indicaciones propuestas',
  'expert.save': 'Guardar agente',
  'expert.saved': 'Guardado',
  'expert.saving': 'Guardando…',
  'expert.stopOptimization': 'Detener la optimización de las indicaciones',
  'expert.tabTitle': 'Indicaciones del agente',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'No se pudo cargar esta versión',
  'expert.versionPrompt': 'Indicaciones de v{version}',
  'expert.versionReview': 'Cambios en las indicaciones de v{version}',
  'expert.versionReviewHint': 'Comparación de solo lectura con la versión anterior de las indicaciones.',
  'expert.viewVersion': 'Ver los cambios en las indicaciones de v{version}',
  'expert.welcome': 'Mensaje de bienvenida',
  'expert.welcomePlaceholder': 'Cuénteme el puesto y la entrevista para la que se está preparando.',
  retry: 'Reintentar',
  'expert.icon.sparkles': 'Agente general',
  'expert.icon.briefcase': 'Agente de negocios',
  'expert.icon.graduation-cap': 'Agente de aprendizaje',
  'expert.icon.code': 'Agente de programación',
  'expert.icon.chart': 'Agente de análisis',
  presetChatName: 'Modo chat',
  presetChatDescription: 'Conversación general con las herramientas de archivo del modo Estándar, sin habilidades, contexto del proyecto, contexto de tiempo de ejecución ni compactación.',
} satisfies Record<keyof typeof en, string>

/** French dictionary, checked against the English keys. */
export const fr = {
  ...guideFr,
  builtInGroup: 'Intégré', customGroup: 'Personnalisé',
  sectionIntro: 'Choisissez les outils de l’agent et son fonctionnement. Utilisez le mode Standard pour les tâches quotidiennes ou le mode Créateur pour ajouter des fonctionnalités à DSH.',

  seatHint: "Choisissez le préréglage d'agent pour votre nouvelle tâche",
  headerHint: "Le préréglage d'agent choisi au démarrage de cette tâche",
  nav: "Préréglages d'agent",

  setDefault: 'Définir comme nouvelle tâche par défaut',
  view: 'Afficher la configuration',

  presetStandardName: 'Mode standard',
  presetStandardDescription:
    'Travaillez avec du code, des fichiers et des informations. Convient à la plupart des tâches, avec recherche, édition, commandes de terminal et autres outils disponibles selon les besoins.',
  presetPtcName: 'Mode PTC',
  presetPtcDescription:
    'Inclut toutes les fonctionnalités du mode Standard. Mieux adapté aux tâches qui appellent des outils par lots, puis filtrent, organisent, dédupliquent, comptent ou résument les résultats.',
  presetMinimalName: 'Mode minimal',
  presetMinimalDescription:
    "L'agent utilise un terminal et une lecture d'image, avec compactage du contexte. Utile pour tester et comparer ses performances de base.",
  presetCordisName: 'Mode Créateur',
  presetCordisDescription:
    "Personnalisez DSH via la conversation. Laissez l'agent écrire des plugins qui ajoutent des fonctionnalités ou une interface utilisateur, ou combinez des outils et des invites pour créer votre propre mode.",

  inUse: 'Nouvelle tâche par défaut',

  noDescription: 'Aucune description.',
  brokenBadge: 'Échec du chargement',

  switchRefused: 'Impossible de passer à {name} : {reason}',
  standardUnavailable: "Le mode standard n'est pas disponible. Restaurez-le ou choisissez un autre mode disponible.",

  close: 'Fermer',

  creatorDraft: "Laissez l'agent m'aider à créer un préréglage",
  createPlugin: "Laissez l'agent créer un plugin",
  createPluginDescription: 'Entrez en mode Créateur et créez votre propre plugin DSH',
  createPluginChecking: 'Vérifier si le mode Créateur est disponible',
  createPluginUnavailable: 'Temporairement indisponible. Rouvrez ce menu pour réessayer',
  createPluginMissing: "Le mode Créateur n'est pas inclus dans cette configuration",

  cancel: 'Annuler',
  duplicateUnavailable: "Ce déploiement n'a pas de répertoire de préréglages accessible en écriture",
  'expert.accept': 'Accepter la nouvelle version',
  'expert.accepting': 'Enregistrement de la version…',
  'expert.back': 'Retour aux agents',
  'expert.backToEditor': "Retour à l'éditeur de l'agent",
  'expert.changeReasons': 'Pourquoi ces lignes ont changé',
  'expert.create': 'Ajouter un agent',
  'expert.createHint': "Choisissez éventuellement une icône, puis renseignez le message d'accueil et l'invite.",
  'expert.dismiss': "Conserver l'invite actuelle",
  'expert.edit': 'Modifier {name}',
  'expert.editHint': "Les modifications manuelles de l'invite ne créent une nouvelle version que si l'invite change.",
  'expert.empty': 'Aucun agent pour le moment',
  'expert.emptyHint': 'Ajoutez un agent pour démarrer une conversation ciblée.',
  'expert.history': 'Historique des versions',
  'expert.icon': 'Icône (facultatif)',
  'expert.loading': 'Chargement des agents…',
  'expert.loadingVersion': 'Chargement de la version…',
  'expert.manage': 'Liste des agents',
  'expert.manageHint': 'Invites de conversation avec un historique des versions local et consultable.',
  'expert.menu': 'Agents',
  'expert.menuHint': 'Choisir ou modifier un agent de conversation',
  'expert.name': 'Nom',
  'expert.namePlaceholder': "Coach d'entretien",
  'expert.noChangeTitle': 'Aucune modification justifiée',
  'expert.noPreviousVersion': 'Avant la v1',
  'expert.noWelcome': "Aucun message d'accueil",
  'expert.optimize': "Optimiser l'invite de l'agent",
  'expert.optimizeFailed': "Échec de l'optimisation de l'invite",
  'expert.optimizing': "Optimisation de l'invite…",
  'expert.optimizingHint': "La compétence d'optimisation analyse les éléments de la conversation et ne modifiera que la règle locale étayée.",
  'expert.original': 'Invite actuelle',
  'expert.prompt': 'Invite',
  'expert.promptPlaceholder': "Écrivez ici les instructions de l'agent.",
  'expert.reviewTitle': 'Vérifier la modification proposée',
  'expert.revised': 'Invite proposée',
  'expert.save': "Enregistrer l'agent",
  'expert.saved': 'Enregistré',
  'expert.saving': 'Enregistrement…',
  'expert.stopOptimization': "Arrêter l'optimisation de l'invite",
  'expert.tabTitle': "Invite de l'agent",
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'Impossible de charger cette version',
  'expert.versionPrompt': 'Invite v{version}',
  'expert.versionReview': "Modifications de l'invite v{version}",
  'expert.versionReviewHint': "Comparaison en lecture seule avec la version précédente de l'invite.",
  'expert.viewVersion': "Afficher les modifications de l'invite v{version}",
  'expert.welcome': "Message d'accueil",
  'expert.welcomePlaceholder': "Dites-moi le poste et l'entretien que vous préparez.",
  retry: 'Réessayer',
  'expert.icon.sparkles': 'Agent général',
  'expert.icon.briefcase': 'Agent professionnel',
  'expert.icon.graduation-cap': "Agent d'apprentissage",
  'expert.icon.code': 'Agent de programmation',
  'expert.icon.chart': "Agent d'analyse",
  presetChatName: 'Mode Chat',
  presetChatDescription: "Conversation générale avec les outils de fichiers standard, sans compétences, ni contexte de projet, ni contexte d'exécution, ni compactage.",
} satisfies Record<keyof typeof en, string>

/** German dictionary, checked against the English keys. */
export const de = {
  ...guideDe,
  builtInGroup: 'Eingebaut', customGroup: 'Benutzerdefiniert',
  sectionIntro: 'Wählen Sie die Tools des Agenten und deren Funktionsweise aus. Verwenden Sie den Standardmodus für alltägliche Aufgaben oder den Creator-Modus, um DSH Funktionen hinzuzufügen.',

  seatHint: 'Wählen Sie die Agentenvoreinstellung für Ihre neue Aufgabe',
  headerHint: 'Die Agentenvoreinstellung, die beim Start dieser Aufgabe ausgewählt wurde',
  nav: 'Agentenvoreinstellungen',

  setDefault: 'Als Standard für neue Aufgabe festlegen',
  view: 'Konfiguration anzeigen',

  presetStandardName: 'Standardmodus',
  presetStandardDescription:
    'Arbeiten Sie mit Code, Dateien und Informationen. Geeignet für die meisten Aufgaben, da bei Bedarf Suche, Bearbeitung, Terminalbefehle und andere Tools verfügbar sind.',
  presetPtcName: 'PTC-Modus',
  presetPtcDescription:
    'Beinhaltet alle Funktionen des Standardmodus. Besser geeignet für Aufgaben, bei denen Tools stapelweise aufgerufen und die Ergebnisse dann gefiltert, organisiert, dedupliziert, gezählt oder zusammengefasst werden.',
  presetMinimalName: 'Minimalmodus',
  presetMinimalDescription:
    'Der Agent verwendet ein Terminal und das Lesen von Bildern mit Kontextkomprimierung. Nützlich zum Testen und Vergleichen der Grundleistung.',
  presetCordisName: 'Erstellermodus',
  presetCordisDescription:
    'Passen Sie DSH durch Gespräche an. Lassen Sie den Agenten Plugins schreiben, die Funktionen oder Benutzeroberflächen hinzufügen, oder kombinieren Sie Tools und Eingabeaufforderungen, um Ihren eigenen Modus zu erstellen.',

  inUse: 'Neuer Aufgabenstandard',

  noDescription: 'Keine Beschreibung.',
  brokenBadge: 'Laden fehlgeschlagen',

  switchRefused: 'Konnte nicht zu {name} wechseln: {reason}',
  standardUnavailable: 'Der Standardmodus ist nicht verfügbar. Stellen Sie es wieder her oder wählen Sie einen anderen verfügbaren Modus.',

  close: 'Schließen',

  creatorDraft: 'Lassen Sie sich vom Agenten beim Erstellen einer Voreinstellung helfen',
  createPlugin: 'Lassen Sie den Agenten ein Plugin erstellen',
  createPluginDescription: 'Wechseln Sie in den Erstellermodus und erstellen Sie Ihr eigenes DSH-Plugin',
  createPluginChecking: 'Prüfen, ob der Creator-Modus verfügbar ist',
  createPluginUnavailable: 'Vorübergehend nicht verfügbar. Öffnen Sie dieses Menü erneut, um es erneut zu versuchen',
  createPluginMissing: 'Der Creator-Modus ist in dieser Konfiguration nicht enthalten',

  cancel: 'Abbrechen',
  duplicateUnavailable: 'Diese Bereitstellung hat kein beschreibbares Verzeichnis für Voreinstellungen',
  'expert.accept': 'Neue Version übernehmen',
  'expert.accepting': 'Version wird gespeichert…',
  'expert.back': 'Zurück zu den Agenten',
  'expert.backToEditor': 'Zurück zum Agenteneditor',
  'expert.changeReasons': 'Warum diese Zeilen geändert wurden',
  'expert.create': 'Agent hinzufügen',
  'expert.createHint': 'Wählen Sie optional ein Symbol und geben Sie dann die Willkommensnachricht und den Prompt ein.',
  'expert.dismiss': 'Aktuellen Prompt behalten',
  'expert.edit': '{name} bearbeiten',
  'expert.editHint': 'Manuelle Änderungen am Prompt erstellen nur dann eine neue Version, wenn sich der Prompt ändert.',
  'expert.empty': 'Noch keine Agenten',
  'expert.emptyHint': 'Fügen Sie einen Agenten hinzu, um ein zielgerichtetes Gespräch zu beginnen.',
  'expert.history': 'Versionsverlauf',
  'expert.icon': 'Symbol (optional)',
  'expert.loading': 'Agenten werden geladen…',
  'expert.loadingVersion': 'Version wird geladen…',
  'expert.manage': 'Agentenliste',
  'expert.manageHint': 'Prompts für Gespräche mit lokalem, überprüfbarem Versionsverlauf.',
  'expert.menu': 'Agenten',
  'expert.menuHint': 'Agenten für Gespräche auswählen oder bearbeiten',
  'expert.name': 'Name',
  'expert.namePlaceholder': 'Interview-Coach',
  'expert.noChangeTitle': 'Keine gerechtfertigte Änderung',
  'expert.noPreviousVersion': 'Vor v1',
  'expert.noWelcome': 'Keine Willkommensnachricht',
  'expert.optimize': 'Agenten-Prompt optimieren',
  'expert.optimizeFailed': 'Prompt-Optimierung fehlgeschlagen',
  'expert.optimizing': 'Prompt wird optimiert…',
  'expert.optimizingHint': 'Der Optimierungs-Skill prüft die Gesprächsbelege und ändert nur die belegte lokale Regel.',
  'expert.original': 'Aktueller Prompt',
  'expert.prompt': 'Prompt',
  'expert.promptPlaceholder': 'Geben Sie hier die Anweisungen für den Agenten ein.',
  'expert.reviewTitle': 'Vorgeschlagene Änderung prüfen',
  'expert.revised': 'Vorgeschlagener Prompt',
  'expert.save': 'Agent speichern',
  'expert.saved': 'Gespeichert',
  'expert.saving': 'Wird gespeichert…',
  'expert.stopOptimization': 'Prompt-Optimierung beenden',
  'expert.tabTitle': 'Agenten-Prompt',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'Diese Version konnte nicht geladen werden',
  'expert.versionPrompt': 'Prompt v{version}',
  'expert.versionReview': 'Änderungen am Prompt v{version}',
  'expert.versionReviewHint': 'Schreibgeschützter Vergleich mit der vorherigen Version des Prompts.',
  'expert.viewVersion': 'Änderungen am Prompt v{version} anzeigen',
  'expert.welcome': 'Willkommensnachricht',
  'expert.welcomePlaceholder': 'Nennen Sie mir die Stelle und das Vorstellungsgespräch, auf das Sie sich vorbereiten.',
  retry: 'Erneut versuchen',
  'expert.icon.sparkles': 'Allgemeiner Agent',
  'expert.icon.briefcase': 'Business-Agent',
  'expert.icon.graduation-cap': 'Lern-Agent',
  'expert.icon.code': 'Code-Agent',
  'expert.icon.chart': 'Analyse-Agent',
  presetChatName: 'Chat-Modus',
  presetChatDescription: 'Allgemeines Gespräch mit den Standard-Dateitools, ohne Skills, Projektkontext, Laufzeitkontext und Kontextkomprimierung.',
} satisfies Record<keyof typeof en, string>

/** Russian dictionary, checked against the English keys. */
export const ru = {
  ...guideRu,
  builtInGroup: 'Встроенный', customGroup: 'Пользовательский',
  sectionIntro: 'Выбирайте инструменты агента и то, как они работают. Используйте стандартный режим для повседневных задач или режим Creator, чтобы расширить возможности DSH.',

  seatHint: 'Выберите предустановку агента для вашей новой задачи',
  headerHint: 'Предварительная настройка агента, выбранная при запуске этой задачи',
  nav: 'Настройки агента',

  setDefault: 'Установить в качестве новой задачи по умолчанию',
  view: 'Посмотреть конфигурацию',

  presetStandardName: 'Стандартный режим',
  presetStandardDescription:
    'Работайте с кодом, файлами и информацией. Подходит для большинства задач, с поиском, редактированием, командами терминала и другими инструментами, доступными по мере необходимости.',
  presetPtcName: 'Режим PTC',
  presetPtcDescription:
    'Включает все возможности стандартного режима. Лучше подходит для задач, которые вызывают инструменты в пакетном режиме, а затем фильтруют, организуют, дедуплицируют, подсчитывают или суммируют результаты.',
  presetMinimalName: 'Минимальный режим',
  presetMinimalDescription:
    'Агент использует терминал и чтение изображений со сжатием контекста. Полезно для тестирования и сравнения его базовой производительности.',
  presetCordisName: 'Режим автора',
  presetCordisDescription:
    'Настройте DSH через разговор. Позвольте агенту писать плагины, которые добавляют функции или пользовательский интерфейс, или комбинируйте инструменты и подсказки для создания собственного режима.',

  inUse: 'Новая задача по умолчанию',

  noDescription: 'Нет описания.',
  brokenBadge: 'Не удалось загрузить',

  switchRefused: 'Не удалось переключиться на {name}: {reason}',
  standardUnavailable: 'Стандартный режим недоступен. Восстановите его или выберите другой доступный режим.',

  close: 'Закрыть',

  creatorDraft: 'Позвольте агенту помочь мне создать пресет',
  createPlugin: 'Позвольте агенту создать плагин',
  createPluginDescription: 'Войдите в режим Creator и создайте свой собственный плагин DSH.',
  createPluginChecking: 'Проверка доступности режима Creator',
  createPluginUnavailable: 'Временно недоступен. Откройте это меню еще раз, чтобы повторить попытку.',
  createPluginMissing: 'Режим Creator не включен в эту конфигурацию.',

  cancel: 'Отмена',
  duplicateUnavailable: 'В этом развертывании нет каталога предустановок, доступного для записи',
  'expert.accept': 'Принять новую версию',
  'expert.accepting': 'Сохранение версии…',
  'expert.back': 'Назад к агентам',
  'expert.backToEditor': 'Назад к редактору агента',
  'expert.changeReasons': 'Почему эти строки изменились',
  'expert.create': 'Добавить агента',
  'expert.createHint': 'Выберите значок (необязательно), затем добавьте приветственное сообщение и подсказку.',
  'expert.dismiss': 'Оставить текущую подсказку',
  'expert.edit': 'Редактировать {name}',
  'expert.editHint': 'Ручные правки подсказки создают новую версию, только если подсказка изменилась.',
  'expert.empty': 'Агентов пока нет',
  'expert.emptyHint': 'Добавьте агента, чтобы начать разговор по конкретной задаче.',
  'expert.history': 'История версий',
  'expert.icon': 'Значок (необязательно)',
  'expert.loading': 'Загрузка агентов…',
  'expert.loadingVersion': 'Загрузка версии…',
  'expert.manage': 'Список агентов',
  'expert.manageHint': 'Подсказки для разговоров с локальной историей версий, доступной для просмотра.',
  'expert.menu': 'Агенты',
  'expert.menuHint': 'Выберите или отредактируйте агента для разговора',
  'expert.name': 'Название',
  'expert.namePlaceholder': 'Тренер по собеседованиям',
  'expert.noChangeTitle': 'Нет обоснованных изменений',
  'expert.noPreviousVersion': 'До v1',
  'expert.noWelcome': 'Нет приветственного сообщения',
  'expert.optimize': 'Оптимизировать подсказку агента',
  'expert.optimizeFailed': 'Не удалось оптимизировать подсказку',
  'expert.optimizing': 'Оптимизация подсказки…',
  'expert.optimizingHint': 'Навык доработки проверяет данные разговора и изменит только подтвержденное локальное правило.',
  'expert.original': 'Текущая подсказка',
  'expert.prompt': 'Подсказка',
  'expert.promptPlaceholder': 'Напишите здесь инструкции для агента.',
  'expert.reviewTitle': 'Проверьте предложенное изменение',
  'expert.revised': 'Предлагаемая подсказка',
  'expert.save': 'Сохранить агента',
  'expert.saved': 'Сохранено',
  'expert.saving': 'Сохранение…',
  'expert.stopOptimization': 'Остановить оптимизацию подсказки',
  'expert.tabTitle': 'Подсказка агента',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'Не удалось загрузить эту версию',
  'expert.versionPrompt': 'Подсказка v{version}',
  'expert.versionReview': 'Изменения подсказки v{version}',
  'expert.versionReviewHint': 'Сравнение с предыдущей версией подсказки только для чтения.',
  'expert.viewVersion': 'Посмотреть изменения подсказки v{version}',
  'expert.welcome': 'Приветственное сообщение',
  'expert.welcomePlaceholder': 'Расскажите, к какой должности и собеседованию вы готовитесь.',
  retry: 'Повторить',
  'expert.icon.sparkles': 'Универсальный агент',
  'expert.icon.briefcase': 'Агент для бизнеса',
  'expert.icon.graduation-cap': 'Агент для обучения',
  'expert.icon.code': 'Агент для программирования',
  'expert.icon.chart': 'Агент для анализа',
  presetChatName: 'Режим чата',
  presetChatDescription: 'Обычный разговор со стандартными файловыми инструментами, без навыков, контекста проекта, контекста времени выполнения и сжатия.',
} satisfies Record<keyof typeof en, string>

/** Portuguese dictionary, checked against the English keys. */
export const pt = {
  ...guidePt,
  builtInGroup: 'Integrado', customGroup: 'Personalizado',
  sectionIntro: 'Escolha as ferramentas do agente e como funciona. Use o modo Padrão para tarefas diárias ou o modo Criador para adicionar recursos ao DSH.',

  seatHint: 'Escolha a predefinição de agente para sua nova tarefa',
  headerHint: 'A predefinição do agente escolhida quando esta tarefa foi iniciada',
  nav: 'Predefinições de agente',

  setDefault: 'Definir como nova tarefa padrão',
  view: 'Ver configuração',

  presetStandardName: 'Modo padrão',
  presetStandardDescription:
    'Trabalhe com código, arquivos e informações. Adequado para a maioria das tarefas, com pesquisa, edição, comandos de terminal e outras ferramentas disponíveis conforme necessário.',
  presetPtcName: 'modo PTC',
  presetPtcDescription:
    'Inclui todos os recursos do modo Padrão. Mais adequado para tarefas que chamam ferramentas em lotes e depois filtram, organizam, desduplicam, contam ou resumem os resultados.',
  presetMinimalName: 'Modo mínimo',
  presetMinimalDescription:
    'O agente utiliza terminal e leitura de imagens, com compactação de contexto. Útil para testar e comparar seu desempenho básico.',
  presetCordisName: 'Modo criador',
  presetCordisDescription:
    'Personalize DSH por meio de conversa. Deixe o agente escrever plug-ins que adicionem recursos ou UI, ou combine ferramentas e prompts para criar seu próprio modo.',

  inUse: 'Novo padrão de tarefa',

  noDescription: 'Nenhuma descrição.',
  brokenBadge: 'Falha ao carregar',

  switchRefused: 'Não foi possível mudar para {name}: {reason}',
  standardUnavailable: 'O modo padrão não está disponível. Restaure-o ou escolha outro modo disponível.',

  close: 'Fechar',

  creatorDraft: 'Deixe o agente me ajudar a criar uma predefinição',
  createPlugin: 'Deixe o agente criar um plugin',
  createPluginDescription: 'Entre no modo Criador e crie seu próprio plug-in DSH',
  createPluginChecking: 'Verificando se o modo Criador está disponível',
  createPluginUnavailable: 'Temporariamente indisponível. Reabra este menu para tentar novamente',
  createPluginMissing: 'O modo criador não está incluído nesta configuração',

  cancel: 'Cancelar',
  duplicateUnavailable: 'Esta implantação não tem um diretório de predefinições gravável',
  'expert.accept': 'Aceitar nova versão',
  'expert.accepting': 'Salvando versão…',
  'expert.back': 'Voltar aos agentes',
  'expert.backToEditor': 'Voltar ao editor do agente',
  'expert.changeReasons': 'Por que estas linhas mudaram',
  'expert.create': 'Adicionar agente',
  'expert.createHint': 'Escolha um ícone (opcional) e depois adicione a mensagem de boas-vindas e o prompt.',
  'expert.dismiss': 'Manter o prompt atual',
  'expert.edit': 'Editar {name}',
  'expert.editHint': 'Edições manuais no prompt só criam uma nova versão quando o prompt muda.',
  'expert.empty': 'Ainda não há agentes',
  'expert.emptyHint': 'Adicione um agente para iniciar uma conversa focada.',
  'expert.history': 'Histórico de versões',
  'expert.icon': 'Ícone (opcional)',
  'expert.loading': 'Carregando agentes…',
  'expert.loadingVersion': 'Carregando versão…',
  'expert.manage': 'Lista de agentes',
  'expert.manageHint': 'Prompts de conversa com histórico de versões local que pode ser revisado.',
  'expert.menu': 'Agentes',
  'expert.menuHint': 'Escolha ou edite um agente de conversa',
  'expert.name': 'Nome',
  'expert.namePlaceholder': 'Coach de entrevistas',
  'expert.noChangeTitle': 'Nenhuma mudança justificada',
  'expert.noPreviousVersion': 'Antes da v1',
  'expert.noWelcome': 'Sem mensagem de boas-vindas',
  'expert.optimize': 'Otimizar o prompt do agente',
  'expert.optimizeFailed': 'Falha na otimização do prompt',
  'expert.optimizing': 'Otimizando o prompt…',
  'expert.optimizingHint': 'A habilidade de refinamento está verificando as evidências da conversa e mudará apenas a regra local comprovada.',
  'expert.original': 'Prompt atual',
  'expert.prompt': 'Prompt',
  'expert.promptPlaceholder': 'Escreva as instruções do agente aqui.',
  'expert.reviewTitle': 'Revise a mudança proposta',
  'expert.revised': 'Prompt proposto',
  'expert.save': 'Salvar agente',
  'expert.saved': 'Salvo',
  'expert.saving': 'Salvando…',
  'expert.stopOptimization': 'Parar a otimização do prompt',
  'expert.tabTitle': 'Prompt do agente',
  'expert.version': 'v{version}',
  'expert.versionLoadFailed': 'Não foi possível carregar esta versão',
  'expert.versionPrompt': 'Prompt da v{version}',
  'expert.versionReview': 'Mudanças no prompt da v{version}',
  'expert.versionReviewHint': 'Comparação somente leitura com a versão anterior do prompt.',
  'expert.viewVersion': 'Ver mudanças no prompt da v{version}',
  'expert.welcome': 'Mensagem de boas-vindas',
  'expert.welcomePlaceholder': 'Conte para qual cargo e entrevista você está se preparando.',
  retry: 'Tentar novamente',
  'expert.icon.sparkles': 'Agente geral',
  'expert.icon.briefcase': 'Agente de negócios',
  'expert.icon.graduation-cap': 'Agente de aprendizado',
  'expert.icon.code': 'Agente de programação',
  'expert.icon.chart': 'Agente de análise',
  presetChatName: 'Modo de conversa',
  presetChatDescription: 'Conversa geral com as ferramentas de arquivo padrão, sem habilidades, contexto do projeto, contexto de tempo de execução ou compactação.',
} satisfies Record<keyof typeof en, string>

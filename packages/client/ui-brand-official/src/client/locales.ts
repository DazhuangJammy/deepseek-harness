/** Localized copy for the custom brand settings card. */
export const zh = {
  title: '界面品牌', description: '自定义左上角图标和名称。关闭后恢复原来的界面。', enabled: '启用自定义品牌',
  name: '名称', nameHint: '留空则使用默认名称。', icon: '图标地址', iconHint: '填写图片 URL 或 data URL；留空则使用默认图标。', iconPlaceholder: 'https://...', upload: '上传图标', uploading: '读取中…',
  save: '保存', saving: '保存中…', saved: '已保存', unsaved: '未保存', reset: '恢复默认', failed: '保存失败，请检查设置后重试。', preview: '默认品牌',
} as const
/** English copy for the custom brand settings card. */
export const en = {
  title: 'Interface branding', description: 'Customize the top-left icon and name. Disable it to restore the original UI.', enabled: 'Enable custom branding',
  name: 'Name', nameHint: 'Leave blank to use the default name.', icon: 'Icon URL', iconHint: 'Use an image URL or data URL; leave blank for the default icon.', iconPlaceholder: 'https://...', upload: 'Upload icon', uploading: 'Reading…',
  save: 'Save', saving: 'Saving…', saved: 'Saved', unsaved: 'Unsaved', reset: 'Restore defaults', failed: 'Save failed. Check the values and try again.', preview: 'Default brand',
} as const
/** Locale keys shared by the Chinese and English dictionaries. */
export type BrandLocaleKey = keyof typeof zh

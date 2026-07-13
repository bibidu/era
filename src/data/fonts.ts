export type FontSource = 'system' | 'google' | 'pixel' | 'cdn'

export interface FontOption {
  id: string
  label: string
  fontFamily: string
  sample: string
  source: FontSource
  googleFamily?: string
  cdnUrl?: string
  pixelFamily?: string
  pixelFiles?: { zh: string; latin: string }
}

/** 原系统字体名，现改为 Web 字体以保证各端显示一致 */
export const CLASSIC_WEB_FONT_IDS = ['heiti', 'song', 'fangsong', 'kai'] as const

function createPixelFont(
  id: string,
  label: string,
  displayFamily: string,
  zhFile: string,
  latinFile: string,
  sample: string,
): FontOption {
  return {
    id,
    label,
    fontFamily: `'${displayFamily}', sans-serif`,
    sample,
    source: 'pixel',
    pixelFamily: displayFamily,
    pixelFiles: { zh: zhFile, latin: latinFile },
  }
}

const RAW_FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: '默认', fontFamily: 'system-ui, -apple-system, sans-serif', sample: '默认字体', source: 'system' },
  { id: 'pingfang', label: '苹方', fontFamily: '"PingFang SC", sans-serif', sample: '苹方', source: 'system' },
  { id: 'yahei', label: '微软雅黑', fontFamily: '"Microsoft YaHei", sans-serif', sample: '微软雅黑', source: 'system' },
  {
    id: 'heiti',
    label: '黑体',
    fontFamily: '"Noto Sans SC", sans-serif',
    sample: '黑体',
    source: 'google',
    googleFamily: 'Noto+Sans+SC:wght@700',
  },
  {
    id: 'song',
    label: '宋体',
    fontFamily: '"Noto Serif SC", serif',
    sample: '宋体',
    source: 'google',
    googleFamily: 'Noto+Serif+SC:wght@400;700',
  },
  {
    id: 'kai',
    label: '楷体',
    fontFamily: '"LXGW WenKai GB", serif',
    sample: '楷体',
    source: 'cdn',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-gb-web@1.521.0/lxgwwenkaigb-regular/result.css',
  },
  {
    id: 'fangsong',
    label: '仿宋',
    fontFamily: '"ZCOOL XiaoWei", serif',
    sample: '仿宋',
    source: 'google',
    googleFamily: 'ZCOOL+XiaoWei',
  },

  { id: 'noto-heavy', label: '思源特粗', fontFamily: '"Noto Sans SC", sans-serif', sample: '思源特粗', source: 'google', googleFamily: 'Noto+Sans+SC:wght@900' },
  { id: 'noto-serif-heavy', label: '思源宋粗', fontFamily: '"Noto Serif SC", serif', sample: '思源宋粗', source: 'google', googleFamily: 'Noto+Serif+SC:wght@900' },
  { id: 'dela-gothic', label: '极哥特', fontFamily: '"Dela Gothic One", sans-serif', sample: '极粗标题', source: 'google', googleFamily: 'Dela+Gothic+One' },
  { id: 'mochiy-pop', label: '圆梦体', fontFamily: '"Mochiy Pop One", sans-serif', sample: '圆梦粗体', source: 'google', googleFamily: 'Mochiy+Pop+One' },
  { id: 'rampart', label: '立体粗', fontFamily: '"Rampart One", cursive', sample: '立体粗体', source: 'google', googleFamily: 'Rampart+One' },
  { id: 'reggae', label: '雷鬼粗', fontFamily: '"Reggae One", cursive', sample: '雷鬼粗体', source: 'google', googleFamily: 'Reggae+One' },
  { id: 'potta', label: '胖圆体', fontFamily: '"Potta One", cursive', sample: '胖圆粗体', source: 'google', googleFamily: 'Potta+One' },
  { id: 'rocknroll', label: '摇滚粗', fontFamily: '"RocknRoll One", sans-serif', sample: '摇滚粗体', source: 'google', googleFamily: 'RocknRoll+One' },
  { id: 'zcool-qingke', label: '站酷黄油', fontFamily: '"ZCOOL QingKe HuangYou", cursive', sample: '站酷黄油', source: 'google', googleFamily: 'ZCOOL+QingKe+HuangYou' },
  { id: 'zcool-kuaile', label: '站酷快乐', fontFamily: '"ZCOOL KuaiLe", cursive', sample: '站酷快乐', source: 'google', googleFamily: 'ZCOOL+KuaiLe' },
  { id: 'wdxl', label: '润滑体', fontFamily: '"WDXL Lubrifont SC", sans-serif', sample: '润滑体', source: 'google', googleFamily: 'WDXL+Lubrifont+SC' },

  { id: 'noto', label: '思源黑体', fontFamily: '"Noto Sans SC", sans-serif', sample: '思源黑体', source: 'google', googleFamily: 'Noto+Sans+SC:wght@400;700' },
  { id: 'noto-serif', label: '思源宋体', fontFamily: '"Noto Serif SC", serif', sample: '思源宋体', source: 'google', googleFamily: 'Noto+Serif+SC:wght@400;700' },
  { id: 'zcool', label: '站酷文艺', fontFamily: '"ZCOOL XiaoWei", serif', sample: '站酷文艺', source: 'google', googleFamily: 'ZCOOL+XiaoWei' },
  { id: 'klee', label: '克莱手写', fontFamily: '"Klee One", cursive', sample: '克莱手写', source: 'google', googleFamily: 'Klee+One:wght@400;600' },
  { id: 'yusei', label: '油性魔法', fontFamily: '"Yusei Magic", sans-serif', sample: '油性魔法', source: 'google', googleFamily: 'Yusei+Magic' },
  { id: 'hachi-maru', label: '八丸POP', fontFamily: '"Hachi Maru Pop", cursive', sample: '八丸POP', source: 'google', googleFamily: 'Hachi+Maru+Pop' },

  { id: 'ma-shan', label: '马善政楷', fontFamily: '"Ma Shan Zheng", cursive', sample: '马善政楷', source: 'google', googleFamily: 'Ma+Shan+Zheng' },
  { id: 'long-cang', label: '龙苍体', fontFamily: '"Long Cang", cursive', sample: '龙苍体', source: 'google', googleFamily: 'Long+Cang' },
  { id: 'liu-jian', label: '刘建毛草', fontFamily: '"Liu Jian Mao Cao", cursive', sample: '刘建毛草', source: 'google', googleFamily: 'Liu+Jian+Mao+Cao' },
  { id: 'zhi-mang', label: '志芒行书', fontFamily: '"Zhi Mang Xing", cursive', sample: '志芒行书', source: 'google', googleFamily: 'Zhi+Mang+Xing' },
  {
    id: 'dachun',
    label: '文楷',
    fontFamily: '"LXGW WenKai GB", serif',
    sample: '文楷',
    source: 'cdn',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-gb-web@1.521.0/lxgwwenkaigb-regular/result.css',
  },
  {
    id: 'dachun-medium',
    label: '文楷中粗',
    fontFamily: '"LXGW WenKai GB Medium", serif',
    sample: '文楷中粗',
    source: 'cdn',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-gb-web@1.521.0/lxgwwenkaigb-medium/result.css',
  },
  createPixelFont(
    'fusion-pixel-8',
    '像素8点',
    'EraPixel8',
    'fusion-pixel-8px-proportional-zh_hans.otf.woff2',
    'fusion-pixel-8px-proportional-latin.otf.woff2',
    '像素8点',
  ),
  createPixelFont(
    'fusion-pixel-10',
    '像素10点',
    'EraPixel10',
    'fusion-pixel-10px-proportional-zh_hans.otf.woff2',
    'fusion-pixel-10px-proportional-latin.otf.woff2',
    '像素10点',
  ),
  createPixelFont(
    'fusion-pixel-12',
    '像素12点',
    'EraPixel12',
    'fusion-pixel-12px-proportional-zh_hans.otf.woff2',
    'fusion-pixel-12px-proportional-latin.otf.woff2',
    '像素12点',
  ),
]

const MONO_FONT_IDS = new Set([
  'dotgothic',
  'yuji-mai',
  'fusion-pixel-8',
  'fusion-pixel-10',
  'fusion-pixel-12',
])

function isMonospaceFont(font: FontOption) {
  const id = font.id.toLowerCase()
  const family = font.fontFamily.toLowerCase()
  return (
    MONO_FONT_IDS.has(font.id) ||
    id.includes('mono') ||
    family.includes('monospace') ||
    /\bmono\b/.test(family)
  )
}

export const FONT_OPTIONS = RAW_FONT_OPTIONS.filter((font) => !isMonospaceFont(font))

export const FONT_COUNT = FONT_OPTIONS.length

export function getFontById(id: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]
}

export type FontSource = 'system' | 'google' | 'pixel'

export interface FontOption {
  id: string
  label: string
  fontFamily: string
  sample: string
  source: FontSource
  googleFamily?: string
  pixelFamily?: string
  pixelFiles?: { zh: string; latin: string }
}

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

export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: '默认', fontFamily: 'system-ui, -apple-system, sans-serif', sample: '默认字体 Aa', source: 'system' },
  { id: 'pingfang', label: '苹方', fontFamily: '"PingFang SC", "Helvetica Neue", sans-serif', sample: '苹方 Aa', source: 'system' },
  { id: 'yahei', label: '微软雅黑', fontFamily: '"Microsoft YaHei", sans-serif', sample: '微软雅黑 Aa', source: 'system' },
  { id: 'heiti', label: '黑体', fontFamily: 'SimHei, "Heiti SC", sans-serif', sample: '黑体 Aa', source: 'system' },
  { id: 'song', label: '宋体', fontFamily: 'SimSun, "Songti SC", serif', sample: '宋体 Aa', source: 'system' },
  { id: 'kai', label: '楷体', fontFamily: 'KaiTi, "Kaiti SC", serif', sample: '楷体 Aa', source: 'system' },
  { id: 'fangsong', label: '仿宋', fontFamily: 'FangSong, "STFangsong", serif', sample: '仿宋 Aa', source: 'system' },
  { id: 'arial', label: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif', sample: 'Arial Aa', source: 'system' },
  { id: 'helvetica', label: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif', sample: 'Helvetica Aa', source: 'system' },
  { id: 'georgia', label: 'Georgia', fontFamily: 'Georgia, serif', sample: 'Georgia Aa', source: 'system' },
  { id: 'times', label: 'Times', fontFamily: '"Times New Roman", Times, serif', sample: 'Times Aa', source: 'system' },
  { id: 'verdana', label: 'Verdana', fontFamily: 'Verdana, Geneva, sans-serif', sample: 'Verdana Aa', source: 'system' },

  { id: 'noto', label: '思源黑体', fontFamily: '"Noto Sans SC", sans-serif', sample: '思源黑体 Aa', source: 'google', googleFamily: 'Noto+Sans+SC:wght@400;700' },
  { id: 'noto-serif', label: '思源宋体', fontFamily: '"Noto Serif SC", serif', sample: '思源宋体 Aa', source: 'google', googleFamily: 'Noto+Serif+SC:wght@400;700' },
  { id: 'wdxl', label: '润滑体', fontFamily: '"WDXL Lubrifont SC", sans-serif', sample: '润滑体 Aa', source: 'google', googleFamily: 'WDXL+Lubrifont+SC' },
  { id: 'zcool', label: '站酷文艺体', fontFamily: '"ZCOOL XiaoWei", serif', sample: '站酷文艺体 Aa', source: 'google', googleFamily: 'ZCOOL+XiaoWei' },
  { id: 'zcool-kuaile', label: '站酷快乐体', fontFamily: '"ZCOOL KuaiLe", cursive', sample: '站酷快乐体 Aa', source: 'google', googleFamily: 'ZCOOL+KuaiLe' },
  { id: 'zcool-qingke', label: '站酷庆科黄油', fontFamily: '"ZCOOL QingKe HuangYou", cursive', sample: '站酷庆科 Aa', source: 'google', googleFamily: 'ZCOOL+QingKe+HuangYou' },
  { id: 'ma-shan', label: '马善政楷书', fontFamily: '"Ma Shan Zheng", cursive', sample: '马善政楷书 Aa', source: 'google', googleFamily: 'Ma+Shan+Zheng' },
  { id: 'long-cang', label: '龙苍体', fontFamily: '"Long Cang", cursive', sample: '龙苍体 Aa', source: 'google', googleFamily: 'Long+Cang' },
  { id: 'liu-jian', label: '刘建毛草', fontFamily: '"Liu Jian Mao Cao", cursive', sample: '刘建毛草 Aa', source: 'google', googleFamily: 'Liu+Jian+Mao+Cao' },
  { id: 'zhi-mang', label: '志芒行书', fontFamily: '"Zhi Mang Xing", cursive', sample: '志芒行书 Aa', source: 'google', googleFamily: 'Zhi+Mang+Xing' },
  { id: 'yuji-mai', label: '佑字麦', fontFamily: '"Yuji Mai", serif', sample: '佑字麦 Aa', source: 'google', googleFamily: 'Yuji+Mai' },
  { id: 'dachun', label: '大椿', fontFamily: '"Yuji Mai", "Ma Shan Zheng", serif', sample: '大椿', source: 'google', googleFamily: 'Yuji+Mai' },
  { id: 'dotgothic', label: '点阵哥特', fontFamily: '"DotGothic16", sans-serif', sample: '点阵哥特 Aa', source: 'google', googleFamily: 'DotGothic16' },
  createPixelFont(
    'fusion-pixel-8',
    '像素8点',
    'EraPixel8',
    'fusion-pixel-8px-proportional-zh_hans.otf.woff2',
    'fusion-pixel-8px-proportional-latin.otf.woff2',
    '像素8 文字',
  ),
  createPixelFont(
    'fusion-pixel-10',
    '像素10点',
    'EraPixel10',
    'fusion-pixel-10px-proportional-zh_hans.otf.woff2',
    'fusion-pixel-10px-proportional-latin.otf.woff2',
    '像素10 文字',
  ),
  createPixelFont(
    'fusion-pixel-12',
    '像素12点',
    'EraPixel12',
    'fusion-pixel-12px-proportional-zh_hans.otf.woff2',
    'fusion-pixel-12px-proportional-latin.otf.woff2',
    '像素12 文字',
  ),

  { id: 'inter', label: 'Inter', fontFamily: 'Inter, sans-serif', sample: 'Inter Aa', source: 'google', googleFamily: 'Inter:wght@400;700' },
  { id: 'roboto', label: 'Roboto', fontFamily: 'Roboto, sans-serif', sample: 'Roboto Aa', source: 'google', googleFamily: 'Roboto:wght@400;700' },
  { id: 'open-sans', label: 'Open Sans', fontFamily: '"Open Sans", sans-serif', sample: 'Open Sans Aa', source: 'google', googleFamily: 'Open+Sans:wght@400;700' },
  { id: 'lato', label: 'Lato', fontFamily: 'Lato, sans-serif', sample: 'Lato Aa', source: 'google', googleFamily: 'Lato:wght@400;700' },
  { id: 'montserrat', label: 'Montserrat', fontFamily: 'Montserrat, sans-serif', sample: 'Montserrat Aa', source: 'google', googleFamily: 'Montserrat:wght@400;700' },
  { id: 'poppins', label: 'Poppins', fontFamily: 'Poppins, sans-serif', sample: 'Poppins Aa', source: 'google', googleFamily: 'Poppins:wght@400;700' },
  { id: 'nunito', label: 'Nunito', fontFamily: 'Nunito, sans-serif', sample: 'Nunito Aa', source: 'google', googleFamily: 'Nunito:wght@400;700' },
  { id: 'raleway', label: 'Raleway', fontFamily: 'Raleway, sans-serif', sample: 'Raleway Aa', source: 'google', googleFamily: 'Raleway:wght@400;700' },
  { id: 'ubuntu', label: 'Ubuntu', fontFamily: 'Ubuntu, sans-serif', sample: 'Ubuntu Aa', source: 'google', googleFamily: 'Ubuntu:wght@400;700' },
  { id: 'work-sans', label: 'Work Sans', fontFamily: '"Work Sans", sans-serif', sample: 'Work Sans Aa', source: 'google', googleFamily: 'Work+Sans:wght@400;700' },
  { id: 'dm-sans', label: 'DM Sans', fontFamily: '"DM Sans", sans-serif', sample: 'DM Sans Aa', source: 'google', googleFamily: 'DM+Sans:wght@400;700' },
  { id: 'plus-jakarta', label: 'Plus Jakarta', fontFamily: '"Plus Jakarta Sans", sans-serif', sample: 'Plus Jakarta Aa', source: 'google', googleFamily: 'Plus+Jakarta+Sans:wght@400;700' },
  { id: 'manrope', label: 'Manrope', fontFamily: 'Manrope, sans-serif', sample: 'Manrope Aa', source: 'google', googleFamily: 'Manrope:wght@400;700' },
  { id: 'rubik', label: 'Rubik', fontFamily: 'Rubik, sans-serif', sample: 'Rubik Aa', source: 'google', googleFamily: 'Rubik:wght@400;700' },
  { id: 'oswald', label: 'Oswald', fontFamily: 'Oswald, sans-serif', sample: 'Oswald Aa', source: 'google', googleFamily: 'Oswald:wght@400;700' },
  { id: 'pt-sans', label: 'PT Sans', fontFamily: '"PT Sans", sans-serif', sample: 'PT Sans Aa', source: 'google', googleFamily: 'PT+Sans:wght@400;700' },

  { id: 'merriweather', label: 'Merriweather', fontFamily: 'Merriweather, serif', sample: 'Merriweather Aa', source: 'google', googleFamily: 'Merriweather:wght@400;700' },
  { id: 'playfair', label: 'Playfair', fontFamily: '"Playfair Display", serif', sample: 'Playfair Aa', source: 'google', googleFamily: 'Playfair+Display:wght@400;700' },
  { id: 'lora', label: 'Lora', fontFamily: 'Lora, serif', sample: 'Lora Aa', source: 'google', googleFamily: 'Lora:wght@400;700' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', fontFamily: '"Libre Baskerville", serif', sample: 'Libre Baskerville Aa', source: 'google', googleFamily: 'Libre+Baskerville:wght@400;700' },
  { id: 'crimson', label: 'Crimson Text', fontFamily: '"Crimson Text", serif', sample: 'Crimson Text Aa', source: 'google', googleFamily: 'Crimson+Text:wght@400;700' },
  { id: 'pt-serif', label: 'PT Serif', fontFamily: '"PT Serif", serif', sample: 'PT Serif Aa', source: 'google', googleFamily: 'PT+Serif:wght@400;700' },
  { id: 'noto-serif-latin', label: 'Noto Serif', fontFamily: '"Noto Serif", serif', sample: 'Noto Serif Aa', source: 'google', googleFamily: 'Noto+Serif:wght@400;700' },

  { id: 'bebas', label: 'Bebas Neue', fontFamily: '"Bebas Neue", sans-serif', sample: 'BEBAS AA', source: 'google', googleFamily: 'Bebas+Neue' },
  { id: 'pacifico', label: 'Pacifico', fontFamily: 'Pacifico, cursive', sample: 'Pacifico Aa', source: 'google', googleFamily: 'Pacifico' },
  { id: 'lobster', label: 'Lobster', fontFamily: 'Lobster, cursive', sample: 'Lobster Aa', source: 'google', googleFamily: 'Lobster' },
  { id: 'dancing', label: 'Dancing Script', fontFamily: '"Dancing Script", cursive', sample: 'Dancing Aa', source: 'google', googleFamily: 'Dancing+Script:wght@400;700' },
  { id: 'great-vibes', label: 'Great Vibes', fontFamily: '"Great Vibes", cursive', sample: 'Great Vibes Aa', source: 'google', googleFamily: 'Great+Vibes' },
  { id: 'abril', label: 'Abril Fatface', fontFamily: '"Abril Fatface", serif', sample: 'Abril Aa', source: 'google', googleFamily: 'Abril+Fatface' },
  { id: 'permanent-marker', label: 'Permanent Marker', fontFamily: '"Permanent Marker", cursive', sample: 'Marker Aa', source: 'google', googleFamily: 'Permanent+Marker' },
  { id: 'satisfy', label: 'Satisfy', fontFamily: 'Satisfy, cursive', sample: 'Satisfy Aa', source: 'google', googleFamily: 'Satisfy' },
  { id: 'caveat', label: 'Caveat', fontFamily: 'Caveat, cursive', sample: 'Caveat Aa', source: 'google', googleFamily: 'Caveat:wght@400;700' },
]

export const FONT_COUNT = FONT_OPTIONS.length

/** 组件库字体 Tab 展示列表（4 列网格，label 为展示名） */
export const FONT_GRID_ITEMS: { id: string; label: string }[] = [
  { id: 'system', label: '经典' },
  { id: 'bebas', label: '抖音体' },
  { id: 'inter', label: '现代' },
  { id: 'playfair', label: '港風' },
  { id: 'zcool', label: '情书' },
  { id: 'zcool-kuaile', label: '卡通' },
  { id: 'roboto', label: '青年' },
  { id: 'noto-serif', label: '粗宋' },
  { id: 'ma-shan', label: '悠然' },
  { id: 'zcool-qingke', label: '文艺' },
  { id: 'liu-jian', label: '手写' },
  { id: 'zhi-mang', label: '行书' },
  { id: 'dotgothic', label: '霓虹' },
  { id: 'pacifico', label: '淘气' },
  { id: 'noto-serif', label: '颜宋' },
  { id: 'caveat', label: '漫趣' },
  { id: 'satisfy', label: '萌趣' },
  { id: 'dachun', label: '大椿' },
  { id: 'long-cang', label: '米粒' },
  { id: 'permanent-marker', label: '手迹' },
  { id: 'dancing', label: '心晴' },
  { id: 'noto-serif', label: '明朝体' },
  { id: 'zcool-kuaile', label: '快乐' },
  { id: 'noto', label: '思源' },
  { id: 'wdxl', label: '润滑体' },
  { id: 'fusion-pixel-8', label: '像素8' },
  { id: 'fusion-pixel-10', label: '像素10' },
  { id: 'fusion-pixel-12', label: '像素12' },
]

export function getFontById(id: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]
}

export type FontSource = 'system' | 'google' | 'fontsource'

export interface FontOption {
  id: string
  label: string
  fontFamily: string
  sample: string
  source: FontSource
  googleFamily?: string
  stylesheetUrl?: string
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
  { id: 'dotgothic', label: '点阵哥特', fontFamily: '"DotGothic16", sans-serif', sample: '点阵哥特 Aa', source: 'google', googleFamily: 'DotGothic16' },
  { id: 'fusion-pixel-8', label: '像素8点', fontFamily: '"Fusion Pixel 8px Proportional SC", monospace', sample: '像素8 文字', source: 'fontsource', stylesheetUrl: 'https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-8px-proportional-sc@5.2.5/index.css' },
  { id: 'fusion-pixel-10', label: '像素10点', fontFamily: '"Fusion Pixel 10px Proportional SC", monospace', sample: '像素10 文字', source: 'fontsource', stylesheetUrl: 'https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-10px-proportional-sc@5.2.5/index.css' },
  { id: 'fusion-pixel-12', label: '像素12点', fontFamily: '"Fusion Pixel 12px Proportional SC", monospace', sample: '像素12 文字', source: 'fontsource', stylesheetUrl: 'https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-12px-proportional-sc@5.2.5/index.css' },
  { id: 'fusion-pixel-12-mono', label: '像素12等宽', fontFamily: '"Fusion Pixel 12px Monospaced SC", monospace', sample: '像素等宽 01', source: 'fontsource', stylesheetUrl: 'https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-12px-monospaced-sc@5.2.5/index.css' },

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

  { id: 'mono', label: '系统等宽', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', sample: '系统等宽 01', source: 'system' },
  { id: 'courier', label: 'Courier', fontFamily: '"Courier New", Courier, monospace', sample: 'Courier 01', source: 'system' },
  { id: 'jetbrains', label: 'JetBrains Mono', fontFamily: '"JetBrains Mono", monospace', sample: 'JetBrains 01', source: 'google', googleFamily: 'JetBrains+Mono:wght@400;700' },
  { id: 'roboto-mono', label: 'Roboto Mono', fontFamily: '"Roboto Mono", monospace', sample: 'Roboto Mono 01', source: 'google', googleFamily: 'Roboto+Mono:wght@400;700' },
  { id: 'source-code', label: 'Source Code Pro', fontFamily: '"Source Code Pro", monospace', sample: 'Source Code 01', source: 'google', googleFamily: 'Source+Code+Pro:wght@400;700' },
  { id: 'noto-mono', label: 'Noto Sans Mono', fontFamily: '"Noto Sans Mono", monospace', sample: 'Noto Mono 01', source: 'google', googleFamily: 'Noto+Sans+Mono:wght@400;700' },
  { id: 'fira-code', label: 'Fira Code', fontFamily: '"Fira Code", monospace', sample: 'Fira Code 01', source: 'google', googleFamily: 'Fira+Code:wght@400;700' },
  { id: 'ibm-plex', label: 'IBM Plex Mono', fontFamily: '"IBM Plex Mono", monospace', sample: 'IBM Plex 01', source: 'google', googleFamily: 'IBM+Plex+Mono:wght@400;700' },
  { id: 'space-mono', label: 'Space Mono', fontFamily: '"Space Mono", monospace', sample: 'Space Mono 01', source: 'google', googleFamily: 'Space+Mono:wght@400;700' },
  { id: 'ubuntu-mono', label: 'Ubuntu Mono', fontFamily: '"Ubuntu Mono", monospace', sample: 'Ubuntu Mono 01', source: 'google', googleFamily: 'Ubuntu+Mono:wght@400;700' },
  { id: 'inconsolata', label: 'Inconsolata', fontFamily: 'Inconsolata, monospace', sample: 'Inconsolata 01', source: 'google', googleFamily: 'Inconsolata:wght@400;700' },
  { id: 'courier-prime', label: 'Courier Prime', fontFamily: '"Courier Prime", monospace', sample: 'Courier Prime 01', source: 'google', googleFamily: 'Courier+Prime:wght@400;700' },
  { id: 'dm-mono', label: 'DM Mono', fontFamily: '"DM Mono", monospace', sample: 'DM Mono 01', source: 'google', googleFamily: 'DM+Mono:wght@400;500' },
  { id: 'red-hat-mono', label: 'Red Hat Mono', fontFamily: '"Red Hat Mono", monospace', sample: 'Red Hat 01', source: 'google', googleFamily: 'Red+Hat+Mono:wght@400;700' },
  { id: 'victor-mono', label: 'Victor Mono', fontFamily: '"Victor Mono", monospace', sample: 'Victor Mono 01', source: 'google', googleFamily: 'Victor+Mono:wght@400;700' },
  { id: 'anonymous-pro', label: 'Anonymous Pro', fontFamily: '"Anonymous Pro", monospace', sample: 'Anonymous 01', source: 'google', googleFamily: 'Anonymous+Pro:wght@400;700' },
  { id: 'share-tech-mono', label: 'Share Tech Mono', fontFamily: '"Share Tech Mono", monospace', sample: 'Share Tech 01', source: 'google', googleFamily: 'Share+Tech+Mono' },
]

export const FONT_COUNT = FONT_OPTIONS.length

import type { ReactNode } from 'react'

import { Star } from '@gravity-ui/icons'

/**
 * @description: 热榜配置（唯一数据源）：按分类分组声明，分类顺序即展示顺序（分类 Chip / 默认排序 / 设置分组共用）
 */
const hotItemsConfig = [
  {
    category: '资讯综合',
    children: [
      { value: 'weibo', label: '微博', tip: '热搜榜' },
      { value: 'toutiao', label: '今日头条', tip: '热榜' },
      { value: 'baidu', label: '百度', tip: '热搜榜' },
      { value: 'qq', label: '腾讯新闻', tip: '热点榜' },
      { value: 'netease', label: '网易新闻', tip: '热榜' },
      { value: 'quark', label: '夸克', tip: '今日热点' },
      { value: 'thepaper', label: '澎湃新闻', tip: '热榜' },
      { value: 'zhihu-daily', label: '知乎日报', tip: '推荐榜' },
      { value: 'sina-news', label: '新浪新闻', tip: '热点榜' },
    ],
  },
  {
    category: '社区讨论',
    children: [
      { value: 'zhihu', label: '知乎', tip: '热榜' },
      { value: 'baidutieba', label: '百度贴吧', tip: '热议榜' },
      { value: 'hupu', label: '虎扑', tip: '步行街热帖', suffix: '亮' },
      { value: 'woshipm', label: '人人都是产品经理', tip: '热榜' },
      { value: 'smzdm', label: '什么值得买', tip: '热榜' },
    ],
  },
  {
    category: '财经',
    children: [
      { value: '10jqka', label: '同花顺', tip: '热榜' },
      { value: 'eastmoney', label: '东方财富', tip: '快讯' },
      { value: 'cls', label: '财联社', tip: '热榜' },
      { value: 'wallstcn', label: '华尔街见闻', tip: '热文榜' },
      { value: 'jin10', label: '金十数据', tip: '快讯' },
    ],
  },
  {
    category: '科技数码',
    children: [
      { value: 'github-trending', label: 'Github', tip: '热门仓库', suffix: <Star width={12} /> },
      { value: 'juejin', label: '稀土掘金', tip: '热榜' },
      { value: 'hello-github', label: 'HelloGithub', tip: '精选' },
      { value: 'csdn', label: 'CSDN', tip: '热榜' },
      { value: '36kr', label: '36氪', tip: '24小时热榜' },
      { value: 'huxiu', label: '虎嗅', tip: '最新资讯' },
      { value: 'ifanr', label: '爱范儿', tip: '快讯' },
      { value: 'sspai', label: '少数派', tip: '热门文章' },
      { value: 'ithome', label: 'IT之家', tip: '热榜' },
      { value: 'dongchedi', label: '懂车帝', tip: '今日要闻' },
    ],
  },
  {
    category: '影音娱乐',
    children: [
      { value: 'bilibili', label: '哔哩哔哩', tip: '热门榜' },
      { value: 'douyin', label: '抖音', tip: '热点榜' },
      { value: 'kuaishou', label: '快手', tip: '热榜' },
      { value: 'acfun', label: 'AcFun', tip: '热榜' },
      { value: 'douban-movie', label: '豆瓣电影', tip: '新片榜' },
      { value: 'netease-music', label: '网易云音乐', tip: '热歌榜' },
      { value: 'qq-music', label: 'QQ 音乐', tip: '热歌榜' },
    ],
  },
  {
    category: '阅读',
    children: [
      { value: 'weread', label: '微信读书', tip: '飙升榜' },
      { value: 'history-today', label: '百度百科', tip: '历史上的今天', suffix: '年' },
      { value: 'douban-book', label: '豆瓣读书', tip: '热门图书' },
      { value: 'jjwxc', label: '晋江文学城', tip: '总分榜' },
    ],
  },
  {
    category: '游戏',
    children: [
      { value: 'steam', label: 'Steam', tip: '热销榜' },
      { value: 'lol', label: '英雄联盟', tip: '更新公告' },
      { value: 'gp', label: '和平精英', tip: '官方资讯' },
      { value: 'yjwujian', label: '永劫无间', tip: '官方资讯' },
      { value: 'genshin', label: '原神', tip: '官方公告' },
      { value: 'zzz', label: '绝区零', tip: '官方公告' },
      { value: 'arknights', label: '明日方舟', tip: '官方公告' },
    ],
  },
] as const

/** 热榜项原始配置 */
export type HotRaw = (typeof hotItemsConfig)[number]['children'][number]
/** 热榜 value 类型 */
export type HotValue = HotRaw['value']

/**
 * @description: 分类清单（从配置派生，无需单独维护；分类顺序即声明顺序）
 */
export const HOT_CATEGORY_LIST = hotItemsConfig.map(({ category }) => category)

/** 热榜分类 */
export type HotCategory = (typeof HOT_CATEGORY_LIST)[number]

/** 热榜子项 */
export interface HotItem {
  value: HotValue
  label: string
  tip: string
  /** 所属分类 */
  category: HotCategory
  suffix?: ReactNode
  raw: HotRaw
}

const hotItems: HotItem[] = hotItemsConfig.flatMap(({ category, children }) =>
  children.map((raw) => ({
    value: raw.value,
    label: raw.label,
    tip: raw.tip,
    category,
    suffix: 'suffix' in raw ? raw.suffix : undefined,
    raw,
  })),
)

// 嵌套数组失去对象键的编译期查重：开发期兜底校验 value 唯一性（value 即 API 路由名，重复会互相覆盖）
if (process.env.NODE_ENV !== 'production') {
  const seen = new Set<HotValue>()

  for (const { value } of hotItems) {
    if (seen.has(value)) {
      throw new Error(`hotItemsConfig 存在重复 value：${value}`)
    }

    seen.add(value)
  }
}

/**
 * @description: 分类 → 平台值列表（与配置同源同序，分类 Chip 与设置分组共用）
 */
export const CATEGORY_GROUPS = hotItemsConfig.map(({ category, children }) => ({
  category,
  values: children.map(({ value }) => value),
}))

const hotValues: HotValue[] = hotItems.map((item) => item.value)

const hotRawMap = Object.fromEntries(hotItems.map((item) => [item.value, item.raw])) as Record<HotValue, HotRaw>

export const HOT_ITEMS = {
  items: hotItems,
  values: hotValues,
  /** 根据 value 获取原始配置 */
  raw: (value: HotValue): HotRaw | undefined => hotRawMap[value],
}

/**
 * @description: 用户排序后的分类清单（配置新增的分类自动补尾，已下线的分类自动剔除）
 */
export const getOrderedCategories = (categoryOrder: readonly HotCategory[]): HotCategory[] => {
  const valid = categoryOrder.filter((category) => HOT_CATEGORY_LIST.includes(category))
  const known = new Set(valid)
  const missing = HOT_CATEGORY_LIST.filter((category) => !known.has(category))

  return [...valid, ...missing]
}

/**
 * @description: 某分类在用户排序中的平台值（保留用户拖拽顺序，配置新增的平台按声明顺序补尾）
 */
export const getCategoryValues = (sortItems: readonly HotValue[], category: HotCategory): HotValue[] => {
  const members = CATEGORY_GROUPS.find((group) => group.category === category)?.values ?? []
  const memberSet = new Set(members)
  const userOrder = sortItems.filter((value) => memberSet.has(value))
  const missing = members.filter((value) => !userOrder.includes(value))

  return [...userOrder, ...missing]
}

/**
 * @description: 常看分节的虚拟分类名（非 hotItemsConfig 中的分类，首页置顶分节与锚点导航共用）
 */
export const FAVORITE_CATEGORY = '常看'

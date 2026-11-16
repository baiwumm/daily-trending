/*
 * @Description: 全局搜索（Ctrl/⌘+K）：跨卡片搜索平台与条目标题，纯客户端内存过滤，无新增接口
 */
'use client'
import type { ReactNode } from 'react'
import type { HotValue } from '@/config/hot-list'
import type { HotListItem, IResponse } from '@/types'

import { Magnifier } from '@gravity-ui/icons'
import { Button, Chip, Modal, ScrollShadow, SearchField, Tooltip, Typography, useOverlayState } from '@heroui/react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

import { HOT_ITEMS } from '@/config/hot-list'
import { API_CACHE_SECONDS } from '@/config/response'
import { formatNumber } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

/** 条目索引分批拉取的并发数：与巡检脚本同经验值，避免并发突发触发上游风控 */
const INDEX_CONCURRENCY = 5
/** 条目结果条数上限 */
const MAX_ENTRY_RESULTS = 50

/** 扁平化搜索结果（键盘上下选择的序号与之对应） */
type ResultRow =
  | { type: 'platform'; value: HotValue; label: string; tip: string }
  | { type: 'entry'; value: HotValue; label: string; title: string; hot?: number | string; index: number }

/**
 * 关键词高亮：在原始大小写文本上定位每次命中（needle 归一化口径与结果过滤一致：trim + 小写），
 * 命中片段品牌色加粗、其余原样输出。indexOf 循环天然免疫正则特殊字符，也不用担心重叠匹配
 */
function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  const needle = keyword.trim().toLowerCase()

  if (!needle) return text

  const nodes: ReactNode[] = []
  let cursor = 0
  let index = text.toLowerCase().indexOf(needle)

  while (index !== -1) {
    if (index > cursor) {
      nodes.push(text.slice(cursor, index))
    }

    nodes.push(
      <span key={index} className="text-accent font-bold">
        {text.slice(index, index + needle.length)}
      </span>,
    )
    cursor = index + needle.length
    index = text.toLowerCase().indexOf(needle, cursor)
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }

  return nodes
}

/** 标题切片的字符预算：命中词前约 1/3 作上下文，其余给命中词及后文（窄屏下超预算部分由 truncate 兜底） */
const TITLE_SNIPPET_BUDGET = 30

/**
 * 关键词锚定切片：超长标题以首次命中位置为中心截取窗口、两端补省略号，
 * 保证命中词必然在可见范围内（单行省略号会裁掉尾部，深命中位置的高亮会随之丢失）。
 * 类似搜索结果摘要的展示逻辑：围绕关键词给上下文，而不是从标题开头硬截
 */
function clipAroundKeyword(text: string, keyword: string): string {
  const needle = keyword.trim().toLowerCase()

  if (!needle || text.length <= TITLE_SNIPPET_BUDGET) return text

  const index = text.toLowerCase().indexOf(needle)

  // 无命中（防御：条目行本应必有命中）时退化为头部截断
  if (index === -1) return `${text.slice(0, TITLE_SNIPPET_BUDGET)}…`

  const start = Math.max(0, index - Math.floor(TITLE_SNIPPET_BUDGET / 3))
  const end = Math.min(text.length, start + TITLE_SNIPPET_BUDGET)

  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

/** 搜索索引条目：只存搜索用得到的字段，压缩 sessionStorage 占用（跳转定位靠数组顺序，与卡片数据天然对齐） */
type SearchIndexItem = Pick<HotListItem, 'title' | 'hot'>
/** 会话索引缓存：value → 写入时间 + 条目列表 */
type SearchIndexCache = Partial<Record<HotValue, { ts: number; data: SearchIndexItem[] }>>

const INDEX_CACHE_KEY = 'hot-search-index'

/** 读取并剔除过期条目（与接口缓存窗口对齐；sessionStorage 不存在或损坏时静默回退空对象，SSR 同样安全） */
function readIndexCache(): SearchIndexCache {
  try {
    const raw = sessionStorage.getItem(INDEX_CACHE_KEY)
    const minTs = Date.now() - API_CACHE_SECONDS * 1000

    return Object.fromEntries(
      Object.entries(raw ? (JSON.parse(raw) as SearchIndexCache) : {}).flatMap(([value, cached]) =>
        cached && cached.ts > minTs ? [[value, cached] as const] : [],
      ),
    )
  } catch {
    return {}
  }
}

/** 水合初始索引：缓存条目展开为索引状态，命中平台打开面板时不再重复拉取 */
function hydrateIndexCache(): Partial<Record<HotValue, SearchIndexItem[]>> {
  return Object.fromEntries(Object.entries(readIndexCache()).map(([value, entry]) => [value, entry.data]))
}

/** 写入单个平台的索引缓存（配额超限等失败不影响功能，下次打开仍走网络拉取） */
function writeIndexCache(value: HotValue, data: SearchIndexItem[]) {
  try {
    const cache = readIndexCache()

    cache[value] = { ts: Date.now(), data }
    sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 静默失败
  }
}

function HotSearch() {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  // 搜索索引：平台 → 条目列表（打开面板时分批补拉未索引的平台；sessionStorage 会话缓存，窗口内免拉取）
  const [index, setIndex] = useState<Partial<Record<HotValue, SearchIndexItem[]>>>(hydrateIndexCache)
  const [pendingCount, setPendingCount] = useState(0)
  // 从缓存水合的平台视为已索引，避免同一会话内重复请求
  const fetchedRef = useRef(new Set<HotValue>(Object.keys(index) as HotValue[]))
  const listRef = useRef<HTMLDivElement>(null)

  // 受控弹层状态：Ctrl/⌘+K 全局快捷键与 Modal 内触发按钮共用
  const overlayState = useOverlayState()

  const hiddenItems = useAppStore((state) => state.hiddenItems)
  const setSearchJump = useAppStore((state) => state.setSearchJump)

  // 参与搜索的平台（尊重用户隐藏设置；分节布局下所有可见平台均可跳转）
  const visibleValues = useMemo(
    () => HOT_ITEMS.items.filter((item) => !hiddenItems.includes(item.value)),
    [hiddenItems],
  )

  // Ctrl/⌘+K 全局唤起（浏览器默认的搜索聚焦行为一并拦截）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        overlayState.toggle()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [overlayState])

  // 关闭面板时重置输入，下次打开回到初始态
  useEffect(() => {
    if (!overlayState.isOpen) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [overlayState.isOpen])

  // 命令面板打开即聚焦输入框（用受控聚焦替代 autoFocus，规避 jsx-a11y/no-autofocus）
  useEffect(() => {
    if (overlayState.isOpen) {
      const input = document.querySelector<HTMLInputElement>('[aria-label="全局搜索"] input')

      input?.focus()
    }
  }, [overlayState.isOpen])

  // 打开面板时分批补拉未索引平台的数据；失败不缓存，下次打开重试
  useEffect(() => {
    if (!overlayState.isOpen) return

    const controller = new AbortController()
    const targets = visibleValues.filter((item) => !fetchedRef.current.has(item.value))

    setPendingCount(targets.length)

    const fetchList = async (value: HotValue) => {
      try {
        const response = await fetch(`/api/${value}`, { signal: controller.signal })
        const result: IResponse = await response.json()

        if (controller.signal.aborted) return

        // 空数据与失败响应（60s 短缓存）都不进索引
        if (result.code !== 200 || !result.data?.length) return

        fetchedRef.current.add(value)
        // 只留搜索用得到的字段，写穿到会话缓存
        const items: SearchIndexItem[] = result.data.map(({ title, hot }) => ({ title, hot }))

        setIndex((prev) => ({ ...prev, [value]: items }))
        writeIndexCache(value, items)
      } catch {
        // 中断或网络失败：留待下次打开重试
      } finally {
        if (!controller.signal.aborted) setPendingCount((prev) => prev - 1)
      }
    }

    void (async () => {
      for (let i = 0; i < targets.length; i += INDEX_CONCURRENCY) {
        if (controller.signal.aborted) return
        await Promise.all(targets.slice(i, i + INDEX_CONCURRENCY).map((item) => fetchList(item.value)))
      }
    })()

    return () => controller.abort()
  }, [overlayState.isOpen])

  // 激活项滚入可视区（仅键盘导航）：↑↓ 会把激活项移出视野需要跟随滚动；
  // 鼠标 hover 激活的行必然已在光标下，若同样触发 scrollIntoView，会与滚轮滚动形成
  // 「滚动 → 新行进入光标 → hover 激活 → 列表再滚几像素露出该行 → 下一行进入光标」的自激励循环，
  // 表现为列表到底后仍在持续轻微跳动
  const isKeyboardNavRef = useRef(false)

  useEffect(() => {
    if (!isKeyboardNavRef.current) return

    isKeyboardNavRef.current = false
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const rows = useMemo<ResultRow[]>(() => {
    const keyword = query.trim().toLowerCase()
    const platformRows: ResultRow[] = visibleValues
      .filter(
        (item) => !keyword || item.label.toLowerCase().includes(keyword) || item.tip.toLowerCase().includes(keyword),
      )
      .map((item) => ({ type: 'platform', value: item.value, label: item.label, tip: item.tip }))

    if (!keyword) return platformRows

    const entryRows: ResultRow[] = []

    for (const { value, label } of visibleValues) {
      const list = index[value]

      if (!list) continue

      list.forEach((item, entryIndex) => {
        if (entryRows.length < MAX_ENTRY_RESULTS && item.title.toLowerCase().includes(keyword)) {
          entryRows.push({ type: 'entry', value, label, title: item.title, hot: item.hot, index: entryIndex })
        }
      })
    }

    return [...platformRows, ...entryRows]
  }, [query, visibleValues, index])

  const activate = (row: ResultRow) => {
    // index = -1 表示只定位到卡片；条目跳转的下标与卡片自身数据同源同序
    setSearchJump({ value: row.value, index: row.type === 'entry' ? row.index : -1, token: Date.now() })
    overlayState.close()
  }

  // ↑↓ 移动激活项（Enter 提交由 SearchField 的 onSubmit 承接）
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      isKeyboardNavRef.current = true
      setActiveIndex((prev) => Math.min(prev + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      isKeyboardNavRef.current = true
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    }
  }

  return (
    <Modal state={overlayState}>
      {/* Tooltip 只包裹触发按钮，不能包裹整个 Modal：Modal 的 backdrop/弹窗经 portal 渲染，
          但在 React 树中仍是 Tooltip 触发元素的后代，会导致弹窗内 hover 误触发 Tooltip */}
      <Tooltip delay={0}>
        <Button isIconOnly aria-label="搜索" size="sm" variant="ghost">
          <Magnifier />
        </Button>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          搜索（Ctrl + K）
        </Tooltip.Content>
      </Tooltip>

      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog aria-label="全局搜索" className="sm:max-w-xl overflow-hidden">
            <Modal.Header>
              <SearchField
                aria-label="搜索平台或条目标题"
                className="w-full"
                name="hot-search"
                value={query}
                variant="secondary"
                onChange={setQuery}
                onClear={() => setActiveIndex(0)}
                onSubmit={() => {
                  const row = rows[activeIndex]

                  if (row) activate(row)
                }}
              >
                <SearchField.Group className="w-full">
                  <SearchField.SearchIcon />
                  <SearchField.Input className="w-full" placeholder="搜索平台或条目标题…" onKeyDown={handleKeyDown} />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </Modal.Header>
            {/* overscroll-contain 阻断滚动链：列表滚到边界后，剩余滚量不再传给弹窗背后的页面 */}
            <Modal.Body className="gap-0 p-2 pt-0 overflow-hidden overscroll-contain">
              {/* onMouseLeave 清除 hover 高亮：activeIndex -1 表示无激活项，↑↓ / 再次 hover 可重新激活 */}
              <ScrollShadow
                ref={listRef}
                className="max-h-[52vh] overscroll-contain"
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {pendingCount > 0 && (
                  <Typography className="block px-2 py-1.5" color="muted" type="body-xs">
                    正在索引平台数据（剩余 {pendingCount} 个）…
                  </Typography>
                )}
                {!rows.length ? (
                  <Typography className="block px-3 py-8 text-center" color="muted" type="body-xs">
                    没有匹配的结果
                  </Typography>
                ) : (
                  rows.map((row, i) => {
                    // 平台与条目分区：类型切换处插入分组标题
                    const showHeader = i === 0 || rows[i - 1].type !== row.type

                    return (
                      <Fragment key={row.type === 'platform' ? `p-${row.value}` : `e-${row.value}-${row.index}`}>
                        {showHeader && (
                          <Typography className="block px-2 pt-2 pb-1" color="muted" type="body-xs">
                            {row.type === 'platform' ? '平台' : '条目'}
                          </Typography>
                        )}
                        <button
                          className={`flex w-full items-center gap-2 rounded-3xl px-2 py-1.5 text-left transition-colors${i === activeIndex ? ' bg-accent-soft' : ''}`}
                          data-active={i === activeIndex}
                          title={row.type === 'entry' ? row.title : undefined}
                          type="button"
                          onClick={() => activate(row)}
                          onMouseEnter={() => {
                            isKeyboardNavRef.current = false
                            setActiveIndex(i)
                          }}
                        >
                          {row.type === 'platform' ? (
                            <>
                              <Chip size="sm">{row.tip}</Chip>
                              <Typography className="font-medium" type="body-sm">
                                <HighlightText keyword={query} text={row.label} />
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Chip className="shrink-0" size="sm">
                                {row.label}
                              </Chip>
                              <Typography className="flex-1 min-w-0 truncate" type="body-sm">
                                <HighlightText keyword={query} text={clipAroundKeyword(row.title, query)} />
                              </Typography>
                              {row.hot ? (
                                <Typography className="shrink-0" color="muted" type="body-xs">
                                  {formatNumber(row.hot)}
                                </Typography>
                              ) : null}
                            </>
                          )}
                        </button>
                      </Fragment>
                    )
                  })
                )}
              </ScrollShadow>
            </Modal.Body>
            <Modal.Footer className="flex-wrap items-center gap-x-3 gap-y-1 justify-between">
              <Typography className="whitespace-nowrap" color="muted" type="body-xs">
                ↑↓ 选择 · Enter 跳转 · Esc 关闭
              </Typography>
              <Typography className="whitespace-nowrap" color="muted" type="body-xs">
                已索引 {visibleValues.filter((item) => index[item.value]).length}/{visibleValues.length} 平台
              </Typography>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default HotSearch

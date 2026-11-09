/**
 * @description: 作者身份单一来源：展示名取仓库地址 owner，bio 与头像取 GitHub 账户
 */
import { fetchJson } from '@/lib/request'
import pkg from '#/package.json'

const GIT_URL = pkg.git.url || pkg.author.url

/** GitHub 用户名：仓库地址 owner（github.com/baiwumm/daily-trending → baiwumm），回退到 author.name */
export const AUTHOR_HANDLE = GIT_URL.match(/github\.com[/:]([^/]+?)(?:\.git)?(?:\/|$)/)?.[1] ?? pkg.author.name

export interface GithubAuthor {
  /** 展示名：GitHub 用户名 */
  name: string
  /** GitHub bio，可为空 */
  bio: string | null
  /** 头像地址 */
  avatarUrl: string
}

/**
 * @description: 拉取 GitHub 账户的 bio 与头像（缓存一天），失败时回退为 handle 与 GitHub 直链头像
 */
export async function getGithubAuthor(): Promise<GithubAuthor> {
  const fallback: GithubAuthor = {
    name: AUTHOR_HANDLE,
    bio: null,
    avatarUrl: `https://github.com/${AUTHOR_HANDLE}.png`,
  }

  try {
    const data = await fetchJson<{ bio?: string | null; avatar_url?: string | null }>(
      `https://api.github.com/users/${AUTHOR_HANDLE}`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 86400 },
      },
    )

    return {
      name: AUTHOR_HANDLE,
      bio: data.bio?.trim() || null,
      avatarUrl: data.avatar_url || fallback.avatarUrl,
    }
  } catch {
    return fallback
  }
}

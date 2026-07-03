/**
 * 简易内存缓存工具
 * 用于前端临时缓存接口数据，减少重复请求
 */
interface CacheItem<T> {
  value: T
  expire: number // 过期时间戳，0 表示永不过期
}

const cacheMap = new Map<string, CacheItem<any>>()

/** 读取缓存，不存在或已过期返回 null */
export function getCache<T = any>(key: string): T | null {
  const item = cacheMap.get(key)
  if (!item) return null
  if (item.expire > 0 && Date.now() > item.expire) {
    cacheMap.delete(key)
    return null
  }
  return item.value as T
}

/** 写入缓存，ttl 单位毫秒，0 表示永不过期 */
export function setCache<T = any>(key: string, value: T, ttl = 0): void {
  cacheMap.set(key, {
    value,
    expire: ttl > 0 ? Date.now() + ttl : 0
  })
}

/** 删除指定缓存 */
export function removeCache(key: string): void {
  cacheMap.delete(key)
}

/** 清空所有缓存 */
export function clearCache(): void {
  cacheMap.clear()
}

/**
 * 带缓存的请求包装
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @param ttl 缓存有效期（毫秒）
 */
export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60 * 1000
): Promise<T> {
  const cached = getCache<T>(key)
  if (cached !== null) return cached
  const value = await fetcher()
  setCache(key, value, ttl)
  return value
}

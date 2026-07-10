/**
 * 新闻详情 - 业务逻辑
 */

import { ref } from 'vue'
import type { NewsArticle } from '../types'
import { getNewsArticle } from '../api/eventApi'

export function useNewsDetail() {
  const news = ref<NewsArticle | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchNews(newsId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      news.value = await getNewsArticle(newsId)
    } catch (err) {
      error.value = (err as Error).message || '加载新闻失败'
      news.value = null
    } finally {
      loading.value = false
    }
  }

  function clearNews(): void {
    news.value = null
    error.value = null
  }

  return { news, loading, error, fetchNews, clearNews }
}

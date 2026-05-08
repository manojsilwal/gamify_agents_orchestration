import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getActivity,
  getActivityStats,
  getPointsByMonth,
  getPortfolioSummary,
  getRecommendations,
  postCrawlSnapshot,
  postShoppingCompare,
  workerCrawl,
} from '../lib/api/client'

export const QK = {
  portfolio: ['portfolio', 'summary'] as const,
  recommendations: ['recommendations'] as const,
  activity: (n: number) => ['activity', n] as const,
  activityStats: ['activity', 'stats'] as const,
  pointsMonth: (n: number) => ['insights', 'points', n] as const,
}

export function usePortfolioSummary() {
  return useQuery({ queryKey: QK.portfolio, queryFn: getPortfolioSummary })
}

export function useRecommendations() {
  return useQuery({ queryKey: QK.recommendations, queryFn: getRecommendations })
}

export function useActivity(limit = 100) {
  return useQuery({ queryKey: QK.activity(limit), queryFn: () => getActivity(limit) })
}

export function useActivityStats() {
  return useQuery({ queryKey: QK.activityStats, queryFn: getActivityStats })
}

export function usePointsByMonth(months = 12) {
  return useQuery({ queryKey: QK.pointsMonth(months), queryFn: () => getPointsByMonth(months) })
}

export function useShoppingCompare() {
  return useMutation({
    mutationFn: (query: string) => postShoppingCompare(query),
  })
}

export function useCrawlAndRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (url: string) => {
      const crawl = await workerCrawl(url)
      await postCrawlSnapshot({
        url: crawl.url,
        title: crawl.title,
        excerpt: crawl.excerpt,
      })
      return crawl
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity'] })
      qc.invalidateQueries({ queryKey: QK.activityStats })
    },
  })
}

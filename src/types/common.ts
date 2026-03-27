// Shared types used across the app
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    page: number
    totalPages: number
    totalCount: number
  }
}

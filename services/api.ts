import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";

import { signOut } from "../contexts/AuthContext";

interface AxiosErrorResponse extends AxiosError {
  code?: string;
}

interface FailedResponseQueue {
  onSuccess: (token: string) => void
  onFailure: (err: AxiosError) => void
}

let isRefreshing = false;
let failedRequestsQueue: FailedResponseQueue[] = [];

export function setupAPIClient(ctx: any = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    /*headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }*/
  })

  // Header must be here, so all modifications will act just in time.
  // Otherwelse, they will maintaim `Bearer undefined` until refresh page...
  api.defaults.headers.common['Authorization'] = `Bearer ${cookies['nextauth.token']}`;

  // Intercpt all requests before use of API
  api.interceptors.request.use(response => {
    let cookies = parseCookies(ctx);

    api.defaults.headers.common['Authorization'] = `Bearer ${cookies['nextauth.token']}`;

    return response
  })

  // Intercpt all responses of API
  api.interceptors.response.use(response => {
    return response
  }, (error: AxiosError<AxiosErrorResponse>) => {
    if (error.response?.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        cookies = parseCookies(ctx);

        const { 'nextauth.refreshToken': refreshToken } = cookies
        const originalConfig = error.config

        if (!isRefreshing) {
          isRefreshing = true

          api
            .post('refresh', { refreshToken })
            .then(response => {
              const { token, refreshToken: newRefresh } = response?.data;

              setCookie(ctx, 'nextauth.token', token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
              })

              setCookie(ctx, 'nextauth.refreshToken', newRefresh, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
              })

              api.defaults.headers.common['Authorization'] = `Bearer ${token}`

              failedRequestsQueue.forEach(request => request.onSuccess(token))
              failedRequestsQueue = []
            })
            .catch(err => {
              failedRequestsQueue.forEach(request => request.onFailure(err))
              failedRequestsQueue = []

              signOut()

              // Execute at server-side
              if (typeof window === 'undefined') {
                return Promise.reject(err)
              }
            })
            .finally(() => {
              isRefreshing = false
            })
        }

        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              if (originalConfig.headers) {
                originalConfig.headers['Authorization'] = `Bearer ${token}`
              } else {
                originalConfig.headers = {
                  Authorization: `Bearer ${cookies['nextauth.token']}`
                }
              }

              resolve(api(originalConfig))
            },
            onFailure: (err: AxiosError) => {
              reject(err)
            }
          })
        })
      } else {
        signOut()
      }
    }

    // if get here, let the error continue
    return Promise.reject(error)
  })

  return api
}
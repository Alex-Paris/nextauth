import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";

interface AxiosErrorResponse {
  code?: string;
}

let cookies = parseCookies();

export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    Authorization: `Bearer ${cookies['nextauth.token']}`
  }
})

api.interceptors.response.use(response => {
  return response
}, (error: AxiosError<AxiosErrorResponse>) => {
  if (error.response?.status === 401) {
    if (error.response.data?.code === 'token.expired') {
      cookies = parseCookies();

      const { 'nextauth.refreshToken': refreshToken } = cookies

      api.post('refresh', {
        refreshToken
      }).then(response => {
        const { token, refresh } = response.data;

        setCookie(undefined, 'nextauth.token', token, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
        })

        setCookie(undefined, 'nextauth.refreshToken', refresh, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
        })

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      })
    } else {

    }
  }
})
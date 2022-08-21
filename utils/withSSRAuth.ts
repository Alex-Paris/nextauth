import jwtDecode from "jwt-decode"
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next"
import { destroyCookie, parseCookies } from "nookies"
import { validateUserPermission } from "./validateUserPermission"

type WithSSRAuthOptions = {
  permissions?: string[]
  roles?: string[]
}

// function that returns a function
export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptions): GetServerSideProps {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx)
    const token = cookies['nextauth.token']

    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    if (options) {
      const user = jwtDecode<{ permissions: string[], roles: string[] }>(token)
      const { permissions, roles } = options

      const userHasValidPermissions = validateUserPermission({
        user,
        permissions,
        roles
      })

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false
          }
        }
      }
    }

    try {
      return await fn(ctx)
    } catch (err) {
      destroyCookie(ctx, 'nextauth.token')
      destroyCookie(ctx, 'nextauth.refreshToken')

      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

  }
}
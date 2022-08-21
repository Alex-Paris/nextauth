import { useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { validateUserPermission } from "../utils/validateUserPermission"

type UseCanParams = {
  permissions?: string[]
  roles?: string[]
}

export function useCan({ permissions = [], roles = [] }: UseCanParams) {
  const { user, isAuthenticated } = useContext(AuthContext)

  if ((!isAuthenticated) || (!user)) {
    return false
  }

  const userHasValidPermissions = validateUserPermission({
    user,
    permissions,
    roles
  })

  return userHasValidPermissions
}
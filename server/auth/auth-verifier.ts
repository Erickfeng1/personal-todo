export interface AuthenticatedUser {
  userId: string
}

export interface AuthVerifier {
  authenticate(request: Request): Promise<AuthenticatedUser | null>
}

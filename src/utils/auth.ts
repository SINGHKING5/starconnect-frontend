export interface User {
  id: number;
  email: string;
  type: string;
  name: string;
}

export interface AuthData {
  token: string;
  user: User;
  userRole: string;
}

/**
 * Get authentication data from localStorage
 */
export function getAuthData(): AuthData | null {
  try {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole');

    if (!token || !userData || !userRole) {
      return null;
    }

    const user = JSON.parse(userData);
    
    return {
      token,
      user,
      userRole
    };
  } catch (error) {
    console.error('Error parsing auth data:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const authData = getAuthData();
  return authData !== null;
}

/**
 * Check if user is a celebrity
 */
export function isCelebrity(): boolean {
  const authData = getAuthData();
  if (!authData) return false;
  
  // Double-check both userRole and user.type for redundancy
  return authData.userRole === 'celebrity' && authData.user.type === 'celebrity';
}

/**
 * Check if user is a public user
 */
export function isPublicUser(): boolean {
  const authData = getAuthData();
  if (!authData) return false;
  
  return authData.userRole === 'public' && authData.user.type === 'public';
}

/**
 * Get current user data
 */
export function getCurrentUser(): User | null {
  const authData = getAuthData();
  return authData?.user || null;
}

/**
 * Get current user role
 */
export function getCurrentUserRole(): string | null {
  const authData = getAuthData();
  return authData?.userRole || null;
}

/**
 * Clear authentication data
 */
export function clearAuthData(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
}

/**
 * Set authentication data
 */
export function setAuthData(token: string, user: User, userRole: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('userRole', userRole);
} 
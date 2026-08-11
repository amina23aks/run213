export function invalidateAdminAccessOnDenied(response: Response): Response {
  if (response.status === 401 || response.status === 403) {
    window.dispatchEvent(new Event("run213:admin-auth-invalid"));
  }
  return response;
}

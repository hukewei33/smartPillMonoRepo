/**
 * Hello service: builds the greeting message for the authenticated user.
 */
export function getHelloMessage(email: string | undefined): string {
  return email ? `Hello, ${email}` : 'Hello, world';
}

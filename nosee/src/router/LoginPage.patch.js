/**
 * PARCHE para LoginPage.jsx
 *
 * En tu LoginPage actual, cuando el login es exitoso haces algo como:
 *   navigate('/home')  o  navigate('/')
 *
 * Reemplázalo con esto para que cada rol aterrice en su dashboard:
 *
 * ─────────────────────────────────────────────────────────────────
 * 1. AGREGA este import al principio de LoginPage.jsx:
 * ─────────────────────────────────────────────────────────────────
 *
 *   import { getRolePath } from '@/router/RoleRouter';
 *
 * ─────────────────────────────────────────────────────────────────
 * 2. En el handler de submit, CAMBIA la navegación post-login:
 * ─────────────────────────────────────────────────────────────────
 *
 *   // ANTES:
 *   const result = await login(email, password);
 *   if (result.success) {
 *     navigate('/home'); // ← reemplazar esto
 *   }
 *
 *   // DESPUÉS:
 *   const result = await login(email, password);
 *   if (result.success) {
 *     const user = useAuthStore.getState().user;  // lee el rol ya guardado
 *     navigate(getRolePath(user?.role), { replace: true });
 *   }
 *
 * ─────────────────────────────────────────────────────────────────
 * NOTA: useAuthStore.getState() es la forma de leer el store fuera
 * de un componente (o justo después de un set()). En este caso es
 * seguro porque login() ya hizo set({ user: mappedUser }) antes de
 * retornar { success: true }.
 * ─────────────────────────────────────────────────────────────────
 */
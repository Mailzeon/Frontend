import { redirect } from 'next/navigation';

// The root URL "/" always redirects to login.
// The middleware handles redirecting already-logged-in users
// to their role-specific dashboard.
export default function RootPage() {
  redirect('/login');
}

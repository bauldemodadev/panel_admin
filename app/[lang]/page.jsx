import { redirect } from 'next/navigation';

export default function LangRootPage({ params }) {
  redirect(`/${params.lang}/dashboard`);
  return null;
}

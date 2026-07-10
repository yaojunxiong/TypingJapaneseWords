import { redirect } from 'next/navigation'

export default function AdminStudyVisitorRedirect() {
  redirect('/admin/workflows?definition_key=study_visitor')
}

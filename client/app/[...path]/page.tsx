import { Workspace } from '@/components/workspace'

export default async function WorkspacePage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <Workspace path={path} />
}

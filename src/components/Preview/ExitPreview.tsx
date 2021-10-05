import Link from 'next/link'

import commonStyles from '../../styles/common.module.scss';

export function ExitPreview() {
  return (
    <Link href="/api/exit-preview">
      <a className={commonStyles.preview}>Sair do modo preview</a>
    </Link>
  )
}

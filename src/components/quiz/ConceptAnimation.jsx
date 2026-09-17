import { animSVG } from '../../engine/animSVG'

export default function ConceptAnimation({ name, micro = '' }) {
  return (
    <div
      className="visual"
      dangerouslySetInnerHTML={{ __html: animSVG(name, micro) }}
    />
  )
}

import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'AINTAR'
const DEFAULT_TITLE = 'AINTAR — Gestão Sustentável dos Sistemas de Saneamento'
const DEFAULT_DESC =
  'Associação de Municípios para o Sistema Intermunicipal de Águas Residuais. Gestão responsável dos sistemas de saneamento na região Centro de Portugal.'
const DEFAULT_IMAGE = '/logos/logo-horizontal-color.png'

export default function SeoHead({ title, description, image, canonical }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE
  const metaDesc = description || DEFAULT_DESC
  const metaImage = image || DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  )
}

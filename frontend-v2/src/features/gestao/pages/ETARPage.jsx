import { Factory as ETARIcon } from '@mui/icons-material';
import { useETARList } from '@/core/hooks/useMetaData';
import InstalacaoPage from '../components/InstalacaoPage';

const COLOR = '#0097a7';

const ETARPage = () => {
  const { data: etarList = [] } = useETARList();

  return (
    <InstalacaoPage
      type="etar"
      entityList={etarList}
      title="ETAR"
      icon={ETARIcon}
      color={COLOR}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Gestão', path: '/etar' },
        { label: 'ETAR' },
      ]}
    />
  );
};

export { ETARPage };
export default ETARPage;

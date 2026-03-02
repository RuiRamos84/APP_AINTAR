import { ElectricBolt as EEIcon } from '@mui/icons-material';
import { useEEList } from '@/core/hooks/useMetaData';
import InstalacaoPage from '../components/InstalacaoPage';

const COLOR = '#f57c00';

const EEPage = () => {
  const { data: eeList = [] } = useEEList();

  return (
    <InstalacaoPage
      type="ee"
      entityList={eeList}
      title="Estações Elevatórias"
      icon={EEIcon}
      color={COLOR}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Gestão', path: '/ee' },
        { label: 'Estações Elevatórias' },
      ]}
    />
  );
};

export { EEPage };
export default EEPage;

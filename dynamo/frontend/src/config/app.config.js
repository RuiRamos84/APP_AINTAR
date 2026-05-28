import etar                    from './entities/etar.js'
import ee                      from './entities/ee.js'
import instalacao               from './entities/instalacao.js'
import obra                     from './entities/obra.js'
import rede_saneamento          from './entities/rede_saneamento.js'
import instalacao_analise       from './entities/instalacao_analise.js'
import instalacao_incumprimento from './entities/instalacao_incumprimento.js'
import instalacao_energyread    from './entities/instalacao_energyread.js'
import instalacao_volumeread    from './entities/instalacao_volumeread.js'
import instalacao_waterread     from './entities/instalacao_waterread.js'
import equipamento              from './entities/equipamento.js'
import equipamento_aloc         from './entities/equipamento_aloc.js'
import equipamento_repair       from './entities/equipamento_repair.js'
import veiculo                  from './entities/veiculo.js'
import vehicle_maintenance      from './entities/vehicle_maintenance.js'
import vehicle_assign           from './entities/vehicle_assign.js'
import entity                   from './entities/entity.js'
import contract                 from './entities/contract.js'
import operacao                 from './entities/operacao.js'
import operacaometa             from './entities/operacaometa.js'
import expense                  from './entities/expense.js'
import task                     from './entities/task.js'
import offices                  from './entities/offices.js'
import epi                      from './entities/epi.js'
import epi_deliver              from './entities/epi_deliver.js'
import letter_template          from './entities/letter_template.js'
import whatsapp_config          from './entities/whatsapp_config.js'
import orcamento                from './entities/orcamento.js'
import caixa                    from './entities/caixa.js'
import sibs                     from './entities/sibs.js'
import sensor                   from './entities/sensor.js'
import rh_colaborador           from './entities/rh_colaborador.js'
import rh_faltas                from './entities/rh_faltas.js'
import rh_ferias                from './entities/rh_ferias.js'
import rh_piquete               from './entities/rh_piquete.js'
import rh_ponto                 from './entities/rh_ponto.js'
import stockin                  from './entities/stockin.js'
import stockout                 from './entities/stockout.js'
import concursal_procedimento   from './entities/concursal_procedimento.js'
import concursal_candidatura    from './entities/concursal_candidatura.js'
import aval_period              from './entities/aval_period.js'
import aval                     from './entities/aval.js'
import site_noticia             from './entities/site_noticia.js'
import site_documento           from './entities/site_documento.js'
import site_alerta              from './entities/site_alerta.js'
import site_publicacao          from './entities/site_publicacao.js'
import site_procedimento        from './entities/site_procedimento.js'
import site_processo_financeiro from './entities/site_processo_financeiro.js'

const config = {
  app: {
    name:    'AINTAR',
    apiBase: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  },

  // Módulos definem o sidebar. Entidades filhas (hidden) NÃO estão listadas aqui.
  modules: [
    {
      id:         'gestao',
      label:      'Gestão',
      icon:       'Building2',
      color:      '#10b981',
      permission: 'operation.access',
      entities:   ['etar', 'ee', 'instalacao', 'obra', 'rede_saneamento'],
    },
    {
      id:         'operacao',
      label:      'Operação',
      icon:       'ClipboardList',
      color:      '#6366f1',
      permission: 'operation.access',
      entities:   ['operacao', 'operacaometa', 'expense'],
    },
    {
      id:         'equipamentos',
      label:      'Equipamentos',
      icon:       'Wrench',
      color:      '#f59e0b',
      permission: 'operation.access',
      entities:   ['equipamento'],
    },
    {
      id:         'frota',
      label:      'Frota',
      icon:       'Car',
      color:      '#3b82f6',
      permission: 'operation.access',
      entities:   ['veiculo', 'vehicle_maintenance', 'vehicle_assign'],
    },
    {
      id:         'clientes',
      label:      'Clientes',
      icon:       'Users',
      color:      '#ec4899',
      permission: 'operation.access',
      entities:   ['entity', 'contract'],
    },
    {
      id:         'financeiro',
      label:      'Financeiro',
      icon:       'PieChart',
      color:      '#ef4444',
      permission: 'operation.access',
      entities:   ['caixa', 'orcamento', 'sibs'],
    },
    {
      id:         'telemetria',
      label:      'Telemetria',
      icon:       'Radio',
      color:      '#14b8a6',
      permission: 'operation.access',
      entities:   ['sensor'],
    },
    {
      id:         'interno',
      label:      'Interno',
      icon:       'Briefcase',
      color:      '#64748b',
      permission: 'operation.access',
      entities:   ['task', 'offices', 'epi', 'letter_template', 'whatsapp_config'],
    },
    {
      id:         'rh',
      label:      'Recursos Humanos',
      icon:       'UserCheck',
      color:      '#8b5cf6',
      permission: 'operation.access',
      entities:   ['rh_colaborador', 'rh_faltas', 'rh_ferias', 'rh_piquete', 'rh_ponto'],
    },
    {
      id:         'armazem',
      label:      'Armazém',
      icon:       'Package',
      color:      '#d97706',
      permission: 'operation.access',
      entities:   ['stockin', 'stockout'],
    },
    {
      id:         'recrutamento',
      label:      'Recrutamento',
      icon:       'UserPlus',
      color:      '#0ea5e9',
      permission: 'operation.access',
      entities:   ['concursal_procedimento'],
    },
    {
      id:         'avaliacoes',
      label:      'Avaliações',
      icon:       'Star',
      color:      '#f97316',
      permission: 'operation.access',
      entities:   ['aval_period', 'aval'],
    },
    {
      id:         'site',
      label:      'Website',
      icon:       'Globe',
      color:      '#06b6d4',
      permission: 'operation.access',
      entities:   [
        'site_noticia', 'site_documento', 'site_alerta',
        'site_publicacao', 'site_procedimento', 'site_processo_financeiro',
      ],
    },
  ],

  // Registo completo — inclui entidades hidden usadas em relations/tabs.
  entities: {
    etar,
    ee,
    instalacao,
    obra,
    rede_saneamento,
    // filhas de instalacao/etar/ee
    instalacao_analise,
    instalacao_incumprimento,
    instalacao_energyread,
    instalacao_volumeread,
    instalacao_waterread,
    equipamento,
    // filhas de equipamento
    equipamento_aloc,
    equipamento_repair,
    veiculo,
    vehicle_maintenance,
    vehicle_assign,
    entity,
    contract,
    operacao,
    operacaometa,
    expense,
    task,
    offices,
    epi,
    epi_deliver,
    letter_template,
    whatsapp_config,
    orcamento,
    caixa,
    sibs,
    sensor,
    rh_colaborador,
    rh_faltas,
    rh_ferias,
    rh_piquete,
    rh_ponto,
    stockin,
    stockout,
    concursal_procedimento,
    // filha de concursal_procedimento
    concursal_candidatura,
    aval_period,
    aval,
    site_noticia,
    site_documento,
    site_alerta,
    site_publicacao,
    site_procedimento,
    site_processo_financeiro,
  },
}

export default config

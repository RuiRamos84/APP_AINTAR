"""
Config mestre — agrega todas as entidades e define os módulos.
Entidades com hidden=True são apenas sub-entidades (usadas em relations/tabs) e não aparecem no sidebar.
"""
from entities.etar                      import ENTITY as etar
from entities.ee                        import ENTITY as ee
from entities.instalacao                import ENTITY as instalacao
from entities.obra                      import ENTITY as obra
from entities.rede_saneamento           import ENTITY as rede_saneamento
from entities.instalacao_analise        import ENTITY as instalacao_analise
from entities.instalacao_incumprimento  import ENTITY as instalacao_incumprimento
from entities.instalacao_energyread     import ENTITY as instalacao_energyread
from entities.instalacao_volumeread     import ENTITY as instalacao_volumeread
from entities.instalacao_waterread      import ENTITY as instalacao_waterread
from entities.equipamento               import ENTITY as equipamento
from entities.equipamento_aloc          import ENTITY as equipamento_aloc
from entities.equipamento_repair        import ENTITY as equipamento_repair
from entities.veiculo                   import ENTITY as veiculo
from entities.vehicle_maintenance       import ENTITY as vehicle_maintenance
from entities.vehicle_assign            import ENTITY as vehicle_assign
from entities.entity                    import ENTITY as entity
from entities.contract                  import ENTITY as contract
from entities.operacao                  import ENTITY as operacao
from entities.operacaometa              import ENTITY as operacaometa
from entities.expense                   import ENTITY as expense
from entities.task                      import ENTITY as task
from entities.offices                   import ENTITY as offices
from entities.epi                       import ENTITY as epi
from entities.epi_deliver               import ENTITY as epi_deliver
from entities.letter_template           import ENTITY as letter_template
from entities.whatsapp_config           import ENTITY as whatsapp_config
from entities.orcamento                 import ENTITY as orcamento
from entities.caixa                     import ENTITY as caixa
from entities.sibs                      import ENTITY as sibs
from entities.sensor                    import ENTITY as sensor
from entities.rh_colaborador            import ENTITY as rh_colaborador
from entities.rh_faltas                 import ENTITY as rh_faltas
from entities.rh_ferias                 import ENTITY as rh_ferias
from entities.rh_piquete               import ENTITY as rh_piquete
from entities.rh_ponto                  import ENTITY as rh_ponto
from entities.stockin                   import ENTITY as stockin
from entities.stockout                  import ENTITY as stockout
from entities.concursal_procedimento    import ENTITY as concursal_procedimento
from entities.concursal_candidatura     import ENTITY as concursal_candidatura
from entities.aval_period               import ENTITY as aval_period
from entities.aval                      import ENTITY as aval
from entities.site_noticia              import ENTITY as site_noticia
from entities.site_documento            import ENTITY as site_documento
from entities.site_alerta               import ENTITY as site_alerta
from entities.site_publicacao           import ENTITY as site_publicacao
from entities.site_procedimento         import ENTITY as site_procedimento
from entities.site_processo_financeiro  import ENTITY as site_processo_financeiro

APP_CONFIG = {
    "app": {
        "name": "AINTAR Dynamo",
    },

    # Módulos definem o que aparece no sidebar.
    # Entidades filhas (hidden) NÃO estão listadas aqui — são acedidas via tabs das entidades pai.
    "modules": [
        {
            "id":         "gestao",
            "label":      "Gestão",
            "icon":       "Building2",
            "color":      "#10b981",
            "permission": "operation.access",
            "entities":   ["etar", "ee", "instalacao", "obra", "rede_saneamento"],
        },
        {
            "id":         "operacao",
            "label":      "Operação",
            "icon":       "ClipboardList",
            "color":      "#6366f1",
            "permission": "operation.access",
            "entities":   ["operacao", "operacaometa", "expense"],
        },
        {
            "id":         "equipamentos",
            "label":      "Equipamentos",
            "icon":       "Wrench",
            "color":      "#f59e0b",
            "permission": "operation.access",
            "entities":   ["equipamento"],
        },
        {
            "id":         "frota",
            "label":      "Frota",
            "icon":       "Car",
            "color":      "#3b82f6",
            "permission": "operation.access",
            "entities":   ["veiculo", "vehicle_maintenance", "vehicle_assign"],
        },
        {
            "id":         "clientes",
            "label":      "Clientes",
            "icon":       "Users",
            "color":      "#ec4899",
            "permission": "operation.access",
            "entities":   ["entity", "contract"],
        },
        {
            "id":         "financeiro",
            "label":      "Financeiro",
            "icon":       "PieChart",
            "color":      "#ef4444",
            "permission": "operation.access",
            "entities":   ["caixa", "orcamento", "sibs"],
        },
        {
            "id":         "telemetria",
            "label":      "Telemetria",
            "icon":       "Radio",
            "color":      "#14b8a6",
            "permission": "operation.access",
            "entities":   ["sensor"],
        },
        {
            "id":         "interno",
            "label":      "Interno",
            "icon":       "Briefcase",
            "color":      "#64748b",
            "permission": "operation.access",
            "entities":   ["task", "offices", "epi", "letter_template", "whatsapp_config"],
        },
        {
            "id":         "rh",
            "label":      "Recursos Humanos",
            "icon":       "UserCheck",
            "color":      "#8b5cf6",
            "permission": "operation.access",
            "entities":   ["rh_colaborador", "rh_faltas", "rh_ferias", "rh_piquete", "rh_ponto"],
        },
        {
            "id":         "armazem",
            "label":      "Armazém",
            "icon":       "Package",
            "color":      "#d97706",
            "permission": "operation.access",
            "entities":   ["stockin", "stockout"],
        },
        {
            "id":         "recrutamento",
            "label":      "Recrutamento",
            "icon":       "UserPlus",
            "color":      "#0ea5e9",
            "permission": "operation.access",
            "entities":   ["concursal_procedimento"],
        },
        {
            "id":         "avaliacoes",
            "label":      "Avaliações",
            "icon":       "Star",
            "color":      "#f97316",
            "permission": "operation.access",
            "entities":   ["aval_period", "aval"],
        },
        {
            "id":         "site",
            "label":      "Website",
            "icon":       "Globe",
            "color":      "#06b6d4",
            "permission": "operation.access",
            "entities":   [
                "site_noticia", "site_documento", "site_alerta",
                "site_publicacao", "site_procedimento", "site_processo_financeiro",
            ],
        },
    ],

    # Registo completo — inclui entidades hidden (filhas).
    # O engine usa este dict para carregar entidades referenciadas em relations.
    "entities": {
        "etar":                     etar,
        "ee":                       ee,
        "instalacao":               instalacao,
        "obra":                     obra,
        "rede_saneamento":          rede_saneamento,
        # filhas de instalacao/etar/ee — hidden
        "instalacao_analise":       instalacao_analise,
        "instalacao_incumprimento": instalacao_incumprimento,
        "instalacao_energyread":    instalacao_energyread,
        "instalacao_volumeread":    instalacao_volumeread,
        "instalacao_waterread":     instalacao_waterread,
        "equipamento":              equipamento,
        # filhas de equipamento — hidden
        "equipamento_aloc":         equipamento_aloc,
        "equipamento_repair":       equipamento_repair,
        "veiculo":                  veiculo,
        "vehicle_maintenance":      vehicle_maintenance,
        "vehicle_assign":           vehicle_assign,
        "entity":                   entity,
        "contract":                 contract,
        "operacao":                 operacao,
        "operacaometa":             operacaometa,
        "expense":                  expense,
        "task":                     task,
        "offices":                  offices,
        "epi":                      epi,
        "epi_deliver":              epi_deliver,
        "letter_template":          letter_template,
        "whatsapp_config":          whatsapp_config,
        "orcamento":                orcamento,
        "caixa":                    caixa,
        "sibs":                     sibs,
        "sensor":                   sensor,
        "rh_colaborador":           rh_colaborador,
        "rh_faltas":                rh_faltas,
        "rh_ferias":                rh_ferias,
        "rh_piquete":               rh_piquete,
        "rh_ponto":                 rh_ponto,
        "stockin":                  stockin,
        "stockout":                 stockout,
        "concursal_procedimento":   concursal_procedimento,
        # filha de concursal_procedimento — hidden
        "concursal_candidatura":    concursal_candidatura,
        "aval_period":              aval_period,
        "aval":                     aval,
        "site_noticia":             site_noticia,
        "site_documento":           site_documento,
        "site_alerta":              site_alerta,
        "site_publicacao":          site_publicacao,
        "site_procedimento":        site_procedimento,
        "site_processo_financeiro": site_processo_financeiro,
    },
}

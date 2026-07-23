export type AuthStackParamList = {
  Login: undefined;
};

export type RhStackParamList = {
  RhHome: undefined;
  RhColaborador: undefined;
  Ponto: undefined;
  Ferias: undefined;
  Faltas: undefined;
  Participacao: undefined;
  Horarios: undefined;
  Piquete: undefined;
  MapaFerias: undefined;
  Aval: undefined;
  AvalAnalytics: undefined;
  FaceEnroll: undefined;
  FaceVerify: { eventoFk: number };
  RhChefia: undefined;
  GestaoCentral: undefined;
  PontoMapa: undefined;
};

export type OperationsStackParamList = {
  OperationsHome: undefined;
  Voltas: undefined;
  TasksManagement: undefined;
  OperationControl: undefined;
  Supervisor: undefined;
};

export type MainTabParamList = {
  RhTab: undefined;
  OperacaoTab: undefined;
};

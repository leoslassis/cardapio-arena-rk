const RESERVA = {
  status: 'Status',
  id: 'ID do pedido',
  evento: 'ID do evento',
  observacao: 'Observação da equipe',
  aprovacao: 'Aprovar',
  confirmado: 'Confirmada',
  fuso: 'America/Sao_Paulo',
};

function instalarAprovacao() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const nomeAba = PropertiesService.getScriptProperties().getProperty('ABA_RESPOSTAS');
  const aba = planilha.getSheetByName(nomeAba || '');
  if (!aba) throw new Error('Configure ABA_RESPOSTAS com o nome da aba de respostas.');
  obterCalendarios();
  let colunas = cabecalhos(aba);
  for (const nome of ['Espaço', 'Data', 'Início', 'Fim']) {
    if (!colunas[nome]) throw new Error('Pergunta ausente no formulário: ' + nome);
  }
  for (const nome of [RESERVA.status, RESERVA.id, RESERVA.evento, RESERVA.observacao]) {
    if (!colunas[nome]) aba.getRange(1, aba.getLastColumn() + 1).setValue(nome);
  }
  colunas = cabecalhos(aba);
  aba.getRange(2, colunas[RESERVA.status], aba.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pendente', RESERVA.aprovacao, 'Recusada', 'Conflito', RESERVA.confirmado, 'Revisar'], true)
      .setAllowInvalid(false).build()
  );
  const instalado = ScriptApp.getProjectTriggers().some(trigger =>
    trigger.getHandlerFunction() === 'aprovarReserva' && trigger.getTriggerSourceId() === planilha.getId()
  );
  if (!instalado) ScriptApp.newTrigger('aprovarReserva').forSpreadsheet(planilha).onEdit().create();
}

function aprovarReserva(evento) {
  const celula = evento.range;
  const aba = celula.getSheet();
  const props = PropertiesService.getScriptProperties();
  if (aba.getName() !== props.getProperty('ABA_RESPOSTAS') ||
      celula.getRow() < 2 || celula.getNumRows() !== 1 ||
      celula.getNumColumns() !== 1 || evento.value !== RESERVA.aprovacao) return;
  const colunas = cabecalhos(aba);
  if (celula.getColumn() !== colunas[RESERVA.status]) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (celula.getValue() !== RESERVA.aprovacao) return;
    const linha = celula.getRow();
    const obs = aba.getRange(linha, colunas[RESERVA.observacao]);
    const id = aba.getRange(linha, colunas[RESERVA.id]);
    try {
      const eventoId = aba.getRange(linha, colunas[RESERVA.evento]);
      if (eventoId.getValue()) {
        celula.setValue(RESERVA.confirmado);
        return;
      }
      const dados = aba.getRange(linha, 1, 1, aba.getLastColumn()).getValues()[0];
      const espaco = dados[colunas['Espaço'] - 1];
      const [inicio, fim] = intervalo(
        dados[colunas.Data - 1],
        aba.getRange(linha, colunas['Início']).getDisplayValue(),
        aba.getRange(linha, colunas.Fim).getDisplayValue()
      );
      const calendarioId = obterCalendarios()[espaco];
      const calendario = calendarioId && CalendarApp.getCalendarById(calendarioId);
      if (!calendario) throw new Error('Agenda não disponível para o espaço informado.');

      const pedidoId = id.getValue() || Utilities.getUuid();
      id.setValue(pedidoId);
      SpreadsheetApp.flush();
      const marca = 'arena-rk-reserva:' + pedidoId;
      const ocupados = calendario.getEvents(inicio, fim).filter(item =>
        item.getStartTime() < fim && item.getEndTime() > inicio
      );
      const existente = ocupados.find(item => item.getDescription().includes(marca));
      if (existente) {
        eventoId.setValue(existente.getId());
        celula.setValue(RESERVA.confirmado);
        obs.clearContent();
        return;
      }
      if (ocupados.length) {
        celula.setValue('Conflito');
        obs.setValue('O horário já está ocupado na agenda.');
        return;
      }
      if (inicio <= new Date()) throw new Error('O horário solicitado já passou.');
      const reserva = calendario.createEvent('Reserva Arena RK • ' + espaco, inicio, fim, {description: marca});
      eventoId.setValue(reserva.getId());
      celula.setValue(RESERVA.confirmado);
      obs.clearContent();
    } catch (erro) {
      celula.setValue('Revisar');
      obs.setValue(String(erro.message || erro));
    }
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function intervalo(data, inicio, fim) {
  if (!(data instanceof Date) || isNaN(data)) throw new Error('Data inválida.');
  const dia = Utilities.formatDate(data, RESERVA.fuso, 'yyyy-MM-dd');
  const horario = valor => {
    const partes = /^([01]?\d|2[0-3]):([0-5]\d)(?::00)?$/.exec(String(valor).trim());
    if (!partes) throw new Error('Informe o horário como HH:MM.');
    const texto = partes[1].padStart(2, '0') + ':' + partes[2];
    return Utilities.parseDate(dia + ' ' + texto, RESERVA.fuso, 'yyyy-MM-dd HH:mm');
  };
  const primeiro = horario(inicio);
  const ultimo = horario(fim);
  if (ultimo <= primeiro) throw new Error('O fim deve acontecer depois do início no mesmo dia.');
  return [primeiro, ultimo];
}

function obterCalendarios() {
  const bruto = PropertiesService.getScriptProperties().getProperty('AGENDAS');
  const agendas = JSON.parse(bruto || '{}');
  if (!agendas || Object.keys(agendas).length === 0) throw new Error('Configure a propriedade AGENDAS.');
  return agendas;
}

function cabecalhos(aba) {
  return Object.fromEntries(aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0]
    .map((nome, indice) => [nome, indice + 1]));
}

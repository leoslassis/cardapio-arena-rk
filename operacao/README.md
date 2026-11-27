# Reservas no Google Agenda

O site envia os visitantes ao WhatsApp oficial enquanto a integração aguarda autorização na conta da Arena. O formulário coleta pedidos e a equipe decide quais aprovar. Nenhuma credencial ou agenda privada entra no site.

1. Na conta Google da Arena, crie uma agenda privada para cada espaço reservável. Compartilhe o acesso necessário apenas com a equipe.
2. Crie um Google Form com as perguntas obrigatórias **Nome**, **WhatsApp**, **Espaço** (lista com os nomes das quadras e da churrasqueira), **Data** (campo do tipo data), **Início** e **Fim** (resposta curta em formato HH:MM). No texto de confirmação, diga que a equipe ainda precisa confirmar o pedido.
3. Vincule o Form a uma planilha de respostas. Configure o fuso da planilha e do Apps Script como **America/Sao_Paulo**. Abra **Extensões → Apps Script** na planilha, copie `reservas.gs` e defina as propriedades de script `ABA_RESPOSTAS` (nome da aba) e `AGENDAS` (objeto JSON que associa os nomes exatos da pergunta Espaço aos IDs privados de agenda).
4. Execute `instalarAprovacao` uma vez com a conta da Arena e autorize Planilhas e Agenda. A conta deve poder editar todas as agendas configuradas.
5. Publique o formulário, faça um pedido de teste e escolha **Aprovar** na coluna **Status**. O evento confirmado deve aparecer na agenda. Faça um segundo teste sobreposto para verificar o status **Conflito**. A equipe avisa o cliente por WhatsApp após conferir o status.
6. Gere links públicos com Espaço preenchido para os botões em `reservas/index.html`. Mantenha a planilha e os calendários privados.

Registre aulas, eventos e reservas feitas por outros canais nas agendas dos espaços que ocuparem. Altere o status apenas em uma célula por vez. Para alterar ou cancelar uma reserva já confirmada, a equipe também deve atualizar o evento na agenda. Os horários de cada pedido devem começar e terminar no mesmo dia.

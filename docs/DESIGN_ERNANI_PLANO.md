# PDF de UI/UX do Ernâni — plano de aplicação no app do paciente

Fonte: PDF de 27 telas (tema escuro + laranja) recebido em 21/10. Comparado com o código do app em 21/10.
Status: [x] feito · [ ] pendente · (R) depende de regra/decisão da cliente.

## Lote 1 — só visual (sem dado novo)
- [x] Abas: Home→Hoje, Progresso→Evolução (telas 01–27, barra inferior)
- [x] Dicas gerais: textos e ícones por orientação, "todos os pacientes" (tela 25)
- [x] Mapa muscular: "enfraquecido" deixa de ser verde (tela 15)
- [x] Home: cards sequência e semana concluída (kcal estimadas fica p/ lote 2, sem origem de dado); "Próxima ação"; "Registro rápido"; sem elogio automático (tela 01)
- [x] Notificações em painel sobre a Home (tela 02); ícones por tipo já existiam
- [x] Água: copo que enche + atalhos 150/250/500 mL (tela 04). "Desfazer último": lote 2 (o contrato soma eventos; desfazer exige apagar evento)
- [x] Plano › Treino: "Treino de hoje" + ficha da semana; sem "0 min" (tela 20). "Feito" por treino na semana: publicado
- [x] Suplementos: adesão da semana + semana em linha (tela 24). "Autor" (quem prescreveu): lote 2 (a tabela não guarda o autor)
- [x] Conquistas: barra de progresso geral (tela 08). Contagem 7/14 nas bloqueadas: lote 2
- [x] Chat: "Sua equipe" com papéis e canal seguro em destaque (tela 26). Botão flutuante "Minha equipe" agora em todas as telas do paciente (tirei o contador "2" que era fixo/inventado)

## Lote 2 — dado novo, sem decisão externa
- [x] Trava de peso >2 kg/dia com confirmação (tela 03); valor confirmado fora da curva não emite o marcador do VRI. Pendente: a equipe aprovar/rejeitar no web e o valor sair do gráfico até lá
- [x] Esforço percebido 1–10 ao concluir o treino (tela 23; evento workout_effort, aparece na timeline do web). Recado ao educador: publicado (vira mensagem no chat marcando o educador)
- [ ] Preparação corporal opcional e miniatura sem quadrado branco (telas 21–22)
- [x] Kcal estimadas da semana em barras na Evolução (tela 13) e Resumo da semana (tela 17; kcal = treino concluído + atividades, rotulado como estimativa). Pendente da tela 17: recado da equipe e compartilhar
- [x] Tela do VRI: número do servidor, curva dos snapshots, 4 componentes com dado real, dica do mais fraco (tela 14). A dica não promete pontos (o servidor decide)
- [x] Guia de pose da foto: check por pose na semana, próxima sugerida, dicas e privacidade (tela 05); "Para:" com chips, já preenchido pela aba (tela 26)

## Lote 3 — depende da cliente (R)
- [ ] Ligas Bronze→Platina; filtro Geral/Amigos/Clínica; feed sem peso de terceiros (telas 09–11)
- [ ] Participar do ranking / só iniciais / exportar dados (LGPD) (tela 27)
- [x] Jornada: "fase n de 5", próximo marco 30/60/90 com barra, atalhos Sequência/Desafio e linha de conquistas (tela 06). Tela da Sequência com a regra ATUAL do servidor (tela 07).
- [ ] (R) Nomes das 5 fases ("nomes a validar"), regra "dia cumprido = 80% das tarefas", proteção semanal e recorde da sequência: mudam regra do servidor e precisam de decisão
- [ ] Dispositivos (sono/passos) — "em breve"

## Telas 13, 15 e 16 (Evolução)
- [x] Comparar fotos com divisor arrastável e data + peso mais próximo de cada foto (tela 16); sem peso a até 7 dias, mostra só a data
- [x] Mapa muscular: "recuperado" volta a ser verde e "enfraquecido" violeta (tela 15)
- [x] Cartão do VRI na Evolução com "Detalhes ›" (tela 13)

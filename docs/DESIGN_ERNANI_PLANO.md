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
- [x] Plano › Treino: "Treino de hoje" + ficha da semana; sem "0 min" (tela 20). Status "feito" por dia: lote 2 (não há leitura)
- [x] Suplementos: adesão da semana + semana em linha (tela 24). "Autor" (quem prescreveu): lote 2 (a tabela não guarda o autor)
- [x] Conquistas: barra de progresso geral (tela 08). Contagem 7/14 nas bloqueadas: lote 2
- [x] Chat: "Sua equipe" com papéis e canal seguro em destaque (tela 26). Botão flutuante "Minha equipe" em todas as telas: pendente

## Lote 2 — dado novo, sem decisão externa
- [x] Trava de peso >2 kg/dia com confirmação (tela 03); valor confirmado fora da curva não emite o marcador do VRI. Pendente: a equipe aprovar/rejeitar no web e o valor sair do gráfico até lá
- [x] Esforço percebido 1–10 ao concluir o treino (tela 23; evento workout_effort, aparece na timeline do web). Recado ao educador: pendente
- [ ] Preparação corporal opcional e miniatura sem quadrado branco (telas 21–22)
- [ ] Gráfico de kcal da semana; resumo da semana (telas 13, 17)
- [ ] Tela do VRI com 4 componentes e dica acionável (tela 14)
- [ ] Guia de pose da foto (tela 05); "Para:" preenchido pelo botão (tela 26)

## Lote 3 — depende da cliente (R)
- [ ] Ligas Bronze→Platina; filtro Geral/Amigos/Clínica; feed sem peso de terceiros (telas 09–11)
- [ ] Participar do ranking / só iniciais / exportar dados (LGPD) (tela 27)
- [ ] 5 fases da Jornada com novos nomes ("nomes a validar") e proteção semanal da sequência (telas 06–07)
- [ ] Dispositivos (sono/passos) — "em breve"

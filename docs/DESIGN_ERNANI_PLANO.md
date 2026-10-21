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
- [x] Trava de peso >2 kg/dia com confirmação (tela 03); valor confirmado fora da curva não emite o marcador do VRI. Equipe aprova/recusa no web (aba Antropometria); até lá o valor fica fora do gráfico e do VRI, e o paciente vê "em análise da equipe"
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

## Ficou para a volta ao web / decisão (não são só mobile)
- Desafio/ranking/ligas/feed/Perfil de ranking e LGPD (telas 09–12 e 27): a tela de Desafios é toda de dados de exemplo (participantes inventados). Precisa de back-end próprio (grupos, pontuação, consentimento, só iniciais). O card da Home deixou de mostrar "#4 · 1.060 pts" fixo.
- Regras da sequência do PDF (dia = 80% das tarefas, proteção semanal, recorde) e nomes das 5 fases: mudam regra do servidor.
- Dispositivos (sono e passos), compartilhar resumo semanal, recado da equipe no resumo, contagem 7/14 nas conquistas, desfazer água, autor do suplemento.

## Feito depois
- Opções de refeição (tela 19): `meals.options` (até 5 alternativas, gravadas pelo editor do plano no web) e `meal_logs.option_index` (qual opção o paciente usou). "Usar opção" marca a refeição como feita com aquela opção.
- Body map oficial (pacote do Ernâni): `src/components/officialMuscles.ts` (gerado do SVG oficial, 41 músculos); serrátil/oblíquos→abdômen, adutores→quadríceps, tibial→panturrilha, infraespinhal→dorsais no estado de recuperação.

## Decisões aprovadas pelo Djeimyson (21/10) — seguir as recomendações do Hefesto
Valem como ponto de partida até Ernâni/Juliana responderem; o que diverge entra como ajuste.
- Sequência: 1 falha perdoada por semana; recorde = maior sequência de todos os tempos.
- Desafio: pontos por dia com teto de 100 (treino 40, refeições 30, água 10, suplemento 10, peso/foto 10). Ligas Bronze→Platina (5): sobe quem fecha a semana nos 30% melhores, desce quem fica nos 20% piores; reinício mensal.
- Ranking: só entra quem aceitar; aparece só com iniciais; por clínica como padrão; feed sem peso/foto de terceiros. Desafio padrão da Vertexa + desafios criados por cada clínica. Sem prêmio real (só selo e posição).
- Dispositivos (passos/sono): só aviso "em breve".
- Resumo semanal: recado automático por faixa de desempenho, que o profissional pode trocar; compartilhar = imagem.
- LGPD: exportar dados e apagar conta, prazo de 15 dias (clínica avisada antes; guarda do histórico clínico a confirmar com a clínica).
- Relatório em lote: um PDF por paciente, baixados num único arquivo.
- Convidados: começar com 2 por clínica, só leitura, sem cobrança extra (a confirmar com a Juliana). Retenção financeira: 5 anos (a confirmar com a contadora).
### Ainda SEM resposta (não construir antes)
- Nomes das 5 fases da Jornada (só o Ernâni define; critério por dias sugerido: 0–14, 15–30, 31–60, 61–90, 90+).
- Quais tarefas entram na regra "dia cumprido = 80%" (hoje: qualquer registro).
- Significado de "Geral" no ranking (sugestão: só a própria clínica).
- Valor e limite de convidados (decisão comercial).

## Sequência (feito em 21/10)
- Servidor: 1 falha perdoada por semana (seg–dom BRT), duas falhas seguidas ou na mesma semana quebram; ninguém perdeu sequência (22 iguais, 1 maior em 23 pacientes). `private.streak_walk`, `public.my_streak_summary()`.
- App: tela da Sequência com recorde, dia protegido e regra explicada. Home/Jornada seguem lendo o último snapshot (atualiza no próximo registro).

## Respostas aprovadas em 21/10 (segunda rodada)
- Fases da Jornada: por TEMPO de acompanhamento, 1–14, 15–30, 31–60, 61–90 e 91+ dias (feito no app: `phaseForDay`; Home, Perfil e Jornada usam o mesmo critério). Os NOMES continuam provisórios; o Ernâni define os definitivos.
- Dia cumprido: ≥80% das atividades PREVISTAS para aquele dia (treino do dia, refeições do plano, hidratação, suplementos). Dia de descanso marcado continua não quebrando a sequência. NÃO implementado ainda: endurece a regra do servidor (pode reduzir sequências atuais), então primeiro simular o efeito nos pacientes reais.
- Ranking "Geral": só pacientes da própria clínica.
- Convidados: 2 gratuitos por clínica; valor do adicional a definir com a Juliana.

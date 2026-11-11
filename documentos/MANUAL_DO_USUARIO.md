# Manual do Usuário e Operação - Obras Jooy

Guia prático de utilização das rotinas do sistema **Obras Jooy (Almoxarifado & Canteiro)** para equipes de campo, almoxarifes e administradores.

---

## 1. Acesso ao Sistema e Autenticação

### 1.1 Tela de Login
1. Acesse o endereço do sistema pelo navegador no computador, tablet ou celular.
2. Informe seu **Login de Usuário** e sua **Senha**.
3. Clique no botão **Entrar no Sistema**.

### 1.2 Instalação no Celular / Tablet (Modo PWA)
O Obras Jooy foi concebido como um Progressive Web App (PWA):
- **No Android (Google Chrome)**: Toque no menu de três pontos no canto superior direito e selecione **Adicionar à tela inicial** (ou **Instalar aplicativo**).
- **No iOS (Safari)**: Toque no ícone de compartilhamento (quadrado com seta para cima) e selecione **Adicionar à Tela de Início**.

### 1.3 Operação Offline no Canteiro
- Quando o colaborador realiza login ao menos uma vez online no aparelho, suas credenciais seguras (criptografadas localmente) são preservadas.
- Se a equipe descer para o subsolo ou perder o sinal de internet/Wi-Fi:
  - O sistema exibe o alerta superior **Modo Offline - Autenticação Local**.
  - O encarregado pode abrir e autenticar no aplicativo normalmente usando sua senha salva.
  - As requisições criadas em campo são guardadas no aparelho e sincronizadas automaticamente assim que o sinal for restabelecido.

---

## 2. Guia do Encarregado (Canteiro de Obras)

O perfil **ENCARREGADO** possui uma interface enxuta e objetiva, adaptada para telas de celulares:

### 2.1 Tela Inicial do Encarregado
- **Resumo dos Meus Pedidos**: Mostra a quantidade de pedidos em andamento (`Aguardando Almoxarifado`), entregues na obra (`Pedidos Atendidos`) e o total histórico.
- **Meus Pedidos Recentes de Obra**: Lista em tempo real com o número da requisição, destino, insumos e status atual (`Aguardando Almoxarifado`, `Em Separação`, `Pronta para Retirada`, `Entregue no Canteiro` ou `Cancelada`).

### 2.2 Criando um Pedido de Material ou Ferramenta
1. Na tela inicial, clique em **Novo Pedido de Obra** (ou acesse a aba **Requisições** no menu).
2. Clique no botão **+ Nova Requisição de Obra**.
3. Preencha as informações:
   - **Obra**: Já vem travada automaticamente na obra vinculada ao seu usuário.
   - **Área / Pavimento de Destino**: Selecione o setor onde o material será aplicado (ex: *Subsolo 02*, *Torre A - 3º Pavimento*).
   - **Etapa de Execução**: Selecione a etapa correspondente (ex: *Estrutura*, *Alvenaria*).
4. Adicione os itens solicitados:
   - Escolha o tipo: **Material** ou **Ferramenta**.
   - Digite no campo de busca para localizar o item pelo nome ou código.
   - Informe a **Quantidade** necessária.
   - Clique em **+ Adicionar Outro Item** caso precise de mais itens no mesmo pedido.
5. (Opcional) Adicione observações no campo de texto (ex: *Urgente para a concretagem do bloco norte*).
6. Clique em **Enviar Requisição**. O pedido entra imediatamente na fila do almoxarifado.

---

## 3. Guia do Almoxarife (Almoxarifado Central)

O perfil **ALMOXARIFE** é responsável pelo controle físico de saldo, conferência e entrega no balcão:

### 3.1 Painel Operacional (Home)
- Acompanhamento de **Requisições Pendentes** no balcão.
- Pendentes de exportação para conferência no ERP (SIENGE).
- Painel de ferramentas em campo vs. disponíveis no almoxarifado.

### 3.2 Atendendo Requisições de Obra
1. Na tela inicial ou em **Requisições**, localize o pedido na lista com status `Aguardando Entrega`.
2. Clique no botão **Atender**.
3. No formulário de entrega:
   - Confira os materiais e informe a **Quantidade Entregue** de cada item (o sistema permite entrega parcial se não houver saldo total).
   - Se o pedido contiver **Ferramentas**, marque a caixa obrigatória confirmando que a ferramenta foi **testada no balcão antes da entrega**.
   - No campo **Retirado por**, digite o nome e função do colaborador que está retirando os materiais (ex: *José da Silva - Pedreiro*).
4. Clique em **Confirmar Entrega e Baixar Estoque**.
   - O saldo no almoxarifado é debitado automaticamente no Livro-Razão.
   - O status da requisição muda para `ATENDIDA`.

### 3.3 Entrada de Materiais e Inserção ao Estoque
1. Acesse o menu **Estoque** na barra de navegação.
2. Na aba **Saldos do Estoque**, localize o material desejado ou utilize a barra de pesquisa rápida.
3. Para registrar uma nova entrada:
   - Clique em **Inserir Saldo / Movimentação**.
   - Digite o nome ou código do insumo no seletor com busca pesquisável.
   - Selecione a obra/almoxarifado de destino.
   - Informe a quantidade e o documento de referência (ex: Nota Fiscal).
   - Confirme a entrada para atualizar o saldo disponível.

### 3.4 Controle de Cautela e Ferramentas
1. Acesse o menu **Ferramentas**.
2. **Visualizar Ativos**: Verifique quais ferramentas estão *Disponíveis*, *Emprestadas* ou *Em Manutenção/Reparo*.
3. **Registrar Devolução**:
   - Apenas o almoxarife pode receber a devolução.
   - Localize o equipamento emprestado e clique em **Devolver**.
   - Realize o teste de funcionamento do equipamento no retorno e marque o checklist de conferência.
   - Se houver avaria, registre o status *Com Defeito* para encaminhar para manutenção.

---

## 4. Guia do Administrador (Gestão e Parâmetros)

O perfil **ADMIN** possui controle total sobre cadastros base e parametrizações:

### 4.1 Gerenciamento de Usuários e Perfis
1. Acesse o menu **Gestão** -> **Usuários**.
2. **Cadastrar Novo Usuário**:
   - Clique em **Novo Usuário**.
   - Informe: Nome Completo, Login, Senha inicial, Cargo e Perfil (`ADMIN`, `ALMOXARIFE`, `ENCARREGADO`, etc.).
   - Para Encarregados e Almoxarifes, selecione a **Obra Vinculada** para travar a seleção no canteiro.
3. **Editar / Inativar Usuário**:
   - Altere dados cadastrais ou redefina senhas com um clique.
   - Inative colaboradores desligados para revogar o acesso imediatamente.

### 4.2 Cadastro de Obras e Pavimentos
1. Acesse **Gestão** -> **Obras & Áreas**.
2. Cadastre o código da obra (ex: `JOOY-01`) e o nome do empreendimento.
3. Clique na obra para detalhar seus setores e pavimentos (ex: *Subsolo 01*, *Térreo*, *Pavimento Tipo*).

### 4.3 Catálogo de Materiais
1. Acesse **Gestão** -> **Catálogo de Materiais**.
2. Cadastre insumos padronizados com Unidade de Medida (UN, KG, M, M2, SC, CX) e Código de Integração SIENGE.

---

## 5. Dúvidas Frequentes e Boas Práticas

- **O que fazer se o encarregado trocar de celular?**
  Basta acessar o navegador no novo aparelho e efetuar o login com o usuário e senha cadastrados.
- **Como alterar a senha de um colaborador?**
  O Administrador do Sistema pode redefinir a senha a qualquer momento no módulo de Usuários.
- **Como garantir que as ferramentas não quebrem sem registro?**
  Nunca entregue ou receba uma ferramenta sem assinalar a confirmação de teste obrigatório no sistema.

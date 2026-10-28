# Guia de Memória do Projeto com Graphify e Obsidian

**Projeto:** Sistema de Almoxarifado de Obras (JOOY Construtora + SENAI)  
**Ferramentas:** Graphify (`graphifyy`) · Obsidian (Second Brain) · Google Antigravity

---

## 1. O que foi Configurado

O **Graphify** foi instalado e integrado com sucesso ao projeto para transformar todo o conhecimento do sistema (código-fonte, regras de negócio da obra, esquema do banco, planos de tasks e instruções dos agentes) em um **grafo de conhecimento navegável**:

1. **Instalação do Core:** Pacote Python `graphifyy` instalado e executável via `py -m graphify`.
2. **Integração com Antigravity:**
   - Regra automática em [`.agents/rules/graphify.md`](file:///c:/Users/Guilherme/Documents/Faculdade/Projetos/obras-jooy/.agents/rules/graphify.md) (o agente consulta o grafo antes de responder dúvidas arquiteturais).
   - Workflow em [`.agents/workflows/graphify.md`](file:///c:/Users/Guilherme/Documents/Faculdade/Projetos/obras-jooy/.agents/workflows/graphify.md).
   - Skill de sistema registrado em `~/.gemini/config/skills/graphify/SKILL.md`.
3. **Cofre do Obsidian Gerado:**
   - Localização: [`graphify-out/obsidian/`](file:///c:/Users/Guilherme/Documents/Faculdade/Projetos/obras-jooy/graphify-out/obsidian)
   - Contém **156 notas Markdown interligadas** por `[[wikilinks]]` e um mapa visual interativo [`graph.canvas`](file:///c:/Users/Guilherme/Documents/Faculdade/Projetos/obras-jooy/graphify-out/obsidian/graph.canvas).

---

## 2. Como Abrir e Visualizar no Obsidian

Siga este passo a passo para conectar o Obsidian à memória do projeto:

1. **Abra o aplicativo Obsidian** no seu computador.
2. Na tela de boas-vindas (ou clicando no ícone do cofre no canto inferior esquerdo), selecione a opção:
   **"Open folder as vault"** (ou *"Abrir pasta como cofre"*).
3. Navegue e selecione a pasta:
   ```
   c:\Users\Guilherme\Documents\Faculdade\Projetos\obras-jooy\graphify-out\obsidian
   ```
4. **Visualização em Grafo (Graph View):**
   - Pressione o atalho `Ctrl + G` (ou clique no ícone de teia na barra lateral esquerda).
   - Você verá a constelação completa do projeto: entidades do Prisma, regras de segurança, tasks T01 a T20, camadas de arquitetura e diretrizes operacionais interconectadas.
5. **Visualização em Canvas:**
   - Na lista de arquivos, abra o arquivo `graph.canvas`.
   - Navegue pelo mapa visual estruturado com zoom e arraste de cartões.

---

## 3. Comandos de Manutenção da Memória

Sempre que novas regras de negócio, tabelas ou códigos forem adicionados, a memória pode ser re-sincronizada com facilidade:

### Atualizar o Grafo da Codebase:
```powershell
py -m graphify update .
```
*(Executa a extração AST de todos os arquivos sem custo de tokens de IA).*

### Reexportar as Notas e o Canvas para o Obsidian:
```powershell
py -m graphify export obsidian
```

### Consultas Rápidas no Terminal (opcional):
```powershell
# Encontrar o menor caminho de dependência entre dois conceitos:
py -m graphify path "Usuario" "MovimentacaoEstoque"

# Explicar um conceito do grafo e suas conexões imediatas:
py -m graphify explain "Requisicao"
```

---

## 4. Plugins Recomendados para o Obsidian

Para uma experiência ainda mais rica no Obsidian, recomendamos habilitar os seguintes *Community Plugins*:

1. **Dataview:** Permite fazer queries em SQL/DQL sobre as notas geradas (ex.: listar todas as tasks pendentes ou tabelas do banco).
2. **Smart Connections (opcional):** Conecta notas semanticamente usando embeddings locais.

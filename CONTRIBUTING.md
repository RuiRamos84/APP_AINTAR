# Guia de Contribuição - APP AINTAR

## Fluxo de Trabalho (Git Workflow)

### 1. Antes de começar uma nova tarefa

Garantir que estás no branch `master` e atualizado:

```bash
git checkout master
git pull origin master
```

### 2. Criar um branch para a tarefa

O nome do branch deve seguir o padrão: `feature/nome-da-tarefa` ou `fix/nome-do-bug`

```bash
git checkout -b feature/nome-da-tarefa
```

**Exemplos:**
- `feature/inventario`
- `feature/relatorios`
- `fix/correcao-login`
- `fix/erro-calculo-total`

### 3. Trabalhar e fazer commits

Faz commits regulares com mensagens descritivas:

```bash
git add .
git commit -m "descrição clara do que foi feito"
```

**Boas práticas para mensagens de commit:**
- `feat: adicionar tabela de inventário`
- `fix: corrigir erro no cálculo do total`
- `refactor: reorganizar serviço de pagamentos`

### 4. Enviar o branch para o GitHub

```bash
git push -u origin feature/nome-da-tarefa
```

### 5. Criar o Pull Request (PR)

1. Vai ao GitHub: https://github.com/RuiRamos84/APP_AINTAR
2. Aparece um banner amarelo com o teu branch → clica **"Compare & pull request"**
   - Se não aparecer: vai a **Pull requests** → **New pull request**
   - Seleciona `base: master` ← `compare: feature/nome-da-tarefa`
3. Preenche:
   - **Título**: descrição curta da tarefa (ex: "Registo de inventário")
   - **Descrição**: explica o que foi feito e porquê
4. Clica **"Create pull request"**

### 6. Aguardar aprovação

- O Rui vai rever o código
- Se houver alterações pedidas, faz as correções no mesmo branch:

```bash
# Fazer as correções pedidas
git add .
git commit -m "fix: correcções pedidas na revisão"
git push
```

- O PR atualiza automaticamente
- Quando aprovado, o Rui faz o merge para `master`

### 7. Após o merge, limpar o branch

```bash
git checkout master
git pull origin master
git branch -d feature/nome-da-tarefa
```

---

## Regras Importantes

1. **NUNCA** fazer push diretamente para o `master`
2. **SEMPRE** criar um branch novo para cada tarefa
3. **SEMPRE** fazer pull do master antes de criar um branch novo
4. Fazer commits pequenos e frequentes (não acumular tudo num só commit)
5. Testar o código antes de criar o Pull Request

---

## Resumo Visual

```
master (produção)
  │
  ├── git checkout -b feature/tarefa
  │     │
  │     ├── commit 1
  │     ├── commit 2
  │     ├── git push
  │     │
  │     └── Pull Request → Revisão → Aprovação
  │                                      │
  ◄──────────────────── Merge ───────────┘
```

# Bioquímica — Treino Adaptativo V4

Aplicação React + Vite com o treino do `Biomedicina-nice`: **145 questões** dos slides, filtro por matéria, correção escrita depois do erro e **+2 do mesmo microtema**.

Os valores energéticos da prova seguem o modelo da apostila: **NADH = 3 ATP**, **FADH = 2 ATP**, **1 volta de Krebs = 12 ATP**.

O app **abre e funciona sem login**. Progresso, erros, revisão e desempenho ficam no `localStorage` deste navegador.

## O que a app faz

- Tela inicial do V4: escolher o tema e treinar 20, 40, 80 ou 145 questões
- Explicação em três camadas (o que o enunciado quer, técnica, mastigada) + animação SVG + chave mental
- Correção obrigatória por escrito depois de cada erro
- Matérias, revisão espaçada (1 → 3 → 7 dias), caderno de erros, simulado e progresso
- Sem Firebase obrigatório: GitHub + Vercel bastam para publicar

## Como rodar

```bash
cd app
npm install
npm run dev
```

```bash
npm run build
npm run preview
npm run lint
```

## Deploy na Vercel

1. Importe o repositório no painel da Vercel.
2. Framework: Vite. Build: `npm run build`. Output: `dist`.
3. **Não é necessário** cadastrar variáveis `VITE_FIREBASE_*`.
4. Deploy.

`vercel.json` já redireciona rotas da SPA para `index.html`.

## Religar Firebase no futuro (opcional)

O código de Auth/Firestore permanece no projeto, desligado. Para sincronizar entre aparelhos:

1. Cadastre as variáveis de `.env.example`.
2. Defina `VITE_CLOUD_SYNC=true`.
3. Ative Authentication (e-mail/senha) e publique `firestore.rules`.
4. Autorize o domínio da Vercel no Firebase.

## Conteúdo

O banco e o fluxo visual vêm de `../referencia/Biomedicina-nice.html` (não alterar essa pasta).

# Bioquímica — Treino Adaptativo V4

Aplicação React + Vite com o treino do `Biomedicina-nice`: **145 questões** dos slides, filtro por matéria, correção escrita depois do erro e **+2 do mesmo microtema**.

Os valores energéticos da prova seguem o modelo da apostila: **NADH = 3 ATP**, **FADH = 2 ATP**, **1 volta de Krebs = 12 ATP**.

## O que a app faz

- Tela inicial do V4: escolher o tema e treinar 20, 40, 80 ou 145 questões
- Explicação em três camadas (o que o enunciado quer, técnica, mastigada) + animação SVG + chave mental
- Correção obrigatória por escrito depois de cada erro
- Login por e-mail e senha (Firebase Auth) com progresso no Firestore
- Modo local/demo se o Firebase ainda não estiver configurado
- Matérias, revisão espaçada (1 → 3 → 7 dias), caderno de erros, simulado e progresso

## Como rodar

```bash
cd app
npm install
npm run dev
```

Sem `.env`, entre em **Continuar em modo local**. O progresso fica neste navegador.

```bash
npm run build
npm run preview
npm run lint
```

## Ligar o Firebase (sync entre dispositivos)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. Ative **Authentication → E-mail/senha**.
3. Crie um app da Web e copie as chaves para `.env` (veja `.env.example`).
4. Crie um banco Firestore e publique as regras:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use SEU_PROJECT_ID
npx -y firebase-tools@latest deploy --only firestore:rules
```

As regras em `firestore.rules` são um **protótipo**: só o dono da conta lê/escreve `users/{uid}`.

## Deploy na Vercel

1. Importe a pasta `app` (ou o repositório, com root `app`).
2. Framework: Vite. Build: `npm run build`. Output: `dist`.
3. Cadastre as variáveis `VITE_FIREBASE_*`.
4. Em Authentication do Firebase, autorize o domínio da Vercel.

`vercel.json` já redireciona rotas da SPA para `index.html`.

## Conteúdo

O banco e o fluxo visual vêm de `../referencia/Biomedicina-nice.html` (não alterar essa pasta).

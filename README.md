# SMZ Repasses · Gestão

Sistema de gestão da operação de **repasse de veículos** (e compra e revenda). Roda direto no navegador, com login e dados sincronizados entre os sócios pelo Supabase, hospedado no Netlify.

## Como funciona o dia a dia
- **Repassar**: cadastra o carro como venda, com nome e telefone do comprador. O sinal é a sua comissão e o boleto do valor original é pago com o dinheiro do cliente (botão *Marcar boleto pago*). No caixa fica só o lucro.
- **Comprar**: o valor sai do caixa ao salvar; depois o carro passa por preparação, venda (com nome e telefone do comprador) e entra no lucro.
- **Clientes**: lista automática de quem já comprou, com botão de WhatsApp e mensagem padrão editável (`{nome}` e `{ultimo}`).
- Valor de venda sai sozinho: valor + acréscimo (em % ou R$). Gastos podem ser lançados depois (Previsto ou Feito).

## Colocar no ar (3 passos, nesta ordem)

### 1) Supabase (banco e login)
1. Crie uma conta em supabase.com e um **projeto novo** só da SMZ.
2. Menu **SQL Editor** > New query > cole o conteúdo de `supabase/schema.sql` > **Run**.
3. Menu **Authentication > Providers > Email**: desligue **Allow new users to sign up** (só você e o sócio entram).
4. Menu **Authentication > Users > Add user**: crie o usuário de cada sócio (e-mail e senha; marque *Auto Confirm User*).
5. No **SQL Editor**, rode (trocando e-mail e nome) uma vez para cada sócio:
   ```sql
   insert into public.members (user_id, nome)
   select id, 'Seu Nome' from auth.users where email = 'voce@email.com';
   ```
6. Menu **Project Settings > API**: copie a **Project URL** e a chave **anon public**.
7. Abra `public/config.js` e cole nas duas linhas `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Deixe `LOCAL_TEST: false`.

### 2) GitHub
1. Crie um repositório **privado** em github.com.
2. Clique em **Add file > Upload files** e arraste o **conteúdo** da pasta extraída (as pastas `public` e `supabase` e os arquivos `netlify.toml`, `README.md`, `.gitignore`), não o .zip. Depois **Commit changes**.

### 3) Netlify
1. Em netlify.com: **Add new site > Import an existing project > GitHub** e escolha o repositório.
2. Deixe **Build command** vazio e **Publish directory** = `public` (o `netlify.toml` já informa isso) > **Deploy**.
3. Abra o endereço que o Netlify gerar e entre com o e-mail e a senha criados no passo 1.
4. (Recomendado) Supabase > **Authentication > URL Configuration**: coloque o endereço do Netlify em *Site URL*.

Para atualizar o sistema depois: troque os arquivos no GitHub e o Netlify publica sozinho.

## Ver no computador antes (opcional)
Extraia o zip (botão direito > Extrair tudo), abra `public/config.js`, troque `LOCAL_TEST` para `true`, abra `public/index.html` e entre com **ADMIN / ADMIN**. Os dados ficam só naquele navegador. Volte para `false` antes de subir.

## Ajustes técnicos
Metas de giro em `public/index.html`: `META_MARGEM_MINIMA_PCT`, `META_DIAS_ESTOQUE`, `ALERTA_DIAS_PREP`, `ALERTA_DIAS_CICLO`.

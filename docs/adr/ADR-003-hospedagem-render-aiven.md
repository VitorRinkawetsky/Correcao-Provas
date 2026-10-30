# ADR-003: Hospedagem no Render com MySQL no Aiven

## Status

Aceita em 30 de outubro de 2026.

## Contexto

A N2 exige o sistema hospedado em um serviço gratuito, com as telas operando
sobre um banco de dados real. A publicação da N1 no GitHub Pages servia apenas
arquivos estáticos e não executa o Express nem o MySQL, então as chamadas
`/api` não funcionariam lá. O banco precisa continuar sendo MySQL
([ADR-001](ADR-001-banco-de-dados-mysql.md)), o que exclui opções gratuitas
baseadas em PostgreSQL, como o Supabase.

## Decisão

- Publicar a aplicação no **Render** como um único Web Service Node.js. O
  Express entrega o front-end compilado (`dist/`) e a API no mesmo endereço:
  [https://sgp-catolica.onrender.com](https://sgp-catolica.onrender.com).
- Hospedar o banco no plano gratuito do **Aiven for MySQL**, com conexão TLS
  (`DB_SSL=true` e o certificado do provedor em `DB_SSL_CA`).
- Criar o schema com `npm run db:setup`, que aplica `database/init.sql` somente
  no banco informado em `DB_NAME`.
- Manter as credenciais apenas nas variáveis de ambiente do Render, nunca no
  repositório.

## Consequências

- Front-end e API compartilham a mesma origem, então o cookie de sessão
  funciona sem configuração de CORS.
- O Render publica automaticamente cada push na branch `main`.
- No plano gratuito, o serviço hiberna após cerca de 15 minutos sem acesso e o
  primeiro acesso seguinte leva aproximadamente um minuto.
- O plano gratuito do Aiven tem recursos limitados (CPU, memória e disco),
  suficientes para a demonstração acadêmica.
- `npm run db:setup` recria as tabelas e apaga os dados; deve ser executado
  apenas na preparação inicial do banco.

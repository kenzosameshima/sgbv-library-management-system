# Casos de Teste - MVP SGB

## CT01 - Cadastro de usuario
- Entrada: nome, email, senha
- Passos: enviar POST `/api/v1/users`
- Esperado: usuario cadastrado

## CT03 - Login valido
- Entrada: email, senha
- Passos: enviar POST `/api/v1/auth/login`
- Esperado: access token e refresh token retornados

## CT05 - Cadastro de livro
- Entrada: titulo, autor, categoria, isbn, totalCopies
- Passos: enviar POST `/api/v1/books` com token ADMIN
- Esperado: livro cadastrado

## CT06 - Emprestimo valido
- Entrada: userId (opcional para ADMIN), bookId
- Passos: enviar POST `/api/v1/loans`
- Esperado: emprestimo registrado e disponibilidade decrementada

## CT07 - Emprestimo indisponivel
- Entrada: bookId indisponivel
- Passos: enviar POST `/api/v1/loans`
- Esperado: bloqueio com mensagem sugerindo reserva

## CT09 - Devolucao
- Entrada: userId (opcional para ADMIN), bookId
- Passos: enviar POST `/api/v1/returns`
- Esperado: emprestimo finalizado e disponibilidade atualizada

## CT11 - Reserva de livro
- Entrada: bookId indisponivel
- Passos: enviar POST `/api/v1/reservations`
- Esperado: usuario entra na fila FIFO

## CT14 - Pagamento de multa
- Entrada: fineId
- Passos: enviar POST `/api/v1/users/fines/pay` com token ADMIN
- Esperado: multa marcada como paga e usuario liberado

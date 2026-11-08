# Test Cases - SGB MVP

## CT01 - Register user
- Input: name, email, password
- Steps: send POST `/api/v1/users`
- Expected: user is registered

## CT03 - Valid login
- Input: email, password
- Steps: send POST `/api/v1/auth/login`
- Expected: access token and refresh token are returned

## CT05 - Register book
- Input: title, author, category, isbn, totalCopies
- Steps: send POST `/api/v1/books` with an ADMIN token
- Expected: book is registered

## CT06 - Valid loan
- Input: userId (optional for ADMIN), bookId
- Steps: send POST `/api/v1/loans`
- Expected: loan is recorded and availability is decremented

## CT07 - Unavailable book loan
- Input: unavailable bookId
- Steps: send POST `/api/v1/loans`
- Expected: request is rejected with a message suggesting a reservation

## CT09 - Return
- Input: userId (optional for ADMIN), bookId
- Steps: send POST `/api/v1/returns`
- Expected: loan is closed and availability is updated

## CT11 - Book reservation
- Input: unavailable bookId
- Steps: send POST `/api/v1/reservations`
- Expected: user joins the FIFO queue

## CT14 - Fine payment
- Input: fineId
- Steps: send POST `/api/v1/users/fines/pay` with an ADMIN token
- Expected: fine is marked as paid and the user can borrow again

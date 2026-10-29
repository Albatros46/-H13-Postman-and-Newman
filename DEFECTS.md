# Defect report — Restful Booker API

Found while writing the API tests (H13), 2026-10-29, against `https://restful-booker.herokuapp.com`.
Every defect was reproduced with `curl` first and is now covered by a test named `[KNOWN BUG BR-xx]`.

**How the tests treat a known defect:** the test asserts today's (wrong) behaviour, so the pipeline stays green while the defect is open. When the API is fixed, that test turns red: a signal to replace it with a test for the correct behaviour and close the defect.

| ID | Severity | Area | Summary |
|---|---|---|---|
| BR-01 | Medium | Auth | Wrong password returns `200 OK` instead of `401 Unauthorized` |
| BR-02 | Medium | Validation | Missing required fields return `500 Internal Server Error` instead of `400 Bad Request` |
| BR-03 | High | Validation | Negative price and checkout before checkin are accepted |
| BR-04 | Low | Update | `PUT` keeps an optional field that was not sent |
| BR-05 | Low | Delete | `DELETE` returns `201 Created` |
| BR-06 | Low | Delete | Deleting an already deleted booking returns `405` instead of `404` |
| BR-07 | High | Data integrity | Decimal price `99.99` is silently stored as `99` |
| BR-08 | Low | Health | `GET /ping` returns `201 Created` instead of `200 OK` |

---

### BR-01 · Wrong password returns 200 OK
- **Request:** `POST /auth` with `{"username":"admin","password":"wrong-password"}`
- **Expected:** `401 Unauthorized`
- **Actual:** `200 OK`, body `{"reason":"Bad credentials"}`
- **Impact:** clients and monitoring that check the status code see a successful login. Only the body tells it failed.
- **Test:** `02 Auth / Bad credentials are rejected`

### BR-02 · Missing fields cause a server error
- **Request:** `POST /booking` with `{"firstname":"OnlyFirstName"}`
- **Expected:** `400 Bad Request` with a message naming the missing fields
- **Actual:** `500 Internal Server Error`, body `Internal Server Error`
- **Impact:** a client mistake looks like a server outage; the client gets no hint what to fix.
- **Test:** `04 Negative and security / Create booking with missing fields`

### BR-03 · Invalid values are stored
- **Request:** `POST /booking` with `"totalprice": -5` and `checkout` one week **before** `checkin`
- **Expected:** `400 Bad Request`
- **Actual:** `200 OK`, the booking is stored as sent
- **Impact:** impossible bookings (negative money, negative stay) end up in the data.
- **Test:** `04 Negative and security / Create booking with invalid values`

### BR-04 · PUT does not replace the whole booking
- **Request:** `PUT /booking/{id}` without `additionalneeds` (the booking had `"Breakfast"`)
- **Expected:** `PUT` replaces the resource; the field is removed
- **Actual:** `"additionalneeds": "Breakfast"` is still there — `PUT` behaves like `PATCH`
- **Test:** `03 Booking lifecycle / Update booking (PUT)`

### BR-05 · DELETE returns 201 Created
- **Request:** `DELETE /booking/{id}` with a valid token
- **Expected:** `204 No Content` (or `200 OK`)
- **Actual:** `201 Created`, body `Created`
- **Test:** `03 Booking lifecycle / Delete booking`

### BR-06 · Second DELETE returns 405
- **Request:** the same `DELETE` again
- **Expected:** `404 Not Found` (the booking does not exist)
- **Actual:** `405 Method Not Allowed`
- **Test:** `03 Booking lifecycle / Delete the same booking again`

### BR-07 · Decimal price is truncated
- **Request:** `POST /booking` with `"totalprice": 99.99`
- **Expected:** `99.99` stored, or `400` if only whole numbers are allowed
- **Actual:** `200 OK`, stored and returned as `99` — no error, no warning
- **Impact:** silent data loss on a money field.
- **Test:** data-driven collection, CSV row `decimal price` (`expectedPrice` = 99)

### BR-08 · Health check returns 201
- **Request:** `GET /ping`
- **Expected:** `200 OK`
- **Actual:** `201 Created`
- **Test:** `01 Health / Ping`

---

Restful Booker is a practice API that is known to contain bugs on purpose. The point of this report is the method: reproduce, describe expected vs. actual, rate the impact, and keep a test that notices when the behaviour changes.

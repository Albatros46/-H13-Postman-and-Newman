# API Testing · Postman + Newman

[![API Tests](https://github.com/Albatros46/-H13-Postman-and-Newman/actions/workflows/api-tests.yml/badge.svg)](https://github.com/Albatros46/-H13-Postman-and-Newman/actions/workflows/api-tests.yml)
![Postman](https://img.shields.io/badge/Postman-collection%20v2.1-FF6C37) ![Newman](https://img.shields.io/badge/Newman-6.2-orange) ![Node](https://img.shields.io/badge/Node.js-24-339933) ![Assertions](https://img.shields.io/badge/assertions-135%20passing-brightgreen) ![Defects](https://img.shields.io/badge/defects%20found-8-red)

API tests for the [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html) practice API, written as Postman collections and run by Newman on every push and every night in GitHub Actions.
While writing them I found **8 defects** — they are documented in [DEFECTS.md](DEFECTS.md) and each one is pinned by a test.

Part of my 52-week QA Automation roadmap — **Week 13**, the start of phase 3 (API testing + BDD).

## What is tested

| Folder | Requests | What is checked |
|---|---|---|
| `01 Health` | 1 | API reachable |
| `02 Auth` | 2 | token login · wrong password rejected |
| `03 Booking lifecycle` | 8 | create → read → find by name → `PUT` → `PATCH` → delete → gone → delete again, **chained through variables** |
| `04 Negative and security` | 10 | `PUT` / `PATCH` / `DELETE` without or with a wrong token → 403, **and the booking is unchanged afterwards** · unknown and non-numeric ids → 404 · missing fields · invalid values · cleanup |
| Data-driven collection | 3 × 9 rows | each row of [`data/bookings.csv`](data/bookings.csv): create → read back → delete |

**Every** response is also checked for time (< 3 s, collection-level script). Bodies are validated against a **JSON Schema** (`additionalProperties: false`, date pattern `YYYY-MM-DD`), so an extra or renamed field fails the test. Checked with a control run: a body with an extra field and one with a wrong type both turn the schema assertion red.

Result: **main collection 54/54 assertions · data-driven 81/81 assertions** (Newman counts 22 + 28 requests, including the `pm.sendRequest` calls).

## Postman techniques used

| Technique | Where |
|---|---|
| Request chaining with collection variables | `Create booking` saves `bookingId` and the expected body; the next 7 requests use them |
| Collection-level pre-request script | unique test data per run: `{{$randomFirstName}}`, a run id in the last name, check-in 30 days from today |
| Collection-level test script | response-time check on every request |
| JSON Schema validation | `pm.expect(body).to.be.jsonSchema(bookingSchema)` |
| `pm.sendRequest` | login once for the data-driven run · cleanup of a second booking without an extra request |
| Data-driven iterations | `newman -d data/bookings.csv`, row values via `pm.iterationData` |
| Environment + secret variable | `environments/…json`, `password` is empty and of type `secret` |

The test data is designed with the techniques from Week 4: boundary values (price `0`, above 32-bit int, one-night stay), equivalence classes (deposit paid / not paid), and special characters (German umlauts, Turkish `ç ğ ı ö`, a 60-character name).

## Defects found

| ID | Severity | Summary |
|---|---|---|
| BR-01 | Medium | Wrong password → `200 OK` instead of `401` |
| BR-02 | Medium | Missing fields → `500` instead of `400` |
| BR-03 | High | Negative price and checkout before checkin are accepted |
| BR-04 | Low | `PUT` keeps a field that was not sent (behaves like `PATCH`) |
| BR-05 | Low | `DELETE` → `201 Created` |
| BR-06 | Low | Second `DELETE` → `405` instead of `404` |
| BR-07 | High | `99.99` is silently stored as `99` |
| BR-08 | Low | `GET /ping` → `201 Created` |

Details with request, expected, actual and impact: [DEFECTS.md](DEFECTS.md).
A test for a known defect asserts today's behaviour and is named `[KNOWN BUG BR-xx]`. The pipeline stays green while the defect is open — and turns red the day the API changes, which is the signal to update the test and close the defect.

## Run

```bash
npm install
npm test             # both collections
npm run test:api     # main collection
npm run test:data    # data-driven collection
```

Reports land in `reports/`: `api.html`, `data.html` (htmlextra) and `*-junit.xml`.

**In the Postman app:** *Import* the two files in `collections/` and the one in `environments/`, select the environment, type the password into `password` (*Current value*), and run the collection with the *Collection Runner* (for the data-driven collection, choose `data/bookings.csv` as the data file).

## Keeping secrets out of the repository and the reports

- `password` is empty in the environment file. `scripts/run.js` passes it from the `RB_PASSWORD` environment variable (a GitHub secret in CI); without it, the public demo password from the API docs is used so the project runs out of the box.
- The token lives only in a collection variable during the run and is never logged.
- The HTML report hides the login request and response bodies, every `Cookie` header and the `password` variable.

**Checked with a control run:** with the same collection but *without* these report options, the HTML report contains the password and the token. With the options: **0** occurrences of the password and **0** token-shaped strings in all reports.

## CI

`.github/workflows/api-tests.yml` — on push, pull request, by hand, and **every night at 05:00 UTC**. The nightly run matters for an API test suite: the API can change or break without a commit in this repository. Two parallel jobs (`api`, `data`), reports uploaded as artifacts for 14 days.

## Why Newman as a library

`scripts/run.js` calls `newman.run()` instead of a long CLI command in `package.json`. That keeps the reporter options in one readable place, reads the password the same way on Windows and Linux, runs both collections and sets the exit code for CI.

## An open observation

In the very first data-driven run, the cleanup `DELETE` failed for rows 4–9 and one response took longer than 3 s. The next three runs were 81/81 green and I could not reproduce it, so the cause is unknown. My guess was that the public server resets its data, but the API docs do not say so. If it happens again, the assertion message shows the actual status code.

## Structure

```
collections/
├── restful-booker.postman_collection.json              main collection (4 folders, 21 requests)
└── restful-booker-data-driven.postman_collection.json  3 requests × CSV rows
environments/restful-booker.postman_environment.json    baseUrl, username, password (secret, empty)
data/bookings.csv                                       9 booking scenarios
scripts/run.js                                          Newman runner + reporters
DEFECTS.md                                              defect report
```

## What I learned
- _TODO: 2–3 sentences in your own words_

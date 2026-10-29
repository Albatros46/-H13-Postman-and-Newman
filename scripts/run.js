#!/usr/bin/env node
/*
 * Runs the Postman collections with Newman (as a library, so it works the same on
 * Windows, macOS, Linux and in CI) and writes CLI, HTML and JUnit reports.
 *
 *   npm test              both collections
 *   npm run test:api      main collection only
 *   npm run test:data     data-driven collection only (data/bookings.csv)
 *
 * The password is read from the RB_PASSWORD environment variable (a CI secret).
 * If it is not set, the public demo password from the Restful Booker docs is used,
 * so the project runs out of the box. It is never written into a collection or a report.
 */
const newman = require('newman');
const path = require('path');

const root = path.join(__dirname, '..');
const DEMO_PASSWORD = 'password123'; // published at https://restful-booker.herokuapp.com/apidoc

const RUNS = {
    api: {
        collection: 'collections/restful-booker.postman_collection.json',
    },
    data: {
        collection: 'collections/restful-booker-data-driven.postman_collection.json',
        iterationData: 'data/bookings.csv',
    },
};

function runOne(name, { collection, iterationData }) {
    return new Promise((resolve) => {
        newman.run({
            collection: path.join(root, collection),
            environment: path.join(root, 'environments/restful-booker.postman_environment.json'),
            envVar: [{ key: 'password', value: process.env.RB_PASSWORD || DEMO_PASSWORD }],
            iterationData: iterationData && path.join(root, iterationData),
            reporters: ['cli', 'htmlextra', 'junit'],
            reporter: {
                htmlextra: {
                    export: path.join(root, `reports/${name}.html`),
                    title: `Restful Booker - ${name}`,
                    browserTitle: `Restful Booker - ${name}`,
                    // Secrets stay out of the HTML report: login body, token response,
                    // the token cookie and the password variable
                    hideRequestBody: ['Create token'],
                    hideResponseBody: ['Create token'],
                    skipHeaders: 'Cookie',
                    skipEnvironmentVars: ['password'],
                    skipSensitiveData: false,
                    showEnvironmentData: true,
                },
                junit: { export: path.join(root, `reports/${name}-junit.xml`) },
            },
            timeoutRequest: 30000,
        }, (err, summary) => {
            if (err) {
                console.error(`${name}: could not run - ${err.message}`);
                return resolve(false);
            }
            const { failures, stats } = summary.run;
            console.log(`\n${name}: ${stats.assertions.total - stats.assertions.failed}/${stats.assertions.total} `
                + `assertions passed, ${stats.requests.total} requests, ${stats.iterations.total} iteration(s)`);
            resolve(failures.length === 0);
        });
    });
}

(async () => {
    const wanted = process.argv[2] ? [process.argv[2]] : Object.keys(RUNS);
    const unknown = wanted.filter((w) => !RUNS[w]);
    if (unknown.length) {
        console.error(`Unknown run "${unknown}". Use one of: ${Object.keys(RUNS).join(', ')}`);
        process.exit(2);
    }
    let ok = true;
    for (const name of wanted) {
        ok = (await runOne(name, RUNS[name])) && ok;
    }
    process.exit(ok ? 0 : 1);
})();

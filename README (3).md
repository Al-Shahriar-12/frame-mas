# Solver checks

Both scripts read the code straight out of `../index.html`. With Node.js 18 or newer installed, run them from the repository folder:

```bash
node tests/verify.js
node tests/combinations.js
```

- `verify.js` compares the solver with 27 hand calculations.
- `combinations.js` compares every generated BNBC 2020 (strength and service) and ASCE 7-16 combination factor with hand-worked tables.

Each prints PASS or FAIL per check and ends with ALL PASSED when everything agrees.

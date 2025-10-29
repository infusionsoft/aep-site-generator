# Contributing

## Prerequisites

Before following any other part of the guide, install the following:

- [npm](https://www.npmjs.com/)
- playwright with chromium: `npx playwright install --with-deps chromium`

## Local Development Quickstart

```
# clone the aeps repository, and point to its location
export AEP_LOCATION=${AEP_LOCATION:-"../aeps"}
# generate the pages required for the astro build
npm run generate
# build and run the astro site
npm run astro build
```

If your aeps repository is in a sibling directory of your
site-generator, you can use the following utility script:

```bash
./scripts/serve.sh
```

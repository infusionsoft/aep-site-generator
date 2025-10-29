#!/usr/bin/env bash
set -x
export SG_DIRECTOR="${PWD}"
export AEP_LOCATION="/tmp/aeps"

if [ ! -d "${AEP_LOCATION}" ]; then
    git clone https://github.com/infusionsoft/aeps.git "${AEP_LOCATION}"
fi

npm install
npx playwright install --with-deps chromium
npm run generate
npm run build

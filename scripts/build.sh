#!/usr/bin/env bash
set -x
export SG_DIRECTOR="${PWD}"
export AEP_LOCATION="/tmp/aeps"
export AEP_EDITION_V4_PREVIEW="/tmp/aeps-v4"

if [ ! -d "${AEP_LOCATION}" ]; then
    git clone https://github.com/infusionsoft/aeps.git "${AEP_LOCATION}"
fi

if [ ! -d "${AEP_EDITION_V4_PREVIEW}" ]; then
    git clone --single-branch --branch v4-preview https://github.com/infusionsoft/aeps.git "${AEP_EDITION_V4_PREVIEW}"
fi

npm install
npx playwright install --with-deps chromium
npm run generate
npm run build

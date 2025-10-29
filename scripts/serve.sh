#!/bin/bash
# a development script to generate and serve the site.

export AEP_LOCATION=${AEP_LOCATION:-"../aeps"}
npm run generate
npm run astro dev
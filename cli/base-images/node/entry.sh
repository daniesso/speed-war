#!/bin/bash
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/before.txt
node /app/dist/index.js
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/after.txt
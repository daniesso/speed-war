#!/bin/bash
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/before.txt
/app/app
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/after.txt
#!/bin/bash
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/before.txt
/app/a.out
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/after.txt
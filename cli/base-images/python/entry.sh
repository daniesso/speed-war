#!/bin/bash
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/before.txt
python3 /app/main.py
date -u +"%Y-%m-%dT%H:%M:%S.%NZ" > /timing/after.txt